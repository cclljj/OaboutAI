#!/usr/bin/env python3
import datetime as dt
import json
import re
from pathlib import Path

import yaml
from common_paths import resolve_site_paths

PATHS = resolve_site_paths(Path(__file__))
ROOT = PATHS.site_root
CONTENT_ROOT = PATHS.content_root
TOPICS_FILE = PATHS.topics_file
KEYWORDS_FILE = PATHS.keywords_file

REQUIRED_FIELDS = {
    "title",
    "source_url",
    "source_type",
    "types",
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


def parse_front_matter(md_path: Path) -> dict:
    raw = md_path.read_text(encoding="utf-8")
    if not raw.startswith("---\n"):
        raise ValueError("missing opening YAML front matter delimiter")
    parts = raw.split("---\n", 2)
    if len(parts) < 3:
        raise ValueError("missing closing YAML front matter delimiter")
    data = yaml.safe_load(parts[1]) or {}
    if not isinstance(data, dict):
        raise ValueError("front matter is not a mapping")
    return data


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

    item_files = sorted(CONTENT_ROOT.glob("**/items/**/index.md"))
    if not item_files:
        print("WARN: no item entries found under content/**/items/**/index.md; skipping entry metadata validation.")
        return 0

    errors: list[str] = []
    en_slugs: set[str] = set()
    zh_slugs: set[str] = set()

    for path in item_files:
        rel = path.relative_to(ROOT).as_posix()
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

        try:
            fm = parse_front_matter(path)
        except Exception as exc:
            errors.append(f"{rel}: invalid front matter ({exc})")
            continue

        missing = [field for field in REQUIRED_FIELDS if field not in fm]
        if missing:
            errors.append(f"{rel}: missing required fields: {', '.join(sorted(missing))}")
            continue

        if fm["source_type"] not in ALLOWED_SOURCE_TYPES:
            errors.append(f"{rel}: `source_type` must be one of {sorted(ALLOWED_SOURCE_TYPES)}")
        if not isinstance(fm["types"], list) or len(fm["types"]) < 1:
            errors.append(f"{rel}: `types` must be a non-empty array")
        elif fm["types"][0] != fm["source_type"]:
            errors.append(f"{rel}: `types[0]` (primary type) must equal `source_type`")
        if fm["language"] not in ALLOWED_LANGS:
            errors.append(f"{rel}: `language` must be one of {sorted(ALLOWED_LANGS)}")
        if fm["language"] != lang:
            errors.append(f"{rel}: `language` must match content path language `{lang}`")

        validate_date(fm["source_date"], "source_date", errors, rel)
        validate_date(fm["submission_date"], "submission_date", errors, rel)

        if not isinstance(fm["keywords"], list) or not fm["keywords"]:
            errors.append(f"{rel}: `keywords` must be a non-empty array")
        else:
            unknown = sorted({kw for kw in fm["keywords"] if kw not in keyword_ids})
            if unknown:
                errors.append(
                    f"{rel}: unknown keywords {unknown}. Map to existing keyword and add proposal to data/keyword_proposals.jsonl."
                )

        primary_topic = fm["primary_topic"]
        if not isinstance(primary_topic, str) or not primary_topic:
            errors.append(f"{rel}: `primary_topic` must be a non-empty string")
        elif primary_topic not in topic_ids:
            errors.append(f"{rel}: unknown primary_topic `{primary_topic}`")

        if not isinstance(fm["topics"], list):
            errors.append(f"{rel}: `topics` must be an array")
        else:
            if len(fm["topics"]) > 9:
                errors.append(f"{rel}: `topics` can include at most 9 secondary values")
            unknown_topics = sorted({topic for topic in fm["topics"] if topic not in topic_ids})
            if unknown_topics:
                errors.append(f"{rel}: unknown topics {unknown_topics}")
            if primary_topic and primary_topic in fm["topics"]:
                errors.append(f"{rel}: `topics` must exclude `primary_topic`")

        attachments = fm.get("attachments")
        if attachments is not None:
            if not isinstance(attachments, list):
                errors.append(f"{rel}: `attachments` must be an array when provided")
            else:
                bundle_dir = path.parent
                for attachment in attachments:
                    if not isinstance(attachment, str):
                        errors.append(f"{rel}: each attachment must be a string path")
                        continue
                    if not (bundle_dir / attachment).exists():
                        errors.append(f"{rel}: attachment `{attachment}` not found in bundle")

    for slug in sorted(zh_slugs):
        if slug not in en_slugs:
            errors.append(
                f"{PATHS.display_path(CONTENT_ROOT)}/zh-tw/items/{slug}/index.md: zh-tw translation exists without canonical English entry"
            )

    if errors:
        for err in errors:
            print(f"ERROR: {err}")
        return 1

    print(f"Validated {len(item_files)} item files successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
