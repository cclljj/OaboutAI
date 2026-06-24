"use strict";

const DEFAULT_SUBJECT = "[OaboutAI] Access approved / 存取權限已核准";
const ADMIN_FALLBACK_SUBJECT = "[OaboutAI] Manual forward needed: access approved";
const { EMAIL_RE, escapeHtml, json, normalizeEmail, safeText, sendEmail } = require("./_mailer");
const { authenticateRequest, fetchAccessRequestById, hasAdminRole, jsonError } = require("./_supabase_auth");

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

function resolveLoginUrl() {
  const fallback = "https://oaboutai.vercel.app/";
  return sanitizeSiteUrl(process.env.HUGO_SUPABASE_REDIRECT_URL || "", fallback);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  const auth = await authenticateRequest(req, res);
  if (!auth) return;

  const isAdmin = await hasAdminRole(auth.envConfig, auth.accessToken, auth.user);
  if (!isAdmin) {
    return jsonError(res, 403, "forbidden");
  }

  const adminEmail = normalizeEmail(process.env.OABOUTAI_ADMIN_NOTIFY_EMAIL || "cclljj@gmail.com");

  const body = typeof req.body === "object" && req.body ? req.body : {};
  const requestId = safeText(body.requestId, "");
  if (!requestId) {
    return jsonError(res, 400, "invalid_payload", "requestId is required");
  }

  const lookup = await fetchAccessRequestById(auth.envConfig, auth.accessToken, requestId);
  if (!lookup.ok) {
    return jsonError(res, 502, lookup.error || "access_request_lookup_failed", lookup.detail || "");
  }
  if (!lookup.row) {
    return jsonError(res, 404, "request_not_found_or_forbidden");
  }

  const requesterEmail = normalizeEmail(lookup.row.email || "");
  const reviewedAt = safeText(lookup.row.reviewed_at, new Date().toISOString());
  const status = safeText(lookup.row.status, "");
  const loginUrl = resolveLoginUrl();

  if (status !== "approved") {
    return jsonError(res, 409, "invalid_request_state", "request must be approved");
  }

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
    const sendResult = await sendEmail({
      to: [requesterEmail],
      subject: DEFAULT_SUBJECT,
      text,
      html
    });

    if (!sendResult.ok) {
      if (sendResult.skipped) {
        return json(res, 202, { ok: true, skipped: true, reason: sendResult.reason || "notification_not_configured" });
      }
      const detail = String(sendResult.detail || "");
      const lowerDetail = detail.toLowerCase();
      const restrictedByTestMode =
        lowerDetail.includes("you can only send testing emails to your own email address") ||
        lowerDetail.includes("please verify a domain at resend.com/domains") ||
        lowerDetail.includes("daily user sending limit exceeded");

      if (restrictedByTestMode && adminEmail && EMAIL_RE.test(adminEmail) && adminEmail !== requesterEmail) {
        const manualText = [
          "Automatic requester email failed because Resend is in testing mode or sender domain is not verified.",
          "Please manually forward the approval notice below to the requester.",
          "",
          `Requester email: ${requesterEmail}`,
          `Approved at: ${reviewedAt}`,
          `Login URL: ${loginUrl}`,
          "",
          "----- Forward content (EN + 中文) -----",
          "",
          text
        ].join("\n");

        const manualHtml = [
          "<p>Automatic requester email failed because Resend is in testing mode or sender domain is not verified.</p>",
          "<p>Please manually forward the approval notice below to the requester.</p>",
          "<ul>",
          `<li><strong>Requester email:</strong> ${escapeHtml(requesterEmail)}</li>`,
          `<li><strong>Approved at:</strong> ${escapeHtml(reviewedAt)}</li>`,
          `<li><strong>Login URL:</strong> <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></li>`,
          "</ul>",
          "<hr>",
          html
        ].join("");

        const fallback = await sendEmail({
          to: [adminEmail],
          subject: ADMIN_FALLBACK_SUBJECT,
          text: manualText,
          html: manualHtml
        });

        if (fallback.ok) {
          return json(res, 202, {
            ok: true,
            skipped: true,
            reason: "requester_notify_fallback_to_admin"
          });
        }
      }

      return json(res, 502, {
        ok: false,
        error: sendResult.error || "notification_send_failed",
        detail: detail.slice(0, 500)
      });
    }

    return json(res, 200, { ok: true, provider: sendResult.provider || "" });
  } catch (error) {
    return json(res, 502, {
      ok: false,
      error: "notification_request_failed",
      detail: String(error && error.message ? error.message : error).slice(0, 500)
    });
  }
};
