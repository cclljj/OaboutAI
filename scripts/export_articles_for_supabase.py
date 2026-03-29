#!/usr/bin/env python3
"""
Export Hugo item content into JSONL rows suitable for Supabase `articles` table import.

Usage:
  python3 scripts/export_articles_for_supabase.py \
    --app-id oaboutai \
    --output /tmp/oaboutai_articles.jsonl
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import yaml


FRONT_MATTER_RE = re.compile(r"^---\n(.*?)\n---\n?", re.DOTALL)


def parse_markdown_file(path: Path) -> tuple[dict[str, Any], str]:
    raw = path.read_text(encoding="utf-8")
    match = FRONT_MATTER_RE.match(raw)
    if not match:
        raise ValueError(f"Missing front matter in {path}")

    front_matter = yaml.safe_load(match.group(1)) or {}
    body = raw[match.end() :]
    return front_matter, body


def rows_for_language(lang_dir: Path, language: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    items_dir = lang_dir / "items"
    for index_md in sorted(items_dir.glob("*/index.md")):
        slug = index_md.parent.name
        front_matter, body = parse_markdown_file(index_md)
        row = {
            "slug": slug,
            "language": language,
            "title": front_matter.get("title", ""),
            "source_url": front_matter.get("source_url", ""),
            "source_type": front_matter.get("source_type", ""),
            "source_date": front_matter.get("source_date", ""),
            "submission_date": front_matter.get("submission_date", ""),
            "executive_summary": front_matter.get("executive_summary", ""),
            "detailed_notes": front_matter.get("detailed_notes", ""),
            "takeaway_html": body.strip(),
            "keywords": front_matter.get("keywords", []),
            "primary_topic": front_matter.get("primary_topic", ""),
            "topics": front_matter.get("topics", []),
            "attachments": front_matter.get("attachments", []),
        }
        rows.append(row)
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--app-id", default="oaboutai")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    app_root = Path("apps") / args.app_id / "content"
    rows = []
    rows.extend(rows_for_language(app_root / "en", "en"))
    rows.extend(rows_for_language(app_root / "zh-tw", "zh-tw"))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"Exported {len(rows)} rows -> {args.output}")


if __name__ == "__main__":
    main()
