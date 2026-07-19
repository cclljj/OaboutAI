# Protected Runtime Design

## Main Files

- `core/assets/js/oa-app.js`
- `core/layouts/item-query/single.html`
- `core/layouts/entry/single.html`
- `core/layouts/items/list.html`
- `core/layouts/index.html`
- `docs/supabase_schema.sql`
- `.github/workflows/docs-site-ci.yml`

## Supabase Article Fields

List views select:

- `slug`
- `language`
- `title`
- `source_url`
- `source_type`
- `source_date`
- `submission_date`
- `executive_summary`
- `keywords`
- `primary_topic`
- `topics`

Detail views additionally select:

- `detailed_notes`
- `takeaway_html`
- `attachments`

`takeaway_html` is retained for backward compatibility, but its stored value is Markdown parsed from the `## Take-away` section.

## Runtime Query Strategy

The browser creates a Supabase client with PKCE, persistent sessions, auto-refresh, and URL session detection. The pinned SDK is served as a fingerprinted first-party Hugo asset. `INITIAL_SESSION` is the single initial render path; token refreshes do not trigger a full protected-view reload.

The browser calls `public.get_access_context` once to upsert the current profile and return role, allowlist, request, admin, and approval state. Article and favorites reads begin concurrently after approval is known.

List pagination uses server-side `range(start, end)` for standard filters. Keyword aliases are canonicalized before the request, then JSONB containment, exact count, ordering, and pagination are executed by PostgREST.

## Rendering Safety

The app uses local helpers:

- `escapeHtml`
- `sanitizeHref`
- `formatMarkdownContent`

`formatMarkdownContent` converts supported Markdown-like body syntax into safe HTML, preserves source line breaks inside paragraph blocks with `<br>`, and delegates inline text to escaped Markdown rendering rather than trusting raw HTML.
- `sanitizeImageSrc`
- `sanitizeSameOriginRedirect`
- `formatMarkdownContent`
- `renderInlineMarkdown`

Markdown support is intentionally narrow: paragraphs, ordered/unordered lists, inline code, links, bold, and emphasis.

## Leakage Guards

The former `compile_obsidian_articles.py` static JSON path still exists for legacy contexts, but production CI removes `data/obsidian` and `static/obsidian` before Hugo/Vercel build. Any replica must preserve that removal step.
