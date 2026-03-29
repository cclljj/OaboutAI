# AGENTS.md - OaboutAI Runtime + Content Ops Contract

Authoritative operating manual for AI agents working in this repository.

## 1. Operating Model

This repository is a composable Hugo monorepo:
- `core/`: reusable framework (layouts, assets, scripts)
- `apps/<app-id>/`: app-level shell/config
- default app: `oaboutai`

Current production delivery model:
1. Hugo provides shell pages and navigation.
2. Supabase provides protected article data.
3. Google OAuth is required to read article content.
4. Favorites are per-user in Supabase.

## 2. Non-Negotiable Runtime Principles

1. Do not expose protected article body content in public static HTML.
2. Preserve strict auth gate behavior for list/single pages.
3. Keep legacy `/items/<slug>` links working via rewrite to `/item/?slug=<slug>`.
4. Do not reintroduce bulk tracked article markdown into public GitHub unless explicitly requested.

## 3. Canonical Paths (Current)

Inside `apps/<app-id>/`:
- `content/<lang>/item/index.md` (single-item shell route)
- `content/<lang>/items/_index.md` (list shell route)
- `content/<lang>/topics/*.md` (topic shell pages)
- `data/topics.json` (topic registry)
- `data/keywords.json` (keyword registry)
- `data/keyword_proposals.jsonl` (proposal queue)
- `app.toml`

Project-level:
- `docs/supabase_schema.sql`
- `core/assets/js/oa-app.js`
- `core/layouts/**` (shell templates)

## 4. Supabase Contract

Required tables:
- `public.articles`
- `public.favorites`

RLS requirements:
- `articles`: authenticated users can `select`
- `favorites`: only owner can `select/insert/delete`

Required runtime env vars:
- `HUGO_SUPABASE_URL`
- `HUGO_SUPABASE_ANON_KEY`
- `HUGO_SUPABASE_REDIRECT_URL`

## 5. Content Governance

Topics:
- source of truth: `apps/<app-id>/data/topics.json`
- max 10 top-level topics

Keywords:
- source of truth: `apps/<app-id>/data/keywords.json`
- if no exact keyword exists:
  1. map to closest existing id
  2. append proposal to `apps/<app-id>/data/keyword_proposals.jsonl`

## 6. Build + CI Gate

Workflow: `.github/workflows/docs-site-ci.yml`

Required steps to mirror in local verification:
1. `python scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean`
2. `cd /tmp/oaboutai-site`
3. `python scripts/sync_topics.py`
4. `python scripts/auto_resolve_content_issues.py`
5. `python scripts/validate_content.py`
6. `rm -f data/keyword_proposals.jsonl`
7. `npx --yes hugo-bin --gc --minify`

## 7. Legacy Ingestion Note

Legacy markdown ingestion workflow (`scripts/ingest_item.py`, OpenClaw docs) is retained for optional offline/staging workflows, but it is not the production source-of-truth for site-visible protected article body content.

If the user asks to publish new article content now, default to Supabase data operations rather than committing article bundles under `apps/.../content/*/items/*`.

## 8. Anti-Patterns

- Reintroducing protected article body into public static HTML.
- Breaking OAuth login/session flow.
- Breaking favorites ownership isolation.
- Hard-coding secrets into repo files.
- Removing legacy slug rewrite compatibility.
