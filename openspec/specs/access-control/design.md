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

Private access helper functions (not exposed through the Data API):

- `private.current_auth_email()`
- `private.is_bootstrap_admin()`
- `private.has_role(target_role text)`
- `private.is_approved_user()`

Audit helper:

- `private.audit_article_delete()`

Intentional authenticated RPCs:

- `public.claim_access_request_admin_notification(uuid)`
- `public.get_access_context(text, text)`
- `public.get_admin_dashboard_stats(integer)`

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

The admin dashboard fetches bounded operational lists for management. Summary metrics, selectable 7-day/30-day/90-day/1-year series, source type counts, keyword counts, and the login leaderboard are aggregated by `public.get_admin_dashboard_stats`; raw article and year-long login-event datasets are not downloaded to the browser.
