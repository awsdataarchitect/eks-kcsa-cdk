FROM --platform=linux/amd64 python:3.9-slim

WORKDIR /app

# Install Flask
RUN pip install --no-cache-dir flask==2.3.3 flask-cors==4.0.0


# Copy only the necessary files
COPY app.py questions.json ./
COPY static ./static
COPY templates ./templates

# List directories for debugging
RUN find . -type f

EXPOSE 5001

CMD ["python", "app.py"]