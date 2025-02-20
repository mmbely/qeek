import pytest
from src.services.github_service import GitHubService
from src.config import load_config

@pytest.fixture
def github_service():
    config = load_config('../.env.test')
    return GitHubService(config['github_token'])

def test_get_repository_metadata(github_service):
    metadata = github_service.get_repository_metadata('mmbely/qeek')
    assert metadata['name'] == 'qeek'
    assert 'description' in metadata
    assert 'language' in metadata
