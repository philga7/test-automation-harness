# 🚀 Test Automation Harness - Makefile
# Provides standardized commands for development, testing, and deployment

# Variables
PROJECT_NAME := test-automation-harness
DOCKER_IMAGE := $(PROJECT_NAME)
DOCKER_TAG := latest
CONTAINER_NAME := $(PROJECT_NAME)-app
DEV_CONTAINER_NAME := $(PROJECT_NAME)-dev
COMPOSE_FILE := docker-compose.yml
NODE_VERSION := 20

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# ================================
# 📋 Help and Information
# ================================
.PHONY: help
help: ## 📋 Show this help message
	@echo "$(GREEN)🚀 Test Automation Harness - Available Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make $(YELLOW)<target>$(NC)\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) }' $(MAKEFILE_LIST)

##@ 🏗️ Development Commands
.PHONY: install
install: ## 📦 Install dependencies
	@echo "$(GREEN)Installing dependencies...$(NC)"
	npm ci

.PHONY: build
build: ## 🔨 Build TypeScript project
	@echo "$(GREEN)Building TypeScript project...$(NC)"
	npm run build

.PHONY: dev
dev: ## 🔄 Start development server
	@echo "$(GREEN)Starting development server...$(NC)"
	npm run dev

.PHONY: clean
clean: ## 🧹 Clean build artifacts
	@echo "$(GREEN)Cleaning build artifacts...$(NC)"
	npm run clean
	rm -rf node_modules/.cache

##@ 🧪 Testing Commands
.PHONY: test
test: ## 🧪 Run all tests
	@echo "$(GREEN)Running all tests...$(NC)"
	npm test

.PHONY: test-unit
test-unit: ## 🔬 Run unit tests
	@echo "$(GREEN)Running unit tests...$(NC)"
	npm run test:unit

.PHONY: test-integration
test-integration: ## 🔗 Run integration tests
	@echo "$(GREEN)Running integration tests...$(NC)"
	npm run test:integration

.PHONY: test-e2e
test-e2e: ## 🌐 Run end-to-end tests
	@echo "$(GREEN)Running e2e tests...$(NC)"
	npm run test:e2e

.PHONY: test-coverage
test-coverage: ## 📊 Run tests with coverage
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	npm run test:coverage

##@ 🐳 Docker Commands
.PHONY: docker-build
docker-build: ## 🔨 Build Docker image
	@echo "$(GREEN)Building Docker image: $(DOCKER_IMAGE):$(DOCKER_TAG)$(NC)"
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

.PHONY: docker-build-dev
docker-build-dev: ## 🔨 Build Docker image for development
	@echo "$(GREEN)Building development Docker image...$(NC)"
	docker build --target builder -t $(DOCKER_IMAGE):dev .

.PHONY: docker-run
docker-run: docker-build ## 🚀 Run Docker container
	@echo "$(GREEN)Running Docker container: $(CONTAINER_NAME)$(NC)"
	docker run -d \
		--name $(CONTAINER_NAME) \
		-p 3000:3000 \
		-v $(PWD)/config:/app/config:ro \
		-v $(PWD)/artifacts:/app/artifacts \
		$(DOCKER_IMAGE):$(DOCKER_TAG)

.PHONY: docker-stop
docker-stop: ## 🛑 Stop Docker container
	@echo "$(GREEN)Stopping Docker container: $(CONTAINER_NAME)$(NC)"
	-docker stop $(CONTAINER_NAME)
	-docker rm $(CONTAINER_NAME)

.PHONY: docker-logs
docker-logs: ## 📜 Show Docker container logs
	@echo "$(GREEN)Showing logs for: $(CONTAINER_NAME)$(NC)"
	docker logs -f $(CONTAINER_NAME)

.PHONY: docker-shell
docker-shell: ## 🐚 Open shell in Docker container
	@echo "$(GREEN)Opening shell in: $(CONTAINER_NAME)$(NC)"
	docker exec -it $(CONTAINER_NAME) /bin/sh

.PHONY: docker-clean
docker-clean: ## 🧹 Clean Docker images and containers
	@echo "$(GREEN)Cleaning Docker resources...$(NC)"
	-docker stop $(CONTAINER_NAME) $(DEV_CONTAINER_NAME)
	-docker rm $(CONTAINER_NAME) $(DEV_CONTAINER_NAME)
	-docker rmi $(DOCKER_IMAGE):$(DOCKER_TAG) $(DOCKER_IMAGE):dev
	docker system prune -f

##@ 🐙 Docker Compose Commands
.PHONY: up
up: ## 🚀 Start all services with Docker Compose
	@echo "$(GREEN)Starting all services...$(NC)"
	docker-compose up -d

.PHONY: up-dev
up-dev: ## 🔄 Start development services
	@echo "$(GREEN)Starting development services...$(NC)"
	docker-compose --profile dev up -d

