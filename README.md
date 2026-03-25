# OaboutAI Knowledge Archive

[![CI](https://img.shields.io/github/actions/workflow/status/cclljj/OaboutAI/docs-site-ci.yml?branch=main&label=CI)](https://github.com/cclljj/OaboutAI/actions/workflows/docs-site-ci.yml)
[![Demo Site](https://img.shields.io/badge/Demo-oaboutai.vercel.app-000?logo=vercel)](https://oaboutai.vercel.app/)
[![Hugo](https://img.shields.io/badge/Hugo-0.152.2-ff4088?logo=hugo)](https://gohugo.io/)

A bilingual, machine-maintained Hugo knowledge archive focused on:
- AI Policy
- AI Governance
- AI Safety

Production site: [https://oaboutai.vercel.app/](https://oaboutai.vercel.app/)

## What This Repository Does

This project is optimized for predictable agent and human collaboration:
- Strict content metadata contract (schema-first publishing)
- Controlled vocabularies for topics and keywords
- EN canonical + zh-TW paired translation workflow
- CI quality gates before deploy
- Vercel production deployment on `main`

## Site Features

- Home (`/`) with Recent entries
- Topic browsing (`/topics/ai-policy/`, `/topics/ai-governance/`, `/topics/ai-safety/`)
- Taxonomy browsing by:
  - Keywords (`/keywords/`)
  - Types (`/types/`)
  - Archive (`/archive/monthly/`)
- Search (`/search/`, `/zh-tw/search/`) over key metadata + content body
- URL-synced sorting and pagination controls on browsing pages

## Tech Stack

- Static site generator: Hugo + Hextra theme
- Content format: Markdown bundles + YAML front matter
- Validation tooling: Python scripts (`scripts/validate_content.py`, `scripts/ingest_item.py`)
- CI/CD: GitHub Actions (`.github/workflows/docs-site-ci.yml`)
- Hosting: Vercel

## Repository Map

- Content:
  - `content/en/items/<slug>/index.md`
  - `content/zh-tw/items/<slug>/index.md`
  - `content/<lang>/topics/*.md`
  - `content/<lang>/archive/monthly.md`
- Taxonomy data:
  - `data/topics.json`
  - `data/keywords.json`
  - `data/keyword_proposals.jsonl`
- Rendering templates:
  - `layouts/index.html`
  - `layouts/topics/topic.html`
  - `layouts/term.html`
  - `layouts/archive/monthly.html`
- Tooling:
  - `scripts/ingest_item.py`
  - `scripts/validate_content.py`
  - `scripts/auto_resolve_content_issues.py`
- Workflow docs:
  - `docs/openclaw_ingestion_workflow.md`
  - `docs/openclaw_system_prompt.md`

## Content Contract (Required Fields)

Each item `index.md` must include:
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

## Agent Ingestion Workflow (OpenClaw)

1. Prepare draft spec:

```bash
python scripts/ingest_item.py prepare \
  --source-input "<url-or-local-path>" \
  --source-date "YYYY-MM-DD" \
  --output /tmp/oaboutai_draft.json
```

2. Complete bilingual fields in draft (`en` + `zh-tw`) and finalize keywords/topics.

3. Dry-run:

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --dry-run
```

4. Write and run checks:

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks
```

Optional direct push:

```bash
python scripts/ingest_item.py ingest \
  --spec-file /tmp/oaboutai_draft.json \
  --run-checks \
  --git-push
```

## Local Development

Prerequisites:
- Python 3.10+
- Node.js (for `npx` workflows)
- Hugo Extended (or `npx --yes hugo-bin`)

Validate content:

```bash
python scripts/validate_content.py
```

Run local preview:

```bash
npx --yes hugo-bin server -D
```

Production build (mirror CI behavior):

```bash
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

## CI/CD Pipeline

Workflow: `.github/workflows/docs-site-ci.yml`

Pipeline stages:
1. Auto-resolve common metadata issues (`scripts/auto_resolve_content_issues.py`)
2. Validate content metadata (`scripts/validate_content.py`)
3. Hugo build
4. Verify output
5. Deploy to Vercel on `main`

Required secret:
- `VERCEL_TOKEN`

## Installation Guide

For a complete setup guide, see:
- [INSTALL.md](INSTALL.md)

## Contributing Notes

- Keep keyword/topic IDs controlled (no ad-hoc IDs in entries)
- Preserve EN/zh-TW pairing for ingested entries
- Keep attachments inside the EN bundle directory when used
- Run validation + build guard before push
- Do not bypass CI for content updates
