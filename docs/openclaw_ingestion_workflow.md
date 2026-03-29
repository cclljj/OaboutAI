# OpenClaw Ingestion Workflow (Legacy / Optional)

This document is kept for teams that still draft content as markdown bundles before importing into Supabase.

## Current Production Reality

- Production page content is served from Supabase `public.articles`.
- Public GitHub no longer needs to store article markdown bundles under `apps/.../content/*/items/*`.
- If you run this workflow, treat output as staging data, then import to Supabase.

## Supported Inputs

- URL
- YouTube URL
- PDF
- DOC/DOCX
- PPT/PPTX
- MD/TXT
- other readable files

## Source Type Mapping

- YouTube URL -> `youtube`
- non-YouTube URL -> `webpage`
- `.pdf` -> `pdf`
- all other readable files -> `other`

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
- keep EN + zh-tw parity for the same slug in data pipelines

## Copyright-Safe Note

For risky uploaded files:
- keep originals in controlled storage
- avoid committing risky originals to public repo
- store stable reference links in metadata (`archived_url` or equivalent)
