ifeq ($(OS),Windows_NT)
    COLOR_RESET=
    COLOR_BLUE_BG=
else
    COLOR_RESET=\033[0m
    COLOR_BLUE_BG=\033[44m
endif

include makefiles/backend.mk
include makefiles/frontend.mk

CHECKOV_VERSION := 3.2.526

# Dependency updates
update-deps:
	@echo "$(COLOR_BLUE_BG)Updating backend Python dependencies...$(COLOR_RESET)"
	cd ./backend && uv lock --upgrade && uv sync
	@echo "$(COLOR_BLUE_BG)Updating frontend Node dependencies...$(COLOR_RESET)"
	cd ./frontend && pnpm update
	@echo "$(COLOR_BLUE_BG)Updating prek hook revisions...$(COLOR_RESET)"
	prek auto-update

upgrade-deps: update-deps

# Aggregate targets
lint: backend-lint frontend-lint markdown-lint
format: backend-format frontend-format
type-check: backend-type-check frontend-type-check
test: backend-test frontend-test
type-coverage: backend-type-coverage frontend-type-coverage
clean: backend-clean frontend-clean

# Convenience aliases for frontend-only tools
fallow: frontend-fallow
css-quality: frontend-css-quality
contrast-audit: frontend-build frontend-contrast-audit
lighthouse: frontend-build frontend-lighthouse

# Project-wide tools
tooling-check:
	@echo "$(COLOR_BLUE_BG)Checking repo tooling symlinks...$(COLOR_RESET)"
	python3 scripts/check-repo-symlinks.py

commitlint:
	@echo "$(COLOR_BLUE_BG)Running commit message linting with commitlint...$(COLOR_RESET)"
	@test -n "$(COMMIT_EDITMSG)" || (echo "Set COMMIT_EDITMSG=/path/to/commit-message-file" && exit 2)
	prek run commitlint --stage commit-msg --commit-msg-filename "$(COMMIT_EDITMSG)"

markdown-lint:
	@echo "$(COLOR_BLUE_BG)Running markdown linting with rumdl...$(COLOR_RESET)"
	uv tool run --from rumdl==0.1.86 rumdl check .

security-scan:
	@echo "$(COLOR_BLUE_BG)Running security scanning with Checkov...$(COLOR_RESET)"
	uv tool run --from checkov==$(CHECKOV_VERSION) checkov --config-file .checkov.yaml

file-naming:
	@echo "$(COLOR_BLUE_BG)Running file naming checks with ls-lint...$(COLOR_RESET)"
	ls-lint

hooks:
	@echo "$(COLOR_BLUE_BG)Running prek hooks on all files...$(COLOR_RESET)"
	prek run --all-files

# Quality assurance suites
qa-backend: backend-lint backend-format backend-type-check backend-audit backend-test backend-type-coverage
qa-frontend: frontend-lint frontend-format frontend-type-check frontend-test frontend-build frontend-audit frontend-fallow frontend-css-quality frontend-contrast-audit frontend-security-lint frontend-type-coverage
qa: format lint type-check backend-validate-api-schema test fallow css-quality frontend-build frontend-contrast-audit frontend-security-lint type-coverage file-naming security-scan

# Run targets
run: run-backend run-frontend

# Docker targets
docker-build:
	@echo "$(COLOR_BLUE_BG)Building containerized services...$(COLOR_RESET)"
	docker-compose build --no-cache

docker-up: docker-build
	@echo "$(COLOR_BLUE_BG)Running containerized services...$(COLOR_RESET)"
	docker-compose up -d

docker-down:
	@echo "$(COLOR_BLUE_BG)Stopping containerized services...$(COLOR_RESET)"
	docker-compose down

# End-to-end testing (Playwright manages the frontend dev server via webServer config)
e2e-test:
	$(MAKE) frontend-e2e-test

.PHONY: update-deps upgrade-deps \
	lint format type-check test type-coverage clean \
	fallow css-quality contrast-audit lighthouse \
	tooling-check commitlint markdown-lint security-scan file-naming hooks \
	qa-backend qa-frontend qa \
	run \
	docker-build docker-up docker-down \
	e2e-test
