from firebase_admin import credentials, firestore
from datetime import datetime
from typing import Dict, List
import logging

# Configure logging
logger = logging.getLogger(__name__)

class FirestoreService:
    def __init__(self, project_id: str):
        """Initialize Firestore service"""
        if not project_id:
            raise ValueError("Project ID is required")
        self.project_id = project_id
        
        # Initialize Firestore client
        import firebase_admin
        from firebase_admin import firestore
        
        if not firebase_admin._apps:
            # Use Application Default Credentials
            firebase_admin.initialize_app()
        
        self.db = firestore.client()
        logger.info(f"Initialized FirestoreService for project: {project_id}")

    def store_repository_metadata(self, repo_id: str, metadata: Dict) -> firestore.DocumentReference:
        """Store repository metadata in Firestore"""
        print(f"Storing metadata for repository: {repo_id}")
        repo_ref = self.db.collection('repositories').document(repo_id)
        
        # Get existing document
        doc = repo_ref.get()
        first_indexed_at = None
        if doc.exists:
            doc_data = doc.to_dict()
            first_indexed_at = doc_data.get('metadata', {}).get('first_indexed_at')
        
        update_data = {
            'metadata': {
                **metadata,
                'sync_status': 'in_progress',
                'last_synced': firestore.SERVER_TIMESTAMP,
                'first_indexed_at': first_indexed_at or firestore.SERVER_TIMESTAMP
            }
        }
        
        repo_ref.set(update_data, merge=True)
        return repo_ref

    def get_repository_files(self, repo_ref) -> List[Dict]:
        """Get existing repository files from Firestore"""
        try:
            files_collection = repo_ref.collection('files')
            files = files_collection.stream()
            return [doc.to_dict() for doc in files]
        except Exception as e:
            logger.error(f"Error fetching repository files from Firestore: {str(e)}")
            return []

    def store_repository_files(self, repo_ref: firestore.DocumentReference, files: List[Dict]):
        """Store repository files metadata in Firestore with metrics"""
        files_collection = repo_ref.collection('files')
        existing_files = {doc.id: doc.to_dict() for doc in files_collection.stream()}
        processed_paths = set()
        stats = {'new': 0, 'updated': 0, 'unchanged': 0, 'deleted': 0, 'restored': 0}
        
        batch = self.db.batch()
        count = 0
        
        # Process all files
        for file in files:
            path = file['path']
            doc_id = path.replace('/', '_')
            processed_paths.add(path)
            
            if file.get('status') == 'deleted':
                stats['deleted'] += 1
                batch.set(files_collection.document(doc_id), {
                    'status': 'deleted',
                    'path': path,
                    'deleted_at': firestore.SERVER_TIMESTAMP,
                    'metadata': {
                        **file.get('metadata', {}),
                        'last_seen': file.get('last_updated'),
                        'deletion_type': 'removed'
                    }
                }, merge=True)
            else:
                if doc_id in existing_files:
                    if existing_files[doc_id].get('status') == 'deleted':
                        stats['restored'] += 1
                    else:
                        stats['updated'] += 1
                else:
                    stats['new'] += 1
                
                batch.set(files_collection.document(doc_id), {
                    'status': 'active',
                    **file,
                    'updated_at': firestore.SERVER_TIMESTAMP
                }, merge=True)
            
            count += 1
            if count >= 500:
                batch.commit()
                batch = self.db.batch()
                count = 0
        
        # Handle implicitly deleted files
        for doc_id, existing in existing_files.items():
            if existing.get('path') not in processed_paths:
                stats['deleted'] += 1
                batch.set(files_collection.document(doc_id), {
                    'status': 'deleted',
                    'deleted_at': firestore.SERVER_TIMESTAMP,
                    'metadata': {
                        **existing.get('metadata', {}),
                        'last_seen': existing.get('last_updated'),
                        'deletion_type': 'removed'
                    }
                }, merge=True)
                
                count += 1
                if count >= 500:
                    batch.commit()
                    batch = self.db.batch()
                    count = 0
        
        # Commit remaining changes and update metadata
        if count > 0:
            batch.commit()
            
        repo_ref.set({
            'metadata': {
                'last_sync_stats': stats,
                'last_synced': firestore.SERVER_TIMESTAMP,
                'sync_status': 'completed',
                'file_counts': {
                    'active': len(processed_paths) - stats['deleted'],
                    'deleted': stats['deleted'],
                    'total': len(processed_paths)
                }
            }
        }, merge=True)

    def update_sync_status(self, repo_ref: firestore.DocumentReference, status: str, error: str = None, progress: dict = None):
        """Update repository sync status"""
        logger.info(f"Updating sync status to: {status}")
        update_data = {
            'metadata': {
                'sync_status': status,
                'last_synced': firestore.SERVER_TIMESTAMP
            }
        }
        
        if error:
            update_data['metadata']['error'] = error
            
        if progress:
            update_data['metadata']['progress'] = progress
            update_data['metadata']['progress_updated_at'] = firestore.SERVER_TIMESTAMP
            
        repo_ref.set(update_data, merge=True)