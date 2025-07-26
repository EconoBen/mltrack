#!/bin/bash

echo "Installing MLTrack documentation recording tools..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Error: Homebrew is not installed. Please install it first."
    exit 1
fi

# Install asciinema
if ! command -v asciinema &> /dev/null; then
    echo "Installing asciinema..."
    brew install asciinema
else
    echo "✓ asciinema already installed"
fi

# Install gifsicle
if ! command -v gifsicle &> /dev/null; then
    echo "Installing gifsicle..."
    brew install gifsicle
else
    echo "✓ gifsicle already installed"
fi

# Install Kap (optional, macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! ls /Applications/Kap.app &> /dev/null; then
        echo "Installing Kap..."
        brew install --cask kap
    else
        echo "✓ Kap already installed"
    fi
fi

# ffmpeg is already installed
echo "✓ ffmpeg already installed"

echo ""
echo "All recording tools installed! You can now:"
echo "- Record terminal sessions with: asciinema rec"
echo "- Optimize GIFs with: gifsicle"
echo "- Convert videos with: ffmpeg"
echo "- Record screen with: Kap (macOS)"