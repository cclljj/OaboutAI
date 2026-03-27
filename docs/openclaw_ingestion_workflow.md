# OpenClaw Ingestion Workflow (AI-Friendly)

This guide is for AI agents and human operators ingesting readable sources into an app.

## Scope

Supported inputs:
- URL
- YouTube URL
- PDF
- DOC/DOCX
- PPT/PPTX
- MD/TXT
- other readable files

Source type mapping:
- YouTube URL -> `youtube`
- non-YouTube URL -> `webpage`
- `.pdf` -> `pdf`
- all other readable files -> `other`

Type taxonomy rule:
- `source_type` is the primary type.
- `types[0]` must equal `source_type`.
- Additional secondary types may be appended to `types` when relevant.

## Required Context

- Repo root: `OaboutAI`
- Target app: `${APP_ID:-oaboutai}`
- Script entrypoints: `scripts/*.py`

## Step 1: Prepare Draft Spec

```bash
python scripts/ingest_item.py prepare \
  --source-input "<url-or-local-path>" \
  --source-date "YYYY-MM-DD" \
  --output /tmp/oaboutai_draft.json
```

What `prepare` does:
- infers `source_type`
- proposes slug/keywords/topics
- drafts EN summary fields

## Step 2: Complete Draft JSON

Edit `/tmp/oaboutai_draft.json` and fill:
- `title.en`, `title.zh-tw`
- `executive_summary.en`, `executive_summary.zh-tw`
- `detailed_notes.en`, `detailed_notes.zh-tw`
- `source_date`
- `keywords`, `topics`

Optional:
- `attachments`
- `keyword_proposals`
- `optional_fields` (`authors`, `publisher`, `archived_url`, `duration`)

Rules:
- Use only IDs from `apps/<app-id>/data/topics.json` and `apps/<app-id>/data/keywords.json`
- No invented keyword IDs
- Keep wording concrete and searchable

## Step 3: Dry Run

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --dry-run
```

## Step 4: Write + Checks

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks
```

## Step 5: Build Guard (CI-Equivalent)

```bash
python scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python scripts/sync_topics.py
python scripts/auto_resolve_content_issues.py
python scripts/validate_content.py
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

## Step 6: Optional Direct Push

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks \
  --git-push
```

## Expected Outputs

- `apps/<app-id>/content/en/items/<slug>/index.md`
- `apps/<app-id>/content/zh-tw/items/<slug>/index.md`
- optional attachments in EN bundle folder
- optional proposal lines in `apps/<app-id>/data/keyword_proposals.jsonl`

## Quality Gate (Must Pass)

1. EN + zh-tw exist for same slug.
2. All keyword/topic IDs are valid for target app.
3. `python scripts/validate_content.py` passes.
4. `hugo --gc --minify` passes in composed workspace.

## Copyright-Safe Mode

For user-uploaded files with copyright risk:
- keep original in controlled external storage
- do not commit risky original to public repo
- record share link in `optional_fields.archived_url` and/or `detailed_notes`

For `[doc]` PDF URL inputs (important normalization rule):
- download the PDF first
- upload the PDF to controlled storage (e.g., Google Drive mirror)
- keep `source_url` as the original external PDF URL
- include the controlled-storage link in `detailed_notes` (or `optional_fields.archived_url`) for stable internal access
- keep `source_type: pdf` (do not classify as `webpage`)
