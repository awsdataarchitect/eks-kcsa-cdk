import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { DockerImageAsset , Platform} from 'aws-cdk-lib/aws-ecr-assets';

export class EksKcsaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // Create VPC
    const vpc = new ec2.Vpc(this, 'EksVpc', {
      maxAzs: 2,
      subnetConfiguration: [{
        name: 'PublicSubnet',
        subnetType: ec2.SubnetType.PUBLIC,
      }],
    })

    const mastersRoleArn = process.env.MASTERS_ROLE_ARN || 'arn:aws:iam::1234567890:role/mastersRoleArn';
    const userRoleArn = process.env.USER_ROLE_ARN || 'arn:aws:iam::1234567890:role/userRoleArn';
    const workerSpotInstanceType = 't3.medium';
    const addOns: Array<blueprints.ClusterAddOn> = [
      new blueprints.addons.AwsLoadBalancerControllerAddOn(),
      new blueprints.addons.VpcCniAddOn(),
    ];

    // Build and push Docker image to ECR
    const appImageAsset = new DockerImageAsset(this, 'kcsa-image', {
      directory: './lib/docker',
      platform: Platform.LINUX_AMD64,
    });

    // Create launch template
    const launchTemplate = new ec2.LaunchTemplate(this, 'LaunchTemplate', {
      keyName: process.env.KEY_PAIR_NAME,
    });

    // Create EKS cluster
    const clusterProvider = new blueprints.GenericClusterProvider({
      version: eks.KubernetesVersion.of('1.32'),
      tags: { 'Name': 'kcsa-cluster' },
        mastersRole: blueprints.getResource(context => {
        return iam.Role.fromRoleArn(context.scope, 'MastersRole', mastersRoleArn, {
          mutable: true, // Set to true if you need to update the role
        })
      }),
      managedNodeGroups: [{
        id: 'mng1-launchtemplate',
        instanceTypes: [new ec2.InstanceType(workerSpotInstanceType)],
        amiType: eks.NodegroupAmiType.AL2_X86_64,
        nodeGroupCapacityType: eks.CapacityType.SPOT,
        desiredSize: 1,
        minSize: 0,
        maxSize: 1,
        nodeGroupSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        launchTemplateSpec: {
          id: launchTemplate.launchTemplateId || 'id',
          version: launchTemplate.latestVersionNumber,
        }
      }],
      privateCluster: false,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PUBLIC }],
    });

    const platformTeam = new blueprints.PlatformTeam({
      name: 'platform-admin',
      userRoleArn: userRoleArn
    });

    const cluster = blueprints.EksBlueprint.builder()
      .clusterProvider(clusterProvider)
      .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.DirectVpcProvider(vpc))
      .teams(platformTeam)
      .addOns(...addOns)
      .account(process.env.CDK_DEFAULT_ACCOUNT)
      .region(process.env.CDK_DEFAULT_REGION)
      .build(this, 'kcsa-cluster');


    // Deploy Kubernetes manifests (Deployment + Service + Ingress)
    const appLabel = { app: 'kcsa-app' };
    const cfnCluster = cluster.getClusterInfo().cluster;
    cfnCluster.addManifest('KcsaDeployment', {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: 'kcsa-backend' },
      spec: {
        replicas: 1,
        selector: { matchLabels: appLabel },
        template: {
          metadata: { labels: appLabel },
          spec: {
            containers: [{
              name: 'kcsa-container',
              image: appImageAsset.imageUri,
              ports: [{ containerPort: 5001 }],
            }],
          },
        },
      },
    });

    cfnCluster.addManifest('KcsaService', {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: 'kcsa-service' },
      spec: {
        type: 'NodePort',
        selector: appLabel,
        ports: [{ port: 80, targetPort: 5001 }],
      },
    });

    cfnCluster.addManifest('EksIngress', {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: 'kcsa-ingress',
        namespace: 'default',
        annotations: {
          'alb.ingress.kubernetes.io/scheme': 'internet-facing',
        },
      },
      spec: {
        ingressClassName: 'alb',
        rules: [
          {
            http: {
              paths: [
                {
                  path: '/',
                  pathType: 'Prefix',
                  backend: {
                    service: {
                      name: 'kcsa-service',
                      port: { number: 80 },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    });
    
  }
}