# Project Composition Specification

## Purpose

This capability defines how OaboutAI is assembled from a reusable Hugo core and an app overlay, and how the resulting site exposes only safe shell pages and routing.

## Requirements

### Requirement: Composable Hugo Monorepo

The system SHALL compose a deployable Hugo site by overlaying one app directory on top of the reusable `core/` directory.

#### Scenario: Compose default app

- **GIVEN** the repository root and app id `oaboutai`
- **WHEN** `scripts/compose_site.py --app-id oaboutai --output <dir> --clean` runs
- **THEN** the output directory contains the reusable core files
- **AND** app-specific files from `apps/oaboutai/` override or extend core files
- **AND** root `api/`, `package.json`, `package-lock.json`, and `vercel.json` are copied when present

#### Scenario: Reject unknown app

- **GIVEN** an app id with no matching `apps/<app-id>/` directory
- **WHEN** composition runs
- **THEN** the command fails with an app-not-found error

### Requirement: Bilingual Shell

The system SHALL provide English and Traditional Chinese shell routes from Hugo content stubs while protected article data is loaded at runtime.

#### Scenario: Language directories exist

- **WHEN** the site is composed
- **THEN** English shell content is read from `content/en`
- **AND** Traditional Chinese shell content is read from `content/zh-tw`
- **AND** the default content language is English without a language subdirectory

#### Scenario: Language switch preserves query state

- **GIVEN** a user is viewing a route with query parameters such as `?slug=<slug>`
- **WHEN** the language switch menu is rendered
- **THEN** same-origin language links preserve the current query string

### Requirement: Runtime View Markers

Hugo templates SHALL mark protected runtime regions with `data-oa-protected-view` so the browser app can replace shell placeholders after auth checks.

#### Scenario: Shell renders placeholders

- **WHEN** Hugo builds list, detail, search, catalog, archive, digest, favorites, or admin pages
- **THEN** each protected section contains a loading placeholder
- **AND** each protected section has a stable `data-oa-protected-view` value

#### Scenario: Static HTML remains a shell

- **WHEN** static HTML is inspected before authentication
- **THEN** it contains route scaffolding and UI labels
- **AND** it does not contain protected article body fields from private content

### Requirement: Legacy Route Compatibility

The system SHALL keep historical route shapes working through Vercel rewrites.

#### Scenario: Legacy item URL resolves

- **WHEN** a request is made to `/items/<slug>` or `/items/<slug>/`
- **THEN** Vercel rewrites it to `/item/?slug=<slug>`

#### Scenario: Localized legacy item URL resolves

- **WHEN** a request is made to `/zh-tw/items/<slug>` or `/zh-tw/items/<slug>/`
- **THEN** Vercel rewrites it to `/zh-tw/item/?slug=<slug>`

#### Scenario: Term URLs resolve to filtered lists

- **WHEN** a request is made to `/keywords/<term>` or `/types/<term>`
- **THEN** Vercel rewrites it to `/items/?term_type=<keywords-or-types>&term_value=<term>`
- **AND** localized term URLs rewrite to the corresponding `/zh-tw/items/` route

### Requirement: Runtime Configuration Injection

The Hugo head partial SHALL inject safe runtime configuration needed by the browser app.

#### Scenario: Supabase metadata exists

- **WHEN** the site is built with Supabase environment variables
- **THEN** the generated head contains meta tags for Supabase URL, anon key, and redirect URL
- **AND** the browser app reads those values at startup

#### Scenario: Missing Supabase config

- **GIVEN** Supabase URL or anon key is absent
- **WHEN** protected views initialize
- **THEN** the UI shows a configuration-missing message
- **AND** no protected data query is attempted

### Requirement: Canonical Host Redirect

Production preview hosts SHALL redirect to the canonical production host when the configured `baseURL` host differs from the current Vercel host.

#### Scenario: Preview host loads production build

- **GIVEN** a production Hugo build
- **AND** the current hostname is a non-canonical `*.vercel.app` preview host
- **WHEN** the page loads
- **THEN** the browser redirects to the canonical host while preserving path, query, and hash

