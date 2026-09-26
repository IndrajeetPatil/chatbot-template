#!/usr/bin/env bash
set -euo pipefail

# Install the pinned Vite+ CLI (`vp`) into $VP_HOME/bin after verifying the
# release checksum. Keep VP_VERSION aligned with vite-plus in
# pnpm-workspace.yaml; checksums come from the release's vp-checksums.txt.
# Like the official installer, the first run adds $VP_HOME/env to shell
# profiles; set VP_SELF_SETUP_NO_MODIFY_PATH=1 to manage PATH yourself.
VP_VERSION=1.0.0-rc.1

case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)
        target=x86_64-unknown-linux-gnu
        sha256=37a4a3eb64c6b184465472de5037ebc81ad8af79937a069186e2de7aff397b6e
        ;;
    Linux-aarch64 | Linux-arm64)
        target=aarch64-unknown-linux-gnu
        sha256=d744493a0a1607de997addf95a2a7c59543b10392d20db1e3c4539a9f9a2a1ce
        ;;
    Darwin-arm64)
        target=aarch64-apple-darwin
        sha256=6234a25866be025cde1c19a14b7b4923866e6e8c39a9e7074540de7f3e3bcd41
        ;;
    Darwin-x86_64)
        target=x86_64-apple-darwin
        sha256=0281317d0e5a91df9a1d25099a15c196a768ee6bbf044f149a484eb7802aeddd
        ;;
    *)
        echo "No pinned Vite+ checksum for $(uname -s)-$(uname -m)." >&2
        exit 1
        ;;
esac

vp_home="${VP_HOME:-$HOME/.vite-plus}"
if [[ "$(readlink -- "$vp_home/current" 2>/dev/null)" == "$VP_VERSION" ]]; then
    exit 0
fi

archive="$(mktemp)"
trap 'rm -f -- "$archive"' EXIT

curl -fsSL --retry 3 --retry-delay 2 --retry-all-errors -o "$archive" \
    "https://github.com/voidzero-dev/vite-plus/releases/download/v${VP_VERSION}/vp-${target}.tar.gz"
if command -v sha256sum >/dev/null; then
    actual="$(sha256sum -- "$archive")"
else
    actual="$(shasum -a 256 -- "$archive")"
fi
if [[ "${actual%% *}" != "$sha256" ]]; then
    echo "Checksum mismatch for vp-${target}.tar.gz." >&2
    exit 1
fi

mkdir -p -- "$vp_home/bin"
tar -xzf "$archive" -C "$vp_home/bin"
VP_HOME="$vp_home" "$vp_home/bin/vp" --version
