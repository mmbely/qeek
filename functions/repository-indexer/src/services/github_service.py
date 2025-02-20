from github import Github
from typing import List, Dict
from firebase_admin import firestore
from datetime import datetime
import re
from pathlib import Path

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

    def extract_code_metadata(self, content: str, file_extension: str) -> Dict:
        """Extract code metadata like imports, functions, classes etc."""
        metadata = {
            'imports': [],
            'functions': [],
            'classes': [],
            'exports': []
        }
        
        # TypeScript/JavaScript patterns
        if file_extension in ['.ts', '.tsx', '.js', '.jsx']:
            # Find imports
            import_pattern = r'import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+[\'"]([^\'"]+)[\'"]'
            metadata['imports'] = re.findall(import_pattern, content)
            
            # Find functions
            function_pattern = r'(?:export\s+)?(?:async\s+)?function\s+(\w+)'
            metadata['functions'].extend(re.findall(function_pattern, content))
            
            # Find arrow functions
            arrow_pattern = r'const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>'
            metadata['functions'].extend(re.findall(arrow_pattern, content))
            
            # Find classes
            class_pattern = r'(?:export\s+)?class\s+(\w+)'
            metadata['classes'] = re.findall(class_pattern, content)
            
            # Find exports
            export_pattern = r'export\s+(?:const|let|var|function|class)\s+(\w+)'
            metadata['exports'] = re.findall(export_pattern, content)

        # Python patterns
        elif file_extension == '.py':
            # Find imports
            import_pattern = r'(?:from\s+(\w+(?:\.\w+)*)\s+import|import\s+(\w+(?:\.\w+)*))'
            imports = re.findall(import_pattern, content)
            metadata['imports'] = [imp[0] or imp[1] for imp in imports]
            
            # Find functions
            function_pattern = r'def\s+(\w+)\s*\('
            metadata['functions'] = re.findall(function_pattern, content)
            
            # Find classes
            class_pattern = r'class\s+(\w+)'
            metadata['classes'] = re.findall(class_pattern, content)

        return metadata

    def get_repository_files(self, repo_full_name: str) -> List[Dict]:
        """Fetch all files from a GitHub repository with code metadata"""
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
                        
                        # Get file extension
                        file_extension = Path(item.path).suffix.lower()
                        
                        # Get code metadata if it's a supported file type
                        code_metadata = {}
                        if file_extension in ['.ts', '.tsx', '.js', '.jsx', '.py']:
                            try:
                                content = repo.get_contents(item.path).decoded_content.decode('utf-8')
                                code_metadata = self.extract_code_metadata(content, file_extension)
                            except Exception as e:
                                print(f"Error extracting code metadata for {item.path}: {str(e)}")
                        
                        # Store searchable fields at root level for better query performance
                        file_data = {
                            'name': item.name,
                            'path': item.path,
                            'language': file_extension.lstrip('.') if file_extension else None,
                            'size': item.size,
                            'last_updated': last_commit.author.date.isoformat() if last_commit else None,
                            'last_commit_message': last_commit.message if last_commit else None,
                            
                            # Searchable metadata at root level
                            'imports': code_metadata.get('imports', []),
                            'functions': code_metadata.get('functions', []),
                            'classes': code_metadata.get('classes', []),
                            'exports': code_metadata.get('exports', []),
                            
                            # Additional metadata that doesn't need to be searched
                            'metadata': {
                                'sha': item.sha,
                                'type': item.type,
                                'content_type': 'code' if file_extension in ['.ts', '.tsx', '.js', '.jsx', '.py'] else 'other'
                            }
                        }
                        
                        contents.append(file_data)
            
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
