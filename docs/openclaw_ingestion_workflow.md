# OpenClaw Ingestion Workflow (Legacy / Optional)

This document is kept for teams that still draft content as markdown bundles before importing into Supabase.

## Current Production Reality

- Production page content is served from Supabase `public.articles`.
- Public GitHub no longer needs to store article markdown bundles under `apps/.../content/*/items/*`.
- Data flow: `OaboutAI_data/obsidian/*.md` -> validate/parse -> upsert `public.articles` -> frontend query.
- If you run this workflow, treat output as staging data, then import/upsert to Supabase.

## Supported Inputs

- URL
- YouTube URL
- PDF
- DOC/DOCX
- PPT/PPTX
- MD/TXT
- other readable files
- multiple URLs/files in one request (batch)

## Source Type Mapping

- YouTube URL -> `youtube`
- non-YouTube URL -> `webpage`
- `.pdf` -> `pdf`
- all other readable files -> `other`

## Bot-Blocked Source Fallback

For sources blocked by anti-bot controls (for example `reuters.com`):
1. search by title + site name
2. use a syndicated mirror page to extract full text
3. keep `source_url` as the original canonical URL

Ask user only when key metadata (especially `source_date`) cannot be determined.

## Legacy Draft Flow

### 1. Prepare draft

```bash
python scripts/ingest_item.py prepare \
  --source-input "<url-or-local-path>" \
  --source-date "YYYY-MM-DD" \
  --output /tmp/oaboutai_draft.json
```

### 2. Fill bilingual fields and taxonomy IDs

Edit `/tmp/oaboutai_draft.json`:
- `title.en`, `title.zh-tw`
- `executive_summary.en`, `executive_summary.zh-tw`
- `detailed_notes.en`, `detailed_notes.zh-tw`
- `takeaway_html.en`, `takeaway_html.zh-tw` (markdown content for `## Take-away`)
- `keywords`, `topics`, `source_date`

### 3. Dry run

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --dry-run
```

### 4. Write + checks

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks
```

## Build Guard (CI-equivalent)

```bash
python scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python scripts/sync_topics.py
python scripts/auto_resolve_content_issues.py
python scripts/validate_content.py
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

## Supabase Publish Step (Recommended)

After content QA, publish via Supabase import/upsert to `public.articles`.

Use:
- Supabase dashboard import tools, or
- your SQL upsert pipeline.

Operational reference:
- `docs/supabase_operations.md`

## Governance Rules

- keyword IDs must come from `apps/<app-id>/data/keywords.json`
- topic IDs must come from `apps/<app-id>/data/topics.json`
- current top-level topic IDs (5): `ai-policy`, `ai-governance`, `ai-safety`, `agentic-ai`, `physical-ai`
- `primary_topic` must not appear in `topics`
- keyword IDs are not valid topic IDs
- keep EN + zh-tw parity for the same slug in data pipelines
- canonical body sections must exist in both languages:
  - `## Executive Summary`
  - `## Detailed Notes`
  - `## Take-away`

Batch handling rule:
- when ingesting multiple items, finish generating all EN/zh-tw files first, then push together in a single commit.

## Copyright-Safe Note

For risky uploaded files:
- keep originals in controlled storage
- avoid committing risky originals to public repo
- store stable reference links in metadata (`archived_url` or equivalent)
