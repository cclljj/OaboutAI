begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.current_auth_email()
returns text
language sql
stable
set search_path = pg_catalog
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function private.is_bootstrap_admin()
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select private.current_auth_email() = 'cclljj@gmail.com';
$$;

create or replace function private.has_role(target_role text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    private.is_bootstrap_admin()
    or exists (
      select 1
      from public.user_roles
      where user_id = (select auth.uid())
        and role = target_role
    );
$$;

create or replace function private.is_approved_user()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    (select auth.uid()) is not null
    and (
      private.has_role('admin')
      or exists (
        select 1
        from public.access_allowlist
        where email = private.current_auth_email()
      )
      or coalesce(
        (
          select ar.status
          from public.access_requests ar
          where ar.requester_user_id = (select auth.uid())
          order by ar.created_at desc
          limit 1
        ),
        ''
      ) = 'approved'
    );
$$;

revoke all on function private.current_auth_email() from public, anon, authenticated, service_role;
revoke all on function private.is_bootstrap_admin() from public, anon, authenticated, service_role;
revoke all on function private.has_role(text) from public, anon, authenticated, service_role;
revoke all on function private.is_approved_user() from public, anon, authenticated, service_role;
grant execute on function private.current_auth_email() to authenticated, service_role;
grant execute on function private.is_bootstrap_admin() to authenticated, service_role;
grant execute on function private.has_role(text) to authenticated, service_role;
grant execute on function private.is_approved_user() to authenticated, service_role;

alter table public.access_requests
  add column if not exists admin_notified_at timestamptz;

create table if not exists public.digests (
  id uuid primary key default gen_random_uuid(),
  digest_date date not null,
  language text not null check (language in ('en', 'zh-tw')),
  title text not null,
  content_html text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_digests_date_language
  on public.digests(digest_date, language);
create index if not exists idx_digests_language_date
  on public.digests(language, digest_date desc);
create index if not exists idx_access_allowlist_created_by
  on public.access_allowlist(created_by);
create index if not exists idx_access_requests_reviewer
  on public.access_requests(reviewer_user_id);
create index if not exists idx_user_roles_created_by
  on public.user_roles(created_by);

revoke all on table public.digests from anon, authenticated, service_role;
grant select on table public.digests to authenticated;
grant select, insert, update, delete on table public.digests to service_role;
alter table public.digests enable row level security;

drop policy if exists "approved users can read digests" on public.digests;
create policy "approved users can read digests"
  on public.digests
  for select
  to authenticated
  using ((select private.is_approved_user()));
drop policy if exists "admins can insert digests" on public.digests;
drop policy if exists "admins can update digests" on public.digests;
drop policy if exists "admins can delete digests" on public.digests;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.audit_article_delete()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  email_claim text := nullif(lower(coalesce(auth.jwt() ->> 'email', '')), '');
begin
  insert into public.article_deletion_logs (
    slug, language, title, deleted_at, deleted_by_user_id, deleted_by_account
  ) values (
    old.slug,
    old.language,
    old.title,
    now(),
    (select auth.uid()),
    coalesce(email_claim, (select auth.uid())::text, 'N/A')
  );
  return old;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated, service_role;
revoke all on function private.audit_article_delete() from public, anon, authenticated, service_role;

drop trigger if exists trg_articles_set_updated_at on public.articles;
create trigger trg_articles_set_updated_at
before update on public.articles
for each row execute function private.set_updated_at();
drop trigger if exists trg_app_users_set_updated_at on public.app_users;
create trigger trg_app_users_set_updated_at
before update on public.app_users
for each row execute function private.set_updated_at();
drop trigger if exists trg_access_requests_set_updated_at on public.access_requests;
create trigger trg_access_requests_set_updated_at
before update on public.access_requests
for each row execute function private.set_updated_at();
drop trigger if exists trg_digests_set_updated_at on public.digests;
create trigger trg_digests_set_updated_at
before update on public.digests
for each row execute function private.set_updated_at();
drop trigger if exists trg_articles_audit_delete on public.articles;
create trigger trg_articles_audit_delete
after delete on public.articles
for each row execute function private.audit_article_delete();

create or replace function public.claim_access_request_admin_notification(target_request_id uuid)
returns table (
  id uuid,
  requester_user_id uuid,
  email text,
  reason text,
  status text,
  reviewed_at timestamptz,
  admin_notified_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  return query
  update public.access_requests ar
  set admin_notified_at = now(), updated_at = now()
  where ar.id = target_request_id
    and ar.requester_user_id = (select auth.uid())
    and ar.status = 'pending'
    and ar.admin_notified_at is null
  returning
    ar.id, ar.requester_user_id, ar.email, ar.reason, ar.status,
    ar.reviewed_at, ar.admin_notified_at, ar.created_at;
end;
$$;

create or replace function public.get_access_context(
  profile_display_name text default null,
  profile_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text := private.current_auth_email();
  latest_request jsonb := null;
  roles jsonb := '[]'::jsonb;
  is_admin boolean := false;
  is_allowlisted boolean := false;
begin
  if current_user_id is null or current_email = '' then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  insert into public.app_users (
    id, email, display_name, avatar_url, last_seen_at
  ) values (
    current_user_id,
    current_email,
    nullif(left(trim(coalesce(profile_display_name, '')), 200), ''),
    nullif(left(trim(coalesce(profile_avatar_url, '')), 2000), ''),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    last_seen_at = excluded.last_seen_at;

  select coalesce(jsonb_agg(ur.role order by ur.role), '[]'::jsonb)
    into roles
  from public.user_roles ur
  where ur.user_id = current_user_id;

  select to_jsonb(ar)
    into latest_request
  from (
    select id, status, reason, created_at, reviewed_at
    from public.access_requests
    where requester_user_id = current_user_id
    order by created_at desc
    limit 1
  ) ar;

  is_admin := private.is_bootstrap_admin()
    or roles @> '["admin"]'::jsonb;
  select exists (
    select 1 from public.access_allowlist where email = current_email
  ) into is_allowlisted;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'email', current_email,
      'displayName', nullif(left(trim(coalesce(profile_display_name, '')), 200), ''),
      'avatar', nullif(left(trim(coalesce(profile_avatar_url, '')), 2000), '')
    ),
    'roles', roles,
    'latestRequest', latest_request,
    'isBootstrapAdmin', private.is_bootstrap_admin(),
    'isAdmin', is_admin,
    'isAllowlisted', is_allowlisted,
    'isApproved', is_admin or is_allowlisted or coalesce(latest_request ->> 'status', '') = 'approved'
  );
end;
$$;

create or replace function public.get_admin_dashboard_stats(range_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  days integer := case when range_days in (7, 30, 90, 365) then range_days else 30 end;
  start_date date := current_date - (days - 1);
begin
  if not private.has_role('admin') then
    raise exception 'admin required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'totalArticles', (select count(*) from public.articles),
    'totalUsers', (select count(*) from public.app_users),
    'totalAdmins', (
      select count(distinct user_id) + case
        when exists (
          select 1 from public.app_users where email = 'cclljj@gmail.com'
        ) and not exists (
          select 1
          from public.user_roles ur
          join public.app_users au on au.id = ur.user_id
          where ur.role = 'admin' and au.email = 'cclljj@gmail.com'
        ) then 1
        when not exists (
          select 1 from public.app_users where email = 'cclljj@gmail.com'
        ) then 1
        else 0
      end
      from public.user_roles
      where role = 'admin'
    ),
    'activeUsers', (
      select count(*) from public.app_users where last_seen_at >= start_date::timestamptz
    ),
    'loginEvents', (
      select count(*) from public.login_events where occurred_at >= start_date::timestamptz
    ),
    'pendingRequests', (
      select count(*) from public.access_requests where status = 'pending'
    ),
    'dailyArticles', (
      select jsonb_agg(jsonb_build_object('date', day::date, 'count', coalesce(a.count, 0)) order by day)
      from generate_series(start_date, current_date, interval '1 day') day
      left join (
        select submission_date::date as date, count(*) as count
        from public.articles
        where submission_date >= start_date
        group by 1
      ) a on a.date = day::date
    ),
    'dailyUsers', (
      select jsonb_agg(jsonb_build_object('date', day::date, 'count', coalesce(u.count, 0)) order by day)
      from generate_series(start_date, current_date, interval '1 day') day
      left join (
        select created_at::date as date, count(*) as count
        from public.app_users
        where created_at >= start_date::timestamptz
        group by 1
      ) u on u.date = day::date
    ),
    'dailyLogins', (
      select jsonb_agg(jsonb_build_object('date', day::date, 'count', coalesce(l.count, 0)) order by day)
      from generate_series(start_date, current_date, interval '1 day') day
      left join (
        select occurred_at::date as date, count(*) as count
        from public.login_events
        where occurred_at >= start_date::timestamptz
        group by 1
      ) l on l.date = day::date
    ),
    'loginLeaderboard', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc, x."lastLoginAt" desc), '[]'::jsonb)
      from (
        select
          le.user_id as "userId",
          au.email,
          au.display_name as "displayName",
          au.avatar_url as avatar,
          count(*) as count,
          max(le.occurred_at) as "lastLoginAt"
        from public.login_events le
        left join public.app_users au on au.id = le.user_id
        where le.occurred_at >= start_date::timestamptz
        group by le.user_id, au.email, au.display_name, au.avatar_url
        order by count(*) desc, max(le.occurred_at) desc
        limit 10
      ) x
    ),
    'byType', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc, x.name), '[]'::jsonb)
      from (
        select source_type as name, count(*) as count
        from public.articles
        where submission_date >= start_date
        group by source_type
        order by count(*) desc, source_type
        limit 20
      ) x
    ),
    'byKeyword', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.count desc, x.name), '[]'::jsonb)
      from (
        select keyword.value as name, count(*) as count
        from public.articles a
        cross join lateral jsonb_array_elements_text(a.keywords) as keyword(value)
        where a.submission_date >= start_date
        group by keyword.value
        order by count(*) desc, keyword.value
        limit 20
      ) x
    )
  );
