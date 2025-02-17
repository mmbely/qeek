from github import Github
from typing import List, Dict

class GitHubService:
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