.DEFAULT_GOAL := help

ifeq ($(OS),Windows_NT)
    COLOR_RESET=
    COLOR_BLUE_BG=
else
    COLOR_RESET=\033[0m
    COLOR_BLUE_BG=\033[44m
endif

include makefiles/backend.mk
include makefiles/frontend.mk

CHECKOV_VERSION := 3.4.6
TYPOS_VERSION := 1.52.2
ACTIONLINT_VERSION := 1.7.12.25
# Pinned by digest to prevent tag drift.
GITLEAKS_IMAGE := zricethezav/gitleaks:v8.30.1@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f

# Local development
SERVICE ?= both

##@ Development

help: ## Show this help
	@awk 'BEGIN {FS = ":.*?## "; printf "\n\033[1mUsage:\033[0m make \033[36m<target>\033[0m\n"} \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } \
		/^[a-zA-Z0-9_-]+:.*?## / { printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2 } \
		END { printf "\n" }' $(MAKEFILE_LIST)

setup: backend/.env backend-setup frontend-setup ## Install dependencies and prepare environment
	@echo "Dependencies ready. Configure backend/.env before running make service."

# An existing environment file is never overwritten, even after template changes.
backend/.env:
	cp backend/.env.example backend/.env

service: ## Run local development services (SERVICE=both|backend|frontend)
	+bash scripts/run-services.sh "$(SERVICE)" "$(MAKE)"

update-deps: ## Update backend, frontend, toolchain, and prek dependencies
	@echo "$(COLOR_BLUE_BG)Updating backend Python dependencies...$(COLOR_RESET)"
	cd ./backend && uv lock --upgrade && uv sync
	@echo "$(COLOR_BLUE_BG)Updating frontend Node dependencies...$(COLOR_RESET)"
	cd ./frontend && $(VP) update
	@echo "$(COLOR_BLUE_BG)Refreshing registry package revisions...$(COLOR_RESET)"
	cd ./frontend && $(VP) update -- --patches
	$(MAKE) frontend-toolchain-align
	@echo "$(COLOR_BLUE_BG)Updating prek hook revisions...$(COLOR_RESET)"
	prek update --freeze

clean: backend-clean frontend-clean ## Remove build artifacts, caches, and dependency directories
	rm -rf .cache .ruff_cache .rumdl_cache .lighthouseci .pnpm-store node_modules
	rm -f results.sarif backend.pid
	$(MAKE) cache-clean docker-clean

cache-clean: ## Clean shared uv and unused pnpm caches
	@echo "$(COLOR_BLUE_BG)Cleaning shared uv and unused pnpm caches...$(COLOR_RESET)"
	uv cache clean
	cd $(FRONTEND_DIR) && bash ../scripts/clean-pnpm-caches.sh

##@ Quality Assurance

qa: file-naming backend-format config-format markdown-format backend-lint markdown-lint spell-check workflow-lint link-check backend-type-check backend-deadcode backend-validate-api-schema backend-audit backend-unit-test backend-mutation-test backend-type-coverage frontend-qa security-scan ## Run full repository quality assurance suite

qa-backend: file-naming backend-lint backend-format backend-type-check backend-deadcode backend-validate-api-schema backend-audit backend-unit-test backend-mutation-test backend-type-coverage ## Run backend quality assurance suite

qa-frontend: file-naming frontend-qa ## Run frontend quality assurance suite

hooks: ## Run all prek hooks against all files
	@echo "$(COLOR_BLUE_BG)Running prek hooks on all files...$(COLOR_RESET)"
	prek run --all-files

lint: file-naming backend-lint frontend-lint markdown-lint spell-check workflow-lint ## Run all linters across backend, frontend, Markdown, and workflows

format: backend-format frontend-format config-format markdown-format ## Format backend, frontend, configs, and Markdown

type-check: backend-type-check frontend-type-check ## Run static type checks on backend and frontend

test: backend-unit-test frontend-unit-test ## Run backend and frontend unit test suites

backend-test: backend-unit-test ## Alias for backend-unit-test
frontend-test: frontend-unit-test ## Alias for frontend-unit-test

type-coverage: backend-type-coverage frontend-type-coverage ## Check backend and frontend type coverage

##@ Testing

e2e-test: frontend-e2e-test ## Run frontend Playwright end-to-end tests locally

e2e-test-docker: frontend-e2e-test-docker ## Run frontend Playwright end-to-end tests in Docker

e2e-update: ## Update visual comparison snapshots in Docker
	$(MAKE) e2e-test-docker E2E_ARGS="--update-snapshots $(E2E_ARGS)"

##@ Repository Checks

file-naming: ## Check file and directory naming conventions with ls-lint
	@echo "$(COLOR_BLUE_BG)Running file naming checks with ls-lint...$(COLOR_RESET)"
	ls-lint

commitlint: ## Lint commit message file with commitlint
	@echo "$(COLOR_BLUE_BG)Running commit message linting with commitlint...$(COLOR_RESET)"
	@test -n "$(COMMIT_EDITMSG)" || (echo "Set COMMIT_EDITMSG=/path/to/commit-message-file" && exit 2)
	prek run commitlint --stage commit-msg --commit-msg-filename "$(COMMIT_EDITMSG)"

markdown-lint: ## Lint Markdown files with rumdl
	@echo "$(COLOR_BLUE_BG)Running markdown linting with rumdl...$(COLOR_RESET)"
	uv tool run --from rumdl==0.3.5 rumdl check .

markdown-format: ## Format Markdown files with rumdl
	@echo "$(COLOR_BLUE_BG)Formatting Markdown with rumdl...$(COLOR_RESET)"
	uv tool run --from rumdl==0.3.5 rumdl fmt .

spell-check: ## Check spelling with typos
	@echo "$(COLOR_BLUE_BG)Checking spelling with typos...$(COLOR_RESET)"
	uv tool run typos@$(TYPOS_VERSION)

workflow-lint: ## Lint GitHub Actions workflows with actionlint
	@echo "$(COLOR_BLUE_BG)Linting GitHub Actions workflows with actionlint...$(COLOR_RESET)"
	uv tool run --from actionlint-py==$(ACTIONLINT_VERSION) actionlint -color

actions-lock: ## Regenerate GitHub Actions workflow lockfile
	@bash scripts/actions-lock.sh

actions-lock-verify: ## Verify GitHub Actions workflow lockfile without modifying it
	@bash scripts/actions-lock.sh --verify

link-check: ## Check repository links with lychee
	@echo "$(COLOR_BLUE_BG)Checking links with lychee...$(COLOR_RESET)"
	@command -v lychee >/dev/null 2>&1 || { \
		echo "lychee is not on PATH: run 'bash scripts/install-lychee.sh' (Linux) or 'brew install lychee' (macOS)." >&2; \
		exit 1; \
	}
	@token="$${GITHUB_TOKEN:-$$(gh auth token 2>/dev/null || true)}"; \
	if [ -n "$$token" ]; then export GITHUB_TOKEN="$$token"; fi; \
	lychee --no-progress .

##@ Security

security-scan: ## Run security scanning on infrastructure with Checkov
	@echo "$(COLOR_BLUE_BG)Running security scanning with Checkov...$(COLOR_RESET)"
	uv tool run --from checkov==$(CHECKOV_VERSION) checkov --config-file .checkov.yaml

secret-scan-ci: ## Scan repository for secrets with Gitleaks
	docker run --rm -v "$(CURDIR)":/repo -w /repo $(GITLEAKS_IMAGE) git \
		--log-opts="--all" --redact --verbose --no-banner --log-level=warn \
		--report-format=sarif --report-path=results.sarif .
	@printf '\033[32mSecret scan passed.\033[0m\n'

##@ Docker

docker-build: ## Build container images with Docker Compose
	@echo "$(COLOR_BLUE_BG)Building containerized services...$(COLOR_RESET)"
	docker-compose build --no-cache

docker-up: docker-build ## Build and start containerized services in background
	@echo "$(COLOR_BLUE_BG)Running containerized services...$(COLOR_RESET)"
	docker-compose up -d

docker-down: ## Stop containerized services
	@echo "$(COLOR_BLUE_BG)Stopping containerized services...$(COLOR_RESET)"
	docker-compose down

docker-clean: ## Clean Docker build and test caches
	@bash scripts/clean-docker-caches.sh

##@ Shortcuts

run: service ## Alias for make service

deadcode: backend-deadcode ## Alias for make backend-deadcode

fallow: frontend-fallow ## Alias for make frontend-fallow

css-quality: frontend-css-quality ## Alias for make frontend-css-quality

accessibility-audit: frontend-accessibility-audit ## Alias for make frontend-accessibility-audit

lighthouse: frontend-lighthouse ## Alias for make frontend-lighthouse

.PHONY: help setup service update-deps \
	lint format type-check test type-coverage clean cache-clean docker-clean \
	fallow deadcode css-quality accessibility-audit lighthouse \
	commitlint markdown-lint markdown-format spell-check workflow-lint actions-lock actions-lock-verify link-check security-scan secret-scan-ci file-naming hooks \
	qa-backend qa-frontend qa \
	run \
	docker-build docker-up docker-down \
	e2e-test e2e-test-docker e2e-update
