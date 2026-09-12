#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
    echo "Docker unavailable; skipping Docker test caches. Run make docker-clean when Docker is running."
    exit 0
fi

# Include the former pnpm store volume left by older versions of the E2E target.
# Listing first makes cleanup repeatable without hiding removal failures (for
# example, a volume still mounted by a running test container).
volumes=$(docker volume ls --format '{{.Name}}')
for volume in chatbot-pw-node-modules chatbot-pw-pnpm-store; do
    if grep -Fxq -- "$volume" <<< "$volumes"; then
        docker volume rm "$volume"
    fi
done
