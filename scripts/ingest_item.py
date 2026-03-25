#!/usr/bin/env python3
"""Ingest content entries for OaboutAI with bilingual output and strict taxonomy.

Workflow:
1) prepare: inspect source input and create a draft JSON spec.
2) ingest: consume a finalized JSON spec, write en/zh-tw bundles, optionally validate/build/git push.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
CONTENT_EN = ROOT / "content" / "en" / "items"
CONTENT_ZH = ROOT / "content" / "zh-tw" / "items"
TOPICS_FILE = ROOT / "data" / "topics.json"
KEYWORDS_FILE = ROOT / "data" / "keywords.json"
KEYWORD_PROPOSALS_FILE = ROOT / "data" / "keyword_proposals.jsonl"

ALLOWED_SOURCE_TYPES = {"webpage", "pdf", "youtube", "other"}
ALLOWED_LANGS = {"en", "zh-tw"}
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"}
OFFICE_EXTENSIONS = {".doc", ".docx", ".ppt", ".pptx"}
TEXT_EXTENSIONS = {".txt", ".md", ".rst", ".csv", ".log"}

TOPIC_BY_KEYWORD = {
    "regulation": "ai-policy",
    "public-consultation": "ai-policy",
    "risk-management": "ai-governance",
    "governance-framework": "ai-governance",
    "audit": "ai-governance",
    "incident-reporting": "ai-governance",
    "model-evaluation": "ai-safety",
    "red-teaming": "ai-safety",
    "safety-cases": "ai-safety",
    "standards": "ai-safety",
}


class SimpleHTMLTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_title = False
        self.title = ""
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "title":
            self.in_title = True

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        chunk = data.strip()
        if not chunk:
            return
        if self.in_title and not self.title:
            self.title = html.unescape(chunk)
        self.parts.append(html.unescape(chunk))


@dataclass
class ExtractedSource:
    source_input: str
    source_url: str
    source_type: str
    title_en: str
    extracted_text: str


def is_url(value: str) -> bool:
    parsed = urllib.parse.urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def infer_source_type(source_input: str, source_type_hint: str | None) -> str:
    if source_type_hint:
        if source_type_hint not in ALLOWED_SOURCE_TYPES:
            raise ValueError(f"source_type_hint must be one of {sorted(ALLOWED_SOURCE_TYPES)}")
        return source_type_hint

    if is_url(source_input):
        host = urllib.parse.urlparse(source_input).netloc.lower()
        if host in YOUTUBE_HOSTS or host.endswith(".youtube.com"):
            return "youtube"
        return "webpage"

    ext = Path(source_input).suffix.lower()
    if ext == ".pdf":
        return "pdf"
    if ext in OFFICE_EXTENSIONS or ext in TEXT_EXTENSIONS:
        return "other"
    return "other"


def sanitize_filename(name: str) -> str:
    stem = Path(name).stem.lower()
    suffix = Path(name).suffix.lower()
    stem = re.sub(r"[^a-z0-9]+", "-", stem).strip("-") or "attachment"
    return f"{stem}{suffix}"


def slugify(title: str) -> str:
    text = title.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text or "untitled"


def ensure_iso_date(value: str, field_name: str) -> None:
    if not DATE_PATTERN.match(value):
        raise ValueError(f"{field_name} must be in YYYY-MM-DD format")
    dt.date.fromisoformat(value)


def run_command(cmd: list[str], cwd: Path | None = None) -> tuple[int, str, str]:
    proc = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        check=False,
        text=True,
        capture_output=True,
    )
    return proc.returncode, proc.stdout, proc.stderr


def read_text_fallback(path: Path) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return path.read_bytes().decode("utf-8", errors="ignore")


def extract_from_html_url(url: str) -> tuple[str, str]:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 OaboutAI-Ingest/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read()
    text = raw.decode("utf-8", errors="ignore")
    parser = SimpleHTMLTextExtractor()
    parser.feed(text)
    body_text = "\n".join(parser.parts)
    return parser.title or url, body_text


def extract_pdf_text(path: Path) -> str:
    try:
        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(str(path))
        pages = [(page.extract_text() or "") for page in reader.pages]
        return "\n\n".join(pages).strip()
    except Exception:
        code, stdout, _ = run_command(["pdftotext", str(path), "-"])
        if code == 0 and stdout.strip():
            return stdout.strip()
    raise RuntimeError("Unable to extract PDF text (install pypdf or pdftotext)")


def extract_docx_text(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        xml_data = archive.read("word/document.xml").decode("utf-8", errors="ignore")
    return "\n".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", xml_data)).strip()


def extract_pptx_text(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        names = sorted(n for n in archive.namelist() if n.startswith("ppt/slides/slide") and n.endswith(".xml"))
        texts: list[str] = []
        for name in names:
            xml_data = archive.read(name).decode("utf-8", errors="ignore")
            texts.extend(re.findall(r"<a:t[^>]*>(.*?)</a:t>", xml_data))
    return "\n".join(texts).strip()


def extract_other_file_text(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in TEXT_EXTENSIONS:
        return read_text_fallback(path)
    if ext == ".docx":
        return extract_docx_text(path)
    if ext == ".pptx":
        return extract_pptx_text(path)
    if ext == ".doc":
        code, stdout, _ = run_command(["antiword", str(path)])
        if code == 0 and stdout.strip():
            return stdout.strip()
        raise RuntimeError("Unable to extract .doc text (install antiword)")
    if ext == ".ppt":
        code, stdout, _ = run_command(["catppt", str(path)])
        if code == 0 and stdout.strip():
            return stdout.strip()
        raise RuntimeError("Unable to extract .ppt text (install catppt)")

    # Generic fallback for unknown readable files.
    return read_text_fallback(path)


def extract_source(source_input: str, source_type: str, source_url: str | None = None) -> ExtractedSource:
    if is_url(source_input):
        url = source_input
        if source_type in {"webpage", "youtube"}:
            try:
                title, text = extract_from_html_url(url)
            except (urllib.error.URLError, TimeoutError):
                # Keep blocked behavior deterministic without hard-failing if network blocks title extraction.
                title, text = url, ""
            if source_type == "youtube" and not text:
                text = "YouTube source detected. Provide transcript or notes for higher quality summaries."
            return ExtractedSource(source_input=source_input, source_url=url, source_type=source_type, title_en=title, extracted_text=text)

    local_path = Path(source_input).expanduser().resolve()
    if not local_path.exists():
        raise FileNotFoundError(f"source_input not found: {source_input}")

    if source_type == "pdf":
        extracted = extract_pdf_text(local_path)
    elif source_type == "other":
        extracted = extract_other_file_text(local_path)
    else:
        extracted = extract_other_file_text(local_path)

    title = local_path.stem.replace("_", " ").replace("-", " ").strip() or local_path.name
    resolved_source_url = source_url or f"file://{local_path.name}"
    return ExtractedSource(
        source_input=source_input,
        source_url=resolved_source_url,
        source_type=source_type,
        title_en=title,
        extracted_text=extracted,
    )


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def tokenize(value: str) -> set[str]:
    return set(re.findall(r"[a-z0-9\-]+", value.lower()))


def propose_keywords(text: str, keyword_records: list[dict[str, Any]], top_n: int = 3) -> list[str]:
    tokens = tokenize(text)
    scored: list[tuple[int, str]] = []
    for record in keyword_records:
        kid = record["id"]
        score = 0
        candidate_terms = [kid]
        label = record.get("label") or {}
        candidate_terms.extend(v for v in label.values() if isinstance(v, str))
        candidate_terms.extend(record.get("aliases") or [])
        for term in candidate_terms:
            tkns = tokenize(str(term))
            if not tkns:
                continue
            overlap = len(tokens & tkns)
            if overlap:
                score += overlap
        scored.append((score, kid))

    scored.sort(key=lambda item: (-item[0], item[1]))
    picks = [kid for score, kid in scored if score > 0][:top_n]
    if not picks:
        return ["governance-framework"]
    return picks


def propose_topics(keywords: list[str], valid_topics: set[str]) -> list[str]:
    topics = {TOPIC_BY_KEYWORD[k] for k in keywords if k in TOPIC_BY_KEYWORD and TOPIC_BY_KEYWORD[k] in valid_topics}
    if not topics:
        topics = {"ai-governance"} if "ai-governance" in valid_topics else {next(iter(valid_topics))}
    ordered = [t for t in ["ai-policy", "ai-governance", "ai-safety"] if t in topics]
    return ordered or sorted(topics)


def summarize_text(text: str, max_chars: int = 1200) -> str:
    clean = re.sub(r"\s+", " ", text).strip()
    if not clean:
        return "Summary unavailable. Provide source excerpt to complete this field."
    if len(clean) <= max_chars:
        return clean
    return clean[: max_chars - 3].rstrip() + "..."


def build_front_matter(
    *,
    title: str,
    source_url: str,
    source_type: str,
    source_date: str,
    submission_date: str,
    executive_summary: str,
    detailed_notes: str,
    keywords: list[str],
    topics: list[str],
    language: str,
    date_value: str,
    attachments: list[str] | None = None,
    optional_fields: dict[str, Any] | None = None,
) -> dict[str, Any]:
    front_matter: dict[str, Any] = {
        "title": title,
        "date": date_value,
        "source_url": source_url,
        "source_type": source_type,
        "types": [source_type],
        "source_date": source_date,
        "submission_date": submission_date,
        "executive_summary": executive_summary,
        "detailed_notes": detailed_notes,
        "keywords": keywords,
        "topics": topics,
        "language": language,
    }
    if attachments:
        front_matter["attachments"] = attachments
    if optional_fields:
        for key, value in optional_fields.items():
            if value is not None:
                front_matter[key] = value
    return front_matter


def render_markdown(front_matter: dict[str, Any], notes_heading: str, details: str) -> str:
    yaml_block = yaml.safe_dump(front_matter, allow_unicode=True, sort_keys=False).strip()
    body = details.strip() if details.strip() else "- Pending notes."
    return f"---\n{yaml_block}\n---\n\n## {notes_heading}\n\n{body}\n"


def validate_spec(spec: dict[str, Any], valid_topics: set[str], valid_keywords: set[str]) -> None:
    required_top = [
        "source_input",
        "source_date",
        "submission_date",
        "title",
        "executive_summary",
        "detailed_notes",
        "keywords",
        "topics",
    ]
    for key in required_top:
        if key not in spec:
            raise ValueError(f"missing required field: {key}")

    for lang in ALLOWED_LANGS:
        for field in ["title", "executive_summary", "detailed_notes"]:
            value = spec.get(field, {}).get(lang)
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"{field}.{lang} is required")

    source_type = infer_source_type(spec["source_input"], spec.get("source_type_hint"))
    if source_type not in ALLOWED_SOURCE_TYPES:
        raise ValueError(f"source_type must be in {sorted(ALLOWED_SOURCE_TYPES)}")

    ensure_iso_date(spec["source_date"], "source_date")
    ensure_iso_date(spec["submission_date"], "submission_date")

    unknown_topics = sorted(set(spec["topics"]) - valid_topics)
    if unknown_topics:
        raise ValueError(f"unknown topics: {unknown_topics}")

    unknown_keywords = sorted(set(spec["keywords"]) - valid_keywords)
    if unknown_keywords:
        raise ValueError(f"unknown keywords: {unknown_keywords}")


def ensure_unique_slug(slug: str) -> str:
    en_path = CONTENT_EN / slug / "index.md"
    zh_path = CONTENT_ZH / slug / "index.md"
    if not en_path.exists() and not zh_path.exists():
        return slug
    suffix = 2
    while True:
        candidate = f"{slug}-{suffix}"
        if not (CONTENT_EN / candidate / "index.md").exists() and not (CONTENT_ZH / candidate / "index.md").exists():
            return candidate
        suffix += 1


def append_keyword_proposals(proposals: list[dict[str, Any]], submission_date: str, source_input: str) -> int:
    if not proposals:
        return 0
    KEYWORD_PROPOSALS_FILE.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with KEYWORD_PROPOSALS_FILE.open("a", encoding="utf-8") as fh:
        for proposal in proposals:
            term = str(proposal.get("term", "")).strip()
            rationale = str(proposal.get("rationale", "")).strip()
            if not term or not rationale:
                continue
            payload = {
                "term": term,
                "rationale": rationale,
                "submission_date": submission_date,
                "source_input": source_input,
            }
            fh.write(json.dumps(payload, ensure_ascii=False) + "\n")
            count += 1
    return count


def copy_attachment(src: Path, dst_dir: Path) -> str:
    safe_name = sanitize_filename(src.name)
    target = dst_dir / safe_name
    if target.exists():
        stem = Path(safe_name).stem
        suffix = Path(safe_name).suffix
        idx = 2
        while True:
            candidate = dst_dir / f"{stem}-{idx}{suffix}"
            if not candidate.exists():
                target = candidate
                break
            idx += 1
    shutil.copy2(src, target)
    return target.name


def cmd_prepare(args: argparse.Namespace) -> int:
    source_type = infer_source_type(args.source_input, args.source_type_hint)
    submission_date = args.submission_date or dt.date.today().isoformat()
    ensure_iso_date(submission_date, "submission_date")

    extracted = extract_source(args.source_input, source_type, source_url=args.source_url)

    topics_data = load_json(TOPICS_FILE)
    keywords_data = load_json(KEYWORDS_FILE)
    valid_topics = {entry["id"] for entry in topics_data}

    keywords = propose_keywords(extracted.extracted_text, keywords_data)
    topics = propose_topics(keywords, valid_topics)

    title_en = extracted.title_en.strip() or "Untitled Source"
    slug_base = f"{submission_date.replace('-', '')}-{slugify(title_en)[:50]}"
    slug = ensure_unique_slug(slug_base)

    summary_en = summarize_text(extracted.extracted_text, max_chars=380)
    notes_en = summarize_text(extracted.extracted_text, max_chars=1200)

    draft = {
        "source_input": args.source_input,
        "source_url": extracted.source_url,
        "source_type_hint": source_type,
        "source_date": args.source_date or "",
        "submission_date": submission_date,
        "slug": slug,
        "title": {
            "en": title_en,
            "zh-tw": "",
        },
        "executive_summary": {
            "en": summary_en,
            "zh-tw": "",
        },
        "detailed_notes": {
            "en": notes_en,
            "zh-tw": "",
        },
        "keywords": keywords,
        "topics": topics,
        "attachments": [],
        "keyword_proposals": [],
        "optional_fields": {
            "authors": None,
            "publisher": None,
            "archived_url": None,
            "duration": None,
        },
        "blocked_reasons": [],
    }

    if not args.source_date:
        draft["blocked_reasons"].append("source_date missing; provide a traceable YYYY-MM-DD value before ingest")

    if source_type == "youtube":
        draft["blocked_reasons"].append("youtube transcript may be incomplete; verify executive_summary and detailed_notes manually")

    output = json.dumps(draft, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(output + "\n", encoding="utf-8")
        print(f"Wrote draft spec: {args.output}")
    else:
        print(output)

    return 0


def cmd_ingest(args: argparse.Namespace) -> int:
    spec_path = Path(args.spec_file)
    if not spec_path.exists():
        print(f"ERROR: spec file not found: {spec_path}", file=sys.stderr)
        return 1
    spec = load_json(spec_path)

    topics_data = load_json(TOPICS_FILE)
    keywords_data = load_json(KEYWORDS_FILE)
    valid_topics = {entry["id"] for entry in topics_data}
    valid_keywords = {entry["id"] for entry in keywords_data}

    try:
        validate_spec(spec, valid_topics, valid_keywords)
    except Exception as exc:
        print(f"ERROR: invalid spec: {exc}", file=sys.stderr)
        return 1

    blocked_reasons = spec.get("blocked_reasons") or []
    if blocked_reasons and not args.force:
        print("ERROR: spec has blocked_reasons; resolve them or pass --force", file=sys.stderr)
        for reason in blocked_reasons:
            print(f"- {reason}", file=sys.stderr)
        return 2

    source_type = infer_source_type(spec["source_input"], spec.get("source_type_hint"))
    source_input = str(spec["source_input"])
    source_url = spec.get("source_url") or (source_input if is_url(source_input) else f"file://{Path(source_input).name}")
    source_date = spec["source_date"]
    submission_date = spec["submission_date"]
    slug = spec.get("slug") or f"{submission_date.replace('-', '')}-{slugify(spec['title']['en'])[:50]}"
    slug = ensure_unique_slug(slug)

    if args.dry_run:
        print("Dry run successful. Spec is valid and ready for ingest.")
        print(f"- slug: {slug}")
        print(f"- source_type: {source_type}")
        print(f"- source_url: {source_url}")
        print(f"- en_path: {(CONTENT_EN / slug / 'index.md').relative_to(ROOT)}")
        print(f"- zh_path: {(CONTENT_ZH / slug / 'index.md').relative_to(ROOT)}")
        return 0

    en_dir = CONTENT_EN / slug
    zh_dir = CONTENT_ZH / slug
    en_dir.mkdir(parents=True, exist_ok=True)
    zh_dir.mkdir(parents=True, exist_ok=True)

    attachments: list[str] = []

    src_path = Path(source_input).expanduser()
    if src_path.exists() and src_path.is_file():
        attachments.append(copy_attachment(src_path.resolve(), en_dir))

    for raw_attachment in spec.get("attachments") or []:
        attachment_path = Path(raw_attachment).expanduser()
        if not attachment_path.exists() or not attachment_path.is_file():
            print(f"ERROR: attachment not found: {attachment_path}", file=sys.stderr)
            return 1
        attachments.append(copy_attachment(attachment_path.resolve(), en_dir))

    optional = spec.get("optional_fields") or {}
    front_en = build_front_matter(
        title=spec["title"]["en"],
        source_url=source_url,
        source_type=source_type,
        source_date=source_date,
        submission_date=submission_date,
        executive_summary=spec["executive_summary"]["en"],
        detailed_notes=spec["detailed_notes"]["en"],
        keywords=spec["keywords"],
        topics=spec["topics"],
        language="en",
        date_value=submission_date,
        attachments=attachments or None,
        optional_fields=optional,
    )

    front_zh = build_front_matter(
        title=spec["title"]["zh-tw"],
        source_url=source_url,
        source_type=source_type,
        source_date=source_date,
        submission_date=submission_date,
        executive_summary=spec["executive_summary"]["zh-tw"],
        detailed_notes=spec["detailed_notes"]["zh-tw"],
        keywords=spec["keywords"],
        topics=spec["topics"],
        language="zh-tw",
        date_value=submission_date,
        attachments=None,
        optional_fields=optional,
    )

    en_md = render_markdown(front_en, "Detailed Notes", spec["detailed_notes"]["en"])
    zh_md = render_markdown(front_zh, "詳細筆記", spec["detailed_notes"]["zh-tw"])

    en_index = en_dir / "index.md"
    zh_index = zh_dir / "index.md"
    en_index.write_text(en_md, encoding="utf-8")
    zh_index.write_text(zh_md, encoding="utf-8")

    proposal_count = append_keyword_proposals(spec.get("keyword_proposals") or [], submission_date, source_input)

    print(f"Created slug: {slug}")
    print(f"- EN: {en_index.relative_to(ROOT)}")
    print(f"- ZH: {zh_index.relative_to(ROOT)}")
    if attachments:
        print(f"- Attachments: {', '.join(attachments)}")
    if proposal_count:
        print(f"- Keyword proposals appended: {proposal_count}")

    if args.run_checks:
        print("Running validator...")
        code, stdout, stderr = run_command([sys.executable, str(ROOT / "scripts" / "validate_content.py")], cwd=ROOT)
        sys.stdout.write(stdout)
        sys.stderr.write(stderr)
        if code != 0:
            return code

        print("Running Hugo build...")
        # Keep local behavior aligned with CI, which removes keyword_proposals.jsonl before build.
        proposals_backup: Path | None = None
        if KEYWORD_PROPOSALS_FILE.exists():
            with tempfile.NamedTemporaryFile(prefix="keyword_proposals_", suffix=".jsonl", delete=False) as tmp:
                proposals_backup = Path(tmp.name)
            shutil.copy2(KEYWORD_PROPOSALS_FILE, proposals_backup)
            KEYWORD_PROPOSALS_FILE.unlink()

        try:
            hugo_cmd = shutil.which("hugo")
            cmd = ["hugo", "--gc", "--minify"] if hugo_cmd else ["npx", "--yes", "hugo-bin", "--gc", "--minify"]
            code, stdout, stderr = run_command(cmd, cwd=ROOT)
        finally:
            if proposals_backup and proposals_backup.exists():
                shutil.move(str(proposals_backup), str(KEYWORD_PROPOSALS_FILE))

        sys.stdout.write(stdout)
        sys.stderr.write(stderr)
        if code != 0:
            return code

    if args.git_push:
        commit_message = args.commit_message or f"content: add {slug} ({source_type})"
        add_targets = [
            str(en_dir),
            str(zh_dir),
            str(KEYWORD_PROPOSALS_FILE),
        ]
        print("Running git add...")
        code, _, stderr = run_command(["git", "add", *add_targets], cwd=ROOT)
        if code != 0:
            print(stderr, file=sys.stderr)
            return code

        print("Running git commit...")
        code, stdout, stderr = run_command(["git", "commit", "-m", commit_message], cwd=ROOT)
        sys.stdout.write(stdout)
        sys.stderr.write(stderr)
        if code != 0:
            return code

        print("Running git push origin main...")
        code, stdout, stderr = run_command(["git", "push", "origin", "main"], cwd=ROOT)
        sys.stdout.write(stdout)
        sys.stderr.write(stderr)
        if code != 0:
            return code

    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Prepare and ingest OaboutAI entries from readable sources.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_prepare = sub.add_parser("prepare", help="Inspect source and output a draft JSON spec.")
    p_prepare.add_argument("--source-input", required=True, help="URL or local file path")
    p_prepare.add_argument("--source-type-hint", choices=sorted(ALLOWED_SOURCE_TYPES), default=None)
    p_prepare.add_argument("--source-url", default=None, help="Override source_url in draft")
    p_prepare.add_argument("--source-date", default=None, help="YYYY-MM-DD")
    p_prepare.add_argument("--submission-date", default=None, help="YYYY-MM-DD, defaults to today")
    p_prepare.add_argument("--output", default=None, help="Write JSON draft to file")
    p_prepare.set_defaults(func=cmd_prepare)

    p_ingest = sub.add_parser("ingest", help="Consume finalized spec JSON and write content bundles.")
    p_ingest.add_argument("--spec-file", required=True, help="Path to finalized JSON spec")
    p_ingest.add_argument("--run-checks", action="store_true", help="Run validate_content.py and hugo build")
    p_ingest.add_argument("--git-push", action="store_true", help="Run git add/commit/push origin main")
    p_ingest.add_argument("--commit-message", default=None, help="Commit message override")
    p_ingest.add_argument("--force", action="store_true", help="Allow ingest even when blocked_reasons exists")
    p_ingest.add_argument("--dry-run", action="store_true", help="Validate spec and planned paths without writing files")
    p_ingest.set_defaults(func=cmd_ingest)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
