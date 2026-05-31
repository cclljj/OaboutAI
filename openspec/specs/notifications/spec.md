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

#### Scenario: Valid request payload

- **WHEN** `/api/access-request-notify` receives POST with valid requester email, reason, request id, user id, language, submitted time, and admin URL
- **THEN** it sends a bilingual email to `OABOUTAI_ADMIN_NOTIFY_EMAIL`
- **AND** returns JSON success if delivery succeeds

#### Scenario: Invalid request payload

- **WHEN** requester email is invalid or reason is empty
- **THEN** the endpoint returns `400` with `invalid_payload`

#### Scenario: Wrong method

- **WHEN** the endpoint receives a non-POST request
- **THEN** it returns `405` and an `Allow: POST` header

### Requirement: Access Approval Requester Notification

The system SHALL notify the requester when an admin approves access.

#### Scenario: Valid approval payload

- **WHEN** `/api/access-approved-notify` receives POST with a valid requester email
- **THEN** it sends a bilingual approval email with login URL and approval timestamp

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

