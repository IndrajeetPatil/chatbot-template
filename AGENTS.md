# Chatbot Template

Project-level instructions for AI coding agents working on this repository.
Codex, GitHub Copilot (code review and coding agent), and other
`AGENTS.md`-aware tools read this file directly.

Full-stack chatbot: React frontend + FastAPI backend,
streamed via Azure Foundry GPT-6 Astra and GPT-5.6 Sol.

## Setup

```bash
cd backend && uv sync --frozen          # Python 3.14, uv 0.12.12
cd frontend && pnpm install --frozen-lockfile  # Node.js 24, pnpm 12.4.1
```

Copy `backend/.env.example` → `backend/.env` and fill in
Azure OpenAI credentials before running.

## Commands

```bash
make update-deps # refresh backend/frontend deps and prek hook revisions
make qa          # full suite: format, lint, type-check, tests,
                 #   coverage, API schema, frontend audits, security
make test        # unit tests only
make e2e-test    # browser behavior against a production build (visuals skip off-Linux)
make e2e-test-docker # behavior + visual snapshots in the pinned CI renderer
make e2e-update  # regenerate visual baselines in that same renderer
make format      # auto-format (Ruff + Biome)
make lint        # lint (ls-lint + Ruff + Biome + rumdl; ESLint runs via make qa)
make file-naming # repository-wide stack-specific filename checks
make type-check  # static types (ty + tsc)
make security-scan # Checkov scan of Docker and GitHub Actions configuration
make contrast-audit # built frontend contrast audit in light/dark mode
make lighthouse  # Lighthouse CI assertions against the built frontend
make docker-build # build both service images with Docker Compose
make run         # start both servers
                 #   frontend :3000, backend :8000, Swagger :8000/docs
docker-compose up
```

The CI-only Security Scan workflow adds full-history Gitleaks with redacted SARIF
reports, online zizmor, and production dependency audits on pushes, pull requests,
weekly schedules, and manual dispatches.

Unless explicitly requested, do not wait for CI/CD checks to finish after
pushing. Report that the checks were triggered and include the relevant PR or
workflow link instead.

## CI output

Keep all checks and thresholds intact when changing reporting. The QA workflow
runs the `make qa` gates as separate steps in the same job. Fallow validates its
configuration with `doctor`, emits GitHub annotations and a compact job summary,
and retains `--fail-on-issues --quiet --summary` as the enforcement gate. Do not
rely on CI reporter exit codes alone. `make fallow` keeps the full local report;
health scores and template statistics are advisory.

Workflows force colour with `FORCE_COLOR`, `CLICOLOR_FORCE`, and tool-specific
controls (`UV_COLOR`, `PREK_COLOR`, Biome's `--colors=force`, zizmor's
`--color=always`, and pytest's `--color=yes`). Dependency installs retain warnings
and errors. Build and Lighthouse measurement details are collapsible; test
reporters retain failure details, annotations, and coverage/HTML artifacts.
Pass colour settings into Docker explicitly and mirror the repository layout
so browser annotations include the `frontend/` prefix.

## Hard constraints

- **Third-party tools**: All downloaded third-party tools, scripts,
  and binaries must be pinned to specific versions and validated using
  SHA256 checksums. Never download the latest or untagged versions.
- **Backend coverage**: 100% lines + branches
  (`fail_under = 100` in `pyproject.toml`).
- **Frontend coverage**: ≥ 90% statements/functions/lines,
  ≥ 75% branches.
- **Type coverage**: 100% both sides (`typecoverage` for Python,
  `type-coverage --strict` for TypeScript).
- **File naming**: enforced by ls-lint 2.3.1 in `make lint`, all QA suites,
  and the `ls-lint` prek pre-commit hook (`make` and `ls-lint` must be on `PATH`).
  Use snake_case for Python, PascalCase for React components/pages, camelCase
  for client modules/hooks, and kebab-case for scripts, docs, and assets.
  Preserve `main.tsx` and standard tool filenames. Consult `.ls-lint.yml`
  before naming files; directory overrides replace all inherited rules.
- **Commit messages**: conventional commits format
  (enforced by `commitlint`).
- **Pre-commit hooks**: managed by `prek` —
  run `make hooks` to verify all files pass.
- **ty hook compatibility**: retain the upstream `ty-pre-commit` hook pinned to
  a full commit SHA. If its bundled uv version conflicts with the project's
  required uv version, downgrade the project uv pin to the compatible version
  and synchronize its Docker image, installer checksum, and documentation.
  Do not replace the upstream hook with a local hook to avoid this conflict.
- **No `dangerouslySetInnerHTML`** — blocked by ESLint security rules.
