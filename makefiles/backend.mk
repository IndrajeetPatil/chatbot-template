BACKEND_DIR=./backend

# Backend tool commands
PYTEST=uv run pytest app tests
PYCOVERAGE=uv run coverage run -m pytest app tests && uv run coverage report && uv run coverage html && uv run coverage xml
PYTYPECHECK=TY_UV=1 uv run ty check
PYTYPECOVERAGE=uv run pyrefly coverage check --fail-under 100 --strict
FASTAPI_RUNSERVER=uv run --env-file .env fastapi dev app/main.py --host 127.0.0.1 --port 8000
OPENAPI_SCHEMA=TESTING=true uv run python -c "from app.main import app; app.openapi()"
LOCUST=uv run locust -H http://127.0.0.1:8000/
MUTMUT=uv run mutmut
UNREF=uv run unref

##@ Backend

run-backend: ## Run FastAPI backend development server
	@echo "$(COLOR_BLUE_BG)Running backend server...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && $(FASTAPI_RUNSERVER)

backend-setup: ## Install locked backend Python dependencies
	cd $(BACKEND_DIR) && uv sync --frozen

backend-lint: ## Lint backend Python code with ruff
	@echo "$(COLOR_BLUE_BG)Running backend linting with ruff...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && uv run ruff check --fix .

backend-format: ## Format backend code with ruff
	@echo "$(COLOR_BLUE_BG)Running backend formatting...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && uv run ruff check --select missing-trailing-comma --fix .
	cd $(BACKEND_DIR) && uv run ruff format . ../README.md ../AGENTS.md ../docs ../.github/prompts

backend-type-check: ## Check backend types with ty
	@echo "$(COLOR_BLUE_BG)Running backend static type checking with ty...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && $(PYTYPECHECK)

backend-deadcode: ## Check for backend dead code with unref
	@echo "$(COLOR_BLUE_BG)Running backend dead-code checks with unref...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && $(UNREF)

backend-audit: ## Audit backend dependencies with uv and deptry
	@echo "$(COLOR_BLUE_BG)Auditing backend dependencies...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && uv audit --no-dev --frozen --preview-features audit && uv run deptry .

backend-validate-api-schema: ## Validate backend OpenAPI schema generation
	@echo "$(COLOR_BLUE_BG)Validating API schema...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && $(OPENAPI_SCHEMA)

backend-unit-test: ## Run backend unit tests with pytest and coverage
	@echo "$(COLOR_BLUE_BG)Running backend unit tests...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && $(PYCOVERAGE)

# A fresh run every time; the gate fails on any mutant the tests let through.
backend-mutation-test: ## Run backend mutation testing with mutmut
	@echo "$(COLOR_BLUE_BG)Running backend mutation testing with mutmut...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && rm -rf mutants && $(MUTMUT) run && $(MUTMUT) export-cicd-stats
	@# List only the mutants left for tests; those ty rejects are already caught.
	@cd $(BACKEND_DIR) && $(MUTMUT) results | grep -v "caught by type check" || true
	@cd $(BACKEND_DIR) && uv run python -c "import json, sys; stats = json.load(open('mutants/mutmut-cicd-stats.json')); untested = stats['survived'] + stats['no_tests']; print(f'Mutants the tests let through: {untested}'); sys.exit(untested > 0)"

# CodSpeed measures CPU simulation in CI; locally this checks benchmark correctness.
# A fixed hash seed keeps dict and set iteration, and so instruction counts, stable.
backend-benchmark: ## Run backend CodSpeed benchmarks
	@echo "$(COLOR_BLUE_BG)Running backend CodSpeed benchmarks...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && PYTHONHASHSEED=0 uv run pytest benchmarks \
		--codspeed --codspeed-mode=simulation --random-order-bucket=none

backend-snapshot-update: ## Rewrite backend inline snapshots
	@echo "$(COLOR_BLUE_BG)Rewriting backend inline snapshots...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && $(PYTEST) --inline-snapshot=create,fix

backend-type-coverage: ## Enforce 100% strict type coverage with pyrefly
	@echo "$(COLOR_BLUE_BG)Running backend type coverage check...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && $(PYTYPECOVERAGE)

backend-load-test: ## Run backend load tests with Locust
	@echo "$(COLOR_BLUE_BG)Running backend load tests...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && $(FASTAPI_RUNSERVER) & echo $$! > backend.pid
	cd $(BACKEND_DIR) && $(LOCUST)

backend-clean: ## Clean backend build artifacts and caches
	@echo "$(COLOR_BLUE_BG)Cleaning backend build artifacts and caches...$(COLOR_RESET)"
	rm -rf $(BACKEND_DIR)/.venv \
	       $(BACKEND_DIR)/htmlcov \
	       $(BACKEND_DIR)/.coverage \
	       $(BACKEND_DIR)/.coverage.* \
	       $(BACKEND_DIR)/coverage.xml \
	       $(BACKEND_DIR)/.cache \
	       $(BACKEND_DIR)/.hypothesis \
	       $(BACKEND_DIR)/.pytest_cache \
	       $(BACKEND_DIR)/.ruff_cache \
	       $(BACKEND_DIR)/.codspeed \
	       $(BACKEND_DIR)/mutants
	find $(BACKEND_DIR) -type d -name __pycache__ -prune -exec rm -rf {} +

.PHONY: backend-setup backend-lint backend-format backend-type-check backend-deadcode backend-audit \
	backend-validate-api-schema backend-unit-test backend-test backend-mutation-test backend-benchmark \
	backend-snapshot-update \
	backend-type-coverage backend-load-test backend-clean run-backend
