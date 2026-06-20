# Chatbot Template

Full-stack chatbot: React frontend + FastAPI backend,
streamed via Azure OpenAI GPT-4o.

## Setup

```bash
cd backend && uv sync --frozen          # Python 3.14, uv ≥ 0.11.10
cd frontend && pnpm install --frozen-lockfile  # Node.js 24, pnpm 11.8.0
```

Copy `backend/.env.example` → `backend/.env` and fill in
Azure OpenAI credentials before running.

## Commands

```bash
make update-deps # refresh backend/frontend deps and prek hook revisions
make qa          # full suite: format, lint, type-check, test,
                 #   coverage, security — run before every commit
make test        # unit tests only
make format      # auto-format (Ruff + Biome)
make lint        # lint (Ruff + Biome + rumdl; ESLint runs via make qa)
make type-check  # static types (ty + tsc)
make run         # start both servers
                 #   frontend :3000, backend :8000, Swagger :8000/docs
docker-compose up
```

## Hard constraints

- **Backend coverage**: 100% lines + branches
  (`fail_under = 100` in `pyproject.toml`).
- **Frontend coverage**: ≥ 90% statements/functions/lines,
  ≥ 75% branches.
- **Type coverage**: 100% both sides (`typecoverage` for Python,
  `type-coverage --strict` for TypeScript).
- **File naming**: enforced by `ls-lint`; rules differ per directory
  (consult `.ls-lint.yml` before naming new files).
- **Commit messages**: conventional commits format
  (enforced by `commitlint`).
- **Pre-commit hooks**: managed by `prek` —
  run `make hooks` to verify all files pass.
- **No `dangerouslySetInnerHTML`** — blocked by ESLint security rules.
