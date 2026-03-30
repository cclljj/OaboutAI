# OaboutAI Knowledge Archive

[![CI](https://img.shields.io/github/actions/workflow/status/cclljj/OaboutAI/docs-site-ci.yml?branch=main&label=CI)](https://github.com/cclljj/OaboutAI/actions/workflows/docs-site-ci.yml)
[![Demo Site](https://img.shields.io/badge/Demo-oaboutai.vercel.app-000?logo=vercel)](https://oaboutai.vercel.app/)
[![Hugo](https://img.shields.io/badge/Hugo-0.152.2-ff4088?logo=hugo)](https://gohugo.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cclljj/OaboutAI/pulls)

OaboutAI is a bilingual Hugo site with **protected content delivery via Supabase**.

Production app: `oaboutai`  
Production site: [https://oaboutai.vercel.app/](https://oaboutai.vercel.app/)

## Current Architecture (Important)

This repository now uses a strict split:
- `core/` + `apps/<app-id>/`: Hugo shell (layout, navigation, static pages, client app bootstrapping)
- Supabase (`articles`, `favorites`): protected article data and per-user state

What this means:
- The public repo no longer stores full article markdown bundles under `apps/.../content/*/items/*/index.md`.
- Page content is loaded client-side after Google sign-in.
- Unauthenticated users only see shell pages (no protected article body in HTML source).

## Repository Model

- `core/`: reusable framework (layouts, assets, scripts)
- `apps/<app-id>/`: app-specific configuration/content shell
- default app: `apps/oaboutai/`
- workflow entrypoints: `scripts/*.py`

## Runtime Features

- Google OAuth (Supabase Auth)
- Auth-gated article list and single-item view
- Per-user favorites (`favorites` table)
- Dynamic `topics`, `keywords`, `types` counts from Supabase article rows
- Legacy compatibility rewrites:
  - `/items/<slug>` -> `/item/?slug=<slug>`
  - `/zh-tw/items/<slug>` -> `/zh-tw/item/?slug=<slug>`

## Required Runtime Env Vars (Vercel)

Set these in Vercel project settings:
- `HUGO_SUPABASE_URL`
- `HUGO_SUPABASE_ANON_KEY`
- `HUGO_SUPABASE_REDIRECT_URL`

## Documentation Map

- `INSTALL.md`: setup, local run, deploy, and Supabase operations
- `docs/supabase_schema.sql`: DB + RLS schema
- `docs/supabase_operations.md`: day-2 operations (seed/import/checklist)
- `docs/system_test_checklist.md`: regression and release go/no-go checklist
- `AGENTS.md`: repo operating contract for AI agents
- `docs/openclaw_ingestion_workflow.md`: legacy markdown ingestion notes and migration guidance
- `docs/openclaw_system_prompt.md`: legacy agent prompt template

## Local Development (Quick)

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
npx --yes hugo-bin server -D
```

Open `http://localhost:1313/`.

## CI/CD

Workflow: `.github/workflows/docs-site-ci.yml`

Pipeline summary:
1. compose `core + app`
2. sync topics
3. validate content shell metadata
4. Hugo build
5. deploy composed output to Vercel (push to `main`)

Required secret:
- `VERCEL_TOKEN`
