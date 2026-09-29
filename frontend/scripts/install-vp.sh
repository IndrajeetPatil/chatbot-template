#!/usr/bin/env bash
set -euo pipefail

# Install the pinned Vite+ CLI (`vp`) into $VP_HOME/bin after verifying the
# release checksum. Keep VP_VERSION aligned with vite-plus in
# pnpm-workspace.yaml; checksums come from the release's vp-checksums.txt.
# Like the official installer, the first run adds $VP_HOME/env to shell
# profiles; set VP_SELF_SETUP_NO_MODIFY_PATH=1 to manage PATH yourself.
VP_VERSION=1.0.0

case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)
        target=x86_64-unknown-linux-gnu
        sha256=2adca8386c8f7e158eea4abe1a3eda9f89313c869145f788409a0be45979dd6a
        ;;
    Linux-aarch64 | Linux-arm64)
        target=aarch64-unknown-linux-gnu
        sha256=113958a622191be25362749aad123c6b2b646f27d69751ec1edd073b33a1bc46
        ;;
    Darwin-arm64)
        target=aarch64-apple-darwin
        sha256=309d42550348aa156e34a9a2eb6e9e8b1c5886126b14cd9a88f42d158a944b35
        ;;
    Darwin-x86_64)
        target=x86_64-apple-darwin
        sha256=27d61dc87e3f456d086fb865aba853a1937a112881d4a7f0dfc03ad0f472fba8
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