end;
$$;

revoke all on function public.claim_access_request_admin_notification(uuid) from public, anon, authenticated, service_role;
revoke all on function public.get_access_context(text, text) from public, anon, authenticated, service_role;
revoke all on function public.get_admin_dashboard_stats(integer) from public, anon, authenticated, service_role;
grant execute on function public.claim_access_request_admin_notification(uuid) to authenticated, service_role;
grant execute on function public.get_access_context(text, text) to authenticated, service_role;
grant execute on function public.get_admin_dashboard_stats(integer) to authenticated, service_role;

drop policy if exists "approved users can read articles" on public.articles;
create policy "approved users can read articles"
  on public.articles for select to authenticated
  using ((select private.is_approved_user()));
drop policy if exists "admins can delete articles" on public.articles;
create policy "admins can delete articles"
  on public.articles for delete to authenticated
  using ((select private.has_role('admin')));

drop policy if exists "users can read own app profile" on public.app_users;
create policy "users can read own app profile"
  on public.app_users for select to authenticated
  using ((select auth.uid()) = id or (select private.has_role('admin')));
drop policy if exists "users can insert own app profile" on public.app_users;
create policy "users can insert own app profile"
  on public.app_users for insert to authenticated
  with check ((select auth.uid()) = id and email = (select private.current_auth_email()));
drop policy if exists "users can update own app profile" on public.app_users;
create policy "users can update own app profile"
  on public.app_users for update to authenticated
  using ((select auth.uid()) = id or (select private.has_role('admin')))
  with check (
    ((select auth.uid()) = id and email = (select private.current_auth_email()))
    or (select private.has_role('admin'))
  );
drop policy if exists "admins can delete app profile" on public.app_users;
create policy "admins can delete app profile"
  on public.app_users for delete to authenticated
  using ((select private.has_role('admin')));

drop policy if exists "admins can read login events" on public.login_events;
create policy "admins can read login events"
  on public.login_events for select to authenticated
  using ((select private.has_role('admin')));

drop policy if exists "users can read roles" on public.user_roles;
create policy "users can read roles"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('admin')));
drop policy if exists "admins can insert roles" on public.user_roles;
create policy "admins can insert roles"
  on public.user_roles for insert to authenticated
  with check ((select private.has_role('admin')));
drop policy if exists "admins can delete roles" on public.user_roles;
create policy "admins can delete roles"
  on public.user_roles for delete to authenticated
  using ((select private.has_role('admin')));

drop policy if exists "admins can read allowlist" on public.access_allowlist;
create policy "admins can read allowlist"
  on public.access_allowlist for select to authenticated
  using (email = (select private.current_auth_email()) or (select private.has_role('admin')));
drop policy if exists "admins can insert allowlist" on public.access_allowlist;
create policy "admins can insert allowlist"
  on public.access_allowlist for insert to authenticated
  with check ((select private.has_role('admin')));
drop policy if exists "admins can delete allowlist" on public.access_allowlist;
create policy "admins can delete allowlist"
  on public.access_allowlist for delete to authenticated
  using ((select private.has_role('admin')));

drop policy if exists "users can read own requests" on public.access_requests;
create policy "users can read own requests"
  on public.access_requests for select to authenticated
  using (requester_user_id = (select auth.uid()) or (select private.has_role('admin')));
drop policy if exists "users can insert own pending requests" on public.access_requests;
create policy "users can insert own pending requests"
  on public.access_requests for insert to authenticated
  with check (
    requester_user_id = (select auth.uid())
    and email = (select private.current_auth_email())
    and status = 'pending'
    and reviewer_user_id is null
    and reviewed_at is null
  );
drop policy if exists "admins can review requests" on public.access_requests;
create policy "admins can review requests"
  on public.access_requests for update to authenticated
  using ((select private.has_role('admin')))
  with check ((select private.has_role('admin')));

drop policy if exists "owner can read favorites" on public.favorites;
create policy "owner can read favorites"
  on public.favorites for select to authenticated
  using ((select private.is_approved_user()) and (select auth.uid()) = user_id);
drop policy if exists "owner can insert favorites" on public.favorites;
create policy "owner can insert favorites"
  on public.favorites for insert to authenticated
  with check ((select private.is_approved_user()) and (select auth.uid()) = user_id);
drop policy if exists "owner can delete favorites" on public.favorites;
create policy "owner can delete favorites"
  on public.favorites for delete to authenticated
  using ((select private.is_approved_user()) and (select auth.uid()) = user_id);

drop policy if exists "admins can read article deletion logs" on public.article_deletion_logs;
create policy "admins can read article deletion logs"
  on public.article_deletion_logs for select to authenticated
  using ((select private.has_role('admin')));

revoke all on function public.has_role(text) from public, anon, authenticated, service_role;
revoke all on function public.is_approved_user() from public, anon, authenticated, service_role;
revoke all on function public.current_auth_email() from public, anon, authenticated, service_role;
revoke all on function public.is_bootstrap_admin() from public, anon, authenticated, service_role;
revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;
revoke all on function public.audit_article_delete() from public, anon, authenticated, service_role;

drop function public.has_role(text);
drop function public.is_approved_user();
drop function public.current_auth_email();
drop function public.is_bootstrap_admin();
drop function public.set_updated_at();
drop function public.audit_article_delete();

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated, service_role';
  end if;
end;
$$;

commit;
