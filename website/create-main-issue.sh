#!/bin/bash

# Create the main MLTrack Documentation 2.0 issue

echo "Creating main documentation issue on GitHub..."

# Create the main issue
gh issue create \
  --title "MLTrack Documentation 2.0 - Professional Documentation System" \
  --body-file DOCUMENTATION_MAIN_ISSUE.md \
  --label "documentation,enhancement,high-priority" \
  --assignee "@me"

echo "Main issue created! You can now:"
echo "1. View it on GitHub"
echo "2. Create sub-issues for each epic"
echo "3. Run ./create-documentation-issues.sh to create all sub-issues"