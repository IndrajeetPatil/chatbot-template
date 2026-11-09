#!/usr/bin/env bash
set -euo pipefail

# Install the pinned Vite+ CLI (`vp`) into $VP_HOME/bin after verifying the
# release checksum. Keep VP_VERSION aligned with vite-plus in
# pnpm-workspace.yaml; checksums come from the release's vp-checksums.txt.
# Like the official installer, the first run adds $VP_HOME/env to shell
# profiles; set VP_SELF_SETUP_NO_MODIFY_PATH=1 to manage PATH yourself.
VP_VERSION=1.5.0

case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)
        target=x86_64-unknown-linux-gnu
        sha256=547ee61b5dbc556bb7d3d996c198334e3477fb245ab41d6faa6efcde106a8405
        ;;
    Linux-aarch64 | Linux-arm64)
        target=aarch64-unknown-linux-gnu
        sha256=36387764b075539bada5acea8e1fc44d671a0ebcff667ba7866aee4067d46d3e
        ;;
    Darwin-arm64)
        target=aarch64-apple-darwin
        sha256=a1b702d22ce2e7dff610d6293dbc47f72b17387cac29af785d75339ee7720426
        ;;
    Darwin-x86_64)
        target=x86_64-apple-darwin
        sha256=b17c62a52421a03f3e0b72211f4f3ceca07fcdf156b2965e293c06c6b5747371
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
