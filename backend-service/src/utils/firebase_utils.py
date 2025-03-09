import os
import logging

logger = logging.getLogger(__name__)

def find_firebase_credentials():
    """Find Firebase credentials file"""
    # Check common locations
    possible_paths = [
        # Backend service root (current working directory)
        os.path.join(os.getcwd(), 'firebase-credentials.json'),
        # Absolute path
        '/home/michael/Documents/GitHub/qeek/backend-service/firebase-credentials.json',
        # Environment variable
        os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    ]
    
    for path in possible_paths:
        if path and os.path.exists(path):
            logger.info(f"Found Firebase credentials at: {path}")
            return path
    
    logger.warning("Firebase credentials file not found, using application default credentials")
    return None
