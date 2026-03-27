#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

import yaml

from common_paths import resolve_site_paths

PATHS = resolve_site_paths(Path(__file__))
SITE_ROOT = PATHS.site_root
TOPICS_FILE = PATHS.topics_file
APP_MANIFEST = SITE_ROOT / "app.toml"


def load_languages() -> list[str]:
    if APP_MANIFEST.exists():
        manifest = APP_MANIFEST.read_text(encoding="utf-8")
        for line in manifest.splitlines():
            line = line.strip()
            if line.startswith("supported_languages") and "[" in line and "]" in line:
                raw = line.split("=", 1)[1].strip().strip("[]")
                langs = [p.strip().strip('"') for p in raw.split(",") if p.strip()]
                if langs:
                    return langs

    content_root = SITE_ROOT / "content"
    langs = [p.name for p in content_root.iterdir() if p.is_dir()]
    return sorted(langs)


def topic_markdown(topic: dict, lang: str, weight: int) -> str:
    topic_id = topic["id"]
    title = topic.get("title", {}).get(lang) or topic_id
    desc = topic.get("description", {}).get(lang) or ""
    fm = {
        "title": title,
        "layout": "topic",
        "topic_key": topic_id,
        "weight": weight,
    }
    yaml_block = yaml.safe_dump(fm, allow_unicode=True, sort_keys=False).strip()
    body = desc.strip()
    if body:
        return f"---\n{yaml_block}\n---\n\n{body}\n"
    return f"---\n{yaml_block}\n---\n"


def main() -> int:
    topics = json.loads(TOPICS_FILE.read_text(encoding="utf-8"))
    if not isinstance(topics, list):
        raise SystemExit("ERROR: topics.json must be an array")

    topic_ids: set[str] = set()
    for entry in topics:
        if not isinstance(entry, dict) or not isinstance(entry.get("id"), str):
            raise SystemExit("ERROR: each topic must be an object with string id")
        topic_ids.add(entry["id"])

    langs = load_languages()
    if not langs:
        raise SystemExit("ERROR: no content languages found")

    for lang in langs:
        topics_dir = SITE_ROOT / "content" / lang / "topics"
        topics_dir.mkdir(parents=True, exist_ok=True)

        for idx, topic in enumerate(topics, start=1):
            weight = int(topic.get("weight") or idx * 10)
            output_path = topics_dir / f"{topic['id']}.md"
            output_path.write_text(topic_markdown(topic, lang, weight), encoding="utf-8")

        for path in topics_dir.glob("*.md"):
            if path.name == "_index.md":
                continue
            if path.stem not in topic_ids:
                path.unlink()

    print(f"Synced {len(topics)} topics across languages: {', '.join(langs)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
