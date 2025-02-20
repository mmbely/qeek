import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path

def cleanup_repository(repo_name: str):
    """Clean up repository files in Firestore"""
    try:
        # Initialize Firebase
        root_dir = Path(__file__).resolve().parent.parent.parent.parent
        cred_path = root_dir / 'firebase-credentials.json'
        cred = credentials.Certificate(str(cred_path))
        firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        
        # Get repository reference
        repo_id = repo_name.replace('/', '_')
        repo_ref = db.collection('repositories').document(repo_id)
        
        # Delete all files in the files collection
        files_ref = repo_ref.collection('files')
        docs = files_ref.list_documents()
        for doc in docs:
            doc.delete()
            
        print(f"Cleaned up files for repository: {repo_name}")
        
    except Exception as e:
        print(f"Error cleaning up repository: {str(e)}")
    finally:
        if firebase_admin._apps:
            firebase_admin.delete_app(firebase_admin.get_app())

if __name__ == '__main__':
    cleanup_repository('mmbely/qeek')