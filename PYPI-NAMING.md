# PyPI Package Naming Options

The package name "mltrack" is already taken on PyPI. Here are the recommended alternatives:

## 🎯 Top Recommendations

### 1. **mltrack-deploy** ⭐ Recommended
- Clear focus on the deployment feature
- Maintains the MLTrack brand
- Descriptive of the main value proposition

### 2. **mlflow-ship**
- Clever play on "ml ship" command
- Clear connection to MLflow
- Memorable and brandable

### 3. **mltrack-pro**
- Suggests enhanced/professional features
- Simple and memorable
- Leaves room for a future "mltrack-lite"

## 📝 Other Options

- **mltrack-plus** - Enhancement theme
- **mlflow-deploy** - Direct MLflow connection
- **ml-shipper** - Focus on shipping/deployment
- **mltrack-hub** - Central management theme
- **mlflow-enhance** - Clear enhancement message

## 🔄 To Change the Package Name

1. Update `pyproject.toml`:
   ```toml
   [project]
   name = "mltrack-deploy"  # or your chosen name
   ```

2. Update the README.md installation instructions:
   ```bash
   pip install mltrack-deploy
   ```

3. Keep the import name as `mltrack`:
   ```python
   import mltrack  # Users still import as mltrack
   ```

4. Update any documentation that references the pip package name

## 📊 Decision Factors

- **Brand consistency**: Keep "mltrack" in the name
- **Clarity**: Make it clear this enhances MLflow
- **SEO**: Include keywords like "deploy" or "ship"
- **Future-proof**: Allow for potential product line expansion

## 🚀 Recommended Action

Use **mltrack-deploy** as it:
- Clearly indicates the deployment capability
- Maintains brand recognition
- Is descriptive for PyPI searches
- Allows the import to remain `import mltrack`