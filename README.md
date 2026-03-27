# OaboutAI Knowledge Archive

[![CI](https://img.shields.io/github/actions/workflow/status/cclljj/OaboutAI/docs-site-ci.yml?branch=main&label=CI)](https://github.com/cclljj/OaboutAI/actions/workflows/docs-site-ci.yml)
[![Demo Site](https://img.shields.io/badge/Demo-oaboutai.vercel.app-000?logo=vercel)](https://oaboutai.vercel.app/)
[![Last Commit](https://img.shields.io/github/last-commit/cclljj/OaboutAI?label=last%20commit)](https://github.com/cclljj/OaboutAI/commits/main)
[![Stars](https://img.shields.io/github/stars/cclljj/OaboutAI?style=social)](https://github.com/cclljj/OaboutAI/stargazers)
[![Issues](https://img.shields.io/github/issues/cclljj/OaboutAI)](https://github.com/cclljj/OaboutAI/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cclljj/OaboutAI/pulls)
[![Hugo](https://img.shields.io/badge/Hugo-0.152.2-ff4088?logo=hugo)](https://gohugo.io/)

Composable bilingual Hugo knowledge archive for AI policy/governance/safety curation.

Production app: `oaboutai`
Production site: [https://oaboutai.vercel.app/](https://oaboutai.vercel.app/)

## Overview

Repository model:
- `core/`: reusable framework
- `apps/<app-id>/`: app-specific content/config

This repo is optimized for:
- machine-maintained publishing workflows
- strict metadata and controlled vocabularies
- parallel human + AI agent operations

## Documentation Map

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

## Key Content Rules

- Every item must include EN canonical + zh-TW pair.
- Topics/keywords must use app registries (`data/topics.json`, `data/keywords.json`).
- Slug format: `YYYYMMDD-short-kebab-title`.

## Content Contract

Required front matter fields for each item:
- `title`
- `source_url`
- `source_type` (`webpage|pdf|youtube|other`)
- `types` (array where `types[0]` is the primary type and must equal `source_type`; additional secondary types allowed)
- `source_date` (`YYYY-MM-DD`)
- `submission_date` (`YYYY-MM-DD`)
- `executive_summary`
- `detailed_notes`
- `keywords` (IDs from app `data/keywords.json`)
- `primary_topic` (single ID from app `data/topics.json`)
- `topics` (secondary IDs from app `data/topics.json`, excluding `primary_topic`)
- `language` (`en|zh-tw`)

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
