# Chatbot Template

React/Vite frontend + FastAPI backend, streaming Azure OpenAI replies.
Start with [README.md](README.md) and the [documentation index](docs/README.md).

## Working here

- Setup and pinned runtime versions: [getting started](docs/getting-started.md).
- Commands, tests, naming, hooks, and CI: [development](docs/development.md).
- Before UI work, read [frontend](docs/frontend.md) and the development guide's
  [Fallow policy](docs/development.md#frontend-code-quality-with-fallow) and
  [visual testing workflow](docs/development.md#browser-and-visual-tests).
- Before API or deployment work, read [backend](docs/backend.md) and
  [security](docs/security.md). Preserve validation before streaming starts.
- Before changing CI reporters, read and preserve the
  [CI output policy](docs/development.md#ci-output).

## Required checks and constraints

- Run `make qa` and `make hooks` for implementation changes; use the relevant
  checks for documentation-only changes. Hooks are managed by prek.
- Keep every check and threshold intact: backend coverage is 100% lines and
  branches; frontend is ≥90% statements/functions/lines and ≥75% branches;
  type coverage is 100% on both sides.
- Fallow: configured dead-code/dependency rules are errors, including unresolved
  imports; strict duplication starts at 50 tokens / 4 lines; cyclomatic and
  cognitive complexity are each ≤5, including tests. No blanket test exclusions.
  Preserve the entry-point and dependency-exception policy in the linked guide.
- Pin all downloaded third-party tools, scripts, and binaries to specific
  versions and validate SHA256 checksums. Never download latest/untagged tools.
- Retain the upstream `ty-pre-commit` hook at a full commit SHA. If its bundled
  uv conflicts with the project pin, downgrade the project uv to the compatible
  version and synchronize the Docker image, installer checksum, and docs.
  Do not replace the upstream hook with a local hook.
- Consult `.ls-lint.yml`: Python snake_case, React components/pages PascalCase,
  client modules/hooks camelCase, scripts/docs/assets kebab-case. Preserve
  `main.tsx` and standard tool filenames; directory overrides replace inherited
  rules. The naming hook requires `make` and `ls-lint` on `PATH`.
- Use conventional commit messages (enforced by commitlint).
- Never commit credentials from `backend/.env`; no `dangerouslySetInnerHTML`.

## Pull requests

Keep the title and body synchronized with the current net diff, update stale
metadata without asking, and verify the live values after editing.
Unless explicitly requested, do not wait for CI/CD after pushing; report that
checks were triggered and include the PR or workflow link.
