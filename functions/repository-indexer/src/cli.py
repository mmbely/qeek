import argparse
import asyncio
import firebase_admin
from firebase_admin import credentials
from pathlib import Path
from main import process_repository
from config import load_config
from services.github_service import GitHubService

async def main():
    parser = argparse.ArgumentParser(description='Repository Indexer CLI')
    parser.add_argument('repo_name', help='Repository name (e.g., "owner/repo")')
    parser.add_argument('--env-file', help='Path to .env file', default='.env')
    parser.add_argument('--account-id', help='Account ID to use', required=True)
    parser.add_argument('--test-mode', action='store_true', help='Use test mode with local token')
    parser.add_argument('--skip-types', help='File types to skip (comma-separated)', default='')
    parser.add_argument('--max-files', type=int, help='Maximum number of files to process', default=None)
    
    args = parser.parse_args()
    
    # Load configuration
    config = load_config(args.env_file)
    
    # Initialize Firebase
    if not firebase_admin._apps:
        root_dir = Path(__file__).resolve().parent.parent.parent.parent
        cred_path = root_dir / 'firebase-credentials.json'
        print(f"Initializing Firebase with credentials from: {cred_path}")
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred, {
            'projectId': config['firebase_project_id']
        })
    
    # Process repository with max files limit
    result = await process_repository(
        repo_full_name=args.repo_name,
        user_id='test_user',  # Only used for logging
        account_id=args.account_id,
        config=config,
        max_files=args.max_files
    )
    
    print("\nProcessing completed!")
    print(f"Status: {result['status']}")
    if result['status'] == 'success':
        print(f"Files processed: {result['file_count']}")
    else:
        print(f"Error: {result['error']}")

if __name__ == '__main__':
    # Run the async main function
    asyncio.run(main())
