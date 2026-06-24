# Content Pipeline Specification

## Purpose

This capability defines how private Obsidian markdown becomes validated Supabase article rows without exposing protected source content in the public repository or static output.

## Requirements

### Requirement: Private Obsidian Source

Production article body content SHALL be sourced from the private repository `cclljj/OaboutAI_data`, default subdirectory `obsidian`.

#### Scenario: Production data injection

- **GIVEN** CI has a valid `OABOUTAI_DATA_REPO_TOKEN`
- **WHEN** the deploy job composes the site with the private data repo URL, ref, token env, and subdir
- **THEN** `obsidian/en` and `obsidian/zh-tw` are copied into composed `data/obsidian`
- **AND** missing language folders fail the compose step
- **AND** archive symlinks, hardlinks, device files, and other special files are rejected before copy

#### Scenario: Missing private token in CI

- **GIVEN** a data repo URL is configured
- **AND** CI has no private data token
- **WHEN** composition runs
- **THEN** the command fails before deployment

### Requirement: Markdown Body Contract

Each Obsidian article SHALL contain canonical front matter and body sections.

#### Scenario: Required sections

- **WHEN** an article markdown file is validated or synced
- **THEN** it must provide `## Executive Summary`
- **AND** it must provide `## Detailed Notes`
- **AND** it must provide `## Take-away`

#### Scenario: Required front matter

- **WHEN** an article markdown file is validated
- **THEN** it must include title, source URL, source type, source date, submission date, keywords, primary topic, topics, and language either as front matter or accepted body-derived fields

#### Scenario: Title YAML style

- **WHEN** an article title is written in YAML front matter
- **THEN** it must use a single-quoted inline scalar such as `title: 'Example'`
- **AND** block scalar title syntax is rejected

### Requirement: Taxonomy Governance

The system SHALL validate topics and keywords against app-local catalog files.

#### Scenario: Topic validation

- **WHEN** article metadata is validated
- **THEN** `primary_topic` and every secondary topic must match an id in `data/topics.json`
- **AND** `primary_topic` must not appear in `topics`
- **AND** no more than ten top-level topics may exist

#### Scenario: Keyword validation

- **WHEN** article metadata is validated
- **THEN** every keyword must match an id in `data/keywords.json`
- **AND** topic ids are not accepted as keywords

#### Scenario: Unknown keyword auto-resolution

- **GIVEN** auto-resolve sees an unknown keyword
- **WHEN** it processes content
- **THEN** it maps the unknown keyword to the fallback `governance-framework`
- **AND** appends a proposal to `data/keyword_proposals.jsonl` unless already present

### Requirement: Supabase Article Sync

The CI deploy pipeline SHALL upsert private Obsidian records into `public.articles`.

#### Scenario: Dry run

- **WHEN** `sync_obsidian_to_supabase.py --dry-run` runs
- **THEN** articles are parsed and validated locally
- **AND** no Supabase writes are performed

#### Scenario: Upsert rows

- **GIVEN** Supabase URL and service-role key are configured
- **WHEN** sync runs without dry-run
- **THEN** rows are upserted into `public.articles` on conflict `(slug, language)`
- **AND** duplicate rows merge with current parsed content

#### Scenario: Delete missing rows

- **GIVEN** `--delete-missing` is set
- **WHEN** existing Supabase article keys are absent from the current source set
- **THEN** those rows are deleted from `public.articles`

#### Scenario: Prune favorites

- **GIVEN** `--prune-favorites` is set with deleted article slugs
- **WHEN** missing article rows are deleted
- **THEN** favorites for those deleted slugs are also deleted

### Requirement: Share Entry Pages

The pipeline SHALL generate public share entry shells that reveal titles and slugs but not protected article bodies.

#### Scenario: Generate entry shells

- **WHEN** private Obsidian sources are present
- **THEN** `sync_share_entries.py` generates `content/<lang>/entry/<slug>/index.md`
- **AND** generated entry pages contain title, slug, layout `entry`, and no protected body sections
- **AND** slugs must be lowercase letters, numbers, and hyphens only
- **AND** the resolved output path must remain inside `content/<lang>/entry`

#### Scenario: Remove stale entry shells

- **WHEN** an article slug no longer exists in the private source
- **THEN** its generated entry shell is removed

### Requirement: Bilingual Canonical Pairing

Traditional Chinese entries SHALL have a corresponding English canonical entry.

#### Scenario: zh-tw without English

- **GIVEN** a `zh-tw` article slug has no matching English slug
- **WHEN** validation runs
- **THEN** validation fails
