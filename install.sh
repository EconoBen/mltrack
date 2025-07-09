#!/bin/bash
# mltrack installation script

set -e

echo "🚀 Installing mltrack..."

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if UV is installed
if command -v uv &> /dev/null; then
    echo -e "${GREEN}✓ UV detected${NC}"
    UV_AVAILABLE=true
else
    echo -e "${YELLOW}⚠ UV not found${NC}"
    UV_AVAILABLE=false
fi

# Installation methods
install_with_uv() {
    echo "Installing with UV (recommended)..."
    if [ "$UV_AVAILABLE" = false ]; then
        echo "Installing UV first..."
        curl -LsSf https://astral.sh/uv/install.sh | sh
        export PATH="$HOME/.local/bin:$PATH"
    fi
    
    # Install mltrack as a tool
    uvx --from . mltrack --help &> /dev/null && echo "Already installed" || uv tool install .
    echo -e "${GREEN}✅ mltrack installed via UV${NC}"
    echo "Run with: uvx mltrack"
}

install_with_pip() {
    echo "Installing with pip..."
    pip install .
    echo -e "${GREEN}✅ mltrack installed via pip${NC}"
    echo "Run with: mltrack"
}

install_editable() {
    echo "Installing in development mode..."
    if [ "$UV_AVAILABLE" = true ]; then
        uv pip install -e .
    else
        pip install -e .
    fi
    echo -e "${GREEN}✅ mltrack installed in editable mode${NC}"
}

# Main menu
echo ""
echo "Choose installation method:"
echo "1) UV tool (recommended) - Isolated, no environment needed"
echo "2) pip install - Traditional Python package"
echo "3) Development mode - Editable installation"
echo "4) Cancel"
echo ""
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        install_with_uv
        ;;
    2)
        install_with_pip
        ;;
    3)
        install_editable
        ;;
    4)
        echo "Installation cancelled"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Next steps:"
echo "1. Initialize mltrack in your project: mltrack init"
echo "2. Add @track decorator to your functions"
echo "3. Run with tracking: mltrack run python your_script.py"
echo ""
echo "For more info: mltrack --help"