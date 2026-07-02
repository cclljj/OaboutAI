-- Supabase Data API explicit grants hardening (prepared for policy #45329)
-- Date: 2026-05
-- Scope: public schema objects used by OaboutAI runtime

-- 0) Stop auto-exposing future tables/sequences in public
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

-- 1) Existing tables: reset then re-grant explicit least privilege

revoke all on table public.articles from anon, authenticated, service_role;
revoke all on table public.app_users from anon, authenticated, service_role;
revoke all on table public.login_events from anon, authenticated, service_role;
revoke all on table public.user_roles from anon, authenticated, service_role;
revoke all on table public.access_allowlist from anon, authenticated, service_role;
revoke all on table public.access_requests from anon, authenticated, service_role;
revoke all on table public.favorites from anon, authenticated, service_role;
revoke all on table public.article_deletion_logs from anon, authenticated, service_role;

grant select on table public.articles to authenticated;
grant select, insert, update, delete on table public.articles to service_role;

grant select, insert, update on table public.app_users to authenticated;
grant select, insert, update, delete on table public.app_users to service_role;

grant select, insert on table public.login_events to authenticated;
grant select, insert, update, delete on table public.login_events to service_role;

grant select, insert, delete on table public.user_roles to authenticated;
grant select, insert, update, delete on table public.user_roles to service_role;

grant select, insert, delete on table public.access_allowlist to authenticated;
grant select, insert, update, delete on table public.access_allowlist to service_role;

grant select, insert, update on table public.access_requests to authenticated;
grant select, insert, update, delete on table public.access_requests to service_role;

grant select, insert, delete on table public.favorites to authenticated;
grant select, insert, update, delete on table public.favorites to service_role;

grant select on table public.article_deletion_logs to authenticated;
grant select, insert, update, delete on table public.article_deletion_logs to service_role;

-- 2) Sequences for bigserial columns

revoke all on sequence public.login_events_id_seq from anon, authenticated, service_role;
revoke all on sequence public.article_deletion_logs_id_seq from anon, authenticated, service_role;

grant usage on sequence public.login_events_id_seq to authenticated;
grant usage on sequence public.article_deletion_logs_id_seq to authenticated;

grant usage, select on sequence public.login_events_id_seq to service_role;
grant usage, select on sequence public.article_deletion_logs_id_seq to service_role;
