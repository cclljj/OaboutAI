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
    parser.add_argument(
        "--delete-missing",
        action="store_true",
        help="Delete rows in Supabase public.articles that are absent from Obsidian source.",
    )
    parser.add_argument(
        "--prune-favorites",
        action="store_true",
        help="Delete favorites rows whose article_slug belongs to deleted articles.",
    )
    parser.add_argument(
        "--delete-batch-size",
        type=int,
        default=200,
        help="Rows per delete request batch.",
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

    record = {
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
    missing_sections = [
        field
        for field in ("executive_summary", "detailed_notes", "takeaway_html")
        if not normalize_text(record.get(field))
    ]
    if missing_sections:
        raise ValueError(
            f"{path}: missing required sections/fields {missing_sections}. "
            "Expected `## Executive Summary`, `## Detailed Notes`, and `## Take-away`."
        )
    return record


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


def postgrest_quote(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def chunk_strings(values: list[str], size: int) -> list[list[str]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def supabase_headers(service_role_key: str) -> dict[str, str]:
    return {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
    }


def fetch_existing_article_keys(supabase_url: str, service_role_key: str, page_size: int = 1000) -> set[tuple[str, str]]:
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/articles?select=slug,language"
    headers = supabase_headers(service_role_key)
    keys: set[tuple[str, str]] = set()
    start = 0

    while True:
        end = start + page_size - 1
        request_headers = headers | {"Range-Unit": "items", "Range": f"{start}-{end}"}
        request = urllib.request.Request(endpoint, method="GET", headers=request_headers)
        try:
            with urllib.request.urlopen(request) as response:
                status = response.getcode()
                body = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Supabase fetch existing keys failed (HTTP {exc.code}): {body}") from exc

        if status != 200:
            raise RuntimeError(f"Supabase fetch existing keys returned unexpected status: {status}")

        rows = json.loads(body)
        if not isinstance(rows, list):
            raise RuntimeError("Supabase fetch existing keys returned unexpected payload format.")

        for row in rows:
            slug = normalize_text(row.get("slug"))
            language = normalize_text(row.get("language"))
            if slug and language:
                keys.add((slug, language))

        if len(rows) < page_size:
            break
        start += page_size

    return keys


def delete_missing_articles(
    supabase_url: str,
    service_role_key: str,
    missing_keys: set[tuple[str, str]],
    delete_batch_size: int,
) -> int:
    if not missing_keys:
        return 0

    headers = supabase_headers(service_role_key) | {"Prefer": "return=minimal"}
    base_endpoint = f"{supabase_url.rstrip('/')}/rest/v1/articles"
    deleted = 0
    grouped: dict[str, list[str]] = {}
    for slug, language in sorted(missing_keys):
        grouped.setdefault(language, []).append(slug)

    for language, slugs in grouped.items():
        for batch in chunk_strings(slugs, delete_batch_size):
            quoted = ",".join(postgrest_quote(slug) for slug in batch)
            query = urllib.parse.urlencode({
                "language": f"eq.{language}",
                "slug": f"in.({quoted})",
            })
            endpoint = f"{base_endpoint}?{query}"
            request = urllib.request.Request(endpoint, method="DELETE", headers=headers)
            try:
                with urllib.request.urlopen(request) as response:
                    status = response.getcode()
            except urllib.error.HTTPError as exc:
                body = exc.read().decode("utf-8", errors="replace")
                raise RuntimeError(f"Supabase delete missing articles failed (HTTP {exc.code}): {body}") from exc
            if status not in (200, 204):
                raise RuntimeError(f"Supabase delete missing articles returned unexpected status: {status}")
            deleted += len(batch)
    return deleted


def prune_favorites_for_deleted_slugs(
    supabase_url: str,
    service_role_key: str,
    deleted_slugs: set[str],
    delete_batch_size: int,
) -> int:
    if not deleted_slugs:
        return 0

    headers = supabase_headers(service_role_key) | {"Prefer": "return=minimal"}
    base_endpoint = f"{supabase_url.rstrip('/')}/rest/v1/favorites"
    pruned = 0

    for batch in chunk_strings(sorted(deleted_slugs), delete_batch_size):
        quoted = ",".join(postgrest_quote(slug) for slug in batch)
        query = urllib.parse.urlencode({"article_slug": f"in.({quoted})"})
        endpoint = f"{base_endpoint}?{query}"
        request = urllib.request.Request(endpoint, method="DELETE", headers=headers)
        try:
            with urllib.request.urlopen(request) as response:
                status = response.getcode()
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Supabase prune favorites failed (HTTP {exc.code}): {body}") from exc
        if status not in (200, 204):
            raise RuntimeError(f"Supabase prune favorites returned unexpected status: {status}")
        pruned += len(batch)
    return pruned


def main() -> int:
    args = parse_args()
    obsidian_root = args.obsidian_root.resolve()
    try:
        rows = collect_rows(obsidian_root)
    except ValueError as exc:
        raise SystemExit(f"ERROR: {exc}") from exc
    print(f"Prepared {len(rows)} rows from {obsidian_root}")

    if args.dry_run and not args.delete_missing:
        print("Dry run complete.")
        return 0

    needs_supabase = (not args.dry_run) or args.delete_missing
    if needs_supabase and not args.supabase_url:
        raise SystemExit("ERROR: --supabase-url (or SUPABASE_URL env) is required.")
    if needs_supabase and not args.service_role_key:
        raise SystemExit("ERROR: --service-role-key (or SUPABASE_SERVICE_ROLE_KEY env) is required.")
    if args.batch_size <= 0:
        raise SystemExit("ERROR: --batch-size must be > 0.")
    if args.delete_batch_size <= 0:
        raise SystemExit("ERROR: --delete-batch-size must be > 0.")

    source_keys = {
        (normalize_text(row.get("slug")), normalize_text(row.get("language")))
        for row in rows
        if normalize_text(row.get("slug")) and normalize_text(row.get("language"))
    }
    existing_keys: set[tuple[str, str]] = set()
    missing_keys: set[tuple[str, str]] = set()
    if args.delete_missing:
        existing_keys = fetch_existing_article_keys(args.supabase_url, args.service_role_key)
        missing_keys = existing_keys - source_keys
        preview = ", ".join(f"{slug}:{lang}" for slug, lang in sorted(missing_keys)[:20])
        if missing_keys:
            print(f"Will delete {len(missing_keys)} missing article rows (preview: {preview})")
        else:
            print("No missing article rows to delete.")

    if args.dry_run:
        if args.delete_missing and args.prune_favorites:
            missing_slugs = {slug for slug, _ in missing_keys}
            print(f"Will prune favorites for {len(missing_slugs)} deleted slugs.")
        elif args.prune_favorites:
            print("Will prune favorites for 0 deleted slugs (delete-missing disabled).")
        print("Dry run complete.")
        return 0

    upsert_rows(args.supabase_url, args.service_role_key, rows, args.batch_size)
    print(f"Upserted {len(rows)} rows into Supabase public.articles")

    deleted_count = 0
    deleted_slugs: set[str] = set()
    if args.delete_missing:
        deleted_count = delete_missing_articles(
            args.supabase_url,
            args.service_role_key,
            missing_keys,
            args.delete_batch_size,
        )
        deleted_slugs = {slug for slug, _ in missing_keys}
        print(f"Deleted {deleted_count} missing rows from Supabase public.articles")

    if args.prune_favorites:
        pruned_count = prune_favorites_for_deleted_slugs(
            args.supabase_url,
            args.service_role_key,
            deleted_slugs,
            args.delete_batch_size,
        )
        print(f"Pruned favorites for {pruned_count} deleted slugs")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
