# Contributing to MLTrack

First off, thank you for considering contributing to MLTrack! It's people like you that make MLTrack such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by the [MLTrack Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* Use a clear and descriptive title
* Describe the exact steps which reproduce the problem
* Provide specific examples to demonstrate the steps
* Describe the behavior you observed after following the steps
* Explain which behavior you expected to see instead and why
* Include screenshots if possible

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* Use a clear and descriptive title
* Provide a step-by-step description of the suggested enhancement
* Provide specific examples to demonstrate the steps
* Describe the current behavior and explain which behavior you expected to see instead
* Explain why this enhancement would be useful

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code follows the style guidelines
6. Issue that pull request!

## Development Setup

1. Clone your fork:
   ```bash
   git clone https://github.com/your-username/mltrack.git
   cd mltrack
   ```

2. Set up the development environment:
   ```bash
   make setup
   ```

3. Create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. Make your changes and test:
   ```bash
   make test
   make lint
   ```

5. Run the development environment:
   ```bash
   make dev
   ```

## Style Guidelines

### Python Code Style

* Follow PEP 8
* Use Black for formatting
* Use ruff for linting
* Add type hints where possible
* Write docstrings for all public functions

### TypeScript/React Code Style

* Use TypeScript for all new components
* Follow the existing component structure
* Use functional components with hooks
* Add proper types for all props and state
* Use Tailwind CSS for styling

### Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

Example:
```
feat: add Modal deployment support

- Add Modal deployment API routes
- Update UI to support Modal deployments
- Add CLI commands for Modal operations
- Update documentation

Fixes #123
```

## Testing

* Write tests for any new functionality
* Ensure all tests pass before submitting PR
* Aim for high test coverage
* Include both unit and integration tests where appropriate

### Running Tests

```bash
# Python tests
make test-python

# UI tests
make test-ui

# All tests
make test
```

## Documentation

* Update the README.md if you change functionality
* Update docstrings for any changed Python functions
* Update TypeScript interfaces and types
* Add JSDoc comments for complex functions
* Include examples where helpful

## Questions?

Feel free to open an issue with your question or reach out to the maintainers.

Thank you for contributing! 🚀