# OaboutAI Knowledge Archive

[![CI](https://img.shields.io/github/actions/workflow/status/cclljj/OaboutAI/docs-site-ci.yml?branch=main&label=CI)](https://github.com/cclljj/OaboutAI/actions/workflows/docs-site-ci.yml)
[![Demo Site](https://img.shields.io/badge/Demo-oaboutai.vercel.app-000?logo=vercel)](https://oaboutai.vercel.app/)
[![Hugo](https://img.shields.io/badge/Hugo-0.152.2-ff4088?logo=hugo)](https://gohugo.io/)

Bilingual Hugo knowledge archive with **Core + App Overlay** architecture.

Production site: [https://oaboutai.vercel.app/](https://oaboutai.vercel.app/)

## Agent Quickstart

This section is optimized for AI agents (Codex, CI bots, automation scripts).

1. Clone and enter repo:

```bash
git clone https://github.com/cclljj/OaboutAI.git
cd OaboutAI
```

2. Install Python dependency used by validators:

```bash
python3 -m pip install --upgrade pip pyyaml
```

3. Compose default app (`oaboutai`) and run checks:

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
python3 scripts/auto_resolve_content_issues.py
python3 scripts/validate_content.py
```

4. Build site with CI-equivalent guard:

```bash
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

5. Success criteria:
- `python3 scripts/validate_content.py` exits `0`
- `public/index.html` exists

## Purpose

This repository enforces predictable, machine-maintained publishing:
- strict front matter schema
- controlled vocabularies (`topics`, `keywords`)
- EN canonical + zh-TW paired entries
- automated validation and deployment

## Core Structure

- Shared framework: `core/`
- App customization/content: `apps/<app-id>/`
- Default app: `apps/oaboutai/`
- App manifest: `apps/<app-id>/app.toml`
- Compose script: `scripts/compose_site.py`
- Topic sync script: `scripts/sync_topics.py`
- Ingestion script: `scripts/ingest_item.py`
- Validator: `scripts/validate_content.py`
- Auto-resolver: `scripts/auto_resolve_content_issues.py`

## Content Contract

Required front matter keys for each item:
- `title`
- `source_url`
- `source_type` (`webpage|pdf|youtube|other`)
- `types` (single-item array equal to `source_type`)
- `source_date` (`YYYY-MM-DD`)
- `submission_date` (`YYYY-MM-DD`)
- `executive_summary`
- `detailed_notes`
- `keywords` (IDs from `data/keywords.json`)
- `topics` (IDs from `data/topics.json`)
- `language` (`en|zh-tw`)

Slug format:
- `YYYYMMDD-short-kebab-title`

## OpenClaw Update Workflow

Use this workflow for URL / YouTube / PDF / DOC / DOCX / PPT / PPTX / MD / TXT.

1. Prepare draft spec:

```bash
python scripts/ingest_item.py prepare \
  --source-input "<url-or-local-path>" \
  --source-date "YYYY-MM-DD" \
  --output /tmp/oaboutai_draft.json
```

2. Fill bilingual fields in `/tmp/oaboutai_draft.json`:
- `title.en`, `title.zh-tw`
- `executive_summary.en`, `executive_summary.zh-tw`
- `detailed_notes.en`, `detailed_notes.zh-tw`
- `keywords`, `topics`, `source_date`

3. Dry-run:

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --dry-run
```

4. Write and check:

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks
```

5. Optional direct push:

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks \
  --git-push
```

## Local Development

Run local server from composed workspace:

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
npx --yes hugo-bin server -D
```

Browse:
- `http://localhost:1313/`

## CI/CD

Workflow: `.github/workflows/docs-site-ci.yml`

Pipeline order:
1. `python scripts/compose_site.py --app-id <app>`
2. `python scripts/sync_topics.py`
3. `python scripts/auto_resolve_content_issues.py`
4. `python scripts/validate_content.py`
5. `hugo --gc --minify` (with `data/keyword_proposals.jsonl` removed)
6. Deploy to Vercel on `main` (default app: `oaboutai`)

Required GitHub secret:
- `VERCEL_TOKEN`

## Install Guide

For full environment setup (local + Vercel), see:
- [INSTALL.md](INSTALL.md)
