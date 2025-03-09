# QAP AI Backend Service

This repository contains the backend service for QAP AI, a code analysis and repository management tool. The service is built with Python and Flask, and is deployed to Google Cloud Run.

## Architecture Overview

The backend service provides:
- Repository indexing and analysis
- Integration with Google's Gemini AI for code understanding
- Firebase integration for data storage
- RESTful API endpoints for the frontend

## Local Development

### Prerequisites

- Python 3.12+
- Docker
- Google Cloud SDK
- Firebase CLI

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/mmbely/qeek.git
   cd qeek/backend-service
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Run the development server:

   ```bash
   python main.py
   ```

## Docker Containerization

### Building the Docker Image

   ```bash
    Build the image locally
    docker build -t qap-ai/backend-service .
    Test the image locally
    docker run -p 8080:8080 qap-ai/backend-service
   ```


### Dockerfile Explanation

The Dockerfile uses a multi-stage build process:

   ```dockerfile

Use Python 3.12 slim image
FROM python:3.12-slim
Set working directory
WORKDIR /app
Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
Copy application code
COPY . .
Set environment variables
ENV PORT=8080
ENV PYTHONUNBUFFERED=1
Expose port
EXPOSE 8080
Run the application
CMD ["python", "main.py"]
 ```

## Google Cloud Run Deployment

### Initial Deployment

1. Build and push the Docker image to Google Container Registry:
   ```bash
   gcloud builds submit --tag gcr.io/qap-ai/backend-service
   ```

2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy backend-service \
     --image gcr.io/qap-ai/backend-service \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 1Gi \
     --cpu 1 \
     --set-env-vars="FIREBASE_PROJECT_ID=qap-ai,ENVIRONMENT=production"
   ```

### Setting Up Secrets

1. Create secrets in Google Secret Manager:
   ```bash
   # For Gemini API key
   echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-

   # For Firebase credentials
   gcloud secrets create firebase-credentials --data-file=firebase-credentials.json
   ```

2. Grant the Cloud Run service account access to the secrets:
   ```bash
   # Get the service account
   SERVICE_ACCOUNT=$(gcloud run services describe backend-service --platform managed --region us-central1 --format="value(serviceAccountEmail)")

   # Grant access to Gemini API key
   gcloud secrets add-iam-policy-binding gemini-api-key \
     --member="serviceAccount:$SERVICE_ACCOUNT" \
     --role="roles/secretmanager.secretAccessor"

   # Grant access to Firebase credentials
   gcloud secrets add-iam-policy-binding firebase-credentials \
     --member="serviceAccount:$SERVICE_ACCOUNT" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. Update the deployment to use the secrets:
   ```bash
   gcloud run services update backend-service \
     --region=us-central1 \
     --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
     --set-secrets="/tmp/firebase-credentials.json=firebase-credentials:latest" \
     --update-env-vars="GOOGLE_APPLICATION_CREDENTIALS=/tmp/firebase-credentials.json"
   ```

### Updating the Deployment

To update the service after making changes:

1. Build and push the new image:
   ```bash
   gcloud builds submit --tag gcr.io/qap-ai/backend-service
   ```

2. Deploy the new version:
   ```bash
   gcloud run deploy backend-service \
     --image gcr.io/qap-ai/backend-service \
     --platform managed \
     --region us-central1
   ```

## API Endpoints

### Health Check
- **URL**: `/`
- **Method**: `GET`
- **Description**: Returns the service status and environment information

### Repository Sync
- **URL**: `/repositories/sync`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "repository_name": "username/repo",
    "account_id": "firebase-account-id"
  }
  ```
- **Description**: Initiates a repository sync process

## Monitoring and Troubleshooting

### Viewing Logs

 ```bash
View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=backend-service" --limit=20
Stream logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=backend-service" --limit=20 --format="default" --stream
 ```


### Common Issues and Solutions

1. **CORS Issues**: If the frontend can't connect to the backend due to CORS, ensure the Flask CORS middleware is properly configured:
   ```python
   from flask_cors import CORS
   app = Flask(__name__)
   CORS(app, origins=["http://localhost:3000", "https://qap-ai.web.app"])
   ```

2. **Secret Access**: If the service can't access secrets, verify the service account has the correct permissions.

3. **Container Startup Failures**: Check logs for startup errors and ensure the container is properly configured.

## CI/CD Pipeline (Future Implementation)

A GitHub Actions workflow can be set up to automate the deployment process:

 ```yaml
name: Deploy to Cloud Run
on:
push:
branches: [ main ]
paths:
'backend-service/'
jobs:
deploy:
runs-on: ubuntu-latest
steps:
uses: actions/checkout@v3
name: Set up Cloud SDK
uses: google-github-actions/setup-gcloud@v1
with:
project_id: qap-ai
service_account_key: ${{ secrets.GCP_SA_KEY }}
name: Build and Deploy

run: |
cd backend-service
gcloud builds submit --tag gcr.io/qap-ai/backend-service
gcloud run deploy backend-service \
--image gcr.io/qap-ai/backend-service \
--platform managed \
--region us-central1
 ```

## License

[Your license information here]







