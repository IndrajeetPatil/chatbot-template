FRONTEND_DIR=./frontend

# Vite+ (`vp`) manages Node, pnpm, and the frontend toolchain.
VP ?= vp

# Keep the version aligned with @playwright/test in frontend/pnpm-lock.yaml.
# Pin both the image digest and architecture so Apple Silicon and CI agree.
PLAYWRIGHT_IMAGE := mcr.microsoft.com/playwright:v1.65.1-noble@sha256:1507cbfc550a63a6b7396791ca4f00df17beb56342d2447b3f106c306f525579

# Local runs fix what they can; CI passes LINT_ARGS= FMT_ARGS=--check to verify.
LINT_ARGS ?= --fix
FMT_ARGS ?=
CHECK_ARGS ?= --fix

# Configuration files outside frontend/ are formatted by the frontend's Oxfmt.
# Markdown belongs to rumdl and Python to Ruff.
CONFIG_FILES = $(shell git ls-files -- '*.yml' '*.yaml' '*.json' '*.toml' '*.mjs' ':!:frontend/**')

frontend-setup: ## Install locked frontend dependencies with Vite+
	cd $(FRONTEND_DIR) && $(VP) install --frozen-lockfile

frontend-toolchain-align: ## Align frontend dependencies with Vite+ toolchain
	cd $(FRONTEND_DIR) && $(VP) exec vp migrate --no-interactive --no-hooks --no-agent --no-editor

frontend-check: ## Check frontend formatting, linting, and types with Vite+
	@echo "$(COLOR_BLUE_BG)Checking frontend format, lint, and types with Vite+...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VP) run check $(CHECK_ARGS)

frontend-qa: ## Run frontend QA checks with Vite+
	cd $(FRONTEND_DIR) && $(VP) run qa

frontend-css-lint: ## Lint frontend CSS with Biome
	cd $(FRONTEND_DIR) && $(VP) run lint:css

frontend-lint: ## Lint frontend code with Oxlint and Biome
	@echo "$(COLOR_BLUE_BG)Running frontend linting with Oxlint and Biome (CSS)...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VP) lint --deny-warnings $(LINT_ARGS) && $(VP) run lint:css

frontend-format: ## Format frontend code with Oxfmt
	@echo "$(COLOR_BLUE_BG)Running frontend formatting with Oxfmt...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VP) fmt $(FMT_ARGS)

config-format: ## Format configuration files outside frontend with Oxfmt
	@echo "$(COLOR_BLUE_BG)Formatting configuration files with Oxfmt...$(COLOR_RESET)"
	@cd $(FRONTEND_DIR) && $(VP) fmt $(FMT_ARGS) $(addprefix $(CURDIR)/,$(CONFIG_FILES))

frontend-type-check: ## Check frontend types with TypeScript
	@echo "$(COLOR_BLUE_BG)Running frontend static type checking with TypeScript...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VP) check --no-fmt --no-lint

frontend-test: ## Run frontend unit tests in Chromium with Vitest
	@echo "$(COLOR_BLUE_BG)Running frontend unit tests in Chromium...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VP) test --coverage

frontend-build: ## Build frontend production assets
	@echo "$(COLOR_BLUE_BG)Building frontend...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VP) run build

frontend-audit: ## Audit frontend dependencies with pnpm
	@echo "$(COLOR_BLUE_BG)Auditing frontend dependencies...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VP) pm audit -- --audit-level=moderate

frontend-fallow: ## Run frontend dead-code, complexity, and duplication checks
	@echo "$(COLOR_BLUE_BG)Running frontend dead-code/complexity/duplication checks with fallow...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VP) run fallow

frontend-css-quality: ## Run frontend CSS quality checks
	@echo "$(COLOR_BLUE_BG)Running frontend CSS code quality checks...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VP) run css-quality

frontend-accessibility-audit: ## Run frontend axe accessibility audit across UI states
	@echo "$(COLOR_BLUE_BG)Running frontend axe accessibility audit across UI states, themes, and layouts...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VP) run accessibility-audit

frontend-type-coverage: ## Check frontend TypeScript type coverage
	@echo "$(COLOR_BLUE_BG)Running frontend type coverage check...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VP) run type-coverage

frontend-lighthouse: ## Run Lighthouse CI audits against frontend preview
	@echo "$(COLOR_BLUE_BG)Running Lighthouse CI...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VP) run lighthouse

frontend-e2e-test: ## Run frontend Playwright end-to-end tests locally
	@echo "$(COLOR_BLUE_BG)Running end-to-end tests...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VP) run test:e2e $(E2E_ARGS)

# Dedicated Linux dependencies never overwrite the host installation.
# Mirror the repository layout so annotations resolve frontend/ paths from /work.
frontend-e2e-test-docker: ## Run frontend Playwright end-to-end tests in Docker
	docker run --rm --init --ipc=host --platform linux/amd64 \
		-e HOST_UID="$$(id -u)" -e HOST_GID="$$(id -g)" \
		-e CI=1 -e FORCE_COLOR -e CLICOLOR_FORCE -e GITHUB_ACTIONS \
		-e GITHUB_WORKSPACE=/work -v "$(CURDIR)/frontend":/work/frontend \
		-v chatbot-pw-node-modules:/work/frontend/node_modules \
		-v chatbot-pw-vite-plus:/root/.vite-plus \
		-w /work/frontend $(PLAYWRIGHT_IMAGE) bash scripts/run-e2e-docker.sh $(E2E_ARGS)

frontend-clean: ## Clean frontend build artifacts and caches
	@echo "$(COLOR_BLUE_BG)Cleaning frontend build artifacts and caches...$(COLOR_RESET)"
	rm -rf $(FRONTEND_DIR)/node_modules \
	       $(FRONTEND_DIR)/dist \
	       $(FRONTEND_DIR)/coverage \
	       $(FRONTEND_DIR)/.vitest \
	       $(FRONTEND_DIR)/playwright-report \
	       $(FRONTEND_DIR)/test-results \
	       $(FRONTEND_DIR)/blob-report \
	       $(FRONTEND_DIR)/playwright/.cache \
	       $(FRONTEND_DIR)/.cache \
	       $(FRONTEND_DIR)/.pnpm-store \
	       $(FRONTEND_DIR)/.fallow \
	       $(FRONTEND_DIR)/.lighthouseci
	rm -f $(FRONTEND_DIR)/*.tsbuildinfo

run-frontend: ## Run frontend development server with Vite+
	@echo "$(COLOR_BLUE_BG)Running frontend server...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VP) dev --host 127.0.0.1 --strictPort

frontend-preview: ## Preview built frontend locally
	cd $(FRONTEND_DIR) && $(VP) run preview

.PHONY: frontend-setup frontend-toolchain-align frontend-check frontend-qa frontend-css-lint \
	frontend-lint frontend-format config-format frontend-type-check \
	frontend-test frontend-build frontend-audit frontend-fallow \
	frontend-css-quality frontend-accessibility-audit frontend-type-coverage \
	frontend-lighthouse frontend-e2e-test frontend-e2e-test-docker frontend-clean run-frontend frontend-preview
