#!/bin/bash
# Script to publish MLTrack to PyPI using uv

set -e

echo "🚀 Preparing to publish MLTrack to PyPI..."

# Check if we're in the right directory
if [ ! -f "pyproject.toml" ]; then
    echo "❌ Error: pyproject.toml not found. Run this script from the project root."
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/ build/ *.egg-info/ src/*.egg-info/ .venv-build/

# Check for uv
echo "🔍 Checking for uv..."
if ! command -v uv &> /dev/null; then
    echo "❌ Error: uv not found. Install it with:"
    echo "   curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Create build environment
echo "🐍 Creating build environment..."
uv venv .venv-build
source .venv-build/bin/activate

# Install build tools
echo "📦 Installing build tools..."
uv pip install build twine pytest

# Run tests first
echo "🧪 Running tests..."
if [ -d "tests" ]; then
    pytest tests/ || { echo "❌ Tests failed. Fix them before publishing."; exit 1; }
else
    echo "⚠️  Warning: tests directory not found. Skipping tests."
fi

# Build the package
echo "🏗️  Building package..."
python -m build

# Check the package
echo "✅ Checking package with twine..."
twine check dist/*

# Show package contents
echo "📦 Package contents:"
ls -la dist/

# Ask for confirmation
echo ""
echo "⚠️  Package name: ml-track"
echo ""
read -p "Do you want to upload to TestPyPI first? (recommended) [y/N] " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Uploading to TestPyPI..."
    twine upload --repository testpypi dist/*
    echo ""
    echo "✅ Uploaded to TestPyPI!"
    echo "Test installation with: uv add --index https://test.pypi.org/simple/ ml-track"
else
    read -p "Upload to PyPI? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📤 Uploading to PyPI..."
        twine upload dist/*
        echo ""
        echo "✅ Published to PyPI!"
        echo "Install with: uv add ml-track"
    else
        echo "❌ Upload cancelled."
    fi
fi

# Cleanup
deactivate
echo "🧹 Cleaning up build environment..."
rm -rf .venv-build/