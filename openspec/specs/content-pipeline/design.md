# Content Pipeline Design

## Main Files

- `core/scripts/compose_site.py`
- `core/scripts/validate_content.py`
- `core/scripts/auto_resolve_content_issues.py`
- `core/scripts/sync_obsidian_to_supabase.py`
- `core/scripts/sync_share_entries.py`
- `core/scripts/sync_topics.py`
- `apps/oaboutai/data/topics.json`
- `apps/oaboutai/data/keywords.json`
- `apps/oaboutai/data/keyword_proposals.jsonl`
- `docs/supabase_schema.sql`

## Article Row Shape

`public.articles` stores:

- `slug`
- `language`
- `title`
- `source_url`
- `source_type`
- `source_date`
- `submission_date`
- `executive_summary`
- `detailed_notes`
- `takeaway_html`
- `keywords`
- `primary_topic`
- `topics`
- `attachments`
- timestamps

Primary key is `(slug, language)`.

## Supported Languages

- `en`
- `zh-tw`

The validator requires the front matter `language` to match the path language.

## Allowed Source Types

- `webpage`
- `pdf`
- `youtube`
- `other`

## Current Top-Level Topics

- `ai-policy`
- `ai-governance`
- `ai-safety`
- `agentic-ai`
- `physical-ai`

## Keyword Catalog

`apps/oaboutai/data/keywords.json` is the keyword source of truth. Each entry has:

- `id`
- localized `label`
- `aliases`

The frontend also uses this catalog to canonicalize keyword filters.

## Sync API

The sync script writes through Supabase PostgREST:

- Upsert endpoint: `/rest/v1/articles?on_conflict=slug,language`
- Headers include `apikey`, `Authorization: Bearer <service-role-key>`, `Content-Type: application/json`, and merge preference.
- Delete-missing uses filtered DELETE requests grouped by language and slug batches.

## Legacy Scripts

`compile_obsidian_articles.py` and `ingest_item.py` remain for historical workflows. Production runtime must continue using Supabase `public.articles`, not public static article bundles.

