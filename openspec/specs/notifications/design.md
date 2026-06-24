# Notifications Design

## Main Files

- `api/_mailer.js`
- `api/access-request-notify.js`
- `api/access-approved-notify.js`
- `core/assets/js/oa-app.js`

## Provider Configuration

SMTP:

- `OABOUTAI_SMTP_USER`
- `OABOUTAI_SMTP_PASS`
- `OABOUTAI_SMTP_HOST`, default `smtp.gmail.com`
- `OABOUTAI_SMTP_PORT`, default `465`
- `OABOUTAI_SMTP_SECURE`, default `true`

Resend:

- `RESEND_API_KEY`
- `OABOUTAI_RESEND_FROM`

Shared:

- `OABOUTAI_MAIL_FROM`
- `OABOUTAI_REPLY_TO`
- `OABOUTAI_ADMIN_NOTIFY_EMAIL`, default `cclljj@gmail.com`

## Endpoint Shape

Both endpoints return JSON through the shared `json()` helper and only accept POST.

Both endpoints require:

- `Authorization: Bearer <supabase access token>`
- `requestId` in JSON body

`access-request-notify` validates and enforces:

- caller has a valid Supabase session
- caller is the same `requester_user_id` as the target `public.access_requests` row
- request status is `pending`
- request has not already been marked with `admin_notified_at`
- requester email/reason are loaded from DB instead of trusting payload fields

The endpoint calls `public.claim_access_request_admin_notification(request_id)` before delivery. The function atomically sets `admin_notified_at` only for the authenticated request owner, pending status, and previously unnotified rows. Duplicate calls return `already_notified` without sending email.

`access-approved-notify` validates and enforces:

- caller has a valid Supabase session
- caller is admin (explicit `user_roles.admin` or bootstrap admin email)
- request status is `approved`
- requester email/reviewed timestamp are loaded from DB instead of trusting payload fields

## Frontend Integration

Access request notification is non-blocking from the user's perspective. The request row is saved first, then email notification is attempted.

Approval notification happens after the admin update succeeds. If notification fails, the admin sees an alert, but the database approval remains saved.
