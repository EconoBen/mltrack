"""User identification system for MLtrack.

Uses API keys for CLI access and OAuth for web access.
"""

import os
import secrets
import csv
from typing import Dict, Optional, List
from dataclasses import dataclass, asdict, field
import json
from pathlib import Path
from datetime import datetime
import hashlib


@dataclass
class User:
    """User information."""
    id: str
    email: str
    name: str
    api_key: Optional[str] = None
    github_username: Optional[str] = None
    team: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    def to_dict(self) -> Dict[str, str]:
        """Convert to dictionary."""
        return {k: v for k, v in asdict(self).items() if v is not None}


class UserRegistry:
    """Simple local user registry using CSV storage."""
    
    def __init__(self, storage_path: Optional[Path] = None):
        """Initialize with storage path."""
        self.storage_path = storage_path or Path.home() / ".mltrack" / "users.csv"
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_file_exists()
        self._cache: Dict[str, User] = {}
        self._load_users()
    
    def _ensure_file_exists(self):
        """Create CSV file with headers if it doesn't exist."""
        if not self.storage_path.exists():
            with open(self.storage_path, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=[
                    'id', 'email', 'name', 'api_key', 'github_username', 'team', 'created_at'
                ])
                writer.writeheader()
    
    def _load_users(self):
        """Load users from CSV into cache."""
        self._cache.clear()
        with open(self.storage_path, 'r', newline='') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Convert empty strings to None
                user_data = {k: v if v else None for k, v in row.items()}
                user = User(**user_data)
                self._cache[user.id] = user
                if user.api_key:
                    self._cache[user.api_key] = user
                if user.email:
                    self._cache[user.email] = user
    
    def _save_users(self):
        """Save all users to CSV."""
        users = []
        seen_ids = set()
        for key, user in self._cache.items():
            if user.id not in seen_ids:
                users.append(user)
                seen_ids.add(user.id)
        
        with open(self.storage_path, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'id', 'email', 'name', 'api_key', 'github_username', 'team', 'created_at'
            ])
            writer.writeheader()
            for user in users:
                writer.writerow(user.to_dict())
    
    def generate_api_key(self) -> str:
        """Generate a secure API key."""
        return f"mltrack_{secrets.token_urlsafe(32)}"
    
    def generate_user_id(self, email: str) -> str:
        """Generate a deterministic user ID from email."""
        return hashlib.sha256(email.encode()).hexdigest()[:12]
    
    def create_user(
        self,
        email: str,
        name: str,
        github_username: Optional[str] = None,
        team: Optional[str] = None,
        generate_api_key: bool = True
    ) -> User:
        """Create a new user."""
        user_id = self.generate_user_id(email)
        
        # Check if user already exists
        if user_id in self._cache:
            return self._cache[user_id]
        
        api_key = self.generate_api_key() if generate_api_key else None
        
        user = User(
            id=user_id,
            email=email,
            name=name,
            api_key=api_key,
            github_username=github_username,
            team=team
        )
        
        # Add to cache with multiple keys for lookup
        self._cache[user.id] = user
        if api_key:
            self._cache[api_key] = user
        self._cache[email] = user
        
        # Save to disk
        self._save_users()
        
        return user
    
    def get_user(self, identifier: str) -> Optional[User]:
        """Get user by ID, email, or API key."""
        return self._cache.get(identifier)
    
    def list_users(self) -> List[User]:
        """List all users."""
        seen_ids = set()
        users = []
        for user in self._cache.values():
            if user.id not in seen_ids:
                users.append(user)
                seen_ids.add(user.id)
        return users
    
    def update_user(self, user_id: str, **kwargs) -> Optional[User]:
        """Update user information."""
        user = self.get_user(user_id)
        if not user:
            return None
        
        # Update fields
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        # Reload cache and save
        self._load_users()
        self._save_users()
        
        return user
    
    def delete_user(self, user_id: str) -> bool:
        """Delete a user."""
        user = self.get_user(user_id)
        if not user:
            return False
        
        # Remove from cache
        keys_to_remove = []
        for key, cached_user in self._cache.items():
            if cached_user.id == user.id:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self._cache[key]
        
        # Save to disk
        self._save_users()
        return True


# Global registry instance
_registry = UserRegistry()


def get_current_user() -> Optional[User]:
    """Get current user based on environment or API key."""
    # Check for API key in environment
    api_key = os.environ.get('MLTRACK_API_KEY')
    if api_key:
        return _registry.get_user(api_key)
    
    # Check for user email in environment (for local development)
    email = os.environ.get('MLTRACK_USER_EMAIL')
    if email:
        return _registry.get_user(email)
    
    # Fall back to system user
    import getpass
    username = getpass.getuser()
    
    # Try to get git email
    try:
        import subprocess
        result = subprocess.run(
            ["git", "config", "user.email"],
            capture_output=True,
            text=True,
            check=False
        )
        if result.returncode == 0:
            email = result.stdout.strip()
            user = _registry.get_user(email)
            if user:
                return user
            
            # Try to get git name
            name_result = subprocess.run(
                ["git", "config", "user.name"],
                capture_output=True,
                text=True,
                check=False
            )
            name = name_result.stdout.strip() if name_result.returncode == 0 else username
            
            # Auto-create user for local development
            return _registry.create_user(
                email=email,
                name=name,
                generate_api_key=False  # No API key for auto-created users
            )
    except Exception:
        pass
    
    # Return anonymous user
    return User(
        id="anonymous",
        email=f"{username}@local",
        name=username
    )


def get_user_tags() -> Dict[str, str]:
    """Get user tags for MLflow tracking."""
    user = get_current_user()
    if not user:
        return {}
    
    tags = {
        "mltrack.user.id": user.id,
        "mltrack.user.email": user.email,
        "mltrack.user.name": user.name,
    }
    
    # Add optional fields
    if user.team:
        tags["mltrack.user.team"] = user.team
    
    if user.github_username:
        tags["mltrack.user.github"] = user.github_username
    
    # Backward compatibility
    tags["user"] = user.email
    if user.team:
        tags["team"] = user.team
    
    return tags


def setup_api_key(email: str, name: str, team: Optional[str] = None) -> str:
    """Setup API key for a user (CLI command)."""
    user = _registry.create_user(
        email=email,
        name=name,
        team=team,
        generate_api_key=True
    )
    return user.api_key