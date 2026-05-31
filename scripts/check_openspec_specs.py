#!/usr/bin/env python3
"""Lightweight OpenSpec structure checks for this repository."""

from __future__ import annotations

import re
import sys
from pathlib import Path


REQUIREMENT_RE = re.compile(r"^### Requirement: .+", re.MULTILINE)
SCENARIO_RE = re.compile(r"^#### Scenario: .+", re.MULTILINE)


def requirement_blocks(text: str) -> list[tuple[str, str]]:
    matches = list(REQUIREMENT_RE.finditer(text))
    blocks: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        blocks.append((match.group(0), text[match.start():end]))
    return blocks


def main() -> int:
    root = Path("openspec")
    errors: list[str] = []

    if not (root / "project.md").exists():
        errors.append("openspec/project.md is required")
    if not (root / "AGENTS.md").exists():
        errors.append("openspec/AGENTS.md is required")

    spec_files = sorted((root / "specs").glob("*/spec.md")) if (root / "specs").exists() else []
    if not spec_files:
        errors.append("openspec/specs/<capability>/spec.md files are required")

    for spec_file in spec_files:
        text = spec_file.read_text(encoding="utf-8")
        if not text.startswith("# "):
            errors.append(f"{spec_file}: must start with a level-1 title")
        blocks = requirement_blocks(text)
        if not blocks:
            errors.append(f"{spec_file}: missing `### Requirement:` sections")
            continue
        for heading, block in blocks:
            if not SCENARIO_RE.search(block):
                errors.append(f"{spec_file}: `{heading}` has no `#### Scenario:`")
            if "**WHEN**" not in block or "**THEN**" not in block:
                errors.append(f"{spec_file}: `{heading}` scenarios must include **WHEN** and **THEN** steps")

        design_file = spec_file.with_name("design.md")
        if not design_file.exists():
            errors.append(f"{spec_file.parent}: missing design.md")

    if errors:
        print("OpenSpec structure check failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"OpenSpec structure check passed ({len(spec_files)} specs scanned).")
    return 0


if __name__ == "__main__":
    sys.exit(main())

