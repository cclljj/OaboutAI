"use strict";

const BOOTSTRAP_ADMIN_EMAIL = "cclljj@gmail.com";

function jsonError(res, statusCode, error, detail) {
  const payload = { ok: false, error };
  if (detail) payload.detail = String(detail).slice(0, 500);
  res.status(statusCode).setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(payload));
}

function getEnvConfig() {
  const supabaseUrl = String(process.env.HUGO_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const anonKey = String(process.env.HUGO_SUPABASE_ANON_KEY || "").trim();
  if (!supabaseUrl || !anonKey) return null;
  return { supabaseUrl, anonKey };
}

function getBearerToken(req) {
  const raw = String(req?.headers?.authorization || req?.headers?.Authorization || "").trim();
  if (!raw) return "";
  const matched = raw.match(/^Bearer\s+(.+)$/i);
  return matched ? String(matched[1] || "").trim() : "";
}

async function supabaseAuthUser(envConfig, accessToken) {
  const response = await fetch(`${envConfig.supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: envConfig.anonKey,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return { ok: false, error: "invalid_token", detail };
  }
  const user = await response.json().catch(() => null);
  if (!user || !user.id) {
    return { ok: false, error: "invalid_token", detail: "user payload missing id" };
  }
  return { ok: true, user };
}

async function fetchAccessRequestById(envConfig, accessToken, requestId) {
  const query = new URLSearchParams();
  query.set("select", "id,requester_user_id,email,reason,status,reviewed_at,created_at");
  query.set("id", `eq.${requestId}`);
  query.set("limit", "1");
  const response = await fetch(`${envConfig.supabaseUrl}/rest/v1/access_requests?${query.toString()}`, {
    method: "GET",
    headers: {
      apikey: envConfig.anonKey,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return { ok: false, error: "access_request_lookup_failed", detail };
  }
  const rows = await response.json().catch(() => []);
  const row = Array.isArray(rows) && rows.length ? rows[0] : null;
  return { ok: true, row };
}

async function hasAdminRole(envConfig, accessToken, user) {
  const email = String(user?.email || "").trim().toLowerCase();
  if (email === BOOTSTRAP_ADMIN_EMAIL) return true;

  const query = new URLSearchParams();
  query.set("select", "user_id");
  query.set("user_id", `eq.${String(user?.id || "")}`);
  query.set("role", "eq.admin");
  query.set("limit", "1");
  const response = await fetch(`${envConfig.supabaseUrl}/rest/v1/user_roles?${query.toString()}`, {
    method: "GET",
    headers: {
      apikey: envConfig.anonKey,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) return false;
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0;
}

async function authenticateRequest(req, res) {
  const envConfig = getEnvConfig();
  if (!envConfig) {
    jsonError(res, 500, "supabase_not_configured");
    return null;
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    jsonError(res, 401, "missing_bearer_token");
    return null;
  }

  const authResult = await supabaseAuthUser(envConfig, accessToken);
  if (!authResult.ok) {
    jsonError(res, 401, authResult.error || "invalid_token", authResult.detail || "");
    return null;
  }

  return {
    envConfig,
    accessToken,
    user: authResult.user
  };
}

module.exports = {
  authenticateRequest,
  fetchAccessRequestById,
  hasAdminRole,
  jsonError
};
