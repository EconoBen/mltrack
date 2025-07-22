# MLTrack Makefile - The Single Source of Truth
# Run 'make help' to see all available commands

.PHONY: help
help: ## Show this help message
	@echo '🚀 MLTrack Development Commands'
	@echo '=============================='
	@echo ''
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ''
	@echo 'Examples:'
	@echo '  make install        # Install all dependencies'
	@echo '  make dev           # Start development environment'
	@echo '  make train         # Train a demo model'
	@echo '  make demo          # Run complete demo workflow'

# ============================================
# ENVIRONMENT SETUP
# ============================================

.PHONY: install
install: install-python install-node ## Install all dependencies (Python + Node.js)

.PHONY: install-python
install-python: ## Install Python dependencies
	@echo "📦 Installing Python dependencies with uv..."
	uv sync
	@echo "✅ Dependencies installed from pyproject.toml"

.PHONY: install-node
install-node: ## Install Node.js dependencies
	@echo "📦 Installing Node.js dependencies..."
	cd ui && npm install

.PHONY: setup
setup: install ## Complete development setup
	@echo "🔧 Setting up development environment..."
	@mkdir -p mlruns
	@mkdir -p models
	@echo "✅ Development environment ready!"

.PHONY: setup-modal
setup-modal: ## Setup Modal deployment environment
	@echo "🚀 Setting up Modal deployment..."
	@./scripts/setup-modal.sh

# ============================================
# DEVELOPMENT
# ============================================

.PHONY: dev
dev: ## Start full development environment (MLflow + UI)
	@echo "🚀 Starting development environment..."
	@make -j2 dev-mlflow dev-ui

.PHONY: dev-mlflow
dev-mlflow: ## Start MLflow server
	@echo "🔬 Starting MLflow server on http://localhost:5001..."
	mlflow server --host 0.0.0.0 --port 5001

.PHONY: dev-ui
dev-ui: ## Start Next.js development server
	@echo "🎨 Starting MLTrack UI on http://localhost:3000..."
	cd ui && npm run dev

.PHONY: dev-ui-prod
dev-ui-prod: ## Start Next.js in production mode
	@echo "🎨 Building and starting MLTrack UI in production mode..."
	cd ui && npm run build && npm run start

# ============================================
# MLFLOW OPERATIONS
# ============================================

.PHONY: mlflow-clean
mlflow-clean: ## Clean all MLflow data (experiments, runs, models)
	@echo "🧹 Cleaning MLflow data..."
	@echo "⚠️  This will delete all experiments and models!"
	@read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	rm -rf mlruns mlflow.db models
	@echo "✅ MLflow data cleaned"

.PHONY: mlflow-ui
mlflow-ui: ## Open MLflow UI in browser
	@echo "🌐 Opening MLflow UI..."
	open http://localhost:5001 || xdg-open http://localhost:5001

# ============================================
# MODEL TRAINING
# ============================================

.PHONY: train
train: ## Train demo models
	@echo "🤖 Training demo models..."
	cd scripts && python train-model-demo.py

.PHONY: train-iris
train-iris: ## Train only Iris classifier
	@echo "🌸 Training Iris classifier..."
	cd scripts && python -c "from train_model_demo import *; setup_mlflow(); create_experiment(); train_iris_model()"

.PHONY: train-wine
train-wine: ## Train only Wine quality model
	@echo "🍷 Training Wine quality model..."
	cd scripts && python -c "from train_model_demo import *; setup_mlflow(); create_experiment(); train_wine_model()"

# ============================================
# MODEL DEPLOYMENT
# ============================================

.PHONY: deploy
deploy: ## Deploy trained model as API
	@echo "🚀 Deploying model as REST API..."
	cd scripts && python deploy-model-demo.py

.PHONY: deploy-background
deploy-background: ## Deploy model API in background
	@echo "🚀 Deploying model API in background..."
	cd scripts && nohup python deploy-model-demo.py > deployment.log 2>&1 &
	@echo "✅ Model API starting... Check deployment.log for details"

.PHONY: deploy-stop
deploy-stop: ## Stop deployed model API
	@echo "⏹️  Stopping model API..."
	@pkill -f "deploy-model-demo.py" || echo "No deployment found"

# ============================================
# MODAL DEPLOYMENT
# ============================================

.PHONY: modal-deploy
modal-deploy: ## Deploy model to Modal (interactive)
	@echo "🚀 Deploying model to Modal..."
	cd examples && python deploy_model.py

.PHONY: modal-deploy-batch
modal-deploy-batch: ## Deploy multiple models to Modal
	@echo "🚀 Batch deploying models to Modal..."
	cd examples && python batch_deploy_models.py

.PHONY: modal-list
modal-list: ## List all Modal deployments
	@echo "📋 Listing Modal deployments..."
	@python -c "from mltrack.deploy import list_deployments; import json; print(json.dumps(list_deployments(), indent=2))"

.PHONY: modal-status
modal-status: ## Check Modal deployment status (requires DEPLOYMENT_ID)
	@if [ -z "$$DEPLOYMENT_ID" ]; then \
		echo "❌ Error: DEPLOYMENT_ID is required"; \
		echo "Usage: make modal-status DEPLOYMENT_ID=<deployment-id>"; \
		exit 1; \
	fi
	@echo "🔍 Checking status for deployment: $$DEPLOYMENT_ID"
	@python -c "from mltrack.deploy import get_deployment_status; import json; print(json.dumps(get_deployment_status('$$DEPLOYMENT_ID'), indent=2))"

.PHONY: modal-stop
modal-stop: ## Stop Modal deployment (requires DEPLOYMENT_ID)
	@if [ -z "$$DEPLOYMENT_ID" ]; then \
		echo "❌ Error: DEPLOYMENT_ID is required"; \
		echo "Usage: make modal-stop DEPLOYMENT_ID=<deployment-id>"; \
		exit 1; \
	fi
	@echo "⏹️  Stopping deployment: $$DEPLOYMENT_ID"
	@python -c "from mltrack.deploy import stop_deployment; result = stop_deployment('$$DEPLOYMENT_ID'); print('✅ Deployment stopped' if result else '❌ Failed to stop deployment')"

.PHONY: modal-test
modal-test: ## Test Modal deployment endpoint (requires ENDPOINT_URL)
	@if [ -z "$$ENDPOINT_URL" ]; then \
		echo "❌ Error: ENDPOINT_URL is required"; \
		echo "Usage: make modal-test ENDPOINT_URL=<endpoint-url>"; \
		exit 1; \
	fi
	@echo "🧪 Testing Modal endpoint: $$ENDPOINT_URL"
	@curl -X POST $$ENDPOINT_URL/predict \
		-H "Content-Type: application/json" \
		-d '{"data": [[5.1, 3.5, 1.4, 0.2]], "return_proba": true}' | jq

.PHONY: modal-clean
modal-clean: ## Stop all Modal deployments
	@echo "🧹 Stopping all Modal deployments..."
	@python -c "from mltrack.deploy import list_deployments, stop_deployment; \
		deployments = list_deployments(); \
		running = [d for d in deployments if d['status'] == 'running']; \
		print(f'Found {len(running)} running deployments'); \
		for d in running: \
			print(f\"Stopping {d['deployment_id']}...\"); \
			stop_deployment(d['deployment_id']); \
		print('✅ All deployments stopped')"

# ============================================
# TESTING
# ============================================

.PHONY: test
test: test-python test-ui ## Run all tests

.PHONY: test-python
test-python: ## Run Python tests
	@echo "🧪 Running Python tests..."
	cd mltrack && python -m pytest tests/ -v

.PHONY: test-ui
test-ui: ## Run UI tests
	@echo "🧪 Running UI tests..."
	cd ui && npm test

.PHONY: test-inference
test-inference: ## Test model inference API
	@echo "🧪 Testing model inference API..."
	cd scripts && python test-inference-demo.py

.PHONY: test-features
test-features: ## Test all MLTrack features
	@echo "🧪 Testing all features..."
	cd ui && ./scripts/test-all-features.sh

.PHONY: type-check
type-check: ## Run TypeScript type checking
	@echo "📝 Running type checks..."
	cd ui && npm run type-check

.PHONY: lint
lint: lint-python lint-ui ## Run all linters

.PHONY: lint-python
lint-python: ## Run Python linting
	@echo "🔍 Linting Python code..."
	ruff check mltrack scripts || true
	black --check mltrack scripts || true

.PHONY: lint-ui
lint-ui: ## Run UI linting
	@echo "🔍 Linting TypeScript/React code..."
	cd ui && npm run lint

