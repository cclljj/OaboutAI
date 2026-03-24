# OaboutAI Knowledge Archive (Hugo)

This site is a static, agent-maintained knowledge archive for AI policy, AI governance, and AI safety resources.  
It is designed for long-term curation: every entry uses strict structured metadata so future agents can ingest, validate, and maintain content with minimal ambiguity.

## Purpose

- Provide a reliable public archive of source materials (web pages, PDFs, YouTube clips, and other references).
- Preserve traceability for each entry: source URL, source date, submission date, and attachment bundle.
- Support fast browsing by newest first, topic, month, keyword, and full-text search.
- Support multilingual publishing with English (`en`) as canonical and Traditional Chinese (`zh-tw`) as optional translation.

## Site Scope

- Top-level topics are controlled and capped at 10 via `data/topics.json`.
- Current topics:
  - `ai-policy`
  - `ai-governance`
  - `ai-safety`
- Keywords are controlled via `data/keywords.json`.

## Content Model

Each entry is a Hugo page bundle:

- Canonical entry: `content/en/items/<slug>/index.md`
- Optional translation: `content/zh-tw/items/<slug>/index.md`
- Attachments: files in the same `<slug>/` folder

Required metadata fields:

- `title`
- `source_url`
- `source_type` (`webpage|pdf|youtube|other`)
- `source_date` (`YYYY-MM-DD`)
- `submission_date` (`YYYY-MM-DD`)
- `executive_summary`
- `detailed_notes`
- `keywords` (must exist in `data/keywords.json`)
- `topics` (must exist in `data/topics.json`)
- `language` (`en|zh-tw`)

## Local Development

Prerequisites:

- Hugo Extended
- Go (for Hugo Modules)
- Python 3.10+ (for validation script)

Commands:

```bash
python scripts/validate_content.py
hugo server -D
```

Production build:

```bash
hugo --gc --minify
```

## OpenClaw Agent Ingestion (All Readable Formats)

For OpenClaw-based ingestion (URL, YouTube, PDF, DOC, DOCX, PPT, PPTX, MD, TXT, and other readable files), use:

- `scripts/ingest_item.py` (prepare/ingest workflow)
- `docs/openclaw_system_prompt.md` (system prompt you can paste into OpenClaw)
- `docs/openclaw_ingestion_workflow.md` (step-by-step runbook + JSON spec skeleton)

Policy for this workflow:

- Create paired entries for the same slug in both `en` and `zh-tw`.
- Do not create `zh-tw`-only entries.
- Use only controlled `topics` and `keywords` IDs from `data/topics.json` and `data/keywords.json`.

Prepare draft spec:

```bash
python scripts/ingest_item.py prepare \
  --source-input "<url-or-local-path>" \
  --source-date "YYYY-MM-DD" \
  --output /tmp/oaboutai_draft.json
```

Finalize spec and ingest:

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --dry-run
```

Write files and run checks:

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks
```

Ingest and push directly to GitHub `main`:

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks \
  --git-push
```

## CI Quality Gate

GitHub Actions workflow: `.github/workflows/docs-site-ci.yml`

Checks:

1. Metadata/schema validation
2. Topic/keyword controlled-vocabulary validation
3. Hugo production build
4. Build artifact presence check (`public/index.html`)

## Deployment (Vercel OaboutAI)

Deployment target:

- Vercel project: `oaboutai` (display name: `OaboutAI`)
- Production URL: `https://oaboutai.vercel.app`
- Build command: `rm -f data/keyword_proposals.jsonl && npx --yes hugo-bin --gc --minify`
- Output directory: `public`

Recommended release flow:

1. Open PR with content/site changes.
2. CI must pass.
3. Merge into `main`.
4. GitHub Actions deploys to Vercel production automatically.

Required GitHub secret for auto-deploy:

- `VERCEL_TOKEN` (Vercel personal/team token with deploy permission)
