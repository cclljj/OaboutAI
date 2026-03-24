# OaboutAI Knowledge Archive

[![CI](https://img.shields.io/github/actions/workflow/status/cclljj/OaboutAI/docs-site-ci.yml?branch=main&label=CI)](https://github.com/cclljj/OaboutAI/actions/workflows/docs-site-ci.yml)
[![Demo Site](https://img.shields.io/badge/Demo-oaboutai.vercel.app-000?logo=vercel)](https://oaboutai.vercel.app/)
[![Hugo](https://img.shields.io/badge/Hugo-0.152.2-ff4088?logo=hugo)](https://gohugo.io/)
[![Content Policy](https://img.shields.io/badge/Content-Bilingual%20Required-1f6feb)](#openclaw-agent-ingestion)

Structured, machine-maintained knowledge archive for AI policy, AI governance, and AI safety materials.

Demo site: [https://oaboutai.vercel.app/](https://oaboutai.vercel.app/)

## Overview

This repository is optimized for predictable agent workflows:

- strict metadata schema for every entry
- controlled topic and keyword vocabularies
- bilingual publishing (`en` + `zh-tw`) for ingestion workflow
- automated CI validation and Vercel production deployment

## Repository Structure

- Canonical entry: `content/en/items/<slug>/index.md`
- zh-TW translation: `content/zh-tw/items/<slug>/index.md`
- Topic definitions: `data/topics.json`
- Keyword definitions: `data/keywords.json`
- Keyword proposal queue: `data/keyword_proposals.jsonl`
- Agent ingestion tooling: `scripts/ingest_item.py`
- Agent runbooks: `docs/openclaw_ingestion_workflow.md`, `docs/openclaw_system_prompt.md`

## Content Contract

Required front matter fields for each entry:

- `title`
- `source_url`
- `source_type` (`webpage|pdf|youtube|other`)
- `source_date` (`YYYY-MM-DD`)
- `submission_date` (`YYYY-MM-DD`)
- `executive_summary`
- `detailed_notes`
- `keywords` (IDs from `data/keywords.json`)
- `topics` (IDs from `data/topics.json`)
- `language` (`en|zh-tw`)

Slug format:

- `YYYYMMDD-short-kebab-title`

## Local Development

Prerequisites:

- Python 3.10+
- Hugo Extended (or use `npx --yes hugo-bin`)

Run validation:

```bash
python scripts/validate_content.py
```

Run local server:

```bash
npx --yes hugo-bin server -D
```

Production build:

```bash
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

## OpenClaw Agent Ingestion

Supported source inputs:

- URL / YouTube
- PDF
- DOC / DOCX
- PPT / PPTX
- MD / TXT
- other readable local files

Mandatory policy:

- create paired `en` and `zh-tw` entries for the same slug
- do not create `zh-tw`-only entries
- use only controlled `topics` and `keywords` IDs
- for user-uploaded files with copyright risk, keep originals outside this public repo and use `archived_url` for traceability

Workflow:

1. Prepare draft

```bash
python scripts/ingest_item.py prepare \
  --source-input "<url-or-local-path>" \
  --source-date "YYYY-MM-DD" \
  --output /tmp/oaboutai_draft.json
```

2. Dry-run ingest

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --dry-run
```

3. Write + checks

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks
```

4. Optional direct push

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks \
  --git-push
```

Copyright-safe mode:

- Original uploaded files are retained in Google Drive (`cclljj.agent@gmail.com` / `Ebook_Documents`).
- Public repository should contain metadata and notes only unless explicit approval is given to publish original files.
- Store external reference in `optional_fields.archived_url` and/or `detailed_notes`.

## CI/CD and Deployment

Workflow file: `.github/workflows/docs-site-ci.yml`

Pipeline behavior:

1. Validate metadata and controlled vocabularies
2. Run Hugo production build
3. On `main` push, deploy to Vercel production

Vercel target:

- Project: `oaboutai`
- Production URL: [https://oaboutai.vercel.app/](https://oaboutai.vercel.app/)

Required GitHub secret:

- `VERCEL_TOKEN` (token with deploy permission for target Vercel scope)
