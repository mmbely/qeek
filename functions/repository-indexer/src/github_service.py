from github import Github
from typing import List, Dict
from firebase_admin import firestore

class GitHubService:
    @staticmethod
    def create_from_account_id(account_id: str) -> 'GitHubService':
        """Factory method to create GitHubService using account's token from Firebase"""
        db = firestore.client()
        account_doc = db.collection('accounts').document(account_id).get()
        
        if not account_doc.exists:
            raise ValueError(f"Account {account_id} not found")
            
        account_data = account_doc.to_dict()
        github_token = account_data.get('settings', {}).get('githubToken')
        
        if not github_token:
            raise ValueError(f"GitHub token not found for account {account_id}")
            
        return GitHubService(github_token)

    @staticmethod
    def create_for_testing(token: str) -> 'GitHubService':
        """Create GitHubService instance for testing"""
        return GitHubService(token)

    def __init__(self, token: str):
        self.github = Github(token)

    def get_repository_files(self, repo_full_name: str) -> List[Dict]:
        """
        Fetch all files from a GitHub repository
        """
        try:
            repo = self.github.get_repo(repo_full_name)
            contents = []
            total_files = 0
            
            def process_contents(path=''):
                items = repo.get_contents(path)
                for item in items:
                    if item.type == 'dir':
                        process_contents(item.path)
                    else:
                        contents.append({
                            'name': item.name,
                            'path': item.path,
                            'size': item.size,
                            'last_updated': repo.get_commits(path=item.path)[0].commit.author.date,
                            'type': item.type,
                            'language': item.name.split('.')[-1] if '.' in item.name else None,
                            'sha': item.sha  # Add SHA for version tracking
                        })
            
            process_contents()
            return contents
            
        except Exception as e:
            print(f"Error fetching repository contents: {str(e)}")
            raise

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