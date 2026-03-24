# OpenClaw Ingestion Workflow (All Readable Formats)

## Scope
This workflow supports URL, YouTube, PDF, DOC, DOCX, PPT, PPTX, MD, TXT, and other readable files.

Source type mapping used by the toolchain:
- URL + YouTube domain -> `youtube`
- URL (non-YouTube) -> `webpage`
- `.pdf` -> `pdf`
- `.doc`, `.docx`, `.ppt`, `.pptx`, `.md`, `.txt`, and other readable files -> `other`

## Tooling
- Script: `scripts/ingest_item.py`
- Validator: `scripts/validate_content.py`
- Build: `hugo --gc --minify`

## Step 1: Prepare Draft Spec
```bash
python scripts/ingest_item.py prepare \
  --source-input "<url-or-local-path>" \
  --source-date "YYYY-MM-DD" \
  --output /tmp/oaboutai_draft.json
```

Notes:
- `prepare` infers `source_type`, proposes `keywords/topics`, drafts slug and English summaries.
- If `source_date` is missing, draft is marked blocked.

## Step 2: Fill Final Bilingual Content
Edit `/tmp/oaboutai_draft.json` and complete:
- `title.en` / `title.zh-tw`
- `executive_summary.en` / `executive_summary.zh-tw`
- `detailed_notes.en` / `detailed_notes.zh-tw`
- `source_date`
- `keywords`, `topics`

Optional:
- `attachments`: additional local files to copy into bundle
- `keyword_proposals`: list of objects with `term` + `rationale`
- `optional_fields`: `authors`, `publisher`, `archived_url`, `duration`

Copyright-safe mode for uploaded files (default for `[doc]`):
- Keep original uploaded files in Google Drive account `cclljj.agent@gmail.com`, folder `Ebook_Documents`.
- Do **not** commit copyrighted originals into this public repo unless explicitly approved.
- Put Google Drive share URL in `optional_fields.archived_url` and/or mention it in `detailed_notes`.

## Step 3: Ingest + Validate + Build (+ optional Push)
Dry-run validation without writing files:
```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --dry-run
```

Write files + run checks:
```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks
```

Manual pre-push build guard (recommended, mirrors CI/Vercel):
```bash
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

Push directly to GitHub main:
```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks \
  --git-push
```

## Expected Outputs
- `content/en/items/<slug>/index.md`
- `content/zh-tw/items/<slug>/index.md` (required; no English-only entries)
- Attachments in `content/en/items/<slug>/`
- Appended lines in `data/keyword_proposals.jsonl` when provided

## Fixed Quality Gate (must pass before push)
1. English + zh-tw both exist for the same slug.
2. `keywords`/`topics` only use existing ids in `data/keywords.json` and `data/topics.json`.
3. `python scripts/validate_content.py` passes.
4. `rm -f data/keyword_proposals.jsonl && npx --yes hugo-bin --gc --minify` passes.

## Example Spec Skeleton
```json
{
  "source_input": "https://example.org/policy-update",
  "source_url": "https://example.org/policy-update",
  "source_type_hint": "webpage",
  "source_date": "2026-03-24",
  "submission_date": "2026-03-24",
  "slug": "20260324-policy-update-brief",
  "title": {
    "en": "Policy Update Brief",
    "zh-tw": "政策更新重點"
  },
  "executive_summary": {
    "en": "Summary in English.",
    "zh-tw": "中文摘要。"
  },
  "detailed_notes": {
    "en": "Detailed notes in English.",
    "zh-tw": "中文詳細筆記。"
  },
  "keywords": ["regulation", "governance-framework"],
  "topics": ["ai-policy", "ai-governance"],
  "attachments": [],
  "keyword_proposals": [],
  "optional_fields": {
    "authors": null,
    "publisher": null,
    "archived_url": null,
    "duration": null
  },
  "blocked_reasons": []
}
```
