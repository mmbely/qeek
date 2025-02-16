import sys
import json
import os
from github import Github
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import signal
from dotenv import load_dotenv

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

def main(repo_full_name: str, user_id: str, account_id: str):
    global repo_ref
    try:
        # Load environment variables from repository-indexer/.env
        script_dir = os.path.dirname(os.path.abspath(__file__))
        repo_indexer_dir = os.path.dirname(script_dir)  # Go up one level to repository-indexer
        env_path = os.path.join(repo_indexer_dir, '.env')
        print(f"Looking for .env at: {env_path}")
        load_dotenv(env_path)
        
        # Initialize Firebase
        if not firebase_admin._apps:
            print("Initializing Firebase...")
            cred_path = os.path.join(os.path.dirname(repo_indexer_dir), 'firebase-credentials.json')
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {
                'projectId': 'qap-ai'
            })
        
        db = firestore.client()
        
        # Get GitHub token from Firebase account document
        print(f"Fetching GitHub token from Firebase for account: {account_id}...")
        account_doc = db.collection('accounts').document(account_id).get()
        if not account_doc.exists:
            raise Exception("Account document not found")
            
        account_data = account_doc.to_dict()
        github_token = account_data.get('settings', {}).get('githubToken')
        if not github_token:
            raise Exception("GitHub token not found in account settings")

        print(f"Found GitHub token: {github_token[:4]}...{github_token[-4:]}")

        repo_ref = db.collection('repositories').document(repo_full_name.replace('/', '_'))
        
        # Reset the sync status
        repo_ref.set({
            'metadata': {
                'sync_status': 'idle',
                'last_synced': firestore.SERVER_TIMESTAMP,
                'error': None,
                'files_processed': 0
            }
        }, merge=True)
        
        # Initialize GitHub with user's token
        g = Github(github_token)
        print(f"Authenticated with GitHub. Rate limit remaining: {g.get_rate_limit().core.remaining}")
        repo = g.get_repo(repo_full_name)
        
        # Get repository contents
        contents = []
        def process_contents(path=''):
            try:
                print(f"Processing path: {path}")
                sys.stdout.flush()  # Force output to show immediately
                items = repo.get_contents(path)
                for item in items:
                    if item.type == 'dir':
                        print(f"Found directory: {item.path}")
                        sys.stdout.flush()
                        process_contents(item.path)
                    elif item.type == 'file':
                        # Only process certain file types
                        if item.name.endswith(('.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.c', '.h', '.cs')):
                            try:
                                print(f"Processing file: {item.path}")
                                sys.stdout.flush()
                                file_content = item.decoded_content.decode('utf-8')
                                contents.append({
                                    'name': item.name,
                                    'path': item.path,
                                    'type': item.type,
                                    'content': file_content,
                                    'size': item.size
                                })
                                
                                # Update progress
                                if len(contents) % 5 == 0:  # Update more frequently
                                    print(f"Processed {len(contents)} files")
                                    sys.stdout.flush()
                                    repo_ref.set({
                                        'metadata': {
                                            'files_processed': len(contents),
                                            'sync_status': 'syncing'
                                        }
                                    }, merge=True)
                            except Exception as e:
                                print(f"Error processing file {item.path}: {str(e)}")
                                sys.stdout.flush()
            except Exception as e:
                print(f"Error processing path {path}: {str(e)}")
                sys.stdout.flush()

        # Process repository contents
        print("Starting to process repository contents...")
        process_contents()
        print(f"Finished processing. Total files: {len(contents)}")

        # Store files in batches
        print("Starting to store files in Firestore...")
        batch_size = 500
        for i in range(0, len(contents), batch_size):
            batch = db.batch()
            chunk = contents[i:i + batch_size]
            
            for file in chunk:
                # Sanitize the path for use as document ID
                doc_id = sanitize_path(file['path'])
                file_ref = repo_ref.collection('files').document(doc_id)
                batch.set(file_ref, {
                    **file,
                    'indexed_at': firestore.SERVER_TIMESTAMP
                })
            
            batch.commit()
            print(f"Stored batch of files {i} to {i + len(chunk)}")

        # Update final status
        print("Updating final status...")
        repo_ref.set({
            'metadata': {
                'sync_status': 'completed',
                'file_count': len(contents),
                'last_synced': firestore.SERVER_TIMESTAMP
            }
        }, merge=True)

        result = {
            'status': 'success',
            'repository': {
                'name': repo.name,
                'full_name': repo.full_name,
                'description': repo.description,
                'default_branch': repo.default_branch,
                'file_count': len(contents)
            }
        }
        
        print(json.dumps(result))
        return 0

    except Exception as e:
        error_result = {
            'status': 'error',
            'error': str(e)
        }
        
        # Update error status in Firebase
        if 'repo_ref' in locals():
            repo_ref.set({
                'metadata': {
                    'sync_status': 'failed',
                    'error': str(e),
                    'last_synced': firestore.SERVER_TIMESTAMP
                }
            }, merge=True)
        
        print(json.dumps(error_result))
        return 1

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python main.py <repository_name> <user_id> <account_id>")
        sys.exit(1)
    
    sys.exit(main(sys.argv[1], sys.argv[2], sys.argv[3]))