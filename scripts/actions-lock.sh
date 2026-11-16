#!/usr/bin/env bash
# Regenerates .github/workflows/actions.lock with GitHub's gh-actions-lock
# extension, keeping the workflows' full-SHA refs, then verifies it.
# Pass --verify to check the lockfile without regenerating it.
set -euo pipefail
cd "$(dirname "$0")/.."

expected_version=v0.4.1

version=$(gh actions-lock --version 2>/dev/null) || {
  echo "Install github/gh-actions-lock $expected_version." >&2
  exit 1
}
if [[ $version != "actions-lock version $expected_version" ]]; then
  echo "Expected actions-lock $expected_version, found $version." >&2
  exit 1
fi

if [[ ${1-} != --verify ]]; then
  gh actions-lock --no-interactive --no-narrow
fi
gh actions-lock --verify
