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