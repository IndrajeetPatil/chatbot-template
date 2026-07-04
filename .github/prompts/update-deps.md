---
name: update-deps
description: Update dependencies and ensure the codebase is compatible with the latest versions
---

# Update Dependencies and Refactor Codebase

Run `make update-deps` to refresh backend uv dependencies, frontend pnpm
dependencies, and prek hook revisions. Then iterate until the full local quality
gate passes:

- `make qa`
- `make frontend-build`
- `make e2e-test`
- `make lighthouse`
- `make docker-build`

Fix any breaking API changes, type errors, lockfile drift, Docker build
failures, coverage regressions, or lint failures introduced by the upgrades.

If the pnpm version changes, update every declaration together:

- `frontend/package.json` (`packageManager`)
- `.github/workflows/qa.yml` (`pnpm/action-setup` `version:`)
- `.github/workflows/tests.yml` (`pnpm/action-setup` `version:` in both jobs)

If the Node.js version changes, update every runtime declaration together:

- `frontend/.nvmrc`
- `frontend/Dockerfile` (`node:<version>-trixie-slim`)

The GitHub workflows read Node from `frontend/.nvmrc`; do not add a separate
hard-coded workflow Node version unless the workflow design changes.

If the Python version changes, update every backend runtime declaration together:

- `backend/pyproject.toml` (`requires-python`)
- `backend/uv.lock` (`requires-python`)
- `backend/Dockerfile` (`python:<version>-slim-trixie`)

If the uv version changes, update every workflow setup declaration together:

- `.github/workflows/qa.yml`
- `.github/workflows/tests.yml`
- `.github/workflows/security.yml`

Do an online search and ensure that the public GitHub Actions used in
`.github/workflows/` are still on the latest stable release. Actions are pinned
by full commit SHA with a `# vX.Y.Z` comment; when updating, replace both the SHA
and the version comment.

Once the dependency update is green, review relevant changelogs and current
documentation for upgraded libraries. Apply small compatibility simplifications
only when they reduce local complexity or remove a workaround, and rerun the
affected checks after each change.

Make a draft PR using the gh CLI, instead of the GitHub MCP server. In the PR
body, summarise dependency groups changed, compatibility fixes made, and the
validation commands that passed.
