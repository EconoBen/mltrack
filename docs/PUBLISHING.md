# Publishing MLTrack to PyPI

This guide covers how to publish MLTrack to the Python Package Index (PyPI).

## 📋 Pre-Publishing Checklist

- [ ] All tests pass (`make test`)
- [ ] Code is linted (`make lint`)
- [ ] Version number updated in `pyproject.toml`
- [ ] CHANGELOG.md updated with new version
- [ ] Documentation is up to date
- [ ] Package name decided (since "mltrack" is taken)

## 🔧 Setup

### 1. Install Publishing Tools

```bash
pip install --upgrade build twine
```

### 2. Create PyPI Account

1. Register at [pypi.org](https://pypi.org/account/register/)
2. Enable 2FA (recommended)
3. Create an API token:
   - Go to Account Settings → API tokens
   - Create a token for "Entire account" or specific project
   - Save the token securely

### 3. Configure Authentication

Create `~/.pypirc`:

```ini
[pypi]
username = __token__
password = pypi-YOUR-TOKEN-HERE

[testpypi]
username = __token__
password = pypi-YOUR-TEST-TOKEN-HERE
```

## 📦 Building the Package

### 1. Clean Previous Builds

```bash
rm -rf dist/ build/ *.egg-info/
```

### 2. Build the Package

```bash
python -m build
```

This creates:
- `dist/mltrack_deploy-0.1.0-py3-none-any.whl` (wheel)
- `dist/mltrack_deploy-0.1.0.tar.gz` (source)

### 3. Verify the Package

```bash
# Check package metadata
twine check dist/*

# Test installation locally
pip install dist/mltrack_deploy-0.1.0-py3-none-any.whl

# Verify it works
ml --version
```

## 🧪 Test on TestPyPI First

### 1. Upload to TestPyPI

```bash
python -m twine upload --repository testpypi dist/*
```

### 2. Test Installation

```bash
# Create a test environment
python -m venv test-env
source test-env/bin/activate

# Install from TestPyPI
pip install -i https://test.pypi.org/simple/ mltrack-deploy

# Test it works
ml --help
```

## 🚀 Publish to PyPI

### 1. Upload to PyPI

```bash
python -m twine upload dist/*
```

### 2. Verify on PyPI

- Check the package page: https://pypi.org/project/mltrack-deploy/
- Test installation: `pip install mltrack-deploy`

## 🔄 Updating the Package

### 1. Update Version

Edit `pyproject.toml`:
```toml
version = "0.2.0"  # Increment version
```

### 2. Update CHANGELOG

Add new version section to `CHANGELOG.md`

### 3. Tag the Release

```bash
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin v0.2.0
```

### 4. Build and Upload

```bash
# Clean, build, and upload
rm -rf dist/ build/
python -m build
python -m twine upload dist/*
```

## 🛠️ Automation with GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to PyPI

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install build twine
    - name: Build package
      run: python -m build
    - name: Publish to PyPI
      env:
        TWINE_USERNAME: __token__
        TWINE_PASSWORD: ${{ secrets.PYPI_API_TOKEN }}
      run: twine upload dist/*
```

## 🐛 Troubleshooting

### "Package name already taken"
- Choose a different name in `pyproject.toml`
- Suggested: `mltrack-deploy`, `mlflow-ship`

### "Invalid token"
- Regenerate token on PyPI
- Ensure token starts with `pypi-`
- Check ~/.pypirc formatting

### "Version already exists"
- Increment version in `pyproject.toml`
- Delete old builds: `rm -rf dist/`

## 📚 Resources

- [PyPI Publishing Guide](https://packaging.python.org/tutorials/packaging-projects/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)