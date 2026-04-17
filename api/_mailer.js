"use strict";

const nodemailer = require("nodemailer");

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_RESEND_FROM = "OaboutAI <onboarding@resend.dev>";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function safeText(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
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

function getSmtpConfig() {
  const user = normalizeEmail(process.env.OABOUTAI_SMTP_USER || "");
  const pass = String(process.env.OABOUTAI_SMTP_PASS || "").trim();
  const host = safeText(process.env.OABOUTAI_SMTP_HOST, "smtp.gmail.com");
  const port = Number(process.env.OABOUTAI_SMTP_PORT || 465);
  const secure = String(process.env.OABOUTAI_SMTP_SECURE || "true").trim().toLowerCase() !== "false";
  if (!user || !pass) return null;
  return { user, pass, host, port, secure };
}

function buildFromAddress() {
  const explicit = String(process.env.OABOUTAI_MAIL_FROM || "").trim();
  if (explicit) return explicit;
  const smtp = getSmtpConfig();
  if (smtp) return `OaboutAI <${smtp.user}>`;
  return safeText(process.env.OABOUTAI_RESEND_FROM, DEFAULT_RESEND_FROM);
}

function getReplyTo() {
  const replyTo = normalizeEmail(process.env.OABOUTAI_REPLY_TO || "");
  return replyTo && EMAIL_RE.test(replyTo) ? replyTo : "";
}

async function sendViaSmtp(payload) {
  const smtp = getSmtpConfig();
  if (!smtp) return { ok: false, skipped: true, reason: "smtp_not_configured" };

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass
      }
    });
    await transporter.sendMail({
      from: buildFromAddress(),
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      replyTo: payload.replyTo || getReplyTo() || undefined
    });
    return { ok: true, provider: "smtp_gmail" };
  } catch (error) {
    return {
      ok: false,
      provider: "smtp_gmail",
      error: "smtp_send_failed",
      detail: String(error && error.message ? error.message : error).slice(0, 500)
    };
  }
}

async function sendViaResend(payload) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = buildFromAddress();
  if (!apiKey) return { ok: false, skipped: true, reason: "resend_not_configured" };

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        reply_to: payload.replyTo || getReplyTo() || undefined
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      return { ok: false, provider: "resend", error: "resend_failed", detail: detail.slice(0, 500) };
    }
    return { ok: true, provider: "resend" };
  } catch (error) {
    return {
      ok: false,
      provider: "resend",
      error: "resend_request_failed",
      detail: String(error && error.message ? error.message : error).slice(0, 500)
    };
  }
}

async function sendEmail(payload) {
  const smtpResult = await sendViaSmtp(payload);
  if (smtpResult.ok) return smtpResult;

  const resendResult = await sendViaResend(payload);
  if (resendResult.ok) return resendResult;

  if (smtpResult.skipped && resendResult.skipped) {
    return { ok: false, skipped: true, reason: "notification_not_configured" };
  }

  if (!smtpResult.skipped) return smtpResult;
  return resendResult;
}

module.exports = {
  EMAIL_RE,
  escapeHtml,
  json,
  normalizeEmail,
  safeText,
  sendEmail
};
