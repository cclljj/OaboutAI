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

`access-request-notify` validates:

- requester email
- non-empty reason
- optional request/user metadata
- sanitized admin URL

`access-approved-notify` validates:

- requester email
- optional reviewed timestamp
- sanitized login URL

## Frontend Integration

Access request notification is non-blocking from the user's perspective. The request row is saved first, then email notification is attempted.

Approval notification happens after the admin update succeeds. If notification fails, the admin sees an alert, but the database approval remains saved.

