"""Tests for git utilities."""

import tempfile
from pathlib import Path
from unittest.mock import Mock, patch
import pytest
import git

from mltrack.git_utils import get_git_info, get_git_tags, create_git_commit_url


@pytest.fixture
def temp_git_repo():
    """Create a temporary git repository."""
    with tempfile.TemporaryDirectory() as tmpdir:
        repo_path = Path(tmpdir)
        repo = git.Repo.init(repo_path)
        
        # Create initial commit
        test_file = repo_path / "test.txt"
        test_file.write_text("Initial content")
        repo.index.add([str(test_file)])
        repo.index.commit("Initial commit")
        
        yield repo_path, repo


class TestGetGitInfo:
    """Test get_git_info function."""
    
    def test_get_git_info_in_repo(self, temp_git_repo):
        """Test get_git_info in a git repository."""
        repo_path, repo = temp_git_repo
        info = get_git_info(repo_path)
        
        assert info["is_repo"] is True
        assert info["commit"] == repo.head.commit.hexsha
        assert info["branch"] in ["main", "master"]
        assert info["is_dirty"] is False
        assert info["remote_url"] is None  # No remote configured
        assert info["modified_files"] == []
        assert info["untracked_files"] == []
        assert info["author_name"] is not None
        assert info["author_email"] is not None
        assert info["commit_message"] == "Initial commit"
        assert info["commit_time"] is not None
    
    def test_get_git_info_with_changes(self, temp_git_repo):
        """Test get_git_info with uncommitted changes."""
        repo_path, repo = temp_git_repo
        
        # Modify existing file
        test_file = repo_path / "test.txt"
        test_file.write_text("Modified content")
        
        # Add untracked file
        untracked = repo_path / "untracked.txt"
        untracked.write_text("New file")
        
        info = get_git_info(repo_path)
        
        assert info["is_dirty"] is True
        assert "test.txt" in info["modified_files"]
        assert "untracked.txt" in info["untracked_files"]
    
    def test_get_git_info_with_remote(self, temp_git_repo):
        """Test get_git_info with remote configured."""
        repo_path, repo = temp_git_repo
        
        # Add remote
        repo.create_remote("origin", "https://github.com/user/repo.git")
        
        info = get_git_info(repo_path)
        
        assert info["remote_url"] == "https://github.com/user/repo.git"
        assert info["remote_name"] == "origin"
    
    def test_get_git_info_not_in_repo(self):
        """Test get_git_info outside a git repository."""
        with tempfile.TemporaryDirectory() as tmpdir:
            info = get_git_info(Path(tmpdir))
            
            assert info["is_repo"] is False
            assert info["commit"] is None
            assert info["branch"] is None
            assert info["error"] is None
    
    def test_get_git_info_default_path(self, monkeypatch):
        """Test get_git_info with default path (current directory)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Change to temp directory
            monkeypatch.chdir(tmpdir)
            
            # Initialize repo in current directory
            repo = git.Repo.init(".")
            test_file = Path("test.txt")
            test_file.write_text("Test")
            repo.index.add(["test.txt"])
            repo.index.commit("Test commit")
            
            # Call without path argument
            info = get_git_info()
            
            assert info["is_repo"] is True
            assert info["commit"] is not None
    
    def test_get_git_info_detached_head(self, temp_git_repo):
        """Test get_git_info with detached HEAD."""
        repo_path, repo = temp_git_repo
        
        # Create another commit
        test_file = repo_path / "test2.txt"
        test_file.write_text("Second file")
        repo.index.add([str(test_file)])
        second_commit = repo.index.commit("Second commit")
        
        # Checkout first commit (detached HEAD)
        repo.head.reference = repo.head.commit.parents[0]
        
        info = get_git_info(repo_path)
        
        assert info["is_repo"] is True
        assert info["branch"] is None  # Detached HEAD
        assert info["commit"] != second_commit.hexsha


class TestGetGitTags:
    """Test get_git_tags function."""
    
    @patch('mltrack.git_utils.get_git_info')
    def test_get_git_tags_in_repo(self, mock_get_info):
        """Test get_git_tags when in a git repository."""
        mock_get_info.return_value = {
            "is_repo": True,
            "commit": "abc123def456",
            "branch": "main",
            "is_dirty": False,
            "remote_url": "https://github.com/user/repo.git",
            "author_name": "Test User",
            "author_email": "test@example.com"
        }
        
        tags = get_git_tags()
        
        assert tags["git.commit"] == "abc123de"  # First 8 chars
        assert tags["git.branch"] == "main"
        assert tags["git.dirty"] == "false"
        assert tags["git.remote"] == "https://github.com/user/repo.git"
        assert tags["git.author"] == "Test User"
    
    @patch('mltrack.git_utils.get_git_info')
    def test_get_git_tags_dirty_repo(self, mock_get_info):
        """Test get_git_tags with uncommitted changes."""
        mock_get_info.return_value = {
            "is_repo": True,
            "commit": "abc123def456",
            "branch": "feature/test",
            "is_dirty": True,
            "remote_url": None
        }
        
        tags = get_git_tags()
        
        assert tags["git.dirty"] == "true"
        assert "git.remote" not in tags  # No remote
    
    @patch('mltrack.git_utils.get_git_info')
    def test_get_git_tags_not_in_repo(self, mock_get_info):
        """Test get_git_tags outside a git repository."""
        mock_get_info.return_value = {
            "is_repo": False,
            "commit": None,
            "branch": None
        }
        
        tags = get_git_tags()
        
        assert tags == {}


class TestCreateGitCommitUrl:
    """Test create_git_commit_url function."""
    
    def test_create_git_commit_url_github_https(self):
        """Test creating GitHub commit URL from HTTPS remote."""
        url = create_git_commit_url(
            "https://github.com/user/repo.git",
            "abc123def456"
        )
        assert url == "https://github.com/user/repo/commit/abc123def456"
    
    def test_create_git_commit_url_github_ssh(self):
        """Test creating GitHub commit URL from SSH remote."""
        url = create_git_commit_url(
            "git@github.com:user/repo.git",
            "abc123def456"
        )
        assert url == "https://github.com/user/repo/commit/abc123def456"
    
    def test_create_git_commit_url_gitlab_https(self):
        """Test creating GitLab commit URL from HTTPS remote."""
        url = create_git_commit_url(
            "https://gitlab.com/user/repo.git",
            "abc123def456"
        )
        assert url == "https://gitlab.com/user/repo/-/commit/abc123def456"
    
    def test_create_git_commit_url_gitlab_ssh(self):
        """Test creating GitLab commit URL from SSH remote."""
        url = create_git_commit_url(
            "git@gitlab.com:user/repo.git",
            "abc123def456"
        )
        assert url == "https://gitlab.com/user/repo/-/commit/abc123def456"
    
    def test_create_git_commit_url_bitbucket_https(self):
        """Test creating Bitbucket commit URL from HTTPS remote."""
        url = create_git_commit_url(
            "https://bitbucket.org/user/repo.git",
            "abc123def456"
        )
        assert url == "https://bitbucket.org/user/repo/commits/abc123def456"
    
    def test_create_git_commit_url_bitbucket_ssh(self):
        """Test creating Bitbucket commit URL from SSH remote."""
        url = create_git_commit_url(
            "git@bitbucket.org:user/repo.git",
            "abc123def456"
        )
        assert url == "https://bitbucket.org/user/repo/commits/abc123def456"
    
    def test_create_git_commit_url_custom_domain(self):
        """Test creating commit URL from custom domain."""
        url = create_git_commit_url(
            "https://git.company.com/user/repo.git",
            "abc123def456"
        )
        # Should return None for unknown domains
        assert url is None
    
    def test_create_git_commit_url_invalid_format(self):
        """Test create_git_commit_url with invalid remote format."""
        url = create_git_commit_url(
            "not-a-valid-url",
            "abc123def456"
        )
        assert url is None
    
    def test_create_git_commit_url_short_commit(self):
        """Test create_git_commit_url with short commit hash."""
        url = create_git_commit_url(
            "https://github.com/user/repo.git",
            "abc123"
        )
        # Should still work with short hash
        assert url == "https://github.com/user/repo/commit/abc123"