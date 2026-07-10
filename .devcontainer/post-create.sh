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
import tomllib

pyproject = tomllib.loads(Path("backend/pyproject.toml").read_text())
print(pyproject["tool"]["uv"]["required-version"].removeprefix("=="))
PY
)
curl -LsSf --retry 3 --retry-delay 2 --retry-all-errors \
  https://astral.sh/uv/install.sh | UV_VERSION="${UV_VERSION}" sh
export PATH="$HOME/.local/bin:$PATH"
# Verify the installed version matches the pinned version
INSTALLED_UV_VERSION=$(uv --version)
echo "${INSTALLED_UV_VERSION}" | grep -qF "${UV_VERSION}" || {
  echo "ERROR: uv version mismatch — expected ${UV_VERSION}, got ${INSTALLED_UV_VERSION}"
  exit 1
}

# ──────────────────────────────────────────────────────────────────────────────
# pnpm — Node.js package manager (version locked to frontend/package.json)
# ──────────────────────────────────────────────────────────────────────────────
PNPM_VERSION=$(
  node -p "require('./frontend/package.json').packageManager.match(/^pnpm@([^+]+)/)[1]"
)
npm install -g "pnpm@${PNPM_VERSION}"
INSTALLED_PNPM_VERSION=$(pnpm --version)
echo "${INSTALLED_PNPM_VERSION}" | grep -qF "${PNPM_VERSION}" || {
  echo "ERROR: pnpm version mismatch — expected ${PNPM_VERSION}, got ${INSTALLED_PNPM_VERSION}"
  exit 1
}

# ──────────────────────────────────────────────────────────────────────────────
# ls-lint — file-naming linter
# ──────────────────────────────────────────────────────────────────────────────
KERNEL=$(uname -s | tr '[:upper:]' '[:lower:]')
MACHINE=$(uname -m)
case "$MACHINE" in
  x86_64)  ARCH="amd64" ;;
  aarch64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $MACHINE" && exit 1 ;;
esac
curl -fsSL --retry 3 --retry-delay 2 --retry-all-errors \
  "https://github.com/loeffel-io/ls-lint/releases/download/v2.3.1/ls-lint-${KERNEL}-${ARCH}" \
  -o /tmp/ls-lint
case "${KERNEL}-${ARCH}" in
  linux-amd64)
    echo "b5a0d2e4427ad039fbc574551f17679f38f142b25d15e0e538769f8cf15af397  /tmp/ls-lint" | sha256sum -c
    ;;
  linux-arm64)
    echo "2abdb71243c619f0bb29587be5c228bec84c107985f2c066139ef0ec35fd3a99  /tmp/ls-lint" | sha256sum -c
    ;;
  *)
    echo "ERROR: no checksum available for ${KERNEL}-${ARCH}; refusing to install unverified binary" >&2
    rm /tmp/ls-lint
    exit 1
    ;;
esac
sudo install -m 0755 /tmp/ls-lint /usr/local/bin/ls-lint
rm /tmp/ls-lint

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
# rather than prompt for confirmation.
pnpm install --frozen-lockfile --config.confirmModulesPurge=false
pnpm exec playwright install --with-deps
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
