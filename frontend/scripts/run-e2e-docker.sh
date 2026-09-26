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

# The Vite+ home volume caches vp, Node, and pnpm between runs.
export VP_HOME=/root/.vite-plus PATH="/root/.vite-plus/bin:$PATH"
export VP_SELF_SETUP_NO_MODIFY_PATH=1
bash scripts/install-vp.sh
vp install --frozen-lockfile -- --loglevel=warn
if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
    (
        echo "::group::Production build details"
        trap 'echo "::endgroup::"' EXIT
        vp build
    )
else
    vp build
fi
vp run test:e2e "$@"
