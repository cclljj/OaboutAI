#!/usr/bin/env python3
import datetime as dt
import json
import re
from pathlib import Path
from typing import Any

import yaml
from common_paths import resolve_site_paths

PATHS = resolve_site_paths(Path(__file__))
ROOT = PATHS.site_root
CONTENT_ROOT = PATHS.content_root
TOPICS_FILE = PATHS.topics_file
KEYWORDS_FILE = PATHS.keywords_file
OBSIDIAN_ROOT = PATHS.data_root / "obsidian"

REQUIRED_FIELDS = {
    "title",
    "source_url",
    "source_type",
    "source_date",
    "submission_date",
    "executive_summary",
    "detailed_notes",
    "keywords",
    "primary_topic",
    "topics",
    "language",
}

ALLOWED_SOURCE_TYPES = {"webpage", "pdf", "youtube", "other"}
ALLOWED_LANGS = {"en", "zh-tw"}
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
FRONT_MATTER_RE = re.compile(r"^---\n(.*?)\n---\n?", re.DOTALL)


def parse_front_matter(md_path: Path) -> tuple[dict[str, Any], str]:
    raw = md_path.read_text(encoding="utf-8")
    match = FRONT_MATTER_RE.match(raw)
    if not match:
        return {}, raw
    data = yaml.safe_load(match.group(1)) or {}
    if not isinstance(data, dict):
        return {}, raw
    return data, raw[match.end() :]


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
            active_key = section_aliases.get(str(heading.group(1)).strip().lower())
            if active_key and active_key not in sections:
                sections[active_key] = []
            continue
        if active_key:
            sections[active_key].append(line)

    return {key: "\n".join(lines).strip() for key, lines in sections.items()}


def normalize_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [part.strip() for part in value.split(",") if part.strip()]
    return []


def validate_record(
    *,
    fm: dict[str, Any],
    rel: str,
    lang: str,
    slug: str,
    topic_ids: set[str],
    keyword_ids: set[str],
    errors: list[str],
    obsidian_mode: bool,
) -> None:
    body_sections = parse_sections(fm.pop("__body__", "")) if "__body__" in fm else {}

    missing = [field for field in REQUIRED_FIELDS if field not in fm and not body_sections.get(field)]
    if missing:
        errors.append(f"{rel}: missing required fields: {', '.join(sorted(missing))}")
        return

    source_type = str(fm.get("source_type", "")).strip()
    if source_type not in ALLOWED_SOURCE_TYPES:
        errors.append(f"{rel}: `source_type` must be one of {sorted(ALLOWED_SOURCE_TYPES)}")

    language = str(fm.get("language", lang)).strip() or lang
    if language not in ALLOWED_LANGS:
        errors.append(f"{rel}: `language` must be one of {sorted(ALLOWED_LANGS)}")
    if language != lang:
        errors.append(f"{rel}: `language` must match path language `{lang}`")

    validate_date(str(fm.get("source_date", "")), "source_date", errors, rel)
    validate_date(str(fm.get("submission_date", "")), "submission_date", errors, rel)

    keywords = normalize_list(fm.get("keywords"))
    if not keywords:
        errors.append(f"{rel}: `keywords` must be a non-empty array")
    else:
        unknown = sorted({kw for kw in keywords if kw not in keyword_ids})
        if unknown:
            errors.append(
                f"{rel}: unknown keywords {unknown}. Map to existing keyword and add proposal to data/keyword_proposals.jsonl."
            )

    primary_topic = str(fm.get("primary_topic", "")).strip()
    if not primary_topic:
        errors.append(f"{rel}: `primary_topic` must be a non-empty string")
    elif primary_topic not in topic_ids:
        errors.append(f"{rel}: unknown primary_topic `{primary_topic}`")

    topics = normalize_list(fm.get("topics"))
    if len(topics) > 9:
        errors.append(f"{rel}: `topics` can include at most 9 secondary values")
    unknown_topics = sorted({topic for topic in topics if topic not in topic_ids})
    if unknown_topics:
        errors.append(f"{rel}: unknown topics {unknown_topics}")
    if primary_topic and primary_topic in topics:
        errors.append(f"{rel}: `topics` must exclude `primary_topic`")

    if not str(fm.get("title", "")).strip():
        errors.append(f"{rel}: `title` must be a non-empty string")
    if not str(fm.get("source_url", "")).strip():
        errors.append(f"{rel}: `source_url` must be a non-empty string")
    if not str(fm.get("executive_summary") or body_sections.get("executive_summary") or "").strip():
        errors.append(f"{rel}: missing `executive_summary` (front matter or `## Executive Summary` section)")
    if not str(fm.get("detailed_notes") or body_sections.get("detailed_notes") or "").strip():
        errors.append(f"{rel}: missing `detailed_notes` (front matter or `## Detailed Notes` section)")

    attachments = fm.get("attachments")
    if attachments is not None:
        normalized_attachments = normalize_list(attachments)
        if not isinstance(attachments, (list, str)):
            errors.append(f"{rel}: `attachments` must be an array (or comma-separated string)")
        elif not obsidian_mode:
            bundle_dir = CONTENT_ROOT / lang / "items" / slug
            for attachment in normalized_attachments:
                if not (bundle_dir / attachment).exists():
                    errors.append(f"{rel}: attachment `{attachment}` not found in bundle")


def validate_date(value: str, field: str, errors: list[str], context: str) -> None:
    if not isinstance(value, str) or not DATE_PATTERN.match(value):
        errors.append(f"{context}: `{field}` must be YYYY-MM-DD")
        return
    try:
        dt.date.fromisoformat(value)
    except ValueError:
        errors.append(f"{context}: `{field}` is not a valid calendar date")


def main() -> int:
    topic_ids = {entry["id"] for entry in json.loads(TOPICS_FILE.read_text(encoding="utf-8"))}
    keyword_ids = {entry["id"] for entry in json.loads(KEYWORDS_FILE.read_text(encoding="utf-8"))}
    if len(topic_ids) > 10:
        print("ERROR: data/topics.json must contain no more than 10 topics.")
        return 1

    obsidian_files = sorted(OBSIDIAN_ROOT.glob("*/*.md"))
    obsidian_mode = bool(obsidian_files)
    item_files = sorted(CONTENT_ROOT.glob("**/items/**/index.md")) if not obsidian_mode else []

    if not obsidian_files and not item_files:
        print("WARN: no content found in data/obsidian/*/*.md or content/**/items/**/index.md; skipping entry metadata validation.")
        return 0

    errors: list[str] = []
    en_slugs: set[str] = set()
    zh_slugs: set[str] = set()

    source_files = obsidian_files if obsidian_mode else item_files
    for path in source_files:
        rel = path.relative_to(ROOT).as_posix()
        if obsidian_mode:
            parts = path.relative_to(OBSIDIAN_ROOT).parts
            if len(parts) != 2:
                errors.append(f"{rel}: invalid path, expected data/obsidian/<lang>/<slug>.md")
                continue
            lang = parts[0]
            slug = path.stem
        else:
            parts = path.relative_to(CONTENT_ROOT).parts
            if len(parts) < 4:
                errors.append(f"{rel}: invalid content path, expected <lang>/items/<slug>/index.md")
                continue
            lang = parts[0]
            slug = parts[2]

        if lang == "en":
            en_slugs.add(slug)
        if lang == "zh-tw":
            zh_slugs.add(slug)

        fm, body = parse_front_matter(path)
        if not fm:
            errors.append(f"{rel}: missing or invalid YAML front matter")
            continue
        fm["__body__"] = body
        validate_record(
            fm=fm,
            rel=rel,
            lang=lang,
            slug=slug,
            topic_ids=topic_ids,
            keyword_ids=keyword_ids,
            errors=errors,
            obsidian_mode=obsidian_mode,
        )

    for slug in sorted(zh_slugs):
        if slug not in en_slugs:
            if obsidian_mode:
                errors.append(
                    f"{PATHS.display_path(OBSIDIAN_ROOT)}/zh-tw/{slug}.md: zh-tw translation exists without canonical English entry"
                )
            else:
                errors.append(
                    f"{PATHS.display_path(CONTENT_ROOT)}/zh-tw/items/{slug}/index.md: zh-tw translation exists without canonical English entry"
                )

    if errors:
        for err in errors:
            print(f"ERROR: {err}")
        return 1

    if obsidian_mode:
        print(f"Validated {len(obsidian_files)} Obsidian files successfully.")
    else:
        print(f"Validated {len(item_files)} item files successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
