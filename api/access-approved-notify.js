"use strict";

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "OaboutAI <onboarding@resend.dev>";
const DEFAULT_SUBJECT = "[OaboutAI] Access approved / 存取權限已核准";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function safeText(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function sanitizeSiteUrl(value, fallback) {
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
  const from = safeText(process.env.OABOUTAI_RESEND_FROM, DEFAULT_FROM);
  if (!apiKey) {
    return json(res, 202, { ok: true, skipped: true, reason: "notification_not_configured" });
  }

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const requesterEmail = normalizeEmail(body.email || "");
  const reviewedAt = safeText(body.reviewedAt, new Date().toISOString());
  const loginUrl = sanitizeSiteUrl(body.loginUrl, "https://oaboutai.vercel.app/");

  if (!requesterEmail || !EMAIL_RE.test(requesterEmail)) {
    return json(res, 400, { ok: false, error: "invalid_payload" });
  }

  const text = [
    "[EN] Your OaboutAI access request has been approved.",
    "Purpose: notify you that you can now sign in and access protected content.",
    "",
    `Approved account: ${requesterEmail}`,
    `Approved at: ${reviewedAt}`,
    "",
    "Please sign in with the same Google account you used when submitting the request.",
    `Sign in URL: ${loginUrl}`,
    "",
    "----------------------------------------",
    "",
    "[中文] 您的 OaboutAI 存取申請已核准。",
    "用途：通知您現在可以登入並存取受保護內容。",
    "",
    `核准帳號：${requesterEmail}`,
    `核准時間：${reviewedAt}`,
    "",
    "請使用您提交申請時的同一個 Google 帳號登入。",
    `登入網址：${loginUrl}`
  ].join("\n");

  const html = [
    "<p><strong>[EN]</strong> Your OaboutAI access request has been approved.</p>",
    "<p>Purpose: notify you that you can now sign in and access protected content.</p>",
    "<ul>",
    `<li><strong>Approved account:</strong> ${escapeHtml(requesterEmail)}</li>`,
    `<li><strong>Approved at:</strong> ${escapeHtml(reviewedAt)}</li>`,
    "</ul>",
    "<p>Please sign in with the same Google account you used when submitting the request.</p>",
    `<p><a href="${escapeHtml(loginUrl)}">Open OaboutAI and sign in</a></p>`,
    "<hr>",
    "<p><strong>[中文]</strong> 您的 OaboutAI 存取申請已核准。</p>",
    "<p>用途：通知您現在可以登入並存取受保護內容。</p>",
    "<ul>",
    `<li><strong>核准帳號：</strong> ${escapeHtml(requesterEmail)}</li>`,
    `<li><strong>核准時間：</strong> ${escapeHtml(reviewedAt)}</li>`,
    "</ul>",
    "<p>請使用您提交申請時的同一個 Google 帳號登入。</p>",
    `<p><a href="${escapeHtml(loginUrl)}">開啟 OaboutAI 並登入</a></p>`
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
        to: [requesterEmail],
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
