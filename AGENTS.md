# Chatbot Template

Project-level instructions for AI coding agents working on this repository.
Codex, GitHub Copilot (code review and coding agent), and other
`AGENTS.md`-aware tools read this file directly.

Full-stack chatbot: React frontend + FastAPI backend,
streamed via Azure OpenAI GPT-4o.

## Setup

```bash
cd backend && uv sync --frozen          # Python 3.14, uv 0.11.29
cd frontend && pnpm install --frozen-lockfile  # Node.js 24, pnpm 11.9.0
```

Copy `backend/.env.example` → `backend/.env` and fill in
Azure OpenAI credentials before running.

## Commands

```bash
make update-deps # refresh backend/frontend deps and prek hook revisions
make qa          # full suite: format, lint, type-check, tests,
                 #   coverage, API schema, frontend audits, security
make tooling-check # verify agent skill symlink wiring
make test        # unit tests only
make format      # auto-format (Ruff + Biome)
make lint        # lint (Ruff + Biome + rumdl; ESLint runs via make qa)
make type-check  # static types (ty + tsc)
make security-scan # Checkov scan of Docker and GitHub Actions configuration
make contrast-audit # built frontend contrast audit in light/dark mode
make lighthouse  # Lighthouse CI assertions against the built frontend
make docker-build # build both service images with Docker Compose
make run         # start both servers
                 #   frontend :3000, backend :8000, Swagger :8000/docs
docker-compose up
```

The CI-only Security Scan workflow adds full-history Gitleaks, online zizmor,
and production dependency audits on pushes, pull requests, weekly schedules,
and manual dispatches.

Unless explicitly requested, do not wait for CI/CD checks to finish after
pushing. Report that the checks were triggered and include the relevant PR or
workflow link instead.

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
