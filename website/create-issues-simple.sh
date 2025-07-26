#!/bin/bash

echo "Creating remaining MLTrack Documentation issues..."

# Epic issues
echo "Creating Epic issues..."

gh issue create \
  --title "Epic: Interactive Dashboard Showcase 🎥" \
  --body "Create visual demonstrations of MLTrack in action through GIFs, videos, and interactive components." \
  --label "epic,video,interactive"

gh issue create \
  --title "Epic: Professional Visual Design 🎨" \
  --body "Establish a cohesive design system that makes documentation beautiful and easy to navigate." \
  --label "epic,design"

gh issue create \
  --title "Epic: Comprehensive User Guides 📚" \
  --body "Write in-depth guides covering all aspects of MLTrack usage." \
  --label "epic,content"

gh issue create \
  --title "Epic: API Reference Documentation 🔧" \
  --body "Create comprehensive API documentation for all MLTrack interfaces." \
  --label "epic,api-docs"

gh issue create \
  --title "Epic: Interactive Code Examples 💻" \
  --body "Make code examples interactive and easy to use." \
  --label "epic,interactive"

gh issue create \
  --title "Epic: Search and Navigation 🔍" \
  --body "Implement powerful search and navigation features." \
  --label "epic,interactive"

gh issue create \
  --title "Epic: Community and Showcase 🌟" \
  --body "Build community features and showcase real-world usage." \
  --label "epic,content"

echo "All epic issues created!"