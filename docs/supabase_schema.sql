-- OaboutAI Supabase schema for protected article delivery, approval-aware access,
-- and per-user favorites.
-- Run in Supabase SQL editor.
--
-- Current production notes:
-- 1) Runtime content is served from Obsidian build artifacts, not directly from `public.articles`.
-- 2) `public.favorites`, `public.app_users`, `public.user_roles`, `public.access_allowlist`,
--    and `public.access_requests` remain runtime-critical.
-- 3) `public.articles` is retained as a legacy optional table for historical SQL workflows.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_auth_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.is_bootstrap_admin()
returns boolean
language sql
stable
as $$
  select public.current_auth_email() = 'cclljj@gmail.com';
$$;

create table if not exists public.articles (
  slug text not null,
  language text not null check (language in ('en', 'zh-tw')),
  title text not null,
  source_url text not null,
  source_type text not null,
  source_date date not null,
  submission_date date not null,
  executive_summary text not null,
  detailed_notes text not null,
  takeaway_html text not null default '',
  keywords jsonb not null default '[]'::jsonb,
  primary_topic text,
  topics jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (slug, language)
);

create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (email = lower(email)),
  display_name text,
  avatar_url text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.access_allowlist (
  email text primary key check (email = lower(email)),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (email = lower(email)),
  reason text not null check (length(trim(reason)) > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  reviewer_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  article_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, article_slug)
);

create index if not exists idx_articles_language on public.articles(language);
create index if not exists idx_articles_source_date on public.articles(source_date desc);
create index if not exists idx_articles_keywords on public.articles using gin (keywords);
create index if not exists idx_articles_topics on public.articles using gin (topics);
create unique index if not exists idx_app_users_email_lower on public.app_users(email);
create index if not exists idx_user_roles_role on public.user_roles(role);
create index if not exists idx_access_requests_requester on public.access_requests(requester_user_id, created_at desc);
create unique index if not exists idx_access_requests_pending_unique
  on public.access_requests(requester_user_id)
  where status = 'pending';
create index if not exists idx_favorites_user on public.favorites(user_id);
create index if not exists idx_favorites_slug on public.favorites(article_slug);

create or replace function public.has_role(target_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_bootstrap_admin()
    or exists (
      select 1
      from public.user_roles
      where user_id = auth.uid()
        and role = target_role
    );
$$;

create or replace function public.is_approved_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      public.has_role('admin')
      or exists (
        select 1
        from public.access_allowlist
        where email = public.current_auth_email()
      )
      or exists (
        select 1
        from public.access_requests
        where requester_user_id = auth.uid()
          and status = 'approved'
      )
    );
$$;

drop trigger if exists trg_articles_set_updated_at on public.articles;
create trigger trg_articles_set_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

drop trigger if exists trg_app_users_set_updated_at on public.app_users;
create trigger trg_app_users_set_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

drop trigger if exists trg_access_requests_set_updated_at on public.access_requests;
create trigger trg_access_requests_set_updated_at
before update on public.access_requests
for each row execute function public.set_updated_at();

alter table public.articles enable row level security;
alter table public.app_users enable row level security;
alter table public.user_roles enable row level security;
alter table public.access_allowlist enable row level security;
alter table public.access_requests enable row level security;
alter table public.favorites enable row level security;

drop policy if exists "authenticated can read articles" on public.articles;
drop policy if exists "approved users can read articles" on public.articles;
create policy "approved users can read articles"
  on public.articles
  for select
  to authenticated
  using (public.is_approved_user());

drop policy if exists "users can read own app profile" on public.app_users;
create policy "users can read own app profile"
  on public.app_users
  for select
  to authenticated
  using (auth.uid() = id or public.has_role('admin'));

drop policy if exists "users can insert own app profile" on public.app_users;
create policy "users can insert own app profile"
  on public.app_users
  for insert
  to authenticated
  with check (
    auth.uid() = id
    and email = public.current_auth_email()
  );

drop policy if exists "users can update own app profile" on public.app_users;
create policy "users can update own app profile"
  on public.app_users
  for update
  to authenticated
  using (auth.uid() = id or public.has_role('admin'))
  with check (
    (auth.uid() = id and email = public.current_auth_email())
    or public.has_role('admin')
  );

drop policy if exists "users can read roles" on public.user_roles;
create policy "users can read roles"
  on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid() or public.has_role('admin'));

drop policy if exists "admins can insert roles" on public.user_roles;
create policy "admins can insert roles"
  on public.user_roles
  for insert
  to authenticated
  with check (public.has_role('admin'));

drop policy if exists "admins can delete roles" on public.user_roles;
create policy "admins can delete roles"
  on public.user_roles
  for delete
  to authenticated
  using (public.has_role('admin'));

drop policy if exists "admins can read allowlist" on public.access_allowlist;
create policy "admins can read allowlist"
  on public.access_allowlist
  for select
  to authenticated
  using (email = public.current_auth_email() or public.has_role('admin'));

drop policy if exists "admins can insert allowlist" on public.access_allowlist;
create policy "admins can insert allowlist"
  on public.access_allowlist
  for insert
  to authenticated
  with check (public.has_role('admin'));

drop policy if exists "admins can delete allowlist" on public.access_allowlist;
create policy "admins can delete allowlist"
  on public.access_allowlist
  for delete
  to authenticated
  using (public.has_role('admin'));

drop policy if exists "users can read own requests" on public.access_requests;
create policy "users can read own requests"
  on public.access_requests
  for select
  to authenticated
  using (requester_user_id = auth.uid() or public.has_role('admin'));

drop policy if exists "users can insert own pending requests" on public.access_requests;
create policy "users can insert own pending requests"
  on public.access_requests
  for insert
  to authenticated
  with check (
    requester_user_id = auth.uid()
    and email = public.current_auth_email()
    and status = 'pending'
    and reviewer_user_id is null
    and reviewed_at is null
  );

drop policy if exists "admins can review requests" on public.access_requests;
create policy "admins can review requests"
  on public.access_requests
  for update
  to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

drop policy if exists "owner can read favorites" on public.favorites;
create policy "owner can read favorites"
  on public.favorites
  for select
  to authenticated
  using (public.is_approved_user() and auth.uid() = user_id);

drop policy if exists "owner can insert favorites" on public.favorites;
create policy "owner can insert favorites"
  on public.favorites
  for insert
  to authenticated
  with check (public.is_approved_user() and auth.uid() = user_id);

drop policy if exists "owner can delete favorites" on public.favorites;
create policy "owner can delete favorites"
  on public.favorites
  for delete
  to authenticated
  using (public.is_approved_user() and auth.uid() = user_id);
