# Supabase Operations Guide

Day-2 operational runbook for OaboutAI runtime content.

## 1. Source of Truth

Production article content is read from:
- `public.articles`

Per-user saved items are read from:
- `public.favorites`

Public GitHub content bundles are **not** the production source of protected article body content.

## 2. Schema + RLS Bootstrap

Run once (or re-apply on reset):
- execute `docs/supabase_schema.sql` in Supabase SQL editor

After running, verify tables exist:

```sql
select to_regclass('public.articles') as articles_table,
       to_regclass('public.favorites') as favorites_table;
```

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

## 6. Runtime Env Vars

Set in Vercel project:
- `HUGO_SUPABASE_URL`
- `HUGO_SUPABASE_ANON_KEY`
- `HUGO_SUPABASE_REDIRECT_URL`

If these are missing, UI will show:
- `Supabase is not configured yet...`

## 7. Common Incidents

### 7.1 Login works, but no content appears

Check:
1. `articles` has rows for current language (`en` or `zh-tw`)
2. RLS policy allows authenticated `select`
3. env vars are present in current deployment

### 7.2 `/item/?slug=...` shows empty

Check:
1. slug exists in `public.articles`
2. slug spelling in URL is exact
3. record language values are canonical (`en` / `zh-tw`)

### 7.3 Topics/Keywords/Types show 0 or empty

Check:
1. article rows exist
2. `primary_topic`, `topics`, `keywords`, `source_type` fields are populated
3. imported JSON fields are valid arrays for `topics` / `keywords`
