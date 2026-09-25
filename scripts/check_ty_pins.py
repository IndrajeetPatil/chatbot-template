"""Keep the project ty installation aligned with the frozen pre-commit hook."""

import re
import sys
from pathlib import Path

import tomllib

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    with (ROOT / "backend/pyproject.toml").open("rb") as file:
        project = tomllib.load(file)
    with (ROOT / "backend/uv.lock").open("rb") as file:
        lock = tomllib.load(file)

    dependencies = project["dependency-groups"]["dev"]
    pins = [
        item.removeprefix("ty==") for item in dependencies if item.startswith("ty==")
    ]
    locked = [item["version"] for item in lock["package"] if item["name"] == "ty"]

    # The frozen tag is a TOML comment, so parse it from the ty hook's block.
    hooks = (ROOT / "prek.toml").read_text(encoding="utf-8")
    ty_blocks = [
        block
        for block in hooks.split("[[repos]]")
        if 'repo = "https://github.com/astral-sh/ty-pre-commit"' in block
    ]
    hook = re.search(
        r'^rev = "[0-9a-f]{40}"\s+# frozen: v(\d+\.\d+\.\d+)\s*$',
        ty_blocks[0] if len(ty_blocks) == 1 else "",
        re.MULTILINE,
    )
    if len(pins) == len(locked) == 1 and hook and pins[0] == locked[0] == hook[1]:
        print(f"ty pins agree: {pins[0]}")
        return 0

    print(
        f"ty pins disagree: pyproject={pins}, uv.lock={locked}, "
        f"ty-pre-commit={hook[1] if hook else 'missing frozen tag'}",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
