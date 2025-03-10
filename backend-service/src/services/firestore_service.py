from firebase_admin import credentials, firestore
from datetime import datetime
from typing import Dict, List

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
        """
        Get existing repository files from Firestore
        """
        try:
            files_collection = repo_ref.collection('files')
            files = files_collection.stream()
            return [doc.to_dict() for doc in files]
        except Exception as e:
            print(f"Error fetching repository files from Firestore: {str(e)}")
            return []

    def store_repository_files(self, repo_ref: firestore.DocumentReference, files: List[Dict]):
        """Store repository files metadata in Firestore with metrics"""
        print(f"Processing {len(files)} files for repository")
        
        files_collection = repo_ref.collection('files')
        metrics_collection = repo_ref.collection('metrics')
        
        # Initialize batch
        batch = self.db.batch()
        batch_size = 0
        max_batch_size = 500
        
        # Initialize stats
        stats = {
            'new': 0,
            'updated': 0,
            'unchanged': 0,
            'deleted': 0,
            'restored': 0
        }

        # Get existing files for comparison
        existing_files = {}
        for doc in files_collection.stream():
            existing_files[doc.id] = doc.to_dict()

        # Track which files still exist
        processed_files = set()
        
        for file in files:
            # Create document ID from path
            doc_id = file['path'].replace('/', '_')
            processed_files.add(doc_id)
            
            file_ref = files_collection.document(doc_id)
            
            # Check if file exists and has changed
            if doc_id in existing_files:
                existing_file = existing_files[doc_id]
                
                # Check if file was previously deleted
                if existing_file.get('status') == 'deleted':
                    stats['restored'] += 1
                else:
                    # Compare relevant fields to detect changes
                    has_changed = (
                        file.get('metadata', {}).get('sha') != existing_file.get('metadata', {}).get('sha') or
                        file.get('size') != existing_file.get('size') or
                        file.get('last_updated') != existing_file.get('last_updated')
                    )
                    
                    if not has_changed:
                        stats['unchanged'] += 1
                        continue
                    
                    stats['updated'] += 1
            else:
                stats['new'] += 1
            
            # Store data optimized for querying
            batch.set(file_ref, {
                'name': file['name'],
                'path': file['path'],
                'language': file['language'],
                'size': file['size'],
                'last_updated': file['last_updated'],
                'last_commit_message': file.get('last_commit_message', ''),
                
                # Original code metadata
                'imports': file.get('imports', []),
                'functions': file.get('functions', []),
                'classes': file.get('classes', []),
                'exports': file.get('exports', []),
                
                # New AI analysis fields
                'summary': file.get('summary', ''),
                'primary_features': file.get('primary_features', []),
                'state_management': file.get('state_management', []),
                'modification_points': file.get('modification_points', []),
                
                # Detailed analysis in a subcollection
                'ai_analysis': file.get('ai_analysis', {}),
                'analysis_metadata': file.get('analysis_metadata', {}),
                
                # Important: Store metadata including SHA
                'metadata': {
                    'sha': file.get('metadata', {}).get('sha'),
                    'type': file.get('metadata', {}).get('type'),
                    'content_type': file.get('metadata', {}).get('content_type')
                },
                
                'status': file.get('status', 'active'),
                'updated_at': firestore.SERVER_TIMESTAMP,
                'first_indexed_at': existing_files.get(doc_id, {}).get('first_indexed_at') or firestore.SERVER_TIMESTAMP
            })
            
            batch_size += 1
            if batch_size >= max_batch_size:
                batch.commit()
                batch = self.db.batch()
                batch_size = 0

        # Handle deleted files
        for doc_id in existing_files:
            if doc_id not in processed_files:
                stats['deleted'] += 1
                files_collection.document(doc_id).set({
                    'status': 'deleted',
                    'deleted_at': firestore.SERVER_TIMESTAMP
                }, merge=True)

        # Commit any remaining changes
        if batch_size > 0:
            batch.commit()
            
        # Store sync metrics
        metrics_ref = metrics_collection.document()
        metrics_ref.set({
            'timestamp': firestore.SERVER_TIMESTAMP,
            'stats': stats,
            'totals': {
                'active_files': len(processed_files),
                'deleted_files': stats['deleted'],
                'total_files': len(processed_files) + stats['deleted']
            }
        })
        
        # Update repository metadata
        repo_ref.set({
            'metadata': {
                'last_sync_stats': stats,
                'last_synced': firestore.SERVER_TIMESTAMP,
                'sync_status': 'completed',
                'file_counts': {
                    'active': len(processed_files),
                    'deleted': stats['deleted'],
                    'total': len(processed_files) + stats['deleted']
                }
            }
        }, merge=True)
        
        print(f"Sync completed: {stats['new']} new, {stats['updated']} updated, "
              f"{stats['unchanged']} unchanged, {stats['deleted']} deleted, "
              f"{stats['restored']} restored")

    def update_sync_status(self, repo_ref: firestore.DocumentReference, status: str, error: str = None, progress: dict = None):
        """
        Update repository sync status
        
        Args:
            repo_ref: Reference to repository document
            status: Current status ('in_progress', 'completed', 'error')
            error: Optional error message
            progress: Optional dict with progress info {'processed': int, 'total': int}
        """
        print(f"Updating sync status to: {status}")
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