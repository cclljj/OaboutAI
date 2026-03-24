# AGENTS.md - OaboutAI Hugo Knowledge Archive

This document is the authoritative operating manual for agents that contribute to and maintain `docs-site/`.

## 1. Design Logic

The site is designed around **predictable machine-maintained curation**.

Core principles:

1. Every entry must be traceable to a source.
2. Metadata is a strict contract, not optional documentation.
3. Top-level topic taxonomy must remain small and stable (max 10).
4. Keyword taxonomy is controlled to prevent drift.
5. English is canonical; Traditional Chinese is an optional translation layer.
6. All assets for one entry live together in a page bundle to keep records portable.

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
- Traditional Chinese (`zh-tw`) entries are optional translations.
- Never create zh-TW-only entries without an English canonical entry.

## 6. Slug and Date Rules

Slug format:

- `YYYYMMDD-short-kebab-title`
- Example: `20260218-eu-ai-office-code`

Date semantics:

- `source_date`: date the referenced source was published or captured.
- `submission_date`: date the entry was added to this archive.
- Both must be absolute dates in ISO format (`YYYY-MM-DD`).

## 7. Authoring Workflow (Agent Procedure)

1. Pick canonical language entry path under `content/en/items/<slug>/`.
2. Add `index.md` with all required fields.
3. Add attachment files to same folder when available.
4. Ensure `topics` values exist in `data/topics.json`.
5. Ensure `keywords` values exist in `data/keywords.json`.
6. Add optional zh-TW translation only after canonical English exists.
7. Run validator:
   - `python docs-site/scripts/validate_content.py`
8. Build check:
   - `hugo --source docs-site --gc --minify`
9. Open PR; CI must pass before merge.

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
