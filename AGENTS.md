# AGENTS.md - OaboutAI Runtime + Content Ops Contract

Authoritative operating manual for AI agents working in this repository.

## 1. Operating Model

This repository is a composable Hugo monorepo:
- `core/`: reusable framework (layouts, assets, scripts)
- `apps/<app-id>/`: app-level shell/config
- default app: `oaboutai`

Current production delivery model:
1. Hugo provides shell pages and navigation.
2. Private content source is `cclljj/OaboutAI_data` (`obsidian/` subtree).
3. CI validates and parses Obsidian markdown, then syncs records into Supabase `public.articles`.
4. Frontend reads content from Supabase `public.articles`; Supabase also handles auth/access control and user features (e.g., favorites).

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

## 4. Runtime Data + Supabase Contract

Primary article source:
- private repo `cclljj/OaboutAI_data`
- default subdir: `obsidian`

Required GitHub Actions secrets in OaboutAI:
- `VERCEL_TOKEN`
- `OABOUTAI_DATA_REPO_TOKEN` (read access to `cclljj/OaboutAI_data`)

Required runtime env vars:
- `HUGO_SUPABASE_URL`
- `HUGO_SUPABASE_ANON_KEY`
- `HUGO_SUPABASE_REDIRECT_URL`
- `RESEND_API_KEY`
- `OABOUTAI_ADMIN_NOTIFY_EMAIL` (default: `cclljj@gmail.com`)
- `OABOUTAI_RESEND_FROM` (optional)
- `HUGO_VERCEL_ANALYTICS_ENABLED` (optional, default: `true`)
- `HUGO_VERCEL_SPEED_INSIGHTS_ENABLED` (optional, default: `true`)
- `OABOUTAI_DATA_REPO_URL` (default: `https://github.com/cclljj/OaboutAI_data`)
- `OABOUTAI_DATA_REPO_REF` (default: `main`)
- `OABOUTAI_DATA_REPO_SUBDIR` (default: `obsidian`)

Supabase tables used in current runtime:
- `public.articles` (runtime article content)
- `public.favorites`
- `public.app_users`
- `public.user_roles`
- `public.access_allowlist`
- `public.access_requests`

Canonical Obsidian body contract (required in `obsidian/en/*.md` and `obsidian/zh-tw/*.md`):
- `## Executive Summary`
- `## Detailed Notes`
- `## Take-away`

Canonical YAML title contract:
- `title` MUST use a single-quoted inline scalar: `title: '...'`
- block scalars for `title` (for example `title: >-`) are not allowed

Compatibility note:
- Supabase column name remains `takeaway_html` for backward compatibility.
- Stored value is markdown content parsed from the `## Take-away` section.

## 5. Content Governance

Topics:
- source of truth: `apps/<app-id>/data/topics.json`
- max 10 top-level topics
- current top-level topics (5):
  1. `ai-policy` -> `AI Policy` / `AI 政策`
  2. `ai-governance` -> `AI Governance` / `AI 治理`
  3. `ai-safety` -> `AI Safety` / `AI 安全`
  4. `agentic-ai` -> `Agentic AI` / `代理式 AI`
  5. `physical-ai` -> `Physical AI` / `物理 AI`

Keywords:
- source of truth: `apps/<app-id>/data/keywords.json`
- preferred official IDs:
  - `regulation`
  - `risk-management`
  - `model-evaluation`
  - `red-teaming`
  - `incident-reporting`
  - `audit`
  - `standards`
  - `safety-cases`
  - `governance-framework`
  - `public-consultation`
  - `sovereign-ai`
- additional descriptive hyphenated keywords are allowed when needed.
- aliases in `keywords.json` must map to canonical keyword IDs.
- if no exact keyword exists:
  1. map to closest existing id
  2. append proposal to `apps/<app-id>/data/keyword_proposals.jsonl`

Topic validation rules:
- `primary_topic` and every entry in `topics` MUST be one of the 5 exact topic IDs above.
- `primary_topic` MUST NOT appear in `topics`.
- keyword IDs are never valid topic values.

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

## 7. Cross-repo CI trigger (for data-side updates)

When content is updated only in `OaboutAI_data`, OaboutAI deployment must be triggered via dispatch.

Expected setup in `OaboutAI_data`:
- workflow: `.github/workflows/trigger-oaboutai-cicd.yml`
- secret: `OABOUTAI_REPO_TRIGGER_TOKEN` (fine-grained PAT)
- required token permission on `cclljj/OaboutAI`:
  - Actions: Read and write
  - Contents: Read

Expected behavior in OaboutAI:
- `docs-site-ci` supports `workflow_dispatch`
- `deploy-vercel` runs on `push main` OR `workflow_dispatch`

Failure triage:
- If dispatch returns 403 `Resource not accessible by personal access token`, fix trigger token scope/permissions.
- If validate passes but deploy is skipped, check `deploy-vercel` job `if:` condition.

## 8. Anti-Patterns

- Reintroducing protected article body into public static HTML.
- Breaking OAuth login/session flow.
- Breaking favorites ownership isolation.
- Hard-coding secrets into repo files.
- Removing legacy slug rewrite compatibility.
