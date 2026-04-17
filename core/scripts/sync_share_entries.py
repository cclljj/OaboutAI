#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

from common_paths import resolve_site_paths

PATHS = resolve_site_paths(Path(__file__))
CONTENT_ROOT = PATHS.content_root
OBSIDIAN_ROOT = PATHS.data_root / "obsidian"
SUPPORTED_LANGS = ("en", "zh-tw")

FRONT_MATTER_PATTERN = re.compile(r"^---\n(.*?)\n---\n?", re.DOTALL)
TITLE_SINGLE_QUOTED_RE = re.compile(r"^title:\s*'(.+)'\s*$", re.MULTILINE)


def parse_simple_front_matter(block: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for raw_line in block.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and ((value[0] == value[-1] == "'") or (value[0] == value[-1] == '"')):
            value = value[1:-1]
        result[key] = value
    return result


def parse_slug_title(path: Path) -> tuple[str, str]:
    raw = path.read_text(encoding="utf-8")
    match = FRONT_MATTER_PATTERN.match(raw)
    if not match:
        raise ValueError(f"{path}: missing YAML front matter")

    front_matter_block = match.group(1)
    front_matter = parse_simple_front_matter(front_matter_block)
    slug = str(front_matter.get("slug", "")).strip() or path.stem

    title_match = TITLE_SINGLE_QUOTED_RE.search(front_matter_block)
    title = title_match.group(1).strip() if title_match else str(front_matter.get("title", "")).strip()
    if not title:
        raise ValueError(f"{path}: missing title")
    if not slug:
        raise ValueError(f"{path}: missing slug")

    return slug, title


def build_share_page(title: str, slug: str) -> str:
    escaped_title = title.replace('"', '\\"')
    escaped_slug = slug.replace('"', '\\"')
    return (
        "---\n"
        f'title: "{escaped_title}"\n'
        f'slug: "{escaped_slug}"\n'
        'layout: "entry"\n'
        "share_public_title: true\n"
        "---\n"
    )


def clear_stale_entries(entry_root: Path, keep_slugs: set[str]) -> int:
    removed = 0
    if not entry_root.exists():
        return removed

    for path in entry_root.iterdir():
        if not path.is_dir():
            continue
        if path.name in keep_slugs:
            continue
        index_file = path / "index.md"
        if not index_file.exists():
            continue
        index_file.unlink()
        path.rmdir()
        removed += 1
    return removed


def sync_lang(lang: str) -> tuple[int, int]:
    source_lang_root = OBSIDIAN_ROOT / lang
    target_lang_root = CONTENT_ROOT / lang / "entry"

    if not source_lang_root.exists():
        removed = clear_stale_entries(target_lang_root, set())
        return 0, removed

    target_lang_root.mkdir(parents=True, exist_ok=True)
    keep_slugs: set[str] = set()
    created = 0

    for source_file in sorted(source_lang_root.glob("*.md")):
        slug, title = parse_slug_title(source_file)
        keep_slugs.add(slug)
        out_dir = target_lang_root / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / "index.md"
        content = build_share_page(title=title, slug=slug)
        previous = out_file.read_text(encoding="utf-8") if out_file.exists() else ""
        if previous != content:
            out_file.write_text(content, encoding="utf-8")
        created += 1

    removed = clear_stale_entries(target_lang_root, keep_slugs)
    return created, removed


def main() -> int:
    total_created = 0
    total_removed = 0

    for lang in SUPPORTED_LANGS:
        created, removed = sync_lang(lang)
        total_created += created
        total_removed += removed
        print(f"Synced share entry pages for {lang}: {created} active, {removed} removed")

    print(f"Share entry sync complete: active={total_created}, removed={total_removed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
