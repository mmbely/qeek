import sys
import json
import os
from github import Github
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import signal
from dotenv import load_dotenv
from repository_indexer.services.github_service import GitHubService
from repository_indexer.services.firestore_service import FirestoreService

def signal_handler(signum, frame):
    print("Received interrupt signal")
    if 'repo_ref' in globals():
        repo_ref.set({
            'metadata': {
                'sync_status': 'failed',
                'error': 'Sync interrupted',
                'last_synced': firestore.SERVER_TIMESTAMP
            }
        }, merge=True)
    sys.exit(1)

# Set up signal handler
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def sanitize_path(path: str) -> str:
    """Convert file path to valid Firestore document ID"""
    # Replace invalid characters and normalize path
    return path.replace('/', '_').replace('.', '_')

def process_repository(repo_full_name: str, user_id: str, account_id: str, config: dict):
    """Main repository processing logic"""
    try:
        # Initialize services based on environment
        if config['environment'] == 'development':
            github_service = GitHubService(config['github_token'])
            firestore_service = init_firestore_dev(config)
        else:
            github_service = GitHubService(get_github_token_from_firebase(account_id))
            firestore_service = init_firestore_prod(config)
        
        # Get repository metadata
        repo_metadata = github_service.get_repository_metadata(repo_full_name)
        
        # Initialize repository document
        repo_ref = firestore_service.store_repository_metadata(
            repo_full_name.replace('/', '_'),
            repo_metadata
        )
        
        # Process repository contents
        contents = []
        process_contents(github_service, repo_full_name, contents)
        
        # Store files metadata
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

def process_contents(github_service, repo_full_name, contents):
    # Process repository contents
    print("Starting to process repository contents...")
    process_contents_recursive(github_service, repo_full_name, contents)
    print(f"Finished processing. Total files: {len(contents)}")

def process_contents_recursive(github_service, path, contents):
    try:
        print(f"Processing path: {path}")
        sys.stdout.flush()
        items = github_service.get_repository_contents(path)
        for item in items:
            if item['type'] == 'dir':
                print(f"Found directory: {item['path']}")
                sys.stdout.flush()
                process_contents_recursive(github_service, item['path'], contents)
            elif item['type'] == 'file':
                # Only process certain file types
                if item['name'].endswith(('.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.c', '.h', '.cs')):
                    try:
                        print(f"Processing file: {item['path']}")
                        sys.stdout.flush()
                        
                        # Get basic file info without content
                        file_metadata = {
                            'name': item['name'],
                            'path': item['path'],
                            'type': item['type'],
                            'size': item['size'],
                            'last_commit': item['last_commit'],
                            'last_updated': item['last_updated'],
                            'language': item['name'].split('.')[-1] if '.' in item['name'] else None,
                            # Add basic code structure info
                            'structure': extract_code_structure(item)
                        }
                        
                        contents.append(file_metadata)
                        
                        # Update progress
                        if len(contents) % 5 == 0:
                            print(f"Processed {len(contents)} files")
                            sys.stdout.flush()
                    except Exception as e:
                        print(f"Error processing file {item['path']}: {str(e)}")
                        sys.stdout.flush()
    except Exception as e:
        print(f"Error processing path {path}: {str(e)}")
        sys.stdout.flush()

def extract_code_structure(file_item):
    """Extract basic code structure without storing full content"""
    try:
        content = file_item['content']
        extension = file_item['name'].split('.')[-1] if '.' in file_item['name'] else ''
        
        structure = {
            'imports': [],
            'functions': [],
            'classes': [],
            'loc': len(content.splitlines())
        }
        
        # Basic parsing based on file type
        if extension in ['py']:
            # Python files
            import ast
            try:
                tree = ast.parse(content)
                structure['imports'] = [
                    node.names[0].name 
                    for node in ast.walk(tree) 
                    if isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom)
                ][:10]  # Limit to first 10 imports
                structure['functions'] = [
                    node.name 
                    for node in ast.walk(tree) 
                    if isinstance(node, ast.FunctionDef)
                ][:10]  # Limit to first 10 functions
                structure['classes'] = [
                    node.name 
                    for node in ast.walk(tree) 
                    if isinstance(node, ast.ClassDef)
                ][:5]  # Limit to first 5 classes
            except:
                pass
            
        elif extension in ['js', 'jsx', 'ts', 'tsx']:
            # JavaScript/TypeScript files (basic regex approach)
            import re
            imports = re.findall(r'import\s+.*?[\'"];', content)
            functions = re.findall(r'function\s+(\w+)\s*\(', content)
            classes = re.findall(r'class\s+(\w+)', content)
            
            structure['imports'] = imports[:10]  # Limit to first 10 imports
            structure['functions'] = functions[:10]  # Limit to first 10 functions
            structure['classes'] = classes[:5]  # Limit to first 5 classes
            
        return structure
    except Exception as e:
        print(f"Error extracting code structure: {str(e)}")
        return {
            'imports': [],
            'functions': [],
            'classes': [],
            'loc': 0,
            'error': str(e)
        }

# This is what the Cloud Function will call
def cloud_function_handler(repo_full_name: str, user_id: str, account_id: str):
    config = {
        'environment': 'production',
        'firebase_project_id': 'qap-ai'
    }
    return process_repository(repo_full_name, user_id, account_id, config)

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python main.py <repository_name> <user_id> <account_id>")
        sys.exit(1)
    
    sys.exit(cloud_function_handler(sys.argv[1], sys.argv[2], sys.argv[3]))