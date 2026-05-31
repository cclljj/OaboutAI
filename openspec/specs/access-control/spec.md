# Access Control Specification

## Purpose

This capability defines authentication, approval, admin management, user-owned favorites access, and Supabase RLS/grant behavior.

## Requirements

### Requirement: Google OAuth Session

The system SHALL authenticate users through Supabase Auth using Google OAuth.

#### Scenario: Supported browser sign-in

- **GIVEN** Supabase URL and anon key are configured
- **WHEN** a user clicks sign in from a supported browser
- **THEN** the browser app starts Google OAuth with Supabase PKCE flow
- **AND** redirects back to the same-origin configured redirect URL or current page

#### Scenario: Unsupported in-app browser

- **GIVEN** the user agent looks like a blocked in-app browser or WebView
- **WHEN** the user clicks sign in
- **THEN** the browser app shows a localized alert advising Safari or Chrome
- **AND** it does not start Google OAuth

### Requirement: User Profile Upsert

The system SHALL maintain one `public.app_users` row for each signed-in Supabase auth user.

#### Scenario: User session is loaded

- **GIVEN** a Supabase user session exists
- **WHEN** protected runtime initialization runs
- **THEN** the browser app upserts `id`, lowercase `email`, `display_name`, `avatar_url`, and `last_seen_at`
- **AND** it records a best-effort `public.login_events` row

### Requirement: Approval Gate

The system SHALL grant protected article access only to approved users.

#### Scenario: Bootstrap admin

- **GIVEN** the current auth email is `cclljj@gmail.com`
- **WHEN** approval is evaluated
- **THEN** the user is treated as an admin and approved even without a `user_roles` row

#### Scenario: Allowlisted user

- **GIVEN** the current auth email appears in `public.access_allowlist`
- **WHEN** approval is evaluated
- **THEN** the user is approved

#### Scenario: Approved request user

- **GIVEN** the user's latest access request has status `approved`
- **WHEN** approval is evaluated
- **THEN** the user is approved

#### Scenario: Pending or denied user

- **GIVEN** the user is not admin, not allowlisted, and has no approved request
- **WHEN** protected views render
- **THEN** article content is withheld
- **AND** the access request UI is shown

### Requirement: Access Request Workflow

The system SHALL allow signed-in unapproved users to submit access requests.

#### Scenario: Submit pending request

- **GIVEN** a signed-in user is unapproved
- **WHEN** the user submits a non-empty reason
- **THEN** the browser inserts a `pending` row into `public.access_requests`
- **AND** the request user id and email match the current auth user
- **AND** admin notification is attempted through `/api/access-request-notify`

#### Scenario: Duplicate pending request

- **GIVEN** a user already has a pending request
- **WHEN** the user views gated content
- **THEN** the UI shows pending status instead of another request form

#### Scenario: Denied request

- **GIVEN** the latest request was denied
- **WHEN** the user views gated content
- **THEN** the UI allows a new access request

### Requirement: Admin Console

The system SHALL expose `/admin/` only to admins and support access, user, and content operations.

#### Scenario: Non-admin opens admin page

- **GIVEN** a signed-in user is approved but not admin
- **WHEN** `/admin/` loads
- **THEN** the UI shows an unauthorized admin state

#### Scenario: Admin reviews requests

- **GIVEN** an admin views pending access requests
- **WHEN** the admin approves or denies a request
- **THEN** the request row is updated with status, reviewer id, and reviewed timestamp
- **AND** approval attempts requester notification through `/api/access-approved-notify`

#### Scenario: Admin manages allowlist

- **GIVEN** an admin enters an email address
- **WHEN** the admin adds it to the allowlist
- **THEN** `public.access_allowlist` is upserted with the email and admin id
- **AND** removing an allowlist entry deletes that row

#### Scenario: Admin manages roles

- **GIVEN** an admin promotes or removes a known user
- **WHEN** the action is confirmed by RLS
- **THEN** `public.user_roles` is upserted or deleted for role `admin`

#### Scenario: Admin removes known user

- **GIVEN** an admin removes a known user who is not self and not bootstrap admin
- **WHEN** both confirmations pass
- **THEN** allowlist access is removed
- **AND** pending or approved access requests for that user/email are denied
- **AND** explicit admin role is removed
- **AND** the app profile is deleted

### Requirement: Explicit Supabase Grants

Supabase public runtime tables SHALL use explicit grants plus RLS rather than relying on public schema defaults.

#### Scenario: Runtime table grants

- **WHEN** the schema is applied
- **THEN** `anon` has no privileges on runtime tables or sequences
- **AND** `authenticated` has only the least privileges needed for the product
- **AND** `service_role` has backend operational privileges

#### Scenario: New table migration

- **WHEN** a SQL file creates a new `public.*` table
- **THEN** the same file includes `REVOKE`, explicit `GRANT`, `ENABLE ROW LEVEL SECURITY`, and policies
- **AND** CI fails if those statements are missing

### Requirement: RLS Ownership And Admin Isolation

RLS SHALL enforce owner-only user operations and admin-only administrative mutations.

#### Scenario: Favorites ownership

- **GIVEN** a user reads, inserts, or deletes favorites
- **WHEN** RLS checks the row
- **THEN** `auth.uid()` must match `favorites.user_id`
- **AND** the user must be approved

#### Scenario: Admin-only protected mutations

- **WHEN** roles, allowlist, access review, app profile delete, or article delete operations occur
- **THEN** policies require admin role or bootstrap admin status

