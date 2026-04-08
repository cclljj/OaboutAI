#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

from common_paths import resolve_site_paths

PATHS = resolve_site_paths(Path(__file__))
DEFAULT_OBSIDIAN_ROOT = PATHS.data_root / "obsidian"
SUPPORTED_LANGS = ("en", "zh-tw")
FRONT_MATTER_PATTERN = re.compile(r"^---\n(.*?)\n---\n?", re.DOTALL)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync Obsidian markdown files into Supabase public.articles."
    )
    parser.add_argument(
        "--obsidian-root",
        type=Path,
        default=DEFAULT_OBSIDIAN_ROOT,
        help="Root folder containing <lang>/*.md (default: data/obsidian).",
    )
    parser.add_argument(
        "--supabase-url",
        default=os.environ.get("SUPABASE_URL", "").strip(),
        help="Supabase project URL. Can also use SUPABASE_URL env var.",
    )
    parser.add_argument(
        "--service-role-key",
        default=os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip(),
        help="Supabase service-role key. Can also use SUPABASE_SERVICE_ROLE_KEY env var.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=200,
        help="Rows per upsert request.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and validate input only; do not send writes to Supabase.",
    )
    return parser.parse_args()


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
        if value == "" or value == "[]":
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
        output: list[str] = []
        seen: set[str] = set()
        for item in value:
            token = normalize_text(item)
            if not token or token in seen:
                continue
            seen.add(token)
            output.append(token)
        return output
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
            active_key = section_aliases.get(normalize_text(heading.group(1)).lower())
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

    return {
        "slug": slug,
        "language": normalize_text(front_matter.get("language")) or lang,
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


def collect_rows(obsidian_root: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for lang in SUPPORTED_LANGS:
        lang_root = obsidian_root / lang
        if not lang_root.exists():
            continue
        for path in sorted(lang_root.glob("*.md")):
            rows.append(parse_article(path, lang))
    rows.sort(key=lambda row: (row.get("source_date") or "", row.get("submission_date") or ""), reverse=True)
    return rows


def chunks(values: list[dict[str, Any]], size: int) -> list[list[dict[str, Any]]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def upsert_rows(supabase_url: str, service_role_key: str, rows: list[dict[str, Any]], batch_size: int) -> None:
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/articles?on_conflict=slug,language"
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    for batch in chunks(rows, batch_size):
        payload = json.dumps(batch, ensure_ascii=False).encode("utf-8")
        request = urllib.request.Request(endpoint, data=payload, method="POST", headers=headers)
        try:
            with urllib.request.urlopen(request) as response:
                status = response.getcode()
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Supabase upsert failed (HTTP {exc.code}): {body}") from exc
        if status not in (200, 201, 204):
            raise RuntimeError(f"Supabase upsert returned unexpected status: {status}")


def main() -> int:
    args = parse_args()
    obsidian_root = args.obsidian_root.resolve()
    rows = collect_rows(obsidian_root)
    print(f"Prepared {len(rows)} rows from {obsidian_root}")

    if args.dry_run:
        print("Dry run complete.")
        return 0

    if not args.supabase_url:
        raise SystemExit("ERROR: --supabase-url (or SUPABASE_URL env) is required.")
    if not args.service_role_key:
        raise SystemExit("ERROR: --service-role-key (or SUPABASE_SERVICE_ROLE_KEY env) is required.")
    if args.batch_size <= 0:
        raise SystemExit("ERROR: --batch-size must be > 0.")

    upsert_rows(args.supabase_url, args.service_role_key, rows, args.batch_size)
    print(f"Upserted {len(rows)} rows into Supabase public.articles")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
