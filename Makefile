ifeq ($(OS),Windows_NT)
    COLOR_RESET=
    COLOR_BLUE_BG=
else
    COLOR_RESET=\033[0m
    COLOR_BLUE_BG=\033[44m
endif

include makefiles/backend.mk
include makefiles/frontend.mk

CHECKOV_VERSION := 3.3.17
# Match the previous action's scanner, pinned by digest to prevent tag drift.
GITLEAKS_IMAGE := zricethezav/gitleaks:v8.24.3@sha256:e1b35e12a8c6fa8901f060459cfb6b2fc4c484d3afbe3b029733a3bbfab07055
# Minimum codex-security CLI the codex-security target was validated against. The
# scan-id parsing below relies on `scans show --filter-output scanId`, so refuse
# to run against an older CLI whose flags/output may differ.
CODEX_SECURITY_MIN_VERSION := 0.1.23

# Local development
SERVICE ?= both

setup: backend/.env backend-setup frontend-setup
	@echo "Dependencies ready. Configure backend/.env before running make service."

# An existing environment file is never overwritten, even after template changes.
backend/.env:
	cp backend/.env.example backend/.env

service:
	+bash scripts/run-services.sh "$(SERVICE)" "$(MAKE)"

# Dependency updates
update-deps:
	@echo "$(COLOR_BLUE_BG)Updating backend Python dependencies...$(COLOR_RESET)"
	cd ./backend && uv lock --upgrade && uv sync
	@echo "$(COLOR_BLUE_BG)Updating frontend Node dependencies...$(COLOR_RESET)"
	cd ./frontend && pnpm update
	@echo "$(COLOR_BLUE_BG)Refreshing registry package revisions...$(COLOR_RESET)"
	cd ./frontend && pnpm update --patches
	@echo "$(COLOR_BLUE_BG)Updating prek hook revisions...$(COLOR_RESET)"
	prek update --freeze

upgrade-deps: update-deps

# Aggregate targets
lint: file-naming backend-lint frontend-lint markdown-lint
format: backend-format frontend-format markdown-format
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
commitlint:
	@echo "$(COLOR_BLUE_BG)Running commit message linting with commitlint...$(COLOR_RESET)"
	@test -n "$(COMMIT_EDITMSG)" || (echo "Set COMMIT_EDITMSG=/path/to/commit-message-file" && exit 2)
	prek run commitlint --stage commit-msg --commit-msg-filename "$(COMMIT_EDITMSG)"

markdown-lint:
	@echo "$(COLOR_BLUE_BG)Running markdown linting with rumdl...$(COLOR_RESET)"
	uv tool run --from rumdl==0.2.72 rumdl check .

markdown-format:
	@echo "$(COLOR_BLUE_BG)Formatting Markdown with rumdl...$(COLOR_RESET)"
	uv tool run --from rumdl==0.2.72 rumdl fmt .

security-scan:
	@echo "$(COLOR_BLUE_BG)Running security scanning with Checkov...$(COLOR_RESET)"
	uv tool run --from checkov==$(CHECKOV_VERSION) checkov --config-file .checkov.yaml

# Full fetched history, redacted findings, and a SARIF artifact for CI.
secret-scan-ci:
	docker run --rm -v "$(CURDIR)":/repo -w /repo $(GITLEAKS_IMAGE) git \
		--log-opts="--all" --redact --verbose --no-banner --log-level=warn \
		--report-format=sarif --report-path=results.sarif .
	@printf '\033[32mSecret scan passed.\033[0m\n'

# Agentic security review: scan with codex-security, then hand the completed
# scan to a spawned Claude Code that triages the findings, fixes the worthwhile
# ones, and opens a PR (see .github/prompts/codex-security.md). A scan is
# referenced by its scanId; findings live in the scan directory and are read
# with `codex-security scans show <scanId>`.
#
# The recipe creates a fresh branch off origin/main and scans THAT tree, so the
# findings, the fixes, and the eventual PR all refer to the same baseline no
# matter which branch you invoke it from. The branch name is unique per run so
# repeated invocations do not collide.
#
# SECURITY: this spawns an autonomous agent with `--dangerously-skip-permissions`,
# which removes Claude Code's command-approval boundary. The scan report and the
# source it inspects are attacker-influenceable, so a prompt-injection payload
# could misuse your shell or `gh` credentials. Run this ONLY in an isolated,
# ephemeral environment with no production secrets beyond a scoped GITHUB token
# and, ideally, restricted network egress. codex-security and claude must already
# be installed; the recipe refuses to run an unexpectedly old codex-security CLI.
codex-security:
	@echo "$(COLOR_BLUE_BG)Running codex-security scan...$(COLOR_RESET)"
	@echo "$(COLOR_BLUE_BG)WARNING: spawns an autonomous agent with --dangerously-skip-permissions; run only in an isolated, credential-limited sandbox.$(COLOR_RESET)"
	@set -eu; \
	command -v codex-security >/dev/null 2>&1 || { echo "codex-security is not installed or not on PATH." >&2; exit 1; }; \
	command -v claude >/dev/null 2>&1 || { echo "claude (Claude Code) is not installed or not on PATH." >&2; exit 1; }; \
	cs_version="$$(codex-security --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)"; \
	if [ -z "$$cs_version" ]; then echo "Could not determine the codex-security version." >&2; exit 1; fi; \
	if [ "$$(printf '%s\n%s\n' "$(CODEX_SECURITY_MIN_VERSION)" "$$cs_version" | sort -t. -k1,1n -k2,2n -k3,3n | head -n1)" != "$(CODEX_SECURITY_MIN_VERSION)" ]; then \
		echo "codex-security $$cs_version is older than the required $(CODEX_SECURITY_MIN_VERSION); its flags/output may differ." >&2; \
		exit 1; \
	fi; \
	if [ -n "$$(git status --porcelain)" ]; then \
		echo "Working tree is not clean; commit, stash, or remove local changes first." >&2; \
		echo "This target checks out a fresh branch off origin/main, and uncommitted (or untracked) changes would be carried onto it and scanned/committed as if they were part of the fix." >&2; \
		exit 1; \
	fi; \
	prompt_src=".github/prompts/codex-security.md"; \
	if [ ! -f "$$prompt_src" ]; then echo "Prompt $$prompt_src not found in the current checkout." >&2; exit 1; fi; \
	prompt_copy="$$(mktemp "$${TMPDIR:-/tmp}/codex-security-prompt.XXXXXX")"; \
	trap 'rm -f "$$prompt_copy"' EXIT; \
	cp "$$prompt_src" "$$prompt_copy"; \
	echo "$(COLOR_BLUE_BG)Preparing a clean branch off origin/main to scan and fix...$(COLOR_RESET)"; \
	git fetch origin; \
	branch="codex-security-fixes-$$(date +%Y%m%d%H%M%S)"; \
	git checkout --no-track -b "$$branch" origin/main; \
	echo "$(COLOR_BLUE_BG)Scanning branch $$branch...$(COLOR_RESET)"; \
	codex-security scan . --model gpt-5.6-sol --effort high; \
	scan_id="$$(codex-security scans show --filter-output scanId | tr -d '[:space:]')"; \
	if [ -z "$$scan_id" ]; then \
		echo "Could not determine the completed codex-security scan id." >&2; \
		exit 1; \
	fi; \
	echo "$(COLOR_BLUE_BG)Scan complete: $$scan_id (branch $$branch)$(COLOR_RESET)"; \
	echo "$(COLOR_BLUE_BG)Spawning Claude Code to triage and fix findings...$(COLOR_RESET)"; \
	claude --dangerously-skip-permissions -p "Follow the instructions in the file $$prompt_copy (a preserved copy of this repository's .github/prompts/codex-security.md, kept outside the checkout because the working tree was switched to origin/main and that path may not exist there yet) to triage the codex-security findings, fix the ones worth fixing, and open a pull request. You are already on a dedicated branch '$$branch' created from origin/main, and the scan ran against this exact tree, so make all fixes here and do not create another branch. The completed scan id is $$scan_id; read its findings with 'codex-security scans show $$scan_id'."

file-naming:
	@echo "$(COLOR_BLUE_BG)Running file naming checks with ls-lint...$(COLOR_RESET)"
	ls-lint

hooks:
	@echo "$(COLOR_BLUE_BG)Running prek hooks on all files...$(COLOR_RESET)"
	prek run --all-files

# Quality assurance suites
qa-backend: file-naming backend-lint backend-format backend-type-check backend-audit backend-test backend-type-coverage
qa-frontend: file-naming frontend-lint frontend-format frontend-type-check frontend-test frontend-build frontend-audit frontend-fallow frontend-css-quality frontend-contrast-audit frontend-security-lint frontend-type-coverage
qa: format lint type-check backend-validate-api-schema test fallow css-quality frontend-build frontend-contrast-audit frontend-security-lint type-coverage security-scan

# Run targets
run: service

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

# Browser behavior locally; Linux visual comparisons use the pinned CI image.
e2e-test: frontend-e2e-test
e2e-test-docker: frontend-e2e-test-docker

e2e-update:
	$(MAKE) e2e-test-docker E2E_ARGS="--update-snapshots $(E2E_ARGS)"

.PHONY: setup service update-deps upgrade-deps \
	lint format type-check test type-coverage clean \
	fallow css-quality contrast-audit lighthouse \
	commitlint markdown-lint markdown-format security-scan secret-scan-ci codex-security file-naming hooks \
	qa-backend qa-frontend qa \
	run \
	docker-build docker-up docker-down \
	e2e-test e2e-test-docker e2e-update
