FRONTEND_DIR=./frontend

# Keep the version aligned with @playwright/test in frontend/pnpm-lock.yaml.
# Pin both the image digest and architecture so Apple Silicon and CI agree.
PLAYWRIGHT_IMAGE := mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27

# Frontend tool commands
LINT=pnpm run lint
TSC=pnpm run check-types
AUDIT=pnpm audit --audit-level=moderate
BUILD=pnpm run build
VITEST=pnpm run test
VITE_START=pnpm run start
PLAYWRIGHT=pnpm run test:e2e
FALLOW=pnpm run fallow
CSS_QUALITY=pnpm run css-quality
CONTRAST_AUDIT=pnpm run contrast-audit
SECURITY_LINT=pnpm run lint:security
TSCOVERAGE=pnpm run type-coverage
LHCI=pnpm dlx @lhci/cli@0.15.1

frontend-lint:
	@echo "$(COLOR_BLUE_BG)Running frontend linting and formatting...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(LINT) $(BIOME_ARGS)

frontend-format: frontend-lint

frontend-type-check:
	@echo "$(COLOR_BLUE_BG)Running frontend static type checking with TypeScript...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(TSC)

frontend-test:
	@echo "$(COLOR_BLUE_BG)Running frontend unit tests...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VITEST)

frontend-build:
	@echo "$(COLOR_BLUE_BG)Building frontend...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(BUILD)

frontend-audit:
	@echo "$(COLOR_BLUE_BG)Auditing frontend dependencies...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(AUDIT)

frontend-fallow:
	@echo "$(COLOR_BLUE_BG)Running frontend dead-code/complexity/duplication checks with fallow...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(FALLOW)

frontend-css-quality:
	@echo "$(COLOR_BLUE_BG)Running frontend CSS code quality checks...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(CSS_QUALITY)

frontend-contrast-audit:
	@echo "$(COLOR_BLUE_BG)Running frontend contrast audit in light and dark mode...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(CONTRAST_AUDIT)

frontend-security-lint:
	@echo "$(COLOR_BLUE_BG)Running frontend security linting with ESLint...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(SECURITY_LINT)

frontend-type-coverage:
	@echo "$(COLOR_BLUE_BG)Running frontend type coverage check...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(TSCOVERAGE)

frontend-lighthouse:
	@echo "$(COLOR_BLUE_BG)Running Lighthouse CI...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(LHCI) autorun

frontend-e2e-test: frontend-build
	@echo "$(COLOR_BLUE_BG)Running end-to-end tests...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(PLAYWRIGHT) $(E2E_ARGS)

# Dedicated Linux dependencies never overwrite the host installation.
# Mirror the repository layout so annotations resolve frontend/ paths from /work.
frontend-e2e-test-docker:
	docker run --rm --init --ipc=host --platform linux/amd64 \
		-e HOST_UID="$$(id -u)" -e HOST_GID="$$(id -g)" \
		-e CI=1 -e FORCE_COLOR -e CLICOLOR_FORCE -e GITHUB_ACTIONS \
		-e GITHUB_WORKSPACE=/work -v "$(CURDIR)/frontend":/work/frontend \
		-v chatbot-pw-node-modules:/work/frontend/node_modules \
		-w /work/frontend $(PLAYWRIGHT_IMAGE) bash scripts/run-e2e-docker.sh $(E2E_ARGS)

frontend-clean:
	@echo "$(COLOR_BLUE_BG)Cleaning frontend build artifacts and caches...$(COLOR_RESET)"
	rm -rf $(FRONTEND_DIR)/node_modules \
	       $(FRONTEND_DIR)/dist \
	       $(FRONTEND_DIR)/coverage \
	       $(FRONTEND_DIR)/playwright-report \
	       $(FRONTEND_DIR)/test-results \
	       $(FRONTEND_DIR)/.fallow \
	       $(FRONTEND_DIR)/.lighthouseci

run-frontend:
	@echo "$(COLOR_BLUE_BG)Running frontend server...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(VITE_START) & echo $$! > frontend.pid

.PHONY: frontend-lint frontend-format frontend-type-check \
	frontend-test frontend-build frontend-audit frontend-fallow \
	frontend-css-quality frontend-contrast-audit frontend-security-lint frontend-type-coverage \
	frontend-lighthouse frontend-e2e-test frontend-e2e-test-docker frontend-clean run-frontend
