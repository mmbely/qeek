from firebase_admin import credentials, firestore, initialize_app
from datetime import datetime
from typing import Dict, List

class FirestoreService:
    def __init__(self, project_id: str):
        cred = credentials.ApplicationDefault()
        initialize_app(cred, {
            'projectId': project_id,
        })
        self.db = firestore.client()

    def store_repository_metadata(self, repo_id: str, metadata: Dict):
        """
        Store repository metadata in Firestore
        """
        repo_ref = self.db.collection('repositories').document(repo_id)
        repo_ref.set({
            'metadata': {
                **metadata,
                'last_synced': datetime.now(),
                'sync_status': 'syncing',
                'files_processed': 0,
                'total_files': 0,
                'error': None
            }
        }, merge=True)

    def store_repository_files(self, repo_id: str, files: List[Dict]):
        """
        Store repository files metadata in Firestore
        """
        repo_ref = self.db.collection('repositories').document(repo_id)
        batch = self.db.batch()
        files_processed = 0
        
        # Update total file count
        repo_ref.set({
            'metadata': {
                'total_files': len(files)
            }
        }, merge=True)
        
        for file in files:
            file_ref = repo_ref.collection('files').document(file['path'])
            batch.set(file_ref, {
                **file,
                'indexed_at': datetime.now()
            })
            
            files_processed += 1
            
            # Update progress every 100 files
            if files_processed % 100 == 0:
                repo_ref.set({
                    'metadata': {
                        'files_processed': files_processed
                    }
                }, merge=True)
            
            # Commit every 500 files (Firestore batch limit)
            if len(batch._writes) >= 500:
                batch.commit()
                batch = self.db.batch()
        
        # Commit any remaining files
        if len(batch._writes) > 0:
            batch.commit()
        
        # Update final file count
        repo_ref.set({
            'metadata': {
                'files_processed': files_processed
            }
        }, merge=True)

    def update_sync_status(self, repo_id: str, status: str, error: str = None):
        """
        Update repository sync status
        """
        repo_ref = self.db.collection('repositories').document(repo_id)
        repo_ref.set({
            'metadata': {
                'sync_status': status,
                'last_synced': datetime.now(),
                'error': error
            }
        }, merge=True)