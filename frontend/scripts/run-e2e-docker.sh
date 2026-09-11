#!/usr/bin/env bash
set -euo pipefail

# Called inside the pinned Playwright image by make e2e-test-docker.
: "${HOST_UID:?Set HOST_UID to the invoking user ID}"
: "${HOST_GID:?Set HOST_GID to the invoking group ID}"
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

restore_ownership() {
    local result=$?
    local artifact
    # Only generated, bind-mounted outputs need ownership restored. The
    # dependency volume stays writable by the container's root user.
    for artifact in dist playwright-report test-results e2e-tests/__snapshots__; do
        if [[ -d "$artifact" && ! -L "$artifact" ]]; then
            chown -hR -- "$HOST_UID:$HOST_GID" "$artifact" || result=1
        fi
    done
    exit "$result"
}

trap restore_ownership EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm test:e2e "$@"
