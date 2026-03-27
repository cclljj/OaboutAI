# OaboutAI Knowledge Archive

[![CI](https://img.shields.io/github/actions/workflow/status/cclljj/OaboutAI/docs-site-ci.yml?branch=main&label=CI)](https://github.com/cclljj/OaboutAI/actions/workflows/docs-site-ci.yml)
[![Demo Site](https://img.shields.io/badge/Demo-oaboutai.vercel.app-000?logo=vercel)](https://oaboutai.vercel.app/)

Bilingual Hugo knowledge archive with composable architecture:
- `core/` = reusable framework
- `apps/<app-id>/` = app-specific content/config

Production app: `oaboutai`
Production site: [https://oaboutai.vercel.app/](https://oaboutai.vercel.app/)

## Architecture

- Shared framework: `core/`
- App overlay: `apps/<app-id>/`
- Default app in this repo: `apps/oaboutai/`
- App manifest: `apps/<app-id>/app.toml`
- Script wrappers (stable entrypoints): `scripts/*.py`

Wrappers forward to `core/scripts/*.py` and default `APP_ID=oaboutai` if not set.

## Quickstart (AI-Friendly)

```bash
git clone https://github.com/cclljj/OaboutAI.git
cd OaboutAI
python3 -m pip install --upgrade pip pyyaml
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
python3 scripts/auto_resolve_content_issues.py
python3 scripts/validate_content.py
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
test -f public/index.html
```

## Content Contract

Required front matter fields for each item:
- `title`
- `source_url`
- `source_type` (`webpage|pdf|youtube|other`)
- `types` (single-item array equal to `source_type`)
- `source_date` (`YYYY-MM-DD`)
- `submission_date` (`YYYY-MM-DD`)
- `executive_summary`
- `detailed_notes`
- `keywords` (IDs from app `data/keywords.json`)
- `topics` (IDs from app `data/topics.json`)
- `language` (`en|zh-tw`)

Slug format:
- `YYYYMMDD-short-kebab-title`

## OpenClaw Ingestion

Primary docs:
- `docs/openclaw_ingestion_workflow.md`
- `docs/openclaw_system_prompt.md`

Standard flow:
1. `python scripts/ingest_item.py prepare ...`
2. Fill bilingual fields in draft JSON
3. `python scripts/ingest_item.py ingest --dry-run`
4. `python scripts/ingest_item.py ingest --run-checks`
5. Optional: `--git-push`

## Local Development

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
npx --yes hugo-bin server -D
```

## CI/CD (GitHub Actions + Vercel)

Workflow: `.github/workflows/docs-site-ci.yml`

Pipeline:
1. Compose `core + app`
2. Sync topic pages from `data/topics.json`
3. Auto-resolve/validate metadata
4. Build Hugo site
5. Deploy to Vercel (push to `main`, app fixed to `oaboutai`)

Required secret:
- `VERCEL_TOKEN`
