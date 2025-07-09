"""Git integration utilities for mltrack."""

import os
import subprocess
from pathlib import Path
from typing import Dict, Optional, Any
import logging
from git import Repo, InvalidGitRepositoryError

logger = logging.getLogger(__name__)


def get_git_info(path: Optional[Path] = None) -> Dict[str, Any]:
    """Get comprehensive git information for the current repository."""
    info = {
        "commit": None,
        "branch": None,
        "remote": None,
        "is_dirty": False,
        "uncommitted_changes": None,
        "author": None,
        "commit_time": None,
        "commit_message": None,
    }
    
    try:
        repo = Repo(path or os.getcwd(), search_parent_directories=True)
        
        # Basic info
        if not repo.bare:
            info["commit"] = repo.head.commit.hexsha
            info["commit_time"] = repo.head.commit.committed_datetime.isoformat()
            info["commit_message"] = repo.head.commit.message.strip()
            info["author"] = f"{repo.head.commit.author.name} <{repo.head.commit.author.email}>"
            
            # Branch info
            try:
                info["branch"] = repo.active_branch.name
            except TypeError:
                # Detached HEAD state
                info["branch"] = f"detached@{info['commit'][:7]}"
            
            # Remote info
            if repo.remotes:
                origin = repo.remotes.origin if "origin" in [r.name for r in repo.remotes] else repo.remotes[0]
                info["remote"] = origin.url
            
            # Check for uncommitted changes
            info["is_dirty"] = repo.is_dirty(untracked_files=True)
            if info["is_dirty"]:
                # Get diff of uncommitted changes
                diff_info = []
                
                # Staged changes
                if repo.index.diff("HEAD"):
                    diff_info.append(f"Staged files: {len(repo.index.diff('HEAD'))}")
                
                # Unstaged changes
                if repo.index.diff(None):
                    diff_info.append(f"Modified files: {len(repo.index.diff(None))}")
                
                # Untracked files
                untracked = repo.untracked_files
                if untracked:
                    diff_info.append(f"Untracked files: {len(untracked)}")
                
                info["uncommitted_changes"] = ", ".join(diff_info)
                
                # Get actual diff (limited to prevent huge outputs)
                try:
                    diff_text = repo.git.diff("HEAD")
                    if len(diff_text) > 10000:
                        diff_text = diff_text[:10000] + "\n... (truncated)"
                    info["diff"] = diff_text
                except Exception:
                    pass
        
    except InvalidGitRepositoryError:
        logger.debug("Not in a git repository")
    except Exception as e:
        logger.warning(f"Error getting git info: {e}")
    
    return info


def get_git_tags() -> Dict[str, str]:
    """Get git information as MLflow tags."""
    git_info = get_git_info()
    tags = {}
    
    if git_info["commit"]:
        tags["git.commit"] = git_info["commit"]
        tags["git.branch"] = git_info["branch"]
        
        if git_info["remote"]:
            tags["git.remote"] = git_info["remote"]
        
        if git_info["is_dirty"]:
            tags["git.dirty"] = "true"
            if git_info["uncommitted_changes"]:
                tags["git.uncommitted_changes"] = git_info["uncommitted_changes"]
        
        if git_info["author"]:
            tags["git.author"] = git_info["author"]
    
    return tags


def create_git_commit_url(remote: str, commit: str) -> Optional[str]:
    """Create a URL to view the commit on popular git hosting services."""
    if not remote or not commit:
        return None
    
    # Clean up remote URL
    if remote.endswith(".git"):
        remote = remote[:-4]
    
    # Handle different remote formats
    if "github.com" in remote:
        if remote.startswith("git@"):
            remote = remote.replace(":", "/").replace("git@", "https://")
        return f"{remote}/commit/{commit}"
    
    elif "gitlab.com" in remote:
        if remote.startswith("git@"):
            remote = remote.replace(":", "/").replace("git@", "https://")
        return f"{remote}/-/commit/{commit}"
    
    elif "bitbucket.org" in remote:
        if remote.startswith("git@"):
            remote = remote.replace(":", "/").replace("git@", "https://")
        return f"{remote}/commits/{commit}"
    
    return None