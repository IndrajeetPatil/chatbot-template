#!/usr/bin/env bash
set -euo pipefail

# Install the pinned ls-lint binary into /usr/local/bin after verifying its
# release checksum. Shared by the devcontainer and the QA and prek workflows.
LS_LINT_VERSION=2.3.1

case "$(uname -s)-$(uname -m)" in
    Linux-x86_64)
        target=linux-amd64
        sha256=b5a0d2e4427ad039fbc574551f17679f38f142b25d15e0e538769f8cf15af397
        ;;
    Linux-aarch64)
        target=linux-arm64
        sha256=2abdb71243c619f0bb29587be5c228bec84c107985f2c066139ef0ec35fd3a99
        ;;
    *)
        echo "No pinned ls-lint checksum for $(uname -s)-$(uname -m); refusing to install an unverified binary." >&2
        exit 1
        ;;
esac

binary="$(mktemp)"
trap 'rm -f -- "$binary"' EXIT

curl -fsSL --retry 3 --retry-delay 2 --retry-all-errors -o "$binary" \
    "https://github.com/loeffel-io/ls-lint/releases/download/v${LS_LINT_VERSION}/ls-lint-${target}"
echo "${sha256}  ${binary}" | sha256sum -c
sudo install -m 0755 -- "$binary" /usr/local/bin/ls-lint
