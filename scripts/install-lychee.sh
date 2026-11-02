#!/usr/bin/env bash
set -euo pipefail

# Install the pinned lychee link checker into /usr/local/bin after verifying
# its release checksum. Used by the devcontainer; on macOS, `brew install lychee`.
LYCHEE_VERSION=0.24.2

case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)
        target=x86_64-unknown-linux-gnu
        sha256=1f4e0ef7f6554a6ed33dd7ac144fb2e1bbed98598e7af973042fc5cd43951c9a
        ;;
    Linux-aarch64)
        target=aarch64-unknown-linux-gnu
        sha256=91a7bd65685da41b90ccb9bc867a3d649a7818042dae04ff405e55a25bddee4c
        ;;
    *)
        echo "No pinned lychee checksum for $(uname -s)-$(uname -m); refusing to install an unverified binary." >&2
        exit 1
        ;;
esac

workdir="$(mktemp -d)"
trap 'rm -rf -- "$workdir"' EXIT

archive="${workdir}/lychee.tar.gz"
curl -fsSL --retry 3 --retry-delay 2 --retry-all-errors -o "$archive" \
    "https://github.com/lycheeverse/lychee/releases/download/lychee-v${LYCHEE_VERSION}/lychee-${target}.tar.gz"
echo "${sha256}  ${archive}" | sha256sum -c
tar -xzf "$archive" -C "$workdir"
sudo install -m 0755 -- "$(find "$workdir" -type f -name lychee | head -n 1)" /usr/local/bin/lychee
