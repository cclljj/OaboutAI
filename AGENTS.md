# AGENTS.md - OaboutAI Hugo Knowledge Archive

This document is the authoritative operating manual for agents that contribute to and maintain this repository root Hugo site.

## 1. Design Logic

The site is designed around **predictable machine-maintained curation**.

Core principles:

1. Every entry must be traceable to a source.
2. Metadata is a strict contract, not optional documentation.
3. Top-level topic taxonomy must remain small and stable (max 10).
4. Keyword taxonomy is controlled to prevent drift.
5. English is canonical; OpenClaw ingestion requires paired Traditional Chinese translation in the same run.
6. Prefer bundle-local assets for portability, except when copyright-safe mode requires external archival.

## 2. Directory Contract

You must follow these paths exactly:

- Canonical entries: `content/en/items/<slug>/index.md`
- Optional zh-TW translation: `content/zh-tw/items/<slug>/index.md`
- Topic pages: `content/<lang>/topics/<topic>.md`
- Monthly archive page: `content/<lang>/archive/monthly.md`
- Topic source of truth: `data/topics.json`
- Keyword source of truth: `data/keywords.json`
- Keyword proposal queue: `data/keyword_proposals.jsonl`

Attachment rule:

- Place attachment files in the same bundle folder as the entry `index.md`.
- Refer to attachments by relative file name in front matter `attachments`.
- Copyright-safe exception: for user-uploaded files with potential copyright risk, do not commit originals to this public repo; store externally and link via `archived_url`.

## 3. Required Entry Metadata

Every `index.md` entry front matter must include:

- `title`
- `source_url`
- `source_type` (`webpage|pdf|youtube|other`)
- `source_date` (`YYYY-MM-DD`)
- `submission_date` (`YYYY-MM-DD`)
- `executive_summary`
- `detailed_notes`
- `keywords` (array)
- `topics` (array)
- `language` (`en|zh-tw`)

Optional fields:

- `attachments` (array)
- `authors`
- `publisher`
- `archived_url`
- `duration`

## 4. Taxonomy Governance

### Topics

- `data/topics.json` is the source of truth.
- Keep no more than 10 top-level topics.
- Current required topics:
  - `ai-policy`
  - `ai-governance`
  - `ai-safety`
- Entries can belong to multiple topics.

### Keywords

- Use only IDs from `data/keywords.json`.
- If no exact keyword exists:
  1. Choose the closest existing keyword.
  2. Append one JSON line to `data/keyword_proposals.jsonl` with candidate term and rationale.
- Do not publish entries with invented keyword IDs.

## 5. Language Policy

- English (`en`) is mandatory canonical content for every entry.
- OpenClaw ingestion requires paired Traditional Chinese (`zh-tw`) content for the same slug.
- Never create zh-TW-only entries without an English canonical entry.

## 6. Slug and Date Rules

Slug format:

- `YYYYMMDD-short-kebab-title`
- Example: `20260218-eu-ai-office-code`

Date semantics:

- `source_date`: date the referenced source was published or captured.
- `submission_date`: date the entry was added to this archive.
- Both must be absolute dates in ISO format (`YYYY-MM-DD`).

## 7. OpenClaw Workflow (Authoritative)

When task scope matches URL/YouTube/PDF/DOC/DOCX/PPT/PPTX/MD/TXT/other readable sources, agents must follow this workflow.

References:

- `docs/openclaw_ingestion_workflow.md`
- `docs/openclaw_system_prompt.md`
- `scripts/ingest_item.py`

Procedure:

1. Prepare draft spec:
   - `python scripts/ingest_item.py prepare --source-input "<url-or-local-path>" --source-date "YYYY-MM-DD" --output /tmp/oaboutai_draft.json`
2. Complete bilingual fields in draft spec:
   - `title.en` / `title.zh-tw`
   - `executive_summary.en` / `executive_summary.zh-tw`
   - `detailed_notes.en` / `detailed_notes.zh-tw`
   - `keywords`, `topics`, `source_date`
3. Validate without writing:
   - `python scripts/ingest_item.py ingest --spec-file /tmp/oaboutai_draft.json --dry-run`
4. Write files and run checks:
   - `python scripts/ingest_item.py ingest --spec-file /tmp/oaboutai_draft.json --run-checks`
5. Build guard (required before push):
   - `rm -f data/keyword_proposals.jsonl`
   - `npx --yes hugo-bin --gc --minify`
6. Push path (if requested):
   - `python scripts/ingest_item.py ingest --spec-file /tmp/oaboutai_draft.json --run-checks --git-push`

Expected outputs:

- `content/en/items/<slug>/index.md`
- `content/zh-tw/items/<slug>/index.md`
- Attachments under `content/en/items/<slug>/`
- Optional proposals appended to `data/keyword_proposals.jsonl`

Copyright-safe mode (for user-uploaded files, default for `[doc]` tasks):

- Keep originals in Google Drive account `cclljj.agent@gmail.com`, folder `Ebook_Documents`.
- Do not commit copyrighted originals into this public repository unless explicitly approved.
- Record the share link in `optional_fields.archived_url` and/or `detailed_notes`.

Source type mapping:

- YouTube URL -> `youtube`
- Non-YouTube URL -> `webpage`
- `.pdf` -> `pdf`
- Other readable files (`.doc/.docx/.ppt/.pptx/.md/.txt/...`) -> `other`

Git push convention:

- Branch: `main`
- Commit message format: `content: add <slug> (<source_type>)`

## 8. Maintenance Workflow

### Add a new topic

1. Add topic object in `data/topics.json`.
2. Ensure topic count remains <= 10.
3. Add topic page in `content/en/topics/` and optional `content/zh-tw/topics/`.
4. Update menus in `hugo.toml` when needed.

### Add a new keyword

1. Add keyword object in `data/keywords.json` with stable `id`, bilingual labels, and optional aliases.
2. Backfill existing entries if this resolves overloaded keyword mapping.
3. Remove processed suggestion lines from `data/keyword_proposals.jsonl`.

## 9. Quality Gate

CI workflow (`.github/workflows/docs-site-ci.yml`) is mandatory and must pass:

1. metadata schema checks
2. controlled vocabulary checks
3. Hugo build checks

Do not bypass CI for content updates.

## 10. Anti-Patterns (Do Not Do)

- Do not publish entries with missing required front matter.
- Do not invent top-level topic IDs in entry files.
- Do not invent keyword IDs in entry files.
- Do not place attachments outside the entry bundle.
- Do not create translation-only entries without English canonical source.
