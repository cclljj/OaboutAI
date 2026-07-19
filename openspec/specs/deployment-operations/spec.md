# Deployment Operations Specification

## Purpose

This capability defines local verification, CI validation, production deployment, Supabase sync, smoke tests, and operational guardrails.

## Requirements

### Requirement: Validation Job

The CI validation job SHALL validate code, content metadata, SQL grant policy, and static build safety for pull requests and matching pushes.

#### Scenario: CI path trigger

- **WHEN** changes are pushed or opened in a pull request under core app, app overlay, API, scripts, docs, OpenSpec, root docs, Vercel config, or workflow files
- **THEN** the docs-site CI workflow runs

#### Scenario: SQL grant policy check

- **WHEN** the validation job runs
- **THEN** it executes `scripts/check_supabase_grant_policy.py`
- **AND** fails if a SQL file creates a `public.*` table without same-file grant/RLS/policy statements
- **AND** fails if existing runtime table grants drift from the documented least-privilege baseline
- **AND** fails if any `public.*` table is granted to `anon`
- **AND** pinned browser dependency tests and the production dependency audit pass

#### Scenario: Shell-only build validation

- **WHEN** validation composes the site without private data
- **THEN** topic sync, auto-resolve, content validation, share entry sync, private source removal, Hugo build, and output checks all run

### Requirement: Production Deploy Job

The deploy job SHALL run only for main branch pushes or manual workflow dispatch targeting `refs/heads/main`.

#### Scenario: Required secret checks

- **WHEN** deployment starts
- **THEN** it fails early if `VERCEL_TOKEN`, `OABOUTAI_DATA_REPO_TOKEN`, `SUPABASE_URL`, or `SUPABASE_SERVICE_ROLE_KEY` are missing

#### Scenario: Private repo access check

- **WHEN** deployment starts
- **THEN** the workflow verifies the private data repository API returns HTTP 200 using the cleaned token
- **AND** whitespace in the token is rejected

#### Scenario: Supabase content sync

- **WHEN** private data validation succeeds
- **THEN** CI syncs Obsidian rows to Supabase with `--delete-missing` and `--prune-favorites`

#### Scenario: Vercel build and deploy

- **WHEN** Supabase sync succeeds
- **THEN** CI removes private data, pulls Vercel settings, writes composed Vercel config, builds production artifacts, verifies no public Obsidian JSON, and deploys prebuilt artifacts to production

### Requirement: Post-Deploy Smoke Tests

The deployment SHALL verify key public shell routes after production deployment.

#### Scenario: Smoke tests run

- **WHEN** production deploy completes
- **THEN** `scripts/smoke_test_routes.sh` runs with `BASE_URL=https://oaboutai.vercel.app`
- **AND** it checks home, list, item shell, entry shell, topics, keywords, types, and rewrite compatibility routes return expected shell markers or HTTP 200

### Requirement: Cross-Repo Dispatch

Content-only changes in `OaboutAI_data` SHALL be able to trigger OaboutAI deployment by GitHub workflow dispatch.

#### Scenario: Data repo push

- **GIVEN** the data repository has a workflow with a token allowed to dispatch OaboutAI Actions
- **WHEN** content changes are pushed
- **THEN** OaboutAI receives `workflow_dispatch`
- **AND** the dispatch targets the OaboutAI `main` ref
- **AND** the deploy job runs even without a code push

### Requirement: Operational Runbooks

The project SHALL maintain human-readable setup, Supabase, and regression runbooks alongside OpenSpec.

#### Scenario: Operator needs setup guidance

- **WHEN** a maintainer needs to bootstrap or deploy
- **THEN** `README.md`, `INSTALL.md`, `docs/supabase_operations.md`, and `docs/system_test_checklist.md` provide operational instructions

### Requirement: Production Analytics Controls

The site SHALL optionally enable Vercel Analytics and Speed Insights only in production builds.

#### Scenario: Analytics enabled

- **GIVEN** the build is production
- **AND** analytics flags are not false-like values
- **WHEN** the head partial renders
- **THEN** Vercel Analytics and Speed Insights scripts are included

#### Scenario: Analytics disabled

- **GIVEN** the relevant flag is `0`, `false`, `off`, or `no`
- **WHEN** the head partial renders
- **THEN** the matching Vercel script is omitted

### Requirement: Browser Delivery Hardening

The production deployment SHALL send defense-in-depth browser headers and cache fingerprinted assets efficiently.

#### Scenario: Production response headers

- **WHEN** Vercel serves a site response
- **THEN** CSP, MIME-sniffing, referrer, permissions, and frame-embedding protections are present

#### Scenario: Fingerprinted asset caching

- **WHEN** Vercel serves a JavaScript or CSS asset under the fingerprinted asset paths
- **THEN** the response is cacheable for one year with `immutable`
- **AND** HTML remains revalidated
