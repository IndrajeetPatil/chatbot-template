#!/usr/bin/env bash
set -euo pipefail

# Query from the frontend workspace so pnpm honors its configured cache location.
cache_dir=$(pnpm cache path)
case "$cache_dir" in
    /) echo "Refusing to clean a pnpm cache at the filesystem root." >&2; exit 1 ;;
    /*) ;;
    *) echo "Expected an absolute pnpm cache path, got: $cache_dir" >&2; exit 1 ;;
esac

# Pruning preserves packages linked into other projects. In pnpm 12 it does not
# clear metadata or dlx environments, so remove those separately.
pnpm store prune
pnpm cache delete '*' >/dev/null
rm -rf -- "$cache_dir/dlx"
rm -f -- "$cache_dir/lockfile-verified.jsonl"
