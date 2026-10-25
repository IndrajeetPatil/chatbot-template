#!/usr/bin/env bash
set -euo pipefail

# Install the pinned Vite+ CLI (`vp`) into $VP_HOME/bin after verifying the
# release checksum. Keep VP_VERSION aligned with vite-plus in
# pnpm-workspace.yaml; checksums come from the release's vp-checksums.txt.
# Like the official installer, the first run adds $VP_HOME/env to shell
# profiles; set VP_SELF_SETUP_NO_MODIFY_PATH=1 to manage PATH yourself.
VP_VERSION=1.4.0

case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)
        target=x86_64-unknown-linux-gnu
        sha256=992558abc9621384434a22d80e06e117615680f14a3e17a58eb287fd30a07694
        ;;
    Linux-aarch64 | Linux-arm64)
        target=aarch64-unknown-linux-gnu
        sha256=8eee2d3e9a5bf8654f5150048f5a82b86d4f546c34c530f052545f5058db60de
        ;;
    Darwin-arm64)
        target=aarch64-apple-darwin
        sha256=d54d258ce67d43c0deffb09329825241db197c2f20e72871121227f03fb40312
        ;;
    Darwin-x86_64)
        target=x86_64-apple-darwin
        sha256=10cdffc49c20dea7ef5bd69f74e8a52f6553076e551326d4efd1013b2efdd9fa
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
