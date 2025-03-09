#!/usr/bin/env python3
import sys
import os
import argparse
import asyncio
import logging
import json
from pathlib import Path
import firebase_admin
from firebase_admin import credentials
from dotenv import load_dotenv

# Add the backend-service directory to the Python path
backend_service_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_service_dir))

# Import from src
from src.utils.firebase_utils import find_firebase_credentials
from src.main import process_repository

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Repository sync script')
    parser.add_argument('repo', help='Repository name (owner/repo)')
    parser.add_argument('--account-id', required=True, help='Account ID for GitHub token')
    parser.add_argument('--user-id', help='User ID for logging')
    parser.add_argument('--max-files', type=int, help='Maximum number of files to process')
    parser.add_argument('--skip-types', help='Comma-separated list of file extensions to skip')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    return parser.parse_args()

async def main():
    """Main entry point"""
    logger.info("Starting repository sync script")
    args = parse_args()
    logger.debug(f"Arguments: {sys.argv}")
    
    # Set verbose logging if requested
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Load environment variables
    load_dotenv()
    
    # Check for environment variables
    print("Environment variables:")
    print(f"GITHUB_TOKEN exists: {bool(os.environ.get('GITHUB_TOKEN'))}")
    print(f"REACT_APP_GITHUB_TOKEN exists: {bool(os.environ.get('REACT_APP_GITHUB_TOKEN'))}")
    
    # Check for environment variables
    print("Environment variables:")
    print(f"GEMINI_API_KEY exists: {bool(os.environ.get('GEMINI_API_KEY'))}")
    
    # Check for Firebase credentials
    cred_path = find_firebase_credentials()
    if cred_path:
        print(f"Found Firebase credentials at: {cred_path}")
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = cred_path
    else:
        print("Firebase credentials file not found, using application default credentials")
    
    # Check for Firebase credentials in root directory
    root_dir = Path(__file__).resolve().parent.parent.parent.parent
    cred_path = root_dir / 'firebase-credentials.json'
    print(f"Looking for Firebase credentials at: {cred_path}")
    
    # Parse skip types
    skip_types = None
    if args.skip_types:
        skip_types = set(args.skip_types.split(','))
    
    # Configuration
    config = {
        'environment': 'development',
        'firebase_project_id': 'qap-ai',
        'gemini_api_key': os.environ.get('GEMINI_API_KEY')
    }
    
    # Process repository
    result = await process_repository(
        repo_full_name=args.repo,
        user_id=args.user_id or 'cli_user',
        account_id=args.account_id,
        config=config,
        max_files=args.max_files,
        skip_types=skip_types
    )
    
    print("\nProcessing completed!")
    print(f"Status: {result['status']}")
    if result['status'] == 'error':
        print(f"Error: {result['error']}")

if __name__ == '__main__':
    asyncio.run(main())
