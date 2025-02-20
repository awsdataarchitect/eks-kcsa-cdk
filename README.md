# Open-source code for a KCSA Exam Simulator on Amazon EKS Cluster running Kubernetes v1.32 (code: Penelope)

This is a CDK project written in TypeScript to streamline your IaC with a single-stack deployment powered by AWS CDK EKS-Blueprints. Contains all example docker code for a KCSA Exam Practice App with multiple choice questions and includes manifests for deployment, service and ingress as well.

For more details on how to deploy the infrastructure and the solution details, please refer to the Blog Post:
* [Building the KCSA Exam Simulator on Amazon EKS Cluster running Kubernetes v1.32 (code: Penelope)](https://vivek-aws.medium.com/building-the-kcsa-exam-simulator-on-amazon-eks-cluster-running-kubernetes-v1-32-code-penelope-dfb29e1bec47).

![Alt text](./eks.png?raw=true "EKS Cluster Deployed using CDK EKS-Blueprints")

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
