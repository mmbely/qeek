import json
import firebase_admin
from firebase_admin import credentials
from services.github_service import GitHubService
from services.firestore_service import FirestoreService
from services.gemini_service import GeminiService
import os
from dotenv import load_dotenv
from pathlib import Path

async def process_contents(github_service, gemini_service, repo_full_name: str, contents: list):
    """Process repository contents recursively and generate AI summaries"""
    try:
        files = github_service.get_repository_files(repo_full_name)
        
        # Generate AI summaries for each file
        for file_info in files:
            if isinstance(file_info, dict) and 'path' in file_info:
                if file_info.get('type') != 'dir':
                    try:
                        content = github_service.get_file_content(repo_full_name, file_info['path'])
                        
                        # Generate enhanced analysis
                        analysis_result = await gemini_service.generate_file_summary(content, file_info['path'])
                        
                        # Add the analysis to file metadata
                        file_info['ai_analysis'] = analysis_result['analysis']
                        file_info['analysis_metadata'] = {
                            'generated_at': analysis_result['generated_at'],
                            'model_version': analysis_result['model_version']
                        }
                        
                        # Add searchable fields at root level for better query performance
                        if 'analysis' in analysis_result:
                            analysis = analysis_result['analysis']
                            file_info['summary'] = analysis.get('summary', '')
                            file_info['primary_features'] = analysis.get('searchMetadata', {}).get('primaryFeatures', [])
                            file_info['state_management'] = analysis.get('searchMetadata', {}).get('stateManagement', [])
                            file_info['modification_points'] = [
                                point
                                for func in analysis.get('functions', [])
                                for point in func.get('modificationPoints', [])
                            ]
                            
                    except Exception as e:
                        print(f"Error processing file {file_info['path']}: {str(e)}")
                        file_info['ai_analysis'] = {'error': str(e)}
                
                contents.append(file_info)
            else:
                print(f"Skipping invalid file info: {file_info}")
        
        return contents
    except Exception as e:
        print(f"Error processing contents: {str(e)}")
        raise

def process_repository(repo_full_name: str, user_id: str, account_id: str, config: dict):
    """Main repository processing logic"""
    try:
        print(f"Processing repository: {repo_full_name}")
        print(f"Environment: {config['environment']}")
        
        # Initialize services based on environment
        if config['environment'] == 'development':
            print("Using development environment")
            github_service = GitHubService.create_from_account_id(account_id)  # Use Firebase token even in dev
        else:
            print("Using production environment")
            github_service = GitHubService.create_from_account_id(account_id)
        
        firestore_service = init_firestore_dev(config) if config['environment'] == 'development' else init_firestore_prod(config)
        
        # Initialize Gemini service
        gemini_service = GeminiService(config['gemini_api_key'])
        
        # Get repository metadata
        repo_metadata = github_service.get_repository_metadata(repo_full_name)
        
        # Initialize repository document
        repo_ref = firestore_service.store_repository_metadata(
            repo_full_name.replace('/', '_'),
            repo_metadata
        )
        
        # Process repository contents with AI summaries
        contents = []
        await process_contents(github_service, gemini_service, repo_full_name, contents)
        
        # Store files metadata with AI summaries
        firestore_service.store_repository_files(repo_ref, contents)
        
        # Update final status
        firestore_service.update_sync_status(repo_ref, 'completed')
        
        return {
            'status': 'success',
            'repository': repo_metadata,
            'file_count': len(contents)
        }

    except Exception as e:
        error_msg = str(e)
        print(f"Error: {error_msg}")
        return {
            'status': 'error',
            'error': error_msg
        }

def init_firestore_dev(config):
    """Initialize Firestore for development"""
    if not firebase_admin._apps:
        cred = credentials.Certificate(config['firebase_credentials_path'])
        firebase_admin.initialize_app(cred, {
            'projectId': config['firebase_project_id']
        })
    return FirestoreService(config['firebase_project_id'])

def init_firestore_prod(config):
    """Initialize Firestore for production"""
    if not firebase_admin._apps:
        # In Cloud Functions, use default credentials
        firebase_admin.initialize_app()
    return FirestoreService(config['firebase_project_id'])

def get_github_token_from_firebase(account_id):
    """Get GitHub token from Firebase in production"""
    db = firebase_admin.firestore.client()
    account_doc = db.collection('accounts').document(account_id).get()
    if not account_doc.exists:
        raise Exception("Account document not found")
        
    account_data = account_doc.to_dict()
    github_token = account_data.get('settings', {}).get('githubToken')
    if not github_token:
        raise Exception("GitHub token not found in account settings")
    
    return github_token

def load_env():
    """Load environment variables from root .env file"""
    env_path = Path(__file__).parents[3] / '.env'  # Go up 3 levels to reach root
    load_dotenv(env_path)

def get_secret(secret_id: str) -> str:
    """Retrieve secret from environment variables"""
    load_env()
    return os.getenv(secret_id)

# This is what the Cloud Function will call
def cloud_function_handler(repo_full_name: str, user_id: str, account_id: str):
    config = {
        'environment': os.getenv('ENVIRONMENT', 'development'),
        'firebase_project_id': 'qap-ai',
        'gemini_api_key': get_secret('GEMINI_API_KEY')
    }
    return process_repository(repo_full_name, user_id, account_id, config)
