#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from common_paths import resolve_site_paths

PATHS = resolve_site_paths(Path(__file__))
DATA_ROOT = PATHS.data_root
OBSIDIAN_ROOT = DATA_ROOT / "obsidian"
STATIC_OUT = PATHS.site_root / "static" / "obsidian"
SUPPORTED_LANGS = ("en", "zh-tw")
FRONT_MATTER_PATTERN = re.compile(r"^---\n(.*?)\n---\n?", re.DOTALL)


def parse_markdown(path: Path) -> tuple[dict[str, Any], str]:
    raw = path.read_text(encoding="utf-8")
    match = FRONT_MATTER_PATTERN.match(raw)
    if not match:
        return {}, raw
    front_matter = parse_simple_front_matter(match.group(1))
    body = raw[match.end() :]
    return front_matter, body


def parse_simple_front_matter(block: str) -> dict[str, Any]:
    result: dict[str, Any] = {}
    current_key = ""
    for raw_line in block.splitlines():
        line = raw_line.rstrip()
        if not line.strip() or line.strip().startswith("#"):
            continue
        list_match = re.match(r"^\s*-\s*(.*)\s*$", line)
        if list_match and current_key:
            existing = result.get(current_key)
            if not isinstance(existing, list):
                existing = []
                result[current_key] = existing
            existing.append(unquote(list_match.group(1).strip()))
            continue
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        current_key = key
        if value == "":
            result[key] = []
            continue
        if value == "[]":
            result[key] = []
            continue
        result[key] = unquote(value)
    return result


def unquote(value: str) -> str:
    token = value.strip()
    if len(token) >= 2 and ((token[0] == token[-1] == '"') or (token[0] == token[-1] == "'")):
        return token[1:-1]
    return token


def normalize_text(value: Any) -> str:
    return str(value or "").strip()


def normalize_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        result = []
        seen = set()
        for item in value:
            token = normalize_text(item)
            if not token or token in seen:
                continue
            seen.add(token)
            result.append(token)
        return result
    if isinstance(value, str):
        parts = [part.strip() for part in value.split(",")]
        return [part for part in parts if part]
    return []


def parse_sections(body: str) -> dict[str, str]:
    section_aliases = {
        "executive summary": "executive_summary",
        "detailed notes": "detailed_notes",
        "take-away": "takeaway_html",
        "takeaway": "takeaway_html",
        "take away": "takeaway_html",
    }
    sections: dict[str, list[str]] = {}
    active_key: str | None = None

    for line in body.splitlines():
        heading = re.match(r"^\s*##\s+(.+?)\s*$", line)
        if heading:
            raw_key = normalize_text(heading.group(1)).lower()
            active_key = section_aliases.get(raw_key)
            if active_key and active_key not in sections:
                sections[active_key] = []
            continue
        if active_key:
            sections[active_key].append(line)

    return {key: "\n".join(lines).strip() for key, lines in sections.items()}


def parse_article(path: Path, lang: str) -> dict[str, Any]:
    front_matter, body = parse_markdown(path)
    sections = parse_sections(body)

    slug = normalize_text(front_matter.get("slug")) or path.stem
    language = normalize_text(front_matter.get("language")) or lang

    return {
        "slug": slug,
        "language": language,
        "title": normalize_text(front_matter.get("title")),
        "source_url": normalize_text(front_matter.get("source_url")),
        "source_type": normalize_text(front_matter.get("source_type")),
        "source_date": normalize_text(front_matter.get("source_date")),
        "submission_date": normalize_text(front_matter.get("submission_date")),
        "executive_summary": normalize_text(front_matter.get("executive_summary") or sections.get("executive_summary")),
        "detailed_notes": normalize_text(front_matter.get("detailed_notes") or sections.get("detailed_notes")),
        "takeaway_html": normalize_text(front_matter.get("takeaway_html") or sections.get("takeaway_html")),
        "keywords": normalize_string_list(front_matter.get("keywords")),
        "primary_topic": normalize_text(front_matter.get("primary_topic")),
        "topics": normalize_string_list(front_matter.get("topics")),
        "attachments": normalize_string_list(front_matter.get("attachments")),
    }


def compile_language(lang: str) -> list[dict[str, Any]]:
    lang_root = OBSIDIAN_ROOT / lang
    if not lang_root.exists():
        return []
    rows = [parse_article(path, lang) for path in sorted(lang_root.glob("*.md"))]
    rows.sort(key=lambda row: (row.get("source_date") or "", row.get("submission_date") or ""), reverse=True)
    return rows


def main() -> int:
    STATIC_OUT.mkdir(parents=True, exist_ok=True)
    total = 0

    for lang in SUPPORTED_LANGS:
        rows = compile_language(lang)
        out_path = STATIC_OUT / f"articles.{lang}.json"
        out_path.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
        total += len(rows)
        print(f"Wrote {len(rows)} records -> {PATHS.display_path(out_path)}")

    print(f"Compiled Obsidian articles successfully: total={total}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
