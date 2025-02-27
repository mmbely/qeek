import json
import asyncio
from typing import List, Dict
from pathlib import Path
from datetime import datetime
import time
from tqdm import tqdm  # For progress bars
import firebase_admin
from firebase_admin import credentials
from services.github_service import GitHubService
from services.firestore_service import FirestoreService
from services.gemini_service import GeminiService
import os
from dotenv import load_dotenv

async def process_file(github_service, gemini_service, repo_full_name: str, file_info: Dict) -> Dict:
    """Process a single file with rate limiting and retries"""
    max_retries = 3
    retry_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            # Skip files we don't want to analyze
            if not should_analyze_file(file_info['path']):
                return file_info
                
            # Get file content
            content = github_service.get_file_content(repo_full_name, file_info['path'])
            
            # Generate AI analysis
            analysis_result = await gemini_service.generate_file_summary(content, file_info['path'])
            
            if 'error' in analysis_result:
                raise Exception(analysis_result['error'])
                
            # Add analysis to file metadata
            file_info['ai_analysis'] = analysis_result['analysis']
            file_info['analysis_metadata'] = {
                'generated_at': analysis_result['generated_at'],
                'model_version': analysis_result['model_version']
            }
            
            # Add searchable fields at root level
            if 'analysis' in analysis_result:
                analysis = analysis_result['analysis']
                file_info.update({
                    'summary': analysis.get('summary', ''),
                    'primary_features': analysis.get('searchMetadata', {}).get('primaryFeatures', []),
                    'data_types': analysis.get('searchMetadata', {}).get('dataTypes', []),
                    'state_management': analysis.get('searchMetadata', {}).get('stateManagement', []),
                    'dependencies': analysis.get('searchMetadata', {}).get('dependencies', {}),
                    'functions': analysis.get('functions', []),
                    'classes': analysis.get('classes', []),
                    'integration_points': analysis.get('integrationPoints', [])
                })
            
            return file_info
            
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Error processing {file_info['path']} (attempt {attempt + 1}): {str(e)}")
                time.sleep(retry_delay)
            else:
                print(f"Failed to process {file_info['path']} after {max_retries} attempts: {str(e)}")
                file_info['ai_analysis'] = {'error': str(e)}
                return file_info

def should_analyze_file(file_path: str) -> bool:
    """Determine if a file should be analyzed"""
    # Skip directories we don't want to analyze
    skip_dirs = {
        '.git', 'node_modules', 'venv', '__pycache__', 
        'dist', 'build', '.next', 'coverage'
    }
    if any(skip_dir in file_path for skip_dir in skip_dirs):
        return False
        
    # File extensions we want to analyze
    valid_extensions = {
        '.py', '.js', '.jsx', '.ts', '.tsx', 
        '.java', '.cpp', '.hpp', '.c', '.h',
        '.go', '.rs', '.php', '.rb'
    }
    
    return Path(file_path).suffix.lower() in valid_extensions

