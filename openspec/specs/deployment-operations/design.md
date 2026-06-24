# Deployment Operations Design

## Main Files

- `.github/workflows/docs-site-ci.yml`
- `scripts/smoke_test_routes.sh`
- `scripts/check_supabase_grant_policy.py`
- `scripts/compose_site.py`
- `core/scripts/compose_site.py`
- `core/scripts/sync_obsidian_to_supabase.py`
- `vercel.json`
- `scripts/vercel_build.sh`
- `README.md`
- `INSTALL.md`
- `docs/supabase_operations.md`
- `docs/system_test_checklist.md`

## Workflow Jobs

`validate-and-build`:

- checkout
- setup Python 3.12
- install `pyyaml`
- run Supabase grant policy guard
- compose site
- sync topic pages
- auto-resolve metadata issues
- validate content metadata
- generate share entry pages
- remove private source folders
- install Hugo Extended 0.152.2
- run Hugo build
- verify public output excludes Obsidian article JSON

`deploy-vercel`:

- requires `validate-and-build`
- runs on `push main` or `workflow_dispatch` targeting `refs/heads/main`
- checks required tokens and Supabase secrets
- cleans and validates private data token
- checks private data repo access
- sets up Node.js 24 and Vercel CLI
- composes site with private data
- validates and syncs content
- removes private data before Vercel build
- builds and deploys production
- runs smoke tests

## Smoke Test Coverage

The smoke script checks:

- `/`
- `/items/`
- `/item/?slug=smoke-test`
- a discovered `/entry/<slug>/` path from sitemap
- `/topics/`
- `/keywords/`
- `/types/`
- item, keyword, and type rewrite compatibility in both languages

The script validates shell markers rather than authenticated protected content.

## Workflow Path Maintenance

When adding documentation that should trigger CI, include its path in workflow `push.paths` and `pull_request.paths`. OpenSpec changes should be included so behavioral documentation edits receive the same validation path as code/doc changes.

## Supabase Grant Guard

`scripts/check_supabase_grant_policy.py` enforces the project baseline for runtime `public.*` tables:

- no table grants to `anon`
- `authenticated` grants must match the least-privilege table baseline
- `service_role` grants must be limited to `select`, `insert`, `update`, and `delete`
- newly created `public.*` tables must include same-file revoke, explicit grants, RLS enablement, and policy creation
