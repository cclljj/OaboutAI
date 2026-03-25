#!/usr/bin/env python3
import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
CONTENT_ROOT = ROOT / "content"
KEYWORDS_FILE = ROOT / "data" / "keywords.json"
KEYWORD_PROPOSALS_FILE = ROOT / "data" / "keyword_proposals.jsonl"
FALLBACK_KEYWORD = "governance-framework"


def parse_front_matter(md_path: Path) -> tuple[dict, str]:
    raw = md_path.read_text(encoding="utf-8")
    if not raw.startswith("---\n"):
        return {}, raw
    parts = raw.split("---\n", 2)
    if len(parts) < 3:
        return {}, raw
    data = yaml.safe_load(parts[1]) or {}
    if not isinstance(data, dict):
        return {}, raw
    body = parts[2]
    return data, body


def write_front_matter(md_path: Path, fm: dict, body: str) -> None:
    dumped = yaml.safe_dump(fm, sort_keys=False, allow_unicode=True).strip()
    md_path.write_text(f"---\n{dumped}\n---\n{body}", encoding="utf-8")


def load_existing_proposals() -> set[str]:
    if not KEYWORD_PROPOSALS_FILE.exists():
        return set()
    terms: set[str] = set()
    for line in KEYWORD_PROPOSALS_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except Exception:
            continue
        term = str(payload.get("term", "")).strip()
        if term:
            terms.add(term)
    return terms


def append_proposals(unknown_terms: set[str]) -> int:
    if not unknown_terms:
        return 0
    existing = load_existing_proposals()
    to_append = sorted(term for term in unknown_terms if term not in existing)
    if not to_append:
        return 0
    KEYWORD_PROPOSALS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with KEYWORD_PROPOSALS_FILE.open("a", encoding="utf-8") as fh:
        for term in to_append:
            payload = {
                "term": term,
                "rationale": "Auto-added by CI/content auto-resolver; mapped to existing fallback keyword `governance-framework`.",
            }
            fh.write(json.dumps(payload, ensure_ascii=False) + "\n")
    return len(to_append)


def main() -> int:
    keyword_ids = {entry["id"] for entry in json.loads(KEYWORDS_FILE.read_text(encoding="utf-8"))}
    if FALLBACK_KEYWORD not in keyword_ids:
        raise SystemExit(f"Fallback keyword `{FALLBACK_KEYWORD}` is missing in data/keywords.json")

    changed_files = 0
    unknown_terms: set[str] = set()

    for path in sorted(CONTENT_ROOT.glob("**/items/**/index.md")):
        fm, body = parse_front_matter(path)
        if not fm:
            continue

        changed = False

        keywords = fm.get("keywords")
        if isinstance(keywords, list):
            resolved_keywords: list[str] = []
            seen: set[str] = set()
            for raw_kw in keywords:
                kw = str(raw_kw).strip()
                if not kw:
                    continue
                if kw in keyword_ids:
                    mapped = kw
                else:
                    unknown_terms.add(kw)
                    mapped = FALLBACK_KEYWORD
                if mapped not in seen:
                    resolved_keywords.append(mapped)
                    seen.add(mapped)
            if resolved_keywords != keywords:
                fm["keywords"] = resolved_keywords
                changed = True

        attachments = fm.get("attachments")
        if isinstance(attachments, list):
            existing_attachments = []
            for name in attachments:
                attachment_name = str(name).strip()
                if not attachment_name:
                    continue
                if (path.parent / attachment_name).exists():
                    existing_attachments.append(attachment_name)
            if existing_attachments != attachments:
                changed = True
                if existing_attachments:
                    fm["attachments"] = existing_attachments
                else:
                    fm.pop("attachments", None)

        if changed:
            write_front_matter(path, fm, body)
            changed_files += 1

    proposal_count = append_proposals(unknown_terms)
    print(
        f"Auto-resolve complete: changed_files={changed_files}, "
        f"unknown_keywords_mapped={len(unknown_terms)}, proposals_appended={proposal_count}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
