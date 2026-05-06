BACKEND_DIR=./backend

# Backend tool commands
PYTEST=uv run pytest app tests --verbose
PYCOVERAGE=uv run coverage run -m pytest app tests && uv run coverage report && uv run coverage html && uv run coverage xml
PYTYPECOVERAGE=uv run python -m typecoverage app tests locustfile.py --recursive --exit-nonzero-on-issues
FASTAPI_RUNSERVER=uv run fastapi dev app/main.py --host 0.0.0.0 --port 8000
OPENAPI_SCHEMA=TESTING=true uv run python -c "from app.main import app; app.openapi()"
LOCUST=uv run locust -H http://127.0.0.1:8000/

backend-lint:
	@echo "$(COLOR_BLUE_BG)Running backend linting with ruff...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && uv run ruff check --fix .

backend-format:
	@echo "$(COLOR_BLUE_BG)Running backend formatting...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && find . -name '*.py' -not -path './.venv/*' -print0 | xargs -0 uv run add-trailing-comma --exit-zero-even-if-changed
	cd $(BACKEND_DIR) && uv run ruff format .

backend-type-check:
	@echo "$(COLOR_BLUE_BG)Running backend static type checking with ty...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && uv run ty check

backend-audit:
	@echo "$(COLOR_BLUE_BG)Auditing backend dependencies...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && uv audit --no-dev --frozen --preview-features audit

backend-validate-api-schema:
	@echo "$(COLOR_BLUE_BG)Validating API schema...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && $(OPENAPI_SCHEMA)

backend-test:
	@echo "$(COLOR_BLUE_BG)Running backend unit tests...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && $(PYTEST) && $(PYCOVERAGE)

backend-type-coverage:
	@echo "$(COLOR_BLUE_BG)Running backend type coverage check...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && $(PYTYPECOVERAGE)

backend-load-test:
	@echo "$(COLOR_BLUE_BG)Running backend load tests...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && $(FASTAPI_RUNSERVER) & echo $$! > backend.pid
	cd $(BACKEND_DIR) && $(LOCUST)

backend-clean:
	@echo "$(COLOR_BLUE_BG)Cleaning backend build artifacts and caches...$(COLOR_RESET)"
	rm -rf $(BACKEND_DIR)/.venv \
	       $(BACKEND_DIR)/htmlcov \
	       $(BACKEND_DIR)/.coverage \
	       $(BACKEND_DIR)/.pytest_cache \
	       $(BACKEND_DIR)/.ruff_cache
	find $(BACKEND_DIR) -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

run-backend:
	@echo "$(COLOR_BLUE_BG)Running backend server...$(COLOR_RESET)"
	cd $(BACKEND_DIR) && $(FASTAPI_RUNSERVER) & echo $$! > backend.pid

.PHONY: backend-lint backend-format backend-type-check backend-audit \
	backend-validate-api-schema backend-test backend-type-coverage \
	backend-load-test backend-clean run-backend
