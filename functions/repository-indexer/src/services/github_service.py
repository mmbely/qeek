from github import Github
from typing import List, Dict
from firebase_admin import firestore
from datetime import datetime

class GitHubService:
    @staticmethod
    def create_from_account_id(account_id: str) -> 'GitHubService':
        """Factory method to create GitHubService using account's token from Firebase"""
        print(f"Getting GitHub token for account: {account_id}")
        db = firestore.client()
        
        # Look in secure_tokens collection
        token_doc = db.collection('secure_tokens').document(account_id).get()
        
        if not token_doc.exists:
            raise ValueError(f"Token document not found for account {account_id}")
            
        token_data = token_doc.to_dict()
        github_token = token_data.get('githubToken')
        
        if not github_token:
            raise ValueError(f"GitHub token not found in secure_tokens for account {account_id}")
            
        print("Successfully retrieved GitHub token")
        return GitHubService(github_token)

    def __init__(self, token: str):
        if not token:
            raise ValueError("GitHub token is required")
        print("Initializing GitHub client with token")
        self.github = Github(token)
        
        # Verify authentication
        try:
            user = self.github.get_user()
            print(f"Authenticated as GitHub user: {user.login}")
        except Exception as e:
            print(f"Failed to authenticate with GitHub: {str(e)}")
            raise

    def get_repository_files(self, repo_full_name: str) -> List[Dict]:
        """Fetch all files from a GitHub repository"""
        try:
            repo = self.github.get_repo(repo_full_name)
            contents = []
            
            def process_contents(path=''):
                items = repo.get_contents(path)
                for item in items:
                    if item.type == 'dir':
                        process_contents(item.path)
                    else:
                        # Get the last commit for this file
                        commits = repo.get_commits(path=item.path)
                        last_commit = commits[0].commit if commits else None
                        
                        contents.append({
                            'name': item.name,
                            'path': item.path,
                            'size': item.size,
                            'type': item.type,
                            'language': item.name.split('.')[-1] if '.' in item.name else None,
                            'sha': item.sha,
                            'last_updated': last_commit.author.date.isoformat() if last_commit else None,
                            'last_commit_message': last_commit.message if last_commit else None
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

    def get_file_content(self, repo_full_name: str, file_path: str) -> str:
        """Fetch content of a specific file - useful for AI analysis later"""
        try:
            repo = self.github.get_repo(repo_full_name)
            file_content = repo.get_contents(file_path)
            return file_content.decoded_content.decode('utf-8')
        except Exception as e:
            print(f"Error fetching file content: {str(e)}")
            raise