.PHONY: down
down: ## 🛑 Stop all services
	@echo "$(GREEN)Stopping all services...$(NC)"
	docker-compose down

.PHONY: restart
restart: down up ## 🔄 Restart all services
	@echo "$(GREEN)Services restarted$(NC)"

.PHONY: logs
logs: ## 📜 Show logs from all services
	@echo "$(GREEN)Showing logs from all services...$(NC)"
	docker-compose logs -f

.PHONY: ps
ps: ## 📊 Show running containers
	@echo "$(GREEN)Running containers:$(NC)"
	docker-compose ps

##@ 🚀 Deployment Commands
.PHONY: deploy
deploy: docker-build up ## 🚀 Full deployment (build + start)
	@echo "$(GREEN)✅ Deployment complete! Application available at: http://localhost:3000$(NC)"

.PHONY: deploy-dev
deploy-dev: docker-build-dev up-dev ## 🔄 Development deployment
	@echo "$(GREEN)✅ Development deployment complete! Application available at: http://localhost:3001$(NC)"

.PHONY: quick-deploy
quick-deploy: up ## ⚡ Quick deployment (no rebuild)
	@echo "$(GREEN)✅ Quick deployment complete!$(NC)"

##@ 🔍 Health and Monitoring
.PHONY: health
health: ## 🏥 Check application health
	@echo "$(GREEN)Checking application health...$(NC)"
	@curl -f http://localhost:3000/health 2>/dev/null && echo "$(GREEN)✅ Application is healthy$(NC)" || echo "$(RED)❌ Application is unhealthy$(NC)"

.PHONY: status
status: ## 📊 Show detailed status
	@echo "$(GREEN)=== System Status ===$(NC)"
	@echo "$(YELLOW)Docker Images:$(NC)"
	@docker images | grep $(PROJECT_NAME) || echo "No project images found"
	@echo ""
	@echo "$(YELLOW)Running Containers:$(NC)"
	@docker ps --filter "name=$(PROJECT_NAME)" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "No containers running"
	@echo ""
	@echo "$(YELLOW)Docker Compose Services:$(NC)"
	@docker-compose ps || echo "No compose services running"

##@ 🧹 Cleanup Commands
.PHONY: clean-all
clean-all: clean docker-clean ## 🧹 Clean everything (build + Docker)
	@echo "$(GREEN)Cleaned all artifacts$(NC)"

.PHONY: clean-artifacts
clean-artifacts: ## 🧹 Clean test artifacts
	@echo "$(GREEN)Cleaning test artifacts...$(NC)"
	npm run artifacts:clean

.PHONY: reset
reset: down clean-all install build ## 🔄 Full reset (clean + reinstall + rebuild)
	@echo "$(GREEN)✅ Full reset complete$(NC)"

##@ 🛠️ Utility Commands
.PHONY: check-deps
check-deps: ## 🔍 Check if required dependencies are installed
	@echo "$(GREEN)Checking dependencies...$(NC)"
	@command -v node >/dev/null 2>&1 || (echo "$(RED)❌ Node.js not found$(NC)" && exit 1)
	@command -v npm >/dev/null 2>&1 || (echo "$(RED)❌ npm not found$(NC)" && exit 1)
	@command -v docker >/dev/null 2>&1 || (echo "$(RED)❌ Docker not found$(NC)" && exit 1)
	@command -v docker-compose >/dev/null 2>&1 || (echo "$(RED)❌ Docker Compose not found$(NC)" && exit 1)
	@echo "$(GREEN)✅ All dependencies found$(NC)"

.PHONY: version
version: ## 📋 Show version information
	@echo "$(GREEN)=== Version Information ===$(NC)"
	@echo "$(YELLOW)Project:$(NC) $(PROJECT_NAME)"
	@echo "$(YELLOW)Node.js:$(NC) $$(node --version 2>/dev/null || echo 'Not installed')"
	@echo "$(YELLOW)npm:$(NC) $$(npm --version 2>/dev/null || echo 'Not installed')"
	@echo "$(YELLOW)Docker:$(NC) $$(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',' || echo 'Not installed')"
	@echo "$(YELLOW)Docker Compose:$(NC) $$(docker-compose --version 2>/dev/null | cut -d' ' -f3 | tr -d ',' || echo 'Not installed')"

##@ 📚 Documentation
.PHONY: docs
docs: ## 📚 Generate/view documentation
	@echo "$(GREEN)Opening project documentation...$(NC)"
	@echo "📋 README: file://$(PWD)/README.md"
	@echo "📊 API Docs: file://$(PWD)/docs/API.md"

# Prevent intermediate file deletion
.PRECIOUS: %

# Ensure targets don't conflict with files
.PHONY: $(MAKECMDGOALS)
