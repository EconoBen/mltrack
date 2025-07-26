#!/bin/bash

# MLTrack Documentation 2.0 - GitHub Issues Creation Script
# This script creates all the issues for the documentation project

echo "Creating MLTrack Documentation 2.0 GitHub Issues..."

# Create labels first
echo "Creating labels..."
gh label create "epic" --description "Epic issue containing multiple sub-issues" --color "6B46C1" || true
gh label create "design" --description "Design-related tasks" --color "FEF3C7" || true
gh label create "content" --description "Documentation writing" --color "DBEAFE" || true
gh label create "interactive" --description "Interactive features" --color "D1FAE5" || true
gh label create "video" --description "Video/GIF creation" --color "FEE2E2" || true
gh label create "api-docs" --description "API documentation" --color "E0E7FF" || true
gh label create "phase-1" --description "Foundation phase" --color "10B981" || true
gh label create "phase-2" --description "Content creation phase" --color "3B82F6" || true
gh label create "phase-3" --description "Interactive features phase" --color "8B5CF6" || true
gh label create "phase-4" --description "Polish & launch phase" --color "F59E0B" || true

# Epic 1: Interactive Dashboard Showcase
echo "Creating Epic 1: Interactive Dashboard Showcase..."
EPIC1=$(gh issue create \
  --title "Epic: Interactive Dashboard Showcase 🎥" \
  --body "Create visual demonstrations of MLTrack in action through GIFs, videos, and interactive components.

## Overview
This epic covers all visual and interactive elements that showcase MLTrack's capabilities.

## Success Criteria
- [ ] 10+ feature demonstration GIFs/videos created
- [ ] Interactive terminal demos implemented
- [ ] Before/after comparisons with MLflow
- [ ] All demos load in < 2 seconds

## Sub-issues
- Set up screen recording infrastructure
- Record feature demonstrations
- Create interactive demos" \
  --label "epic,video,interactive,priority-high" \
  --assignee "@me")

# Sub-issues for Epic 1
gh issue create \
  --title "Set up screen recording infrastructure" \
  --body "Research and implement tools for creating high-quality documentation videos and GIFs.

## Tasks
- [ ] Research recording tools (Asciinema, Kap, ScreenFlow)
- [ ] Create recording templates and guidelines
- [ ] Set up video compression pipeline
- [ ] Document recording best practices

## Acceptance Criteria
- Recording setup documented
- Sample recordings created
- Compression maintains quality while reducing size" \
  --label "video,phase-1"

gh issue create \
  --title "Record MLTrack feature demonstrations" \
  --body "Create visual demonstrations of all key MLTrack features.

## Recordings Needed
- [ ] Real-time experiment tracking
- [ ] One-command model deployment
- [ ] Cost tracking dashboard
- [ ] Model comparison features
- [ ] Multi-model management
- [ ] Team collaboration
- [ ] MLflow → MLTrack migration
- [ ] A/B testing setup
- [ ] Auto-scaling in action
- [ ] API endpoint usage

## Requirements
- GIF format for quick demos (< 10 seconds)
- MP4 for longer workflows
- Consistent terminal theme
- Clear, readable text" \
  --label "video,content,phase-2"

# Epic 2: Professional Visual Design
echo "Creating Epic 2: Professional Visual Design..."
EPIC2=$(gh issue create \
  --title "Epic: Professional Visual Design 🎨" \
  --body "Establish a cohesive design system that makes documentation beautiful and easy to navigate.

## Overview
Create a modern, professional design system inspired by leading documentation sites.

## Success Criteria
- [ ] Complete design system documented
- [ ] All components follow consistent styling
- [ ] Responsive on all devices
- [ ] Accessibility score > 95

## Sub-issues
- Design system creation
- Landing page enhancement
- Documentation theme customization" \
  --label "epic,design,priority-high" \
  --assignee "@me")

# Epic 3: Comprehensive User Guides
echo "Creating Epic 3: Comprehensive User Guides..."
EPIC3=$(gh issue create \
  --title "Epic: Comprehensive User Guides 📚" \
  --body "Write in-depth guides covering all aspects of MLTrack usage.

## Overview
Create thorough, well-structured guides that take users from beginner to expert.

## Content Plan
- Getting Started (4 guides)
- Feature Guides (6 guides)
- Integration Guides (6 guides)
- Deployment Guides (5 guides)

## Success Criteria
- [ ] 20+ comprehensive guides written
- [ ] All guides include code examples
- [ ] Consistent structure and style
- [ ] User testing feedback incorporated" \
  --label "epic,content,priority-high" \
  --assignee "@me")

# Epic 4: API Reference Documentation
echo "Creating Epic 4: API Reference Documentation..."
EPIC4=$(gh issue create \
  --title "Epic: API Reference Documentation 🔧" \
  --body "Create comprehensive API documentation for all MLTrack interfaces.

## Overview
Build auto-generated, searchable API documentation for Python, CLI, and REST APIs.

## Components
- Python API (auto-generated from docstrings)
- CLI Reference (all commands documented)
- REST API (OpenAPI/Swagger spec)

## Success Criteria
- [ ] 100% public API coverage
- [ ] Interactive API explorer
- [ ] Examples for every method
- [ ] Type hints throughout" \
  --label "epic,api-docs,priority-medium" \
  --assignee "@me")

# Epic 5: Interactive Code Examples
echo "Creating Epic 5: Interactive Code Examples..."
EPIC5=$(gh issue create \
  --title "Epic: Interactive Code Examples 💻" \
  --body "Make code examples interactive and easy to use.

## Overview
Transform static code blocks into interactive, engaging examples.

## Features
- Copy-to-clipboard functionality
- Language tabs (Python/Bash/YAML)
- Syntax highlighting with themes
- Live playgrounds
- Line highlighting for emphasis

## Success Criteria
- [ ] All code blocks have copy buttons
- [ ] Multi-language examples where relevant
- [ ] 5+ interactive playgrounds
- [ ] < 100ms copy response time" \
  --label "epic,interactive,priority-medium" \
  --assignee "@me")

# Epic 6: Search and Navigation
echo "Creating Epic 6: Search and Navigation..."
EPIC6=$(gh issue create \
  --title "Epic: Search and Navigation 🔍" \
  --body "Implement powerful search and navigation features.

## Overview
Create a search experience that helps users find information instantly.

## Features
- Algolia DocSearch integration
- Keyboard shortcuts (Ctrl+K)
- Smart suggestions
- Search analytics
- Breadcrumb navigation

## Success Criteria
- [ ] Search results in < 200ms
- [ ] 90%+ search success rate
- [ ] Keyboard navigation throughout
- [ ] Mobile-friendly search" \
  --label "epic,interactive,priority-high" \
  --assignee "@me")

# Epic 7: Community and Showcase
echo "Creating Epic 7: Community and Showcase..."
EPIC7=$(gh issue create \
  --title "Epic: Community and Showcase 🌟" \
  --body "Build community features and showcase real-world usage.

## Overview
Highlight the MLTrack community and real-world success stories.

## Components
- User testimonials
- Company logos showcase
- Case studies (3-5)
- Community contributions
- Success metrics

## Success Criteria
- [ ] 10+ testimonials collected
- [ ] 5+ company logos
- [ ] 3+ detailed case studies
- [ ] Community contribution guide" \
  --label "epic,content,priority-low" \
  --assignee "@me")

# Create phase-specific issues
echo "Creating phase-specific implementation issues..."

gh issue create \
  --title "Phase 1: Documentation Foundation Setup" \
  --body "Set up the foundation for MLTrack Documentation 2.0.

## Week 1-2 Tasks
- [ ] Set up GitHub project board
- [ ] Configure issue templates
- [ ] Initialize design tokens
- [ ] Set up Storybook for components
- [ ] Configure CI/CD for docs
- [ ] Create contribution guidelines

## Deliverables
- Project board configured
- Design system initialized
- Build pipeline ready
- Recording setup complete" \
  --label "phase-1,priority-high" \
  --milestone "Phase 1: Foundation"

echo "All issues created successfully!"
echo "View the project at: https://github.com/EconoBen/mltrack/issues"