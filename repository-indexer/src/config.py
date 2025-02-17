import os
from dotenv import load_dotenv

def load_config(env_path=None):
    """Load configuration from .env file"""
    if env_path:
        load_dotenv(env_path)
    else:
        load_dotenv()

    return {
        'github_token': os.getenv('GITHUB_TOKEN'),
        'firebase_project_id': os.getenv('FIREBASE_PROJECT_ID', 'qap-ai'),
        'firebase_credentials_path': os.getenv('FIREBASE_CREDENTIALS_PATH', '../firebase-credentials.json'),
        'environment': os.getenv('ENVIRONMENT', 'development')
    }