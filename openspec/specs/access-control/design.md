# Access Control Design

## Main Files

- `core/assets/js/oa-app.js`
- `docs/supabase_schema.sql`
- `scripts/check_supabase_grant_policy.py`
- `api/access-request-notify.js`
- `api/access-approved-notify.js`
- `api/_mailer.js`
- `core/layouts/admin/single.html`
- `AGENTS.md`

## Database Objects

Runtime access tables:

- `public.app_users`
- `public.login_events`
- `public.user_roles`
- `public.access_allowlist`
- `public.access_requests`
- `public.favorites`
- `public.article_deletion_logs`

Access helper functions:

- `public.current_auth_email()`
- `public.is_bootstrap_admin()`
- `public.has_role(target_role text)`
- `public.is_approved_user()`

Audit helper:

- `public.audit_article_delete()`

## Least Privilege Baseline

- `public.articles`: `authenticated` = `SELECT`
- `public.app_users`: `authenticated` = `SELECT, INSERT, UPDATE`
- `public.login_events`: `authenticated` = `SELECT, INSERT`, sequence `USAGE` (SELECT is RLS-limited to admins)
- `public.user_roles`: `authenticated` = `SELECT, INSERT, DELETE`
- `public.access_allowlist`: `authenticated` = `SELECT, INSERT, DELETE`
- `public.access_requests`: `authenticated` = `SELECT, INSERT, UPDATE`
- `public.favorites`: `authenticated` = `SELECT, INSERT, DELETE`
- `public.article_deletion_logs`: `authenticated` = `SELECT`, sequence `USAGE`

Admin-only behavior is still enforced by RLS even when the table grant includes a verb.

## CI Guard

`scripts/check_supabase_grant_policy.py` scans SQL files under `docs`, `supabase`, and `migrations`. Any SQL file that creates a `public.*` table must include same-file:

- `revoke all on table public.<table>`
- `grant ... on table public.<table> to authenticated`
- `grant ... on table public.<table> to service_role`
- `alter table public.<table> enable row level security`
- `create policy ... on public.<table>`

The guard runs in `.github/workflows/docs-site-ci.yml`.

## OAuth Details

The frontend initializes Supabase Auth with:

- `flowType: "pkce"`
- `persistSession: true`
- `autoRefreshToken: true`
- `detectSessionInUrl: true`

The unsupported-browser check looks for common in-app browser/WebView markers before starting Google OAuth.

## Admin Dashboard Data

The admin dashboard fetches requests, allowlist, users, roles, deletion logs, articles, and login events. It derives summary metrics, 30-day line charts, source type counts, and keyword counts in the browser.
