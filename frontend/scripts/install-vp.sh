#!/usr/bin/env bash
set -euo pipefail

# Install the pinned Vite+ CLI (`vp`) into $VP_HOME/bin after verifying the
# release checksum. Keep VP_VERSION aligned with vite-plus in
# pnpm-workspace.yaml; checksums come from the release's vp-checksums.txt.
# Like the official installer, the first run adds $VP_HOME/env to shell
# profiles; set VP_SELF_SETUP_NO_MODIFY_PATH=1 to manage PATH yourself.
VP_VERSION=1.8.0

case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)
        target=x86_64-unknown-linux-gnu
        sha256=09c610b61f22f3a02bb38dae948d4ddcdada0c019ff96341b72894be576c6b03
        ;;
    Linux-aarch64 | Linux-arm64)
        target=aarch64-unknown-linux-gnu
        sha256=21cc1ee922571b59dc9b8dedb2d0a0f7adaa8783354849d51f937043c7c9c948
        ;;
    Darwin-arm64)
        target=aarch64-apple-darwin
        sha256=cc7dffc938d6fb91445e2a4c37825dc933ff3b1d7a480a9f17bf8b4f77357421
        ;;
    Darwin-x86_64)
        target=x86_64-apple-darwin
        sha256=1b8e825a2031994358df0681a3f41bf3e5079ebff1697442c5de19aad68a42f4
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
