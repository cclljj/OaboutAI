# System Test Checklist (Regression Guard)

Purpose:
- capture the current architecture and major changes
- provide a repeatable test checklist to avoid regressions
- reduce repeated production incidents during future development

## 1. Development Summary (What Changed)

This project moved from markdown-driven public content pages to an Obsidian(private-repo) build pipeline with protected runtime UX.

Major milestones completed:
1. Mobile menu interaction stabilized (tap/click behavior and focus handling).
2. Google OAuth login introduced via Supabase Auth.
3. Strict content gate enabled:
   - unauthenticated users see shell only
   - protected article body fetched after login only
4. Favorites implemented per user (`public.favorites` with RLS owner isolation).
5. Public tracked article markdown bundles removed from `apps/.../content/*/items/*`.
6. Entry routing migrated:
   - canonical runtime entry page: `/item/?slug=<slug>`
   - legacy compatibility rewrites for `/items/<slug>` and `/zh-tw/items/<slug>`.
7. `topics`, `keywords`, `types` catalogs moved to Supabase dynamic counts/listing.
8. Drill-down on `keywords/types` changed to query-filtered list route:
   - `/items/?term_type=...&term_value=...`
9. Language switch behavior fixed to preserve query params (especially `slug`) to avoid entry-page errors.

## 2. Current System Baseline

Runtime source of truth:
- `data/obsidian/*/*.md` (in private repo during build) -> `static/obsidian/articles.<lang>.json`
- `public.favorites` (Supabase): per-user favorites

Static site role:
- Hugo renders shell/layout/navigation only
- front-end app (`core/assets/js/oa-app.js`) handles auth state + protected data fetch

Critical env vars:
- `HUGO_SUPABASE_URL`
- `HUGO_SUPABASE_ANON_KEY`
- `HUGO_SUPABASE_REDIRECT_URL`

## 3. Pre-Deploy Smoke Checks

Run locally before push:
1. `python3 scripts/compose_site.py --app-id "${APP_ID:-oaboutai}" --output /tmp/oaboutai-site --clean`
2. `cd /tmp/oaboutai-site`
3. `python3 scripts/sync_topics.py`
4. `python3 scripts/auto_resolve_content_issues.py`
5. `python3 scripts/validate_content.py`
6. `python3 scripts/compile_obsidian_articles.py`
7. `rm -f data/keyword_proposals.jsonl`
8. `npx --yes hugo-bin --gc --minify`

Expected:
- build success
- no hard errors in compose/validate/build

## 4. Functional Checklist (Manual E2E)

Use one browser profile with clean cache and at least two test Google accounts.

### A. Auth Gate
1. Open home page logged out.
2. Open `/items/`, `/item/?slug=<known-slug>`, `/topics/`, `/keywords/`, `/types/` logged out.
3. Click sign-in, complete Google OAuth.
4. Sign out and verify gate returns.

Expected:
- logged out: shell only, no readable protected article body
- logged in: list/detail load normally
- sign-out reverts to shell/gate state

### B. Entry Routing and Legacy Compatibility
1. Open `/item/?slug=<known-slug>`.
2. Open legacy `/items/<known-slug>` (and trailing slash variant).
3. Repeat in zh-tw paths.

Expected:
- all routes resolve to correct entry view
- no 404 for legacy item URLs
- entry content visible after login

### C. Language Switching (High Risk)
1. Open `/item/?slug=<known-slug>` in EN.
2. Switch language to zh-tw from language menu.
3. Switch back to EN.

Expected:
- URL keeps `?slug=<known-slug>`
- no error page
- entry remains on corresponding content after switching

### D. Topics / Keywords / Types Catalogs
1. Open `/topics/` after login.
2. Open `/keywords/` and `/types/`.
3. Click any keyword/type card to drill down.

Expected:
- topics counts are non-zero when data exists
- keywords/types list populated from Supabase
- drill-down opens filtered `/items/?term_type=...&term_value=...` (not 404)

### E. Favorites
1. In list view, save one entry.
2. Open `/favorites/` and confirm it appears.
3. Refresh page and verify persistence.
4. Unsave and verify removal.
5. Sign in as another account; verify isolation.

Expected:
- save/unsave works idempotently
- favorites persist per user
- cross-account favorites are isolated

### F. Sorting / Pagination
1. In `/items/` test:
   - sort by `source_date` / `submission_date`
   - order `desc` / `asc`
   - page size `20/50/100`
2. Navigate pages and refresh.

Expected:
- behavior correct after refresh (query-state retained)
- no broken layout on mobile/desktop

### G. Mobile Menu / RWD
1. Use mobile viewport.
2. Open hamburger menu repeatedly.
3. Tap first-level and nested links.
4. Check language switch and auth controls in mobile menu.

Expected:
- menu links reliably tappable
- no focus-jump that blocks tap targets
- auth actions reachable and functioning

## 5. Data Integrity Checklist (Supabase)

Run SQL checks:
1. Count by language:
```sql
select language, count(*) from public.articles group by language order by language;
```
2. invalid language values:
```sql
select language, count(*) from public.articles where language not in ('en','zh-tw') group by language;
```
3. known slug exists:
```sql
select slug, language, title from public.articles where slug = '<known-slug>' order by language;
```

Expected:
- language values are canonical (`en`, `zh-tw`)
- critical slugs present

## 6. Deployment Verification Checklist

After GitHub Actions + Vercel deploy:
1. Verify production home returns `200`.
2. Verify sample entry via canonical and legacy URL.
3. Verify `/keywords/` and `/types/` drill-down no longer 404.
4. Verify language switch on entry preserves slug.

Automated in CI:
- `.github/workflows/docs-site-ci.yml` now runs `scripts/smoke_test_routes.sh` after production deploy.
- script covers key route availability and rewrite compatibility in EN + zh-tw paths.

## 7. Known Failure Signatures and Quick Diagnosis

1. Symptom: entry page shows only title/shell.
- likely cause: wrong/missing item template binding.
- check `core/layouts/_default/item-query.html` exists and deployed.

2. Symptom: login works but no content.
- likely cause: missing/invalid `static/obsidian/articles.<lang>.json` build output.
- run local pre-deploy checks and confirm `python3 scripts/compile_obsidian_articles.py` output.

3. Symptom: keyword/type click -> 404.
- likely cause: drill-down linked to static term pages.
- ensure links use `/items/?term_type=...&term_value=...` and rewrites are present.

4. Symptom: language switch on entry errors.
- likely cause: query params dropped on language change.
- ensure language switch preserves `window.location.search`.

## 8. Release Go/No-Go Gate

Go only when all are true:
1. pre-deploy smoke checks pass
2. auth gate and entry routes pass
3. topics/keywords/types catalogs and drill-down pass
4. favorites and account isolation pass
5. mobile menu tap reliability passes
6. production post-deploy verification passes
