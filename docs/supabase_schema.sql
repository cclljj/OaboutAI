-- OaboutAI Supabase schema for protected article delivery + per-user favorites.
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

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

create index if not exists idx_articles_language on public.articles(language);
create index if not exists idx_articles_source_date on public.articles(source_date desc);
create index if not exists idx_articles_keywords on public.articles using gin (keywords);
create index if not exists idx_articles_topics on public.articles using gin (topics);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  article_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, article_slug)
);

create index if not exists idx_favorites_user on public.favorites(user_id);
create index if not exists idx_favorites_slug on public.favorites(article_slug);

alter table public.articles enable row level security;
alter table public.favorites enable row level security;

drop policy if exists "authenticated can read articles" on public.articles;
create policy "authenticated can read articles"
  on public.articles
  for select
  to authenticated
  using (true);

drop policy if exists "owner can read favorites" on public.favorites;
create policy "owner can read favorites"
  on public.favorites
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "owner can insert favorites" on public.favorites;
create policy "owner can insert favorites"
  on public.favorites
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "owner can delete favorites" on public.favorites;
create policy "owner can delete favorites"
  on public.favorites
  for delete
  to authenticated
  using (auth.uid() = user_id);
