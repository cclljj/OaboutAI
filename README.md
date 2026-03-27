# OaboutAI Knowledge Archive

[![CI](https://img.shields.io/github/actions/workflow/status/cclljj/OaboutAI/docs-site-ci.yml?branch=main&label=CI)](https://github.com/cclljj/OaboutAI/actions/workflows/docs-site-ci.yml)
[![Demo Site](https://img.shields.io/badge/Demo-oaboutai.vercel.app-000?logo=vercel)](https://oaboutai.vercel.app/)

Bilingual Hugo knowledge archive with composable architecture:
- `core/` = reusable framework
- `apps/<app-id>/` = app-specific content/config

Production app: `oaboutai`
Production site: [https://oaboutai.vercel.app/](https://oaboutai.vercel.app/)

## Document Targets

- `README.md` (this file): quick orientation and architecture overview
- `INSTALL.md`: full setup/run/deploy commands (human + AI agent operations)
- `AGENTS.md`: strict agent contract, constraints, and governance

## Architecture

- Shared framework: `core/`
- App overlay: `apps/<app-id>/`
- Default app in this repo: `apps/oaboutai/`
- App manifest: `apps/<app-id>/app.toml`
- Script wrappers (stable entrypoints): `scripts/*.py`

Wrappers forward to `core/scripts/*.py` and default `APP_ID=oaboutai` when not set.

## Quick Start

Use [INSTALL.md](INSTALL.md) for full commands.

Minimal local start:

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
npx --yes hugo-bin server -D
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

- `docs/openclaw_ingestion_workflow.md`
- `docs/openclaw_system_prompt.md`

## Local Development

See [INSTALL.md](INSTALL.md) section 4 and section 5 for dev server and CI-equivalent build guard.

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

## Related Docs

- Setup and deployment: [INSTALL.md](INSTALL.md)
- Agent operating rules: [AGENTS.md](AGENTS.md)
- OpenClaw ingestion: [docs/openclaw_ingestion_workflow.md](docs/openclaw_ingestion_workflow.md)
