#!/usr/bin/env bash
# Runs once after the dev container is created.
# Installs the same tools and dependencies required for development and CI
# (see .github/workflows/qa.yml for the equivalent CI steps).
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# uv — Python package / project manager (version locked to backend/pyproject.toml)
# ──────────────────────────────────────────────────────────────────────────────
UV_VERSION=$(
  python3 - <<'PY'
from pathlib import Path
import sys
import tomllib

try:
    pyproject = tomllib.loads(Path("backend/pyproject.toml").read_text())
    version = pyproject["tool"]["uv"]["required-version"]
except (FileNotFoundError, tomllib.TOMLDecodeError, KeyError, TypeError):
    print(
        "ERROR: could not read [tool.uv].required-version from backend/pyproject.toml",
        file=sys.stderr,
    )
    raise SystemExit(1)

print(str(version).removeprefix("=="))
PY
)
curl -fsSLO --retry 3 --retry-delay 2 --retry-all-errors \
  "https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/uv-installer.sh"
echo "61b349611f1b6e1ba33645f30c36da5287df2609dd7af8605d96a031435eb35b  uv-installer.sh" | sha256sum -c
UV_VERSION="${UV_VERSION}" sh uv-installer.sh
rm uv-installer.sh
export PATH="$HOME/.local/bin:$PATH"
# Verify the installed version matches the pinned version
INSTALLED_UV_VERSION=$(uv --version)
echo "${INSTALLED_UV_VERSION}" | grep -qF "${UV_VERSION}" || {
  echo "ERROR: uv version mismatch — expected ${UV_VERSION}, got ${INSTALLED_UV_VERSION}"
  exit 1
}

# ──────────────────────────────────────────────────────────────────────────────
# Vite+ — frontend toolchain; provisions Node from frontend/.node-version and
# pnpm from frontend/package.json. devcontainer.json puts it on PATH.
# ──────────────────────────────────────────────────────────────────────────────
VP_SELF_SETUP_NO_MODIFY_PATH=1 bash frontend/scripts/install-vp.sh
export PATH="$HOME/.vite-plus/bin:$PATH"

# ──────────────────────────────────────────────────────────────────────────────
# ls-lint — file-naming linter
# ──────────────────────────────────────────────────────────────────────────────
bash scripts/install-ls-lint.sh

# ──────────────────────────────────────────────────────────────────────────────
# Backend — Python dependencies (uv installs the pinned Python version too)
# ──────────────────────────────────────────────────────────────────────────────
cd backend
uv python install
uv sync --frozen
cd ..

# ──────────────────────────────────────────────────────────────────────────────
# Frontend — Node.js dependencies + Playwright browser binaries
# ──────────────────────────────────────────────────────────────────────────────
cd frontend
# confirmModulesPurge=false: when a local checkout is mounted into the
# container, any node_modules built on the host (different OS/arch) must be
# purged and reinstalled for Linux. Without a TTY, pnpm would otherwise abort
# rather than prompt for confirmation. Unit and e2e tests only use Chromium.
vp install --frozen-lockfile -- --config.confirmModulesPurge=false
vp exec playwright install --with-deps chromium
cd ..

# ──────────────────────────────────────────────────────────────────────────────
# .env — provide a starter env file if none exists yet
# ──────────────────────────────────────────────────────────────────────────────
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo ""
  echo "⚠️  Created backend/.env from .env.example."
  echo "    Fill in your Azure OpenAI credentials before running the app."
fi

# ──────────────────────────────────────────────────────────────────────────────
# Git hooks — install pre-commit / pre-push hooks via prek
# ──────────────────────────────────────────────────────────────────────────────
cd backend
uv run prek install
cd ..
