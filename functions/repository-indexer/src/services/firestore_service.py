from firebase_admin import firestore
from datetime import datetime
from typing import Dict, List

class FirestoreService:
    def __init__(self, project_id: str):
        if not project_id:
            raise ValueError("Project ID is required")
        self.db = firestore.client()

    def store_repository_metadata(self, repo_id: str, metadata: Dict) -> firestore.DocumentReference:
        """Store repository metadata in Firestore"""
        print(f"Storing metadata for repository: {repo_id}")
        repo_ref = self.db.collection('repositories').document(repo_id)
        
        update_data = {
            'metadata': metadata,
            'sync_status': 'in_progress',
            'last_synced': firestore.SERVER_TIMESTAMP
        }
        
        repo_ref.set(update_data, merge=True)
        return repo_ref

    def store_repository_files(self, repo_ref: firestore.DocumentReference, files: List[Dict]):
        """Store repository files metadata in Firestore"""
        print(f"Storing {len(files)} files for repository")
        
        # Create a files subcollection
        files_collection = repo_ref.collection('files')
        
        # Use batched writes for better performance
        batch = self.db.batch()
        batch_size = 0
        max_batch_size = 500  # Firestore limit
        
        for file in files:
            file_ref = files_collection.document(file['path'].replace('/', '_'))
            batch.set(file_ref, {
                'metadata': file,
                'updated_at': firestore.SERVER_TIMESTAMP
            })
            batch_size += 1
            
            if batch_size >= max_batch_size:
                batch.commit()
                batch = self.db.batch()
                batch_size = 0
        
        if batch_size > 0:
            batch.commit()

    def update_sync_status(self, repo_ref: firestore.DocumentReference, status: str, error: str = None):
        """Update repository sync status"""
        print(f"Updating sync status to: {status}")
        update_data = {
            'metadata': {
                'sync_status': status,
                'last_synced': firestore.SERVER_TIMESTAMP
            }
        }
        
        if error:
            update_data['metadata']['error'] = error
            
        repo_ref.set(update_data, merge=True)
