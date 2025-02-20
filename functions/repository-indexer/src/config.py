import os
from dotenv import load_dotenv
from pathlib import Path

def load_config(env_path=None):
    """Load configuration from .env file or environment variables"""
    is_cloud_function = os.getenv('FUNCTION_TARGET') is not None
    root_dir = Path(__file__).resolve().parent.parent.parent.parent
    
    if is_cloud_function:
        # Running in Cloud Functions
        return {
            'firebase_project_id': 'qap-ai',
            'environment': 'production',
            'gemini_api_key': os.getenv('GEMINI_API_KEY')
        }
    else:
        # Local development
        if env_path:
            load_dotenv(env_path)
        else:
            root_env_path = root_dir / '.env'
            
            if root_env_path.exists():
                print(f"Loading config from root .env: {root_env_path}")
                load_dotenv(root_env_path)
            else:
                print(f"Warning: No .env file found at {root_env_path}")
                load_dotenv()

        firebase_creds_path = root_dir / 'firebase-credentials.json'
        
        # Print environment variables for debugging
        print("Environment variables:")
        print(f"GITHUB_TOKEN exists: {'GITHUB_TOKEN' in os.environ}")
        print(f"REACT_APP_GITHUB_TOKEN exists: {'REACT_APP_GITHUB_TOKEN' in os.environ}")
        
        return {
            'firebase_project_id': os.getenv('REACT_APP_FIREBASE_PROJECT_ID', 'qap-ai'),
            'firebase_credentials_path': str(firebase_creds_path),
            'environment': os.getenv('ENVIRONMENT', 'development'),
            'gemini_api_key': os.getenv('GEMINI_API_KEY')
        }
