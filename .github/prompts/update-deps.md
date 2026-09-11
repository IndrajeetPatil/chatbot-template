---
name: update-deps
description: Update dependencies and ensure the codebase is compatible with the latest versions
---

# Update Dependencies and Refactor Codebase

Run `make update-deps` to refresh backend uv dependencies, frontend pnpm
dependencies, registry package revisions, and prek hook revisions. Then iterate
until the full local quality gate passes:

- `make qa`
- `make frontend-build`
- `make e2e-test-docker`
- `make lighthouse`
- `make contrast-audit`
- `make docker-build`

Fix any breaking API changes, type errors, lockfile drift, Docker build
failures, coverage regressions, or lint failures introduced by the upgrades.

When Playwright changes, synchronize the image tag and SHA256 digest in
`makefiles/frontend.mk` with the locked `@playwright/test` version. Use
`make e2e-update` to regenerate baselines in the pinned renderer, review the PNGs,
then rerun `make e2e-test-docker` without updating.

If the pnpm version changes, update the canonical declaration in:

- `frontend/package.json` (`packageManager`)

The GitHub workflows read pnpm from `frontend/package.json` via
`pnpm/action-setup`'s `package_json_file` input, and the devcontainer uses
Corepack to install the same pinned version. Do not add or reintroduce hard-coded
pnpm versions in workflow files.

If the Node.js version changes, update every runtime declaration together:

- `frontend/package.json` (`devEngines.runtime.version`)
- `frontend/.nvmrc`
- `frontend/Dockerfile` (`node:<version>-trixie-slim`)
- `.devcontainer/devcontainer.json`
  (`ghcr.io/devcontainers/features/node` `version`)

The GitHub workflows use the runtime resolved from `frontend/package.json` by
pnpm. Do not add a separate hard-coded workflow Node version or a redundant
`actions/setup-node` step unless the workflow design changes.

If the Python version changes, update every backend runtime declaration together:

- `backend/pyproject.toml` (`requires-python`)
- `backend/uv.lock` (`requires-python`)
- `backend/Dockerfile` (`python:<version>-slim-trixie`)

If the uv version changes, update the canonical declaration in:

- `backend/pyproject.toml` (`[tool.uv]` `required-version`)
- `backend/Dockerfile` (update the `uv` image tag and its `@sha256:` digest)
- `.devcontainer/post-create.sh` (update the `uv-installer.sh` SHA checksum)

The GitHub workflows read uv from `backend/pyproject.toml` via
`astral-sh/setup-uv`'s `working-directory` input, and `.devcontainer/post-create.sh`
derives the installed uv version from the same field. Do not mirror that version
into workflow files.

Refresh the pinned Docker base image digests even when the image tag does not
change. Every `FROM` (and `COPY --from`) in `backend/Dockerfile` and
`frontend/Dockerfile` is pinned as `<image>:<tag>@sha256:<digest>`; the digest
freezes the exact bytes, so OS security patches published by Debian/Node under
the same tag are only picked up when the digest is re-pinned. For each pinned
image (`python:<version>-slim-trixie`, `ghcr.io/astral-sh/uv:<version>`,
`node:<version>-trixie-slim`, `debian:trixie-slim`), pull the current tag and
update the `@sha256:` digest to the latest published one, keeping the human
readable tag intact. This is the mechanism that clears OS-package CVEs (e.g.
`perl-base`, `zlib`, `libsqlite3`) from the Trivy scan, so do it before
reconciling `.trivyignore.yaml` below.

For any other third-party tools updated (e.g., Trivy in
`.github/workflows/docker-compose.yml`), ensure their downloaded scripts or
binaries are still pinned to specific versions and their SHA256 checksums are
updated to match the new version.

Reconcile `.trivyignore.yaml` against a fresh scan. After the base-image digests
are re-pinned, rebuild the images and run the same scan CI uses — for each image
from `docker compose config --images`, `trivy image --scanners vuln --pkg-types
os,library --severity CRITICAL --exit-code 1 --ignorefile .trivyignore.yaml`.
The `--exit-code 1` flag matches CI (`.github/workflows/docker-compose.yml`) and
is what makes the scan actually fail on a CRITICAL — without it Trivy exits 0
even when it reports findings, so the exit-code confirmation below would falsely
pass. Then:

- Drop any suppression whose CVE the refreshed base images no longer report at
  CRITICAL (it has been fixed or the vulnerable package is gone) — do not carry
  dead entries.
- For CVEs still flagged with no fixed version (`affected` / `fix_deferred` in
  Debian trixie), extend `expired_at` to the next review window rather than
  deleting the entry, and keep the `statement` accurate.
- The `expired_at` dates are a time-bomb: once past, Trivy stops suppressing and
  the `Docker Build Checks` workflow fails on the next `main` run even with no
  code change. Always advance them as part of this dependency update so the
  review cadence stays aligned with the update cadence. Confirm the CI scan
  command exits 0 for every image before finishing.

`make update-deps` runs `prek update --freeze`, which refreshes each prek hook to
its latest tag but records the resolved **commit SHA** in `rev` with a
`# frozen: <tag>` comment. Keep the hooks in `prek.toml` pinned this way — the
same SHA-pinning convention the repo uses for GitHub Actions. Never rewrite a
frozen `rev` back to a bare mutable tag.

The `prek-version` in `.github/workflows/prek.yaml` is a separate CI pin.
Before updating it or the prek action, confirm the action's bundled checksum
table includes that prek version's Linux x86_64 archive. The action silently
skips SHA256 verification for versions absent from its table.

Review the GitHub Action changes made by pnpm and verify that public actions in
`.github/workflows/` remain pinned by full commit SHA with a matching `# vX.Y.Z`
comment. Investigate any action pnpm could not read instead of silently leaving
an outdated mutable reference.

Once the dependency update is green, review relevant changelogs and current
documentation for upgraded libraries. Apply small compatibility simplifications
only when they reduce local complexity or remove a workaround, and rerun the
affected checks after each change.

Make a draft PR using the gh CLI, instead of the GitHub MCP server. In the PR
body, summarise dependency groups changed, compatibility fixes made, validation
commands that passed, and any key refactorings as list items.
