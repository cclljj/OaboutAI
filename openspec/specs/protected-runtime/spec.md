# Protected Runtime Specification

## Purpose

This capability defines how protected article content is fetched from Supabase at runtime and how the public static site avoids leaking article bodies.

## Requirements

### Requirement: Protected Article Source

The system SHALL treat Supabase `public.articles` as the runtime source of truth for published article content.

#### Scenario: Approved user reads list data

- **GIVEN** an authenticated user who is approved by RLS
- **WHEN** the browser app queries `public.articles`
- **THEN** list views receive article metadata and executive summaries for the active language
- **AND** results are ordered by selected date fields and slug as a stable tie-breaker

#### Scenario: Unapproved user cannot read articles

- **GIVEN** an authenticated user who is not approved
- **WHEN** protected views initialize
- **THEN** the UI shows the access request state
- **AND** article queries are not used to render protected content

#### Scenario: Logged-out user sees auth gate

- **GIVEN** no Supabase session exists
- **WHEN** any protected runtime view initializes
- **THEN** the UI renders a sign-in gate
- **AND** no protected article body is rendered

### Requirement: Article Detail Rendering

The system SHALL render article detail pages from Supabase rows only after the user is authenticated and approved.

#### Scenario: Detail by slug query

- **GIVEN** `/item/?slug=<slug>` is opened
- **WHEN** an approved user session is available
- **THEN** the browser app fetches the row with that slug in the current language
- **AND** if not found, it tries the fallback language
- **AND** it renders metadata, source URL, source type, dates, topics, keywords, executive summary, detailed notes, take-away, and attachments

#### Scenario: Detail by generated share route

- **GIVEN** `/entry/<slug>/` or `/zh-tw/entry/<slug>/` is opened
- **WHEN** an approved user session is available
- **THEN** the page uses the embedded route slug to fetch the same protected detail row

#### Scenario: Missing slug

- **GIVEN** an item shell has no `slug` query or route slug
- **WHEN** the detail view initializes
- **THEN** the UI shows an unavailable state with a missing slug reason

### Requirement: Static Leakage Prevention

The system SHALL prevent private Obsidian sources and generated public article JSON from being present in deploy artifacts.

#### Scenario: CI shell build

- **WHEN** the validation job builds the composed site
- **THEN** `data/obsidian` and `static/obsidian` are removed before Hugo build
- **AND** the generated `public/obsidian/articles.en.json` and `public/obsidian/articles.zh-tw.json` files are absent

#### Scenario: Production Vercel build

- **WHEN** the deploy job builds Vercel artifacts
- **THEN** private Obsidian data is removed before build
- **AND** `.vercel/output/static/obsidian/articles.en.json` and `.vercel/output/static/obsidian/articles.zh-tw.json` are absent

### Requirement: Safe Client Rendering

The browser app SHALL escape untrusted text and sanitize URLs before inserting runtime content into the DOM.

#### Scenario: Rendering text fields

- **WHEN** title, summary, metadata, topics, keywords, or admin table fields are rendered
- **THEN** HTML-sensitive characters are escaped

#### Scenario: Rendering links

- **WHEN** article source URLs or Markdown links are rendered
- **THEN** only `http`, `https`, or explicit `mailto` links are accepted
- **AND** rejected links render as plain text or empty hrefs

#### Scenario: Rendering Markdown-like body fields

- **WHEN** executive summary, detailed notes, or take-away fields are rendered
- **THEN** supported Markdown syntax is converted to safe HTML
- **AND** source line breaks inside paragraph blocks are preserved for readability
- **AND** unsupported raw HTML is escaped rather than trusted
