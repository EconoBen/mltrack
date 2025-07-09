# mltrack Distribution Guide

This guide explains the various ways to install and distribute mltrack.

## 🚀 Quick Install (Recommended)

### Using UV (Fastest & Isolated)
```bash
# Install as a global tool
uvx --from git+https://github.com/EconoBen/mltrack mltrack

# Or from PyPI (when published)
uvx mltrack
```

### Using the Install Script
```bash
curl -sSL https://raw.githubusercontent.com/EconoBen/mltrack/main/install.sh | bash
```

## 📦 Installation Methods

### 1. UV Tool Install (Recommended)
Best for: End users who want an isolated, always-updated tool

```bash
# From PyPI
uv tool install mltrack

# From GitHub
uv tool install git+https://github.com/EconoBen/mltrack

# From local directory
uv tool install /path/to/mltrack
```

**Pros:**
- Isolated from project dependencies
- Always uses latest compatible Python
- Fast installation and updates
- No virtual environment needed

### 2. UV Project Dependency
Best for: Projects that need mltrack as a dependency

```bash
# Add to current project
uv add mltrack

# Or add to pyproject.toml
[project.dependencies]
mltrack = ">=0.1.0"
```

### 3. Homebrew (macOS/Linux)
Best for: Users who prefer system package managers

```bash
# Add the tap
brew tap EconoBen/mltrack

# Install mltrack
brew install mltrack
```

### 4. pip Install
Best for: Traditional Python environments

```bash
# From PyPI
pip install mltrack

# From GitHub
pip install git+https://github.com/EconoBen/mltrack

# Development install
git clone https://github.com/EconoBen/mltrack
cd mltrack
pip install -e .
```

## 🐳 Docker

```dockerfile
FROM python:3.11-slim
RUN pip install mltrack
# Or use UV in Docker
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    /root/.local/bin/uv tool install mltrack
```

## 🔧 Development Setup

```bash
# Clone the repository
git clone https://github.com/EconoBen/mltrack
cd mltrack

# Create UV environment
uv venv
uv sync

# Run in development
uv run mltrack --help
```

## 📋 Platform-Specific Notes

### macOS
- Homebrew formula available
- UV works perfectly via curl installer
- No special requirements

### Linux
- UV installer works on all major distributions
- May need to add `~/.local/bin` to PATH
- Homebrew on Linux also supported

### Windows
- UV has native Windows support
- Use PowerShell for UV installation:
  ```powershell
  irm https://astral.sh/uv/install.ps1 | iex
  ```
- Then: `uv tool install mltrack`

## 🚀 CI/CD Integration

### GitHub Actions
```yaml
- uses: astral-sh/setup-uv@v2
- run: uv tool install mltrack
- run: mltrack run python train.py
```

### GitLab CI
```yaml
before_script:
  - curl -LsSf https://astral.sh/uv/install.sh | sh
  - source $HOME/.local/bin/env
  - uv tool install mltrack
```

## 📦 Publishing

### PyPI
```bash
# Build with UV
uv build

# Upload to PyPI
uv publish
```

### Homebrew
1. Update formula with new version and SHA256
2. Create pull request to homebrew-core or maintain own tap

## 🔍 Verification

After installation, verify with:
```bash
# Check version
mltrack --version

# Run doctor
mltrack doctor

# Run demo
mltrack demo
```

## 🆘 Troubleshooting

### UV not found
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Command not found after UV tool install
Add UV's tool directory to PATH:
```bash
export PATH="$HOME/.local/share/uv/tools/bin:$PATH"
```

### Permission denied
```bash
chmod +x ~/.local/share/uv/tools/mltrack/bin/mltrack
```