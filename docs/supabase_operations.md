# Supabase Operations Guide

Day-2 operational runbook for OaboutAI runtime content.

## 1. Source of Truth

Production article content is read from:
- `public.articles`

Per-user saved items are read from:
- `public.favorites`

Access control state is read from:
- `public.app_users`
- `public.user_roles`
- `public.access_allowlist`
- `public.access_requests`

Public GitHub content bundles are **not** the production source of protected article body content.

## 2. Schema + RLS Bootstrap

Run once (or re-apply on reset):
- execute `docs/supabase_schema.sql` in Supabase SQL editor

After running, verify tables exist:

```sql
select to_regclass('public.articles') as articles_table,
       to_regclass('public.favorites') as favorites_table,
       to_regclass('public.app_users') as app_users_table,
       to_regclass('public.user_roles') as user_roles_table,
       to_regclass('public.access_allowlist') as access_allowlist_table,
       to_regclass('public.access_requests') as access_requests_table;
```

Bootstrap admin:
- `cclljj@gmail.com` is always treated as an admin by policy, even before a `user_roles` row exists.
- Additional admins are stored in `public.user_roles`.

## 3. Required Data Rules (`public.articles`)

- `slug`: stable identifier
- `language`: must be `en` or `zh-tw`
- `source_type`: typically `webpage|pdf|youtube|other`
- `keywords`: JSON array
- `topics`: JSON array
- `primary key`: (`slug`, `language`)

Important runtime note:
- list views filter by exact language; if you import `zh_TW` / `zh-TW` inconsistently, list pages may appear empty.
- use canonical values only: `en`, `zh-tw`.

## 4. Import / Upsert Patterns

Use one of these:
1. Supabase dashboard CSV import
2. SQL upsert scripts (recommended for repeatability)

Example upsert (single row shape):

```sql
insert into public.articles (
  slug, language, title, source_url, source_type,
  source_date, submission_date,
  executive_summary, detailed_notes, takeaway_html,
  keywords, primary_topic, topics, attachments
) values (
  :slug, :language, :title, :source_url, :source_type,
  :source_date, :submission_date,
  :executive_summary, :detailed_notes, :takeaway_html,
  :keywords::jsonb, :primary_topic, :topics::jsonb, :attachments::jsonb
)
on conflict (slug, language)
do update set
  title = excluded.title,
  source_url = excluded.source_url,
  source_type = excluded.source_type,
  source_date = excluded.source_date,
  submission_date = excluded.submission_date,
  executive_summary = excluded.executive_summary,
  detailed_notes = excluded.detailed_notes,
  takeaway_html = excluded.takeaway_html,
  keywords = excluded.keywords,
  primary_topic = excluded.primary_topic,
  topics = excluded.topics,
  attachments = excluded.attachments,
  updated_at = now();
```

## 5. Health Checks

### 5.1 Count rows by language

```sql
select language, count(*)
from public.articles
group by language
order by language;
```

### 5.2 Check a specific slug

```sql
select slug, language, title, source_date
from public.articles
where slug = '20260324-adding-fuel-to-the-fire-ai-information-threats-pdf'
order by language;
```

### 5.3 Detect invalid language values

```sql
select language, count(*)
from public.articles
where language not in ('en', 'zh-tw')
group by language;
```

### 5.4 Favorites ownership sanity

```sql
select user_id, count(*)
from public.favorites
group by user_id
order by count(*) desc
limit 20;
```

### 5.5 Approved vs pending users

```sql
select status, count(*)
from public.access_requests
group by status
order by status;
```

### 5.6 Pending review queue

```sql
select email, reason, created_at
from public.access_requests
where status = 'pending'
order by created_at asc;
```

### 5.7 Current explicit admins

```sql
select au.email, ur.created_at
from public.user_roles ur
join public.app_users au on au.id = ur.user_id
where ur.role = 'admin'
order by au.email;
```

### 5.8 Allowlist

```sql
select email, created_at
from public.access_allowlist
order by email;
```

## 6. Runtime Env Vars

Set in Vercel project:
- `HUGO_SUPABASE_URL`
- `HUGO_SUPABASE_ANON_KEY`
- `HUGO_SUPABASE_REDIRECT_URL`

If these are missing, UI will show:
- `Supabase is not configured yet...`

## 7. Common Incidents

## 7. Access Control Flow

### 7.1 Whitelist path

1. Admin adds the email to `public.access_allowlist`
2. User logs in with Google
3. Front-end upserts a row into `public.app_users`
4. RLS immediately treats the user as approved

### 7.2 Request path

1. User logs in with Google
2. Front-end upserts a row into `public.app_users`
3. If the email is not allowlisted and the user is not an admin, the UI shows a request form
4. Submitting the form inserts a `pending` row into `public.access_requests`
5. Admin reviews it in `/admin/`
6. If approved, the next refresh/session check grants access
7. If denied, the user remains blocked and may submit a new request later

Important:
- Approval email sending is intentionally **not** implemented in this phase.
- Protected article data is guarded by approval-aware RLS; login alone is not enough.

## 8. Common Incidents

### 8.1 Login works, but no content appears

Check:
1. `articles` has rows for current language (`en` or `zh-tw`)
2. user is approved via admin role, allowlist, or an `approved` request
3. env vars are present in current deployment

### 8.2 `/item/?slug=...` shows empty

Check:
1. slug exists in `public.articles`
2. slug spelling in URL is exact
3. record language values are canonical (`en` / `zh-tw`)
4. logged-in user is approved

### 8.3 User can log in but only sees the request form

Check:
1. email is in `public.access_allowlist`, or
2. latest reviewed request for that user is `approved`, or
3. the user is an admin

### 8.4 Topics/Keywords/Types show 0 or empty

Check:
1. article rows exist
2. `primary_topic`, `topics`, `keywords`, `source_type` fields are populated
3. imported JSON fields are valid arrays for `topics` / `keywords`
