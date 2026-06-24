"use strict";

const DEFAULT_SUBJECT = "[OaboutAI] Access request pending review / 新的存取申請待審核";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const { EMAIL_RE, escapeHtml, json, normalizeEmail, safeText, sendEmail } = require("./_mailer");
const { authenticateRequest, claimAccessRequestAdminNotification, fetchAccessRequestById, jsonError } = require("./_supabase_auth");

function clampText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function sanitizeAdminUrl(value, fallback) {
  const raw = String(value || "").trim();
  const safeFallback = String(fallback || "").trim();
  if (!raw) return safeFallback;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch (_error) {
    return safeFallback;
  }
  return safeFallback;
}

function resolveAdminUrl() {
  const fallback = "https://oaboutai.vercel.app/admin/";
  const base = sanitizeAdminUrl(process.env.HUGO_SUPABASE_REDIRECT_URL || "", "https://oaboutai.vercel.app/");
  try {
    return new URL("/admin/", base).href;
  } catch (_error) {
    return fallback;
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const auth = await authenticateRequest(req, res);
  if (!auth) return;

  const adminEmail = normalizeEmail(process.env.OABOUTAI_ADMIN_NOTIFY_EMAIL || "cclljj@gmail.com");
  if (!adminEmail || !EMAIL_RE.test(adminEmail)) {
    return json(res, 202, { ok: true, skipped: true, reason: "notification_not_configured" });
  }

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const requestId = safeText(body.requestId, "");
  const language = safeText(body.language, "en");
  const adminUrl = resolveAdminUrl();

  if (!requestId) {
    return jsonError(res, 400, "invalid_payload", "requestId is required");
  }
  if (!UUID_RE.test(requestId)) {
    return jsonError(res, 400, "invalid_payload", "requestId must be a UUID");
  }

  const claim = await claimAccessRequestAdminNotification(auth.envConfig, auth.accessToken, requestId);
  if (!claim.ok) {
    return jsonError(res, 502, claim.error || "access_request_notification_claim_failed", claim.detail || "");
  }
  if (!claim.row) {
    const lookup = await fetchAccessRequestById(auth.envConfig, auth.accessToken, requestId);
    if (!lookup.ok) {
      return jsonError(res, 502, lookup.error || "access_request_lookup_failed", lookup.detail || "");
    }
    if (!lookup.row) {
      return jsonError(res, 404, "request_not_found_or_forbidden");
    }
    if (safeText(lookup.row.admin_notified_at, "")) {
      return json(res, 202, { ok: true, skipped: true, reason: "already_notified" });
    }
    if (safeText(lookup.row.status, "") !== "pending") {
      return jsonError(res, 409, "invalid_request_state", "request must be pending");
    }
    return jsonError(res, 403, "forbidden");
  }

  const requesterUserId = safeText(claim.row.requester_user_id, "");
  const requesterEmail = normalizeEmail(claim.row.email || "");
  const reason = clampText(claim.row.reason, 4000);
  const submittedAt = safeText(claim.row.created_at, new Date().toISOString());
  const status = safeText(claim.row.status, "");

  if (!requesterUserId || requesterUserId !== safeText(auth.user.id, "")) {
    return jsonError(res, 403, "forbidden");
  }
  if (status !== "pending") {
    return jsonError(res, 409, "invalid_request_state", "request must be pending");
  }

  if (!requesterEmail || !EMAIL_RE.test(requesterEmail) || !reason) {
    return json(res, 400, { ok: false, error: "invalid_payload" });
  }

  const text = [
    "[EN] OaboutAI access request requires your review.",
    "Purpose: notify admin that a new applicant is waiting for approval to access protected content.",
    "",
    `Request ID: ${requestId}`,
    `Requester user ID: ${requesterUserId}`,
    `Requester email: ${requesterEmail}`,
    `Language: ${language}`,
    `Submitted at: ${submittedAt}`,
    "",
    "Applicant reason:",
    reason,
    "",
    `Review page: ${adminUrl}`,
    "",
    "----------------------------------------",
    "",
    "[中文] OaboutAI 有新的存取申請待您審核。",
    "用途：通知管理員有新申請者正在等待核准，核准後申請者才可存取受保護內容。",
    "",
    `申請編號：${requestId}`,
    `申請者使用者 ID：${requesterUserId}`,
    `申請者 Email：${requesterEmail}`,
    `語言：${language}`,
    `送出時間：${submittedAt}`,
    "",
    "申請理由：",
    reason,
    "",
    `審核頁面：${adminUrl}`
  ].join("\n");

  const html = [
    "<p><strong>[EN]</strong> OaboutAI access request requires your review.</p>",
    "<p>Purpose: notify admin that a new applicant is waiting for approval to access protected content.</p>",
    "<ul>",
    `<li><strong>Request ID:</strong> ${escapeHtml(requestId)}</li>`,
    `<li><strong>Requester user ID:</strong> ${escapeHtml(requesterUserId)}</li>`,
    `<li><strong>Requester email:</strong> ${escapeHtml(requesterEmail)}</li>`,
    `<li><strong>Language:</strong> ${escapeHtml(language)}</li>`,
    `<li><strong>Submitted at:</strong> ${escapeHtml(submittedAt)}</li>`,
    "</ul>",
    "<p><strong>Applicant reason</strong></p>",
    `<pre style="white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(reason)}</pre>`,
    `<p><a href="${escapeHtml(adminUrl)}">Open admin review page</a></p>`,
    "<hr>",
    "<p><strong>[中文]</strong> OaboutAI 有新的存取申請待您審核。</p>",
    "<p>用途：通知管理員有新申請者正在等待核准，核准後申請者才可存取受保護內容。</p>",
    "<ul>",
    `<li><strong>申請編號：</strong> ${escapeHtml(requestId)}</li>`,
    `<li><strong>申請者使用者 ID：</strong> ${escapeHtml(requesterUserId)}</li>`,
    `<li><strong>申請者 Email：</strong> ${escapeHtml(requesterEmail)}</li>`,
    `<li><strong>語言：</strong> ${escapeHtml(language)}</li>`,
    `<li><strong>送出時間：</strong> ${escapeHtml(submittedAt)}</li>`,
    "</ul>",
    "<p><strong>申請理由</strong></p>",
    `<pre style="white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${escapeHtml(reason)}</pre>`,
    `<p><a href="${escapeHtml(adminUrl)}">開啟管理員審核頁面</a></p>`
  ].join("");

  try {
    const sent = await sendEmail({
      to: [adminEmail],
      subject: DEFAULT_SUBJECT,
      text,
      html
    });
    if (!sent.ok) {
      if (sent.skipped) {
        return json(res, 202, { ok: true, skipped: true, reason: sent.reason || "notification_not_configured" });
      }
      return json(res, 502, {
        ok: false,
        error: sent.error || "notification_send_failed",
        detail: String(sent.detail || "").slice(0, 500)
      });
    }

    return json(res, 200, { ok: true, provider: sent.provider || "" });
  } catch (error) {
    return json(res, 502, {
      ok: false,
      error: "notification_request_failed",
      detail: String(error && error.message ? error.message : error).slice(0, 500)
    });
  }
};