# ============================================
# DEMO WORKFLOWS
# ============================================

.PHONY: demo
demo: ## Run complete MLTrack demo (train → deploy → test)
	@echo "🎭 Running complete MLTrack demo..."
	cd scripts && ./run-complete-demo.sh

.PHONY: demo-data
demo-data: ## Generate demo data with multiple users
	@echo "👥 Generating demo data..."
	cd scripts && python generate-demo-data.py

.PHONY: demo-linkedin
demo-linkedin: ## Prepare LinkedIn demo
	@echo "🎬 Preparing LinkedIn demo..."
	cd ui && ./scripts/prepare-linkedin-demo.sh

.PHONY: demo-clean
demo-clean: ## Clean up after demo
	@echo "🧹 Cleaning up demo..."
	cd ui && ./scripts/cleanup-demo.sh

.PHONY: demo-modal
demo-modal: ## Run complete Modal deployment demo
	@echo "🚀 Running Modal deployment demo..."
	./scripts/modal-demo.sh

# ============================================
# DATABASE OPERATIONS
# ============================================

.PHONY: db-reset
db-reset: ## Reset database
	@echo "🗄️  Resetting database..."
	rm -f mlflow.db
	@echo "✅ Database reset"

.PHONY: db-backup
db-backup: ## Backup MLflow database
	@echo "💾 Backing up database..."
	@mkdir -p backups
	cp mlflow.db backups/mlflow-$$(date +%Y%m%d-%H%M%S).db || echo "No database to backup"
	@echo "✅ Database backed up"

# ============================================
# DOCKER OPERATIONS
# ============================================

.PHONY: docker-build
docker-build: ## Build Docker images
	@echo "🐳 Building Docker images..."
	docker-compose build

.PHONY: docker-up
docker-up: ## Start services with Docker Compose
	@echo "🐳 Starting services..."
	docker-compose up -d

.PHONY: docker-down
docker-down: ## Stop Docker services
	@echo "🐳 Stopping services..."
	docker-compose down

.PHONY: docker-logs
docker-logs: ## Show Docker logs
	docker-compose logs -f

# ============================================
# UTILITIES
# ============================================

.PHONY: clean
clean: ## Clean build artifacts and caches
	@echo "🧹 Cleaning build artifacts..."
	rm -rf ui/.next ui/node_modules
	rm -rf mltrack/__pycache__ scripts/__pycache__
	find . -name "*.pyc" -delete
	find . -name ".DS_Store" -delete
	@echo "✅ Clean complete"

.PHONY: format
format: ## Format all code
	@echo "✨ Formatting code..."
	cd ui && npm run format
	black mltrack scripts
	@echo "✅ Code formatted"

.PHONY: open
open: ## Open MLTrack UI in browser
	@echo "🌐 Opening MLTrack UI..."
	open http://localhost:3000 || xdg-open http://localhost:3000

.PHONY: logs
logs: ## Show all logs
	@echo "📋 Showing logs..."
	tail -f *.log ui/*.log scripts/*.log 2>/dev/null || echo "No logs found"

.PHONY: status
status: ## Check status of all services
	@echo "📊 Service Status:"
	@echo -n "  MLflow: "
	@curl -s http://localhost:5001/health > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Stopped"
	@echo -n "  UI: "
	@curl -s http://localhost:3000 > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Stopped"
	@echo -n "  API: "
	@curl -s http://localhost:8000/health > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Stopped"

.PHONY: kill-all
kill-all: ## Stop all MLTrack services
	@echo "⏹️  Stopping all services..."
	@pkill -f "mlflow server" || true
	@pkill -f "next dev" || true
	@pkill -f "npm run" || true
	@pkill -f "deploy-model" || true
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5001 | xargs kill -9 2>/dev/null || true
	@lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@echo "✅ All services stopped"

# ============================================
# RELEASE
# ============================================

.PHONY: version
version: ## Show current version
	@echo "MLTrack Version: $$(cat VERSION || echo 'dev')"

.PHONY: release
release: ## Create a new release
	@echo "📦 Creating new release..."
	@read -p "Version (e.g., 1.0.0): " version && \
	echo $$version > VERSION && \
	git add VERSION && \
	git commit -m "Release v$$version" && \
	git tag -a v$$version -m "Release v$$version"

# Default target
.DEFAULT_GOAL := help