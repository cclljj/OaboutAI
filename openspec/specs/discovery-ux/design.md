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

The main schema file currently defines article/access tables but does not define `public.digests`. A full replica that enables Digest must create this table and RLS/grants using the same explicit grant policy as other runtime tables.

Suggested minimum row shape:

- `digest_date date`
- `language text`
- `title text`
- `content_html text`
- timestamps
- primary key `(digest_date, language)`

## Known Behavior Boundaries

Search is client-side over rows fetched for the active language. Large article sets may require future server-side search, but the current behavior is browser filtering.

Keyword filtering is partly client-side because keyword aliases are normalized by the browser catalog. Type, topic, favorite, and month filters are pushed into Supabase queries where possible.