async def process_repository(
    repo_full_name: str, 
    user_id: str, 
    account_id: str, 
    config: dict,
    max_files: int = None,
    skip_types: set = None
):
    """
    Process repository files and generate AI analysis
    
    Args:
        repo_full_name: Full repository name (owner/repo)
        user_id: User ID for logging
        account_id: Account ID for GitHub token
        config: Configuration dictionary
        max_files: Optional maximum number of files to process
        skip_types: Optional set of file extensions to skip
    """
    try:
        print(f"Processing repository: {repo_full_name}")
        
        # Initialize services
        github_service = GitHubService.create_from_account_id(account_id)
        firestore_service = FirestoreService(config['firebase_project_id'])
        gemini_service = GeminiService(config['gemini_api_key'])
        
        # Get repository metadata including last_synced timestamp
        repo_id = repo_full_name.replace('/', '_')
        repo_ref = firestore_service.db.collection('repositories').document(repo_id)
        repo_doc = repo_ref.get()
        
        last_synced = None
        if repo_doc.exists:
            last_synced = repo_doc.to_dict().get('metadata', {}).get('last_synced')
            print(f"Last sync timestamp: {last_synced}")
        
        # Convert last_synced to datetime if it's a string
        if last_synced and isinstance(last_synced, str):
            try:
                # Try parsing ISO format first
                last_synced = datetime.fromisoformat(last_synced)
            except ValueError:
                # Fallback to other formats if needed
                try:
                    last_synced = datetime.strptime(last_synced, '%Y-%m-%d %H:%M:%S.%f%z')
                except ValueError:
                    last_synced = datetime.strptime(last_synced, '%Y-%m-%d %H:%M:%S%z')
        
        # Get repository metadata and store it
        repo_metadata = github_service.get_repository_metadata(repo_full_name)
        repo_ref = firestore_service.store_repository_metadata(repo_id, repo_metadata)
        
        # Get existing files from Firestore
        existing_files = firestore_service.get_repository_files(repo_ref)
        existing_files_map = {f['path']: f for f in existing_files}
        
        # Get current files from GitHub
        print("Fetching repository files...")
        current_files = github_service.get_repository_files(repo_full_name)
        
        # Limit files if max_files is specified
        if max_files is not None:
            print(f"Limiting to {max_files} files for testing")
            current_files = current_files[:max_files]
        
        # Determine which files need processing
        files_to_process = []
        for file in current_files:
            # Skip files with extensions in skip_types
            file_extension = file['path'].split('.')[-1].lower()
            if skip_types and file_extension in skip_types:
                continue
                
            existing_file = existing_files_map.get(file['path'])
            should_process = False
            
            if existing_file is None:
                # New file
                print(f"New file found: {file['path']}")
                should_process = True
            else:
                # Check SHA if available
                existing_sha = existing_file.get('metadata', {}).get('sha')
                current_sha = file.get('metadata', {}).get('sha')
                
                if existing_sha and current_sha:
                    # We have SHAs to compare
                    if existing_sha != current_sha:
                        print(f"SHA changed for file: {file['path']}")
                        should_process = True
                else:
                    # No SHA, process to be safe
                    print(f"No SHA available, processing: {file['path']}")
                    should_process = True
            
            if should_process:
                files_to_process.append(file)
        
        total_files = len(files_to_process)
        print(f"Found {total_files} files that need processing out of {len(current_files)} total files")
        
        # Update initial progress
        firestore_service.update_sync_status(
            repo_ref, 
            'in_progress',
            progress={'processed': 0, 'total': total_files}
        )
        
        # Process only changed files
        processed_files = []
        with tqdm(total=total_files, desc="Analyzing files") as pbar:
            for i, file in enumerate(files_to_process):
                processed_file = await process_file(
                    github_service, 
                    gemini_service, 
                    repo_full_name, 
                    file
                )
                processed_files.append(processed_file)
                pbar.update(1)
                
                # Update progress in Firestore every 10 files or at the end
                if (i + 1) % 10 == 0 or (i + 1) == total_files:
                    try:
                        firestore_service.update_sync_status(
                            repo_ref, 
                            'in_progress',
                            progress={
                                'processed': len(processed_files),
                                'total': total_files
                            }
                        )
                    except Exception as e:
                        print(f"Warning: Failed to update progress: {str(e)}")
        
        # Store only the processed files
        print("\nStoring results in Firestore...")
        firestore_service.store_repository_files(repo_ref, processed_files)
        firestore_service.update_sync_status(repo_ref, 'completed')
        
        print(f"\nCompleted processing {total_files} files")
        return {
            'status': 'success',
            'repository': repo_metadata,
            'file_count': total_files,
            'changed_files': total_files
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"\nError: {error_msg}")
        if 'repo_ref' in locals():
            firestore_service.update_sync_status(repo_ref, 'error', error=error_msg)
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

if __name__ == '__main__':
    import dotenv
    from pathlib import Path
    
    # Load environment variables
    root_dir = Path(__file__).resolve().parent.parent.parent.parent
    env_path = root_dir / '.env'
    dotenv.load_dotenv(env_path)
    
    # Configuration
    config = {
        'environment': 'development',
        'firebase_project_id': 'qap-ai',
        'gemini_api_key': os.getenv('GEMINI_API_KEY')
    }
    
    # Run the processor
    repo_name = 'mmbely/qeek'  # Replace with your repo
    asyncio.run(process_repository(
        repo_full_name=repo_name,
        user_id='test_user',
        account_id='your_account_id',  # Replace with your account ID
        config=config
    ))
