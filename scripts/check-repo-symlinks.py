#!/usr/bin/env python3
"""Verify shared skill symlink wiring for agent tooling."""

from __future__ import annotations

from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parent.parent
AGENTS_SKILLS = REPO_ROOT / ".agents" / "skills"
CLAUDE_SKILLS = REPO_ROOT / ".claude" / "skills"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def list_skill_names() -> list[str]:
    skills = sorted(path.parent.name for path in AGENTS_SKILLS.glob("*/SKILL.md"))
    if not skills:
        fail(f"no skills found under {AGENTS_SKILLS}")
    return skills


def check_claude_skill_symlinks() -> None:
    skills = set(list_skill_names())
    if not CLAUDE_SKILLS.exists():
        fail(f"missing Claude skills directory: {CLAUDE_SKILLS}")
    if not CLAUDE_SKILLS.is_dir():
        fail(f"Claude skills path is not a directory: {CLAUDE_SKILLS}")

    for name in sorted(skills):
        link = CLAUDE_SKILLS / name
        if not link.is_symlink():
            fail(
                f".agents/skills/{name} is missing matching symlink "
                f".claude/skills/{name}"
            )
        if link.resolve() != (AGENTS_SKILLS / name).resolve():
            fail(f".claude/skills/{name} does not resolve to .agents/skills/{name}")
        if not (link / "SKILL.md").is_file():
            fail(f".claude/skills/{name}/SKILL.md is not readable through the symlink")

    for entry in CLAUDE_SKILLS.iterdir():
        if not entry.is_symlink():
            fail(f"{entry} is not a symlink into .agents/skills/")
        if entry.name not in skills:
            fail(f".claude/skills/{entry.name} has no matching .agents/skills entry")


def main() -> None:
    check_claude_skill_symlinks()
    print("Agent skill symlinks OK.")


if __name__ == "__main__":
    main()
