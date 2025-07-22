#!/bin/bash
# Script to publish MLTrack to PyPI

set -e

echo "🚀 Preparing to publish MLTrack to PyPI..."

# Check if we're in the right directory
if [ ! -f "pyproject.toml" ]; then
    echo "❌ Error: pyproject.toml not found. Run this script from the project root."
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/ build/ *.egg-info/ src/*.egg-info/

# Check for required tools
echo "🔍 Checking for required tools..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 not found"
    exit 1
fi

if ! python3 -m pip show build &> /dev/null; then
    echo "📦 Installing build tool..."
    python3 -m pip install --upgrade build
fi

if ! python3 -m pip show twine &> /dev/null; then
    echo "📦 Installing twine..."
    python3 -m pip install --upgrade twine
fi

# Run tests first
echo "🧪 Running tests..."
if command -v pytest &> /dev/null; then
    pytest tests/ || { echo "❌ Tests failed. Fix them before publishing."; exit 1; }
else
    echo "⚠️  Warning: pytest not found. Skipping tests."
fi

# Build the package
echo "🏗️  Building package..."
python3 -m build

# Check the package
echo "✅ Checking package with twine..."
python3 -m twine check dist/*

# Show package contents
echo "📦 Package contents:"
ls -la dist/

# Ask for confirmation
echo ""
echo "⚠️  IMPORTANT: The package name 'mltrack' is already taken on PyPI!"
echo "You need to either:"
echo "1. Change the package name in pyproject.toml (suggested: mltrack-plus, mltrack-pro, mltrack-deploy)"
echo "2. Use TestPyPI first: python3 -m twine upload --repository testpypi dist/*"
echo ""
read -p "Do you want to upload to TestPyPI first? (recommended) [y/N] " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Uploading to TestPyPI..."
    python3 -m twine upload --repository testpypi dist/*
    echo ""
    echo "✅ Uploaded to TestPyPI!"
    echo "Test installation with: pip install -i https://test.pypi.org/simple/ mltrack"
else
    echo "❌ Upload cancelled. Please resolve the package name issue first."
    echo "Suggested new names:"
    echo "  - mltrack-plus"
    echo "  - mltrack-pro" 
    echo "  - mltrack-deploy"
    echo "  - mlflow-track"
    echo "  - ml-shipper"
fi