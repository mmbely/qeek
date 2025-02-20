#!/bin/bash

# Create main directory structure
mkdir -p repository-indexer/src/services
mkdir -p repository-indexer/tests
mkdir -p repository-indexer/lib

# Create source files
cat > repository-indexer/src/config.py << 'EOF'
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
EOF

cat > repository-indexer/src/cli.py << 'EOF'
import argparse
from main import process_repository
from config import load_config

def main():
    parser = argparse.ArgumentParser(description='Repository Indexer CLI')
    parser.add_argument('repo_name', help='Repository name (e.g., "owner/repo")')
    parser.add_argument('--env-file', help='Path to .env file', default='.env')
    parser.add_argument('--user-id', help='Test user ID', default='test_user')
    parser.add_argument('--account-id', help='Test account ID', default='test_account')
    
    args = parser.parse_args()
    
    # Load configuration
    config = load_config(args.env_file)
    
    # Process repository
    result = process_repository(
        repo_full_name=args.repo_name,
        user_id=args.user_id,
        account_id=args.account_id,
        config=config
    )
    
    print(result)

if __name__ == '__main__':
    main()
EOF

cat > repository-indexer/src/services/github_service.py << 'EOF'
from github import Github
from typing import List, Dict

class GitHubService:
    def __init__(self, token: str):
        self.github = Github(token)

    def get_repository_metadata(self, repo_full_name: str) -> Dict:
        """Get basic repository metadata"""
        try:
            repo = self.github.get_repo(repo_full_name)
            return {
                'name': repo.name,
                'full_name': repo.full_name,
                'description': repo.description,
                'default_branch': repo.default_branch,
                'language': repo.language,
                'created_at': repo.created_at.isoformat() if repo.created_at else None,
                'updated_at': repo.updated_at.isoformat() if repo.updated_at else None,
                'size': repo.size,
                'stars': repo.stargazers_count,
                'forks': repo.forks_count
            }
        except Exception as e:
            print(f"Error fetching repository metadata: {str(e)}")
            raise

    def get_file_content(self, repo_full_name: str, file_path: str) -> str:
        """Fetch content of a specific file - useful for AI analysis later"""
        try:
            repo = self.github.get_repo(repo_full_name)
            file_content = repo.get_contents(file_path)
            return file_content.decoded_content.decode('utf-8')
        except Exception as e:
            print(f"Error fetching file content: {str(e)}")
            raise
EOF

cat > repository-indexer/src/services/firestore_service.py << 'EOF'
from firebase_admin import credentials, firestore, initialize_app
from datetime import datetime
from typing import Dict, List

class FirestoreService:
    def __init__(self, project_id: str):
        if not project_id:
            raise ValueError("Project ID is required")
            
        self.db = firestore.client()

    def store_repository_metadata(self, repo_id: str, metadata: Dict):
        """Store repository metadata in Firestore"""
        repo_ref = self.db.collection('repositories').document(repo_id)
        repo_ref.set({
            'metadata': {
                **metadata,
                'last_synced': firestore.SERVER_TIMESTAMP,
                'sync_status': 'syncing'
            }
        }, merge=True)
        return repo_ref

    def store_repository_files(self, repo_ref, files: List[Dict]):
        """Store repository files metadata in Firestore"""
        batch = self.db.batch()
        files_stored = 0
        
        for file in files:
            # Sanitize path for document ID
            doc_id = file['path'].replace('/', '_').replace('.', '_')
            file_ref = repo_ref.collection('files').document(doc_id)
            
            batch.set(file_ref, {
                **file,
                'indexed_at': firestore.SERVER_TIMESTAMP
            })
            
            files_stored += 1
            
            # Commit every 500 files (Firestore batch limit)
            if files_stored % 500 == 0:
                batch.commit()
                batch = self.db.batch()
                print(f"Stored {files_stored} files")
        
        # Commit any remaining files
        if batch._writes:
            batch.commit()
            print(f"Stored total of {files_stored} files")

    def update_sync_status(self, repo_ref, status: str, error: str = None):
        """Update repository sync status"""
        update_data = {
            'metadata': {
                'sync_status': status,
                'last_synced': firestore.SERVER_TIMESTAMP
            }
        }
        
        if error:
            update_data['metadata']['error'] = error
            
        repo_ref.set(update_data, merge=True)
EOF

cat > repository-indexer/src/main.py << 'EOF'
import json
import firebase_admin
from firebase_admin import credentials
from services.github_service import GitHubService
from services.firestore_service import FirestoreService

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

# This is what the Cloud Function will call
def cloud_function_handler(repo_full_name: str, user_id: str, account_id: str):
    config = {
        'environment': 'production',
        'firebase_project_id': 'qap-ai'
    }
    return process_repository(repo_full_name, user_id, account_id, config)
EOF

# Create test files
cat > repository-indexer/tests/test_github_service.py << 'EOF'
import pytest
from src.services.github_service import GitHubService
from src.config import load_config

@pytest.fixture
def github_service():
    config = load_config('../.env.test')
    return GitHubService(config['github_token'])

def test_get_repository_metadata(github_service):
    metadata = github_service.get_repository_metadata('mmbely/qeek')
    assert metadata['name'] == 'qeek'
    assert 'description' in metadata
    assert 'language' in metadata
EOF

# Create environment files
cat > repository-indexer/.env.example << 'EOF'
GITHUB_TOKEN=your_github_token_here
FIREBASE_PROJECT_ID=qap-ai
FIREBASE_CREDENTIALS_PATH=../firebase-credentials.json
ENVIRONMENT=development
EOF

# Create requirements.txt
cat > repository-indexer/requirements.txt << 'EOF'
PyGithub==1.55
firebase-admin==6.1.0
python-dotenv==0.19.2
pytest==7.4.0
EOF

# Create .gitignore
cat > repository-indexer/.gitignore << 'EOF'
__pycache__/
*.pyc
.env
.env.test
.pytest_cache/
lib/
EOF

# Make the CLI script executable
chmod +x repository-indexer/src/cli.py

echo "Repository indexer structure created successfully!"
echo "Next steps:"
echo "1. Copy .env.example to .env.test and add your GitHub token"
echo "2. Install requirements: pip install -r repository-indexer/requirements.txt"
echo "3. Run tests: cd repository-indexer && pytest tests/"
echo "4. Try the CLI: python src/cli.py owner/repo --env-file .env.test"