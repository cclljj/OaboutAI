# Discovery UX Design

## Main Files

- `core/assets/js/oa-app.js`
- `core/layouts/index.html`
- `core/layouts/items/list.html`
- `core/layouts/item-query/single.html`
- `core/layouts/entry/single.html`
- `core/layouts/topics/list.html`
- `core/layouts/topics/topic.html`
- `core/layouts/keywords/taxonomy.html`
- `core/layouts/types/taxonomy.html`
- `core/layouts/search/single.html`
- `core/layouts/archive/monthly.html`
- `core/layouts/favorites/single.html`
- `core/layouts/digest/list.html`

## URL State Keys

- `sort_by`
- `sort_order`
- `page_size`
- `page`
- `month`
- `term_type`
- `term_value`
- `topic`
- `slug`
- `date`

## Article Card Contract

Article cards include:

- title linked to `/entry/<slug>/` or `/zh-tw/entry/<slug>/`
- source date
- submission date
- source type
- up to three topic chips
- executive summary
- favorite toggle
- admin-only delete button

## Digest Runtime Dependency

The browser currently queries `public.digests` with:

- list: `digest_date`, `title`, `language`
- detail: `digest_date`, `title`, `content_html`, `language`

The canonical schema defines `public.digests` with explicit grants, approval-aware RLS, and a unique `(digest_date, language)` constraint. Authenticated users receive `SELECT` only; service-role ingestion receives explicit CRUD privileges.

Suggested minimum row shape:

- `digest_date date`
- `language text`
- `title text`
- `content_html text`
- timestamps
- UUID primary key plus unique `(digest_date, language)`

Digest detail pages load pinned DOMPurify only on the digest route. `core/assets/js/oa-sanitize.js` applies a strict element/attribute allowlist and fails closed if the sanitizer is unavailable.

## Known Behavior Boundaries

Search is client-side over rows fetched for the active language. Large article sets may require future server-side search, but the current behavior is browser filtering.

Keyword aliases are normalized by the browser catalog, while canonical JSONB containment and pagination are pushed into Supabase. Type, topic, favorite, and month filters are also pushed into Supabase where possible.
