#!/bin/bash
# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the mltrack root directory
MLTRACK_DIR="$(dirname "$SCRIPT_DIR")"
cd "$MLTRACK_DIR"
uv run python test_mltrack.py