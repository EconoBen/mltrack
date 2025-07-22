# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-01-22

### Added
- Initial release of MLTrack
- Drop-in enhancement for MLflow with modern UI and deployment capabilities
- Beautiful Next.js UI to replace MLflow's dated interface
- Simple CLI commands: `ml train`, `ml save`, `ml ship`, `ml try`
- One-command deployment to Modal with automatic FastAPI endpoint creation
- Cost tracking for training and deployment operations
- Authentication system with development and production modes
- Welcome page for first-time users
- S3 integration for model storage
- Support for scikit-learn, PyTorch, and TensorFlow models
- Automatic MLflow server management
- Docker support for containerized deployments
- Comprehensive testing framework

### Security
- Secure authentication with NextAuth.js
- Environment variable validation
- Safe model serialization with cloudpickle

### Documentation
- Professional README with clear value proposition
- Deployment guides for Modal and Docker
- API documentation
- Contributing guidelines

[0.1.0]: https://github.com/EconoBen/mltrack/releases/tag/v0.1.0