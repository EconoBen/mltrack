#!/bin/bash

# Run the lineage tracking demo

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the mltrack root directory
MLTRACK_DIR="$(dirname "$SCRIPT_DIR")"
cd "$MLTRACK_DIR"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install mltrack package in development mode
echo "Installing mltrack package..."
pip install -e .

# Run the lineage example
echo "Running lineage tracking example..."
python examples/lineage_example.py

echo "Demo complete! Check the MLflow UI to see the lineage data."
echo "You can run: mlflow ui"