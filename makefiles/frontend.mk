FRONTEND_DIR=./frontend

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
	cd $(FRONTEND_DIR) && $(LINT)

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

frontend-e2e-test:
	@echo "$(COLOR_BLUE_BG)Running end-to-end tests...$(COLOR_RESET)"
	cd $(FRONTEND_DIR) && $(PLAYWRIGHT)

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
	frontend-lighthouse frontend-e2e-test frontend-clean run-frontend
