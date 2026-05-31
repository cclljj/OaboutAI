# OaboutAI Project Specification

## Purpose

OaboutAI is a bilingual knowledge archive for AI policy, governance, safety, agentic AI, and physical AI resources. The project separates public application code from protected article content so the site can be open-source while article bodies remain gated behind Supabase Auth and approval-aware row-level security.

## Current Architecture

The repository is a composable Hugo monorepo:

- `core/` contains reusable layouts, assets, styles, and scripts.
- `apps/oaboutai/` contains the app shell, content route stubs, Hugo config, i18n, and taxonomy catalogs.
- `api/` contains Vercel serverless email helpers.
- `scripts/` contains thin wrappers that run the matching `core/scripts/` implementation.
- `docs/` contains operational SQL, Supabase runbooks, and regression checklists.
- `openspec/` contains the behavioral source of truth for rebuilding the project.

Production content comes from the private repository `cclljj/OaboutAI_data`, default subdirectory `obsidian`. CI injects that private data into a composed Hugo workspace, validates it, syncs it into Supabase `public.articles`, then removes private source files before building and deploying the static shell to Vercel.

## Non-Negotiable Constraints

- Protected article body content MUST NOT be committed to the public repository.
- Protected article body content MUST NOT be emitted into public static HTML or public static JSON bundles.
- List, detail, search, catalog, favorites, digest, and admin runtime views MUST honor the auth and approval gate.
- Legacy `/items/<slug>` routes MUST continue to resolve to the current item shell.
- Supabase `public.*` tables MUST use explicit `REVOKE`, least-privilege `GRANT`, RLS, and policies.
- Runtime secrets MUST be supplied through GitHub Actions, Vercel, Supabase, or local environment variables, never hard-coded in tracked source.

## Runtime Dependencies

- Hugo Extended `0.152.2` in CI.
- Python `>=3.10`, with `pyyaml` for content validation and generation.
- Node.js for Vercel and `nodemailer`.
- Supabase Auth, PostgREST Data API, RLS tables, and service-role sync.
- Vercel static hosting and serverless functions.
- Private GitHub data repository access token for production deploy.

## Required Secrets And Environment

GitHub Actions secrets:

- `VERCEL_TOKEN`
- `OABOUTAI_DATA_REPO_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Runtime/build environment:

- `HUGO_SUPABASE_URL`
- `HUGO_SUPABASE_ANON_KEY`
- `HUGO_SUPABASE_REDIRECT_URL`
- `OABOUTAI_ADMIN_NOTIFY_EMAIL`
- `OABOUTAI_SMTP_USER`
- `OABOUTAI_SMTP_PASS`
- `OABOUTAI_SMTP_HOST`
- `OABOUTAI_SMTP_PORT`
- `OABOUTAI_SMTP_SECURE`
- `OABOUTAI_MAIL_FROM`
- `OABOUTAI_REPLY_TO`
- `RESEND_API_KEY`
- `OABOUTAI_RESEND_FROM`
- `HUGO_VERCEL_ANALYTICS_ENABLED`
- `HUGO_VERCEL_SPEED_INSIGHTS_ENABLED`
- `OABOUTAI_DATA_REPO_URL`
- `OABOUTAI_DATA_REPO_REF`
- `OABOUTAI_DATA_REPO_SUBDIR`

## Canonical Local Verification

```bash
python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean
cd /tmp/oaboutai-site
python3 scripts/sync_topics.py
python3 scripts/auto_resolve_content_issues.py
python3 scripts/validate_content.py
python3 scripts/sync_share_entries.py
rm -rf data/obsidian static/obsidian
rm -f data/keyword_proposals.jsonl
npx --yes hugo-bin --gc --minify
```

For production-equivalent content sync, run `python3 scripts/sync_obsidian_to_supabase.py --dry-run` before private sources are removed.

## Specification Map

- `project-composition`: repository shape, composed Hugo workspace, static shell, routing, i18n, and environment injection.
- `protected-runtime`: Supabase-backed protected article runtime and static leakage prevention.
- `access-control`: OAuth, approval gates, user profiles, admin workflows, RLS, and grant policy.
- `content-pipeline`: private Obsidian source contract, taxonomy governance, validation, Supabase sync, and share entry generation.
- `discovery-ux`: list/detail/catalog/search/archive/favorites/digest user behavior.
- `notifications`: SMTP/Resend email delivery and serverless notification endpoints.
- `deployment-operations`: CI/CD, Vercel deployment, smoke tests, and operational verification.

## Replication Boundary

A faithful replica requires both repositories:

- Public app repository with this codebase.
- Private data repository with `obsidian/en/*.md` and `obsidian/zh-tw/*.md` files following the content contract.

Without the private data repository, the public app can still build as a shell, but it cannot populate protected runtime article rows.

