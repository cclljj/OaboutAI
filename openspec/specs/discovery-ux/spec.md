# Discovery UX Specification

## Purpose

This capability defines the user-facing discovery features: recent entries, item lists, topic pages, term catalogs, search, archive, favorites, and weekly digest views.

## Requirements

### Requirement: Server-Paged Article Lists

The system SHALL render article list views from Supabase with URL-preserved sorting and pagination state.

#### Scenario: Default list state

- **WHEN** an approved user opens a list route
- **THEN** the default sort field is `source_date`
- **AND** the default order is descending
- **AND** the default page size is `20`
- **AND** valid page sizes are `20`, `50`, and `100`

#### Scenario: State updates URL

- **WHEN** the user changes sort field, sort order, page size, or page
- **THEN** `sort_by`, `sort_order`, `page_size`, and `page` query parameters are updated
- **AND** refreshing the page preserves the chosen state

### Requirement: Home Recent Entries

The home page SHALL show a protected recent entries section after approval.

#### Scenario: Approved home load

- **GIVEN** an approved user opens the home page
- **WHEN** protected views render
- **THEN** the home recent entries view fetches the active language article page
- **AND** renders entry cards with title, metadata chips, executive summary, favorite control, and admin delete control when applicable

### Requirement: Topic Discovery

The system SHALL expose topic catalog and topic detail pages based on `data/topics.json`.

#### Scenario: Topic catalog

- **GIVEN** an approved user opens `/topics/`
- **WHEN** article rows are loaded
- **THEN** the topic grid displays every configured topic
- **AND** each topic shows a dynamic count of articles where it is primary or secondary topic

#### Scenario: Topic detail

- **GIVEN** an approved user opens `/topics/<topic-id>/`
- **WHEN** article rows are queried
- **THEN** the list includes articles where `primary_topic` equals the topic id
- **AND** articles whose `topics` array contains the topic id are also included

### Requirement: Keyword And Type Discovery

The system SHALL expose dynamic keyword and source-type catalogs from article rows.

#### Scenario: Keyword catalog

- **GIVEN** an approved user opens `/keywords/`
- **WHEN** article rows are loaded
- **THEN** the page lists keywords with article counts
- **AND** keyword aliases are canonicalized through `data/keywords.json`
- **AND** clicking a keyword opens `/items/?term_type=keywords&term_value=<keyword>`

#### Scenario: Type catalog

- **GIVEN** an approved user opens `/types/`
- **WHEN** article rows are loaded
- **THEN** the page lists source types with article counts
- **AND** clicking a type opens `/items/?term_type=types&term_value=<type>`

### Requirement: Search

The system SHALL provide client-side live search over approved article rows in the active language.

#### Scenario: Empty search

- **WHEN** the search page loads
- **THEN** the UI prompts the user to start typing

#### Scenario: Matching search

- **WHEN** the user enters one or more search tokens
- **THEN** results include articles whose combined title, executive summary, detailed notes, or slug include every token
- **AND** at most 80 matching cards are rendered

### Requirement: Monthly Archive

The system SHALL expose a monthly archive index and month-filtered article list.

#### Scenario: Archive index

- **WHEN** an approved user opens `/archive/monthly/` without a month query
- **THEN** the page groups articles by `source_date` month
- **AND** each month links back to the same route with `?month=YYYY-MM`

#### Scenario: Archive month filter

- **WHEN** an approved user opens `/archive/monthly/?month=YYYY-MM`
- **THEN** the list includes rows with `source_date` from the first day of that month up to but excluding the first day of the next month

### Requirement: Favorites

The system SHALL allow approved users to save and remove article slugs as personal favorites.

#### Scenario: Save favorite

- **GIVEN** an approved user clicks save on an article
- **WHEN** the article slug is not already saved
- **THEN** the browser inserts `user_id` and `article_slug` into `public.favorites`
- **AND** all matching buttons update to the saved state

#### Scenario: Remove favorite

- **GIVEN** an approved user clicks a saved favorite
- **WHEN** the slug is already saved
- **THEN** the browser deletes that user's favorite row
- **AND** a favorites page card for that slug is removed from the current DOM

#### Scenario: Favorites page

- **WHEN** an approved user opens `/favorites/`
- **THEN** the list includes only article rows whose slug is in the user's favorite set

### Requirement: Admin Delete Controls

Entry cards SHALL expose article delete controls only for admins.

#### Scenario: Admin deletes article

- **GIVEN** an admin confirms both delete prompts
- **WHEN** the article delete request succeeds
- **THEN** the row is deleted from `public.articles`
- **AND** favorite button state and visible entry cards are updated
- **AND** deletion audit logs are available to admin dashboard through RLS

### Requirement: Weekly Digest Views

The system SHALL expose protected weekly digest list and detail pages when `public.digests` rows exist.

#### Scenario: Digest list

- **GIVEN** an approved user opens `/digest/`
- **WHEN** digest rows exist for the active language
- **THEN** the page lists digest title and digest date newest first
- **AND** each item links to `/digest/?date=<digest_date>` in the active language

#### Scenario: Digest detail

- **GIVEN** an approved user opens `/digest/?date=<date>`
- **WHEN** a matching digest row exists
- **THEN** the page renders digest title, date, and `content_html`
- **AND** item links inside digest content are rewritten to protected entry links
- **AND** reference lists following reference headings receive digest-specific styling

#### Scenario: Digest missing

- **WHEN** no digest row exists for the requested date and language
- **THEN** the page shows a digest-not-found message

