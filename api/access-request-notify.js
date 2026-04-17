"use strict";

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "OaboutAI <onboarding@resend.dev>";
const DEFAULT_SUBJECT = "[OaboutAI] Access request pending review / 新的存取申請待審核";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function safeText(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function json(res, statusCode, payload) {
  res.status(statusCode).setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(payload));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const adminEmail = normalizeEmail(process.env.OABOUTAI_ADMIN_NOTIFY_EMAIL || "cclljj@gmail.com");
  const from = safeText(process.env.OABOUTAI_RESEND_FROM, DEFAULT_FROM);

  if (!apiKey || !adminEmail || !EMAIL_RE.test(adminEmail)) {
    return json(res, 202, { ok: true, skipped: true, reason: "notification_not_configured" });
  }

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const requesterEmail = normalizeEmail(body.email || "");
  const reason = clampText(body.reason, 4000);
  const requestId = safeText(body.requestId, "n/a");
  const requesterUserId = safeText(body.requesterUserId, "n/a");
  const submittedAt = safeText(body.submittedAt, new Date().toISOString());
  const adminUrl = sanitizeAdminUrl(body.adminUrl, "https://oaboutai.vercel.app/admin/");
  const language = safeText(body.language, "en");

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
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from,
        to: [adminEmail],
        subject: DEFAULT_SUBJECT,
        text,
        html
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      return json(res, 502, { ok: false, error: "resend_failed", detail: detail.slice(0, 500) });
    }

    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 502, {
      ok: false,
      error: "notification_request_failed",
      detail: String(error && error.message ? error.message : error).slice(0, 500)
    });
  }
};
