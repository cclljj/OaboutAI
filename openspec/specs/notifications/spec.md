# Notifications Specification

## Purpose

This capability defines email notification behavior for access requests and approval messages through Vercel serverless endpoints.

## Requirements

### Requirement: SMTP First, Resend Fallback

The system SHALL attempt notification delivery through SMTP first, then Resend when SMTP is unavailable or fails.

#### Scenario: SMTP configured and succeeds

- **GIVEN** SMTP user and password are configured
- **WHEN** an email notification is sent
- **THEN** the system sends through SMTP
- **AND** returns provider `smtp_gmail`

#### Scenario: SMTP unavailable but Resend succeeds

- **GIVEN** SMTP is not configured or fails
- **AND** `RESEND_API_KEY` is configured
- **WHEN** an email notification is sent
- **THEN** the system sends through Resend
- **AND** returns provider `resend`

#### Scenario: No provider configured

- **GIVEN** SMTP and Resend are both unconfigured
- **WHEN** an email notification is requested
- **THEN** the endpoint returns an accepted or skipped response rather than blocking the access workflow

### Requirement: Access Request Admin Notification

The system SHALL notify the admin email when a user submits an access request.

#### Scenario: Authenticated request payload

- **WHEN** `/api/access-request-notify` receives POST with a valid bearer token and `requestId`
- **THEN** it sends a bilingual email to `OABOUTAI_ADMIN_NOTIFY_EMAIL`
- **AND** requester email and reason are loaded server-side from `public.access_requests`
- **AND** the request is atomically marked with `admin_notified_at` before delivery is attempted
- **AND** returns JSON success if delivery succeeds

#### Scenario: Duplicate request notification

- **GIVEN** an access request already has `admin_notified_at`
- **WHEN** `/api/access-request-notify` receives the same `requestId`
- **THEN** no email delivery is attempted
- **AND** the endpoint returns accepted JSON with reason `already_notified`

#### Scenario: Invalid request payload

- **WHEN** `requestId` is missing or the request row is not visible to the caller
- **THEN** the endpoint returns a `4xx` error (`invalid_payload` or not-found/forbidden variant)

#### Scenario: Unauthorized caller

- **WHEN** bearer token is missing or invalid
- **THEN** the endpoint returns `401`
- **AND** no email delivery is attempted

#### Scenario: Wrong method

- **WHEN** the endpoint receives a non-POST request
- **THEN** it returns `405` and an `Allow: POST` header

### Requirement: Access Approval Requester Notification

The system SHALL notify the requester when an admin approves access.

#### Scenario: Valid approval request

- **WHEN** `/api/access-approved-notify` receives POST with a valid bearer token and `requestId`
- **AND** the caller has admin privileges
- **AND** the request status is `approved`
- **THEN** it sends a bilingual approval email with login URL and approval timestamp

#### Scenario: Non-admin caller

- **WHEN** a non-admin caller invokes `/api/access-approved-notify`
- **THEN** the endpoint returns `403`
- **AND** no requester email is sent

#### Scenario: Resend test-mode restriction

- **GIVEN** requester delivery fails because Resend test mode or domain verification blocks delivery
- **AND** admin email is configured and differs from requester email
- **WHEN** fallback delivery is attempted
- **THEN** the endpoint sends a manual-forward email to the admin
- **AND** returns accepted success with reason `requester_notify_fallback_to_admin`

### Requirement: Safe Email Content

Notification endpoints SHALL normalize emails and escape HTML content before generating email bodies.

#### Scenario: HTML email construction

- **WHEN** user-provided reason, email, URL, id, or timestamp is inserted into HTML
- **THEN** HTML special characters are escaped

#### Scenario: Sender address

- **WHEN** `OABOUTAI_MAIL_FROM` is configured
- **THEN** it is used as the sender
- **AND** otherwise the sender falls back to SMTP user or Resend sender defaults
