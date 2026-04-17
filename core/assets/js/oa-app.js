(() => {
  /**
   * @typedef {Object} AuthUser
   * @property {string} id
   * @property {string} [email]
   * @property {Object} [user_metadata]
   */

  const BOOTSTRAP_ADMIN_EMAIL = "cclljj@gmail.com";

  const DEFAULT_LABELS = {
    loading: "Loading protected content...",
    loginRequired: "Please sign in with Google to view this content.",
    configMissing: "Supabase is not configured yet. Please set SUPABASE_URL and SUPABASE_ANON_KEY.",
    signIn: "Sign in with Google",
    signOut: "Sign out",
    signedInAs: "Signed in as",
    myFavorites: "My Favorites",
    adminPanel: "Admin",
    sourceDate: "Source date",
    submissionDate: "Submitted on",
    sourceType: "Source type",
    sourceUrl: "Source URL",
    keywords: "Keywords",
    primaryTopic: "Primary topic",
    otherTopics: "Other topics",
    keywordLabel: "Keyword",
    typeLabel: "Type",
    executiveSummary: "Executive Summary",
    detailedNotes: "Detailed Notes",
    takeAway: "Take-away",
    attachments: "Attachments",
    noEntriesYet: "No entries yet.",
    noResults: "No matching entries found.",
    searchPlaceholder: "Search all entries...",
    searchTypeToStart: "Start typing to search.",
    save: "Save",
    saved: "Saved",
    delete: "Delete",
    deleteConfirm: "Are you sure you want to delete this entry?",
    deleteConfirmFinal: "Please confirm again. This action cannot be undone.",
    deleteSuccess: "Entry deleted.",
    deleteError: "Unable to delete this entry right now.",
    remove: "Remove",
    openArticle: "Open",
    sortBy: "Sort by",
    sortOrder: "Order",
    sortNewestFirst: "Newest to oldest",
    sortOldestFirst: "Oldest to newest",
    itemsPerPage: "Per page",
    previousPage: "Previous",
    nextPage: "Next",
    pageStatus: "Page %d of %d",
    accessApprovalRequired: "Access approval required",
    accessApprovalDescription:
      "Your Google account is signed in, but this archive is limited to approved users.",
    accessRequestReasonLabel: "Why do you need access?",
    accessRequestReasonPlaceholder:
      "Please briefly describe your role and why you need access to this archive.",
    submitAccessRequest: "Submit request",
    accessPendingMessage: "Your request is pending review.",
    accessDeniedMessage: "Your access request still needs review. You can update your reason and submit again below.",
    accessApprovedMessage: "Your access has been approved.",
    requestStatusPending: "Pending",
    requestStatusApproved: "Approved",
    requestStatusDenied: "Denied",
    requestSubmittedAt: "Submitted",
    requestReviewedAt: "Reviewed",
    requestReason: "Reason",
    requestStatus: "Status",
    requestActions: "Actions",
    requestRequester: "Requester",
    requestLoginHint: "Sign in to request access.",
    requestAdminHint: "Need access to protected content? Submit a request after signing in.",
    requestSubmitSuccess: "Request submitted.",
    requestSubmitError: "Unable to submit the request right now.",
    reasonRequired: "Please enter a reason before submitting.",
    adminOnly: "Admins only",
    adminUnauthorized: "You do not have permission to view this page.",
    adminPendingRequests: "Pending access requests",
    adminNoPendingRequests: "No pending access requests.",
    adminAllowlist: "Allowlist",
    adminAllowlistEmpty: "No allowlist entries yet.",
    adminAllowlistPlaceholder: "user@example.com",
    adminAddAllowlist: "Add to allowlist",
    adminAdmins: "Current admins",
    adminNoAdmins: "No admins found.",
    adminKnownUsers: "Existing users",
    adminNoKnownUsers: "No signed-in users yet.",
    adminApprove: "Approve",
    adminDeny: "Deny",
    adminMakeAdmin: "Make admin",
    adminRemoveAdmin: "Remove admin",
    adminRefresh: "Refresh",
    adminBootstrap: "Bootstrap admin",
    adminLastSeen: "Last seen",
    adminAccessMode: "Access path",
    adminAccessModeAllowlist: "Allowlisted",
    adminAccessModeRequest: "Requested",
    adminDashboardDescription: "Review access requests, maintain the allowlist, and manage admins.",
    adminExplicitRole: "Explicit admin",
    adminEmail: "Email",
    adminDisplayName: "Name",
    adminNoDisplayName: "Unnamed user",
    adminDeletionLogs: "Deletion logs",
    adminNoDeletionLogs: "No deletion logs yet.",
    adminDeletedAt: "Deleted at",
    adminDeletedBy: "Deleted by",
    adminDeletedEntry: "Entry",
    adminDeleteUser: "Delete user",
    adminDeleteUserConfirm: "Are you sure you want to remove this user profile from the app directory?",
    adminDeleteUserConfirmFinal: "Please confirm again. The user can be added back automatically after signing in again.",
    adminDeleteUserBlocked: "You cannot delete your own account or the bootstrap admin from this list.",
    adminActionSuccess: "Saved.",
    adminActionError: "Unable to save that change right now.",
    adminTabOverview: "Overview",
    adminTabAccess: "Access",
    adminTabUsers: "Users",
    adminTabContent: "Content",
    adminSystemUsage: "System usage",
    adminTotalArticles: "Total articles",
    adminTotalUsers: "Total users",
    adminTotalAdmins: "Total admins",
    adminActiveUsers7d: "Active users (7 days)",
    adminLoginEvents7d: "Login events (7 days)",
    adminLoginEventsUnavailable: "Login event tracking is not enabled yet (table `login_events`).",
    adminArticlesDaily: "Daily new articles (30 days)",
    adminUsersDaily: "Daily new users (30 days)",
    adminLoginsDaily: "Daily logins (30 days)",
    adminArticlesByType: "Articles by type",
    adminArticlesByKeyword: "Top keywords",
    adminStatDate: "Date",
    adminStatCount: "Count",
    adminStatName: "Name",
    adminStatNone: "No data yet."
  };

  const SORT_BY_KEY = "sort_by";
  const SORT_ORDER_KEY = "sort_order";
  const PAGE_SIZE_KEY = "page_size";
  const PAGE_KEY = "page";
  const DEFAULT_SORT_BY = "source_date";
  const DEFAULT_SORT_ORDER = "desc";
  const DEFAULT_PAGE_SIZE = 20;
  const DEFAULT_PAGE = 1;
  const MONTH_KEY = "month";
  const VALID_SORT_BY = new Set(["source_date", "submission_date"]);
  const VALID_SORT_ORDER = new Set(["asc", "desc"]);
  const VALID_PAGE_SIZES = new Set([20, 50, 100]);
  const ARTICLE_LIST_FIELDS = [
    "slug",
    "language",
    "title",
    "source_url",
    "source_type",
    "source_date",
    "submission_date",
    "executive_summary",
    "keywords",
    "primary_topic",
    "topics",
    "attachments"
  ].join(",");
  const ARTICLE_DETAIL_FIELDS = [
    ARTICLE_LIST_FIELDS,
    "detailed_notes",
    "takeaway_html"
  ].join(",");

  function normalizeLang(value) {
    const lower = String(value || "en").toLowerCase();
    if (lower.startsWith("zh")) return "zh-tw";
    return "en";
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function parseJsonAttr(value, fallback) {
    if (!value) return fallback;
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "string") {
        return JSON.parse(parsed);
      }
      return parsed;
    } catch (_error) {
      return fallback;
    }
  }

  function getKeywordCatalog() {
    const node = document.getElementById("oa-keyword-catalog");
    const parsed = node ? parseJsonAttr(node.textContent, []) : [];
    return Array.isArray(parsed) ? parsed : [];
  }

  function normalizeKeywordToken(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function buildKeywordAliasMap(catalog) {
    const aliasMap = new Map();
    const rows = Array.isArray(catalog) ? catalog : [];
    for (const row of rows) {
      const id = normalizeKeywordToken(row?.id || "");
      if (!id) continue;
      const aliases = [];
      aliases.push(id);
      if (Array.isArray(row?.aliases)) aliases.push(...row.aliases);
      if (row?.label && typeof row.label === "object") aliases.push(...Object.values(row.label));

      for (const alias of aliases) {
        const key = normalizeKeywordToken(alias);
        if (!key || aliasMap.has(key)) continue;
        aliasMap.set(key, id);
      }
    }
    return aliasMap;
  }

  function canonicalizeKeyword(value, aliasMap) {
    const token = normalizeKeywordToken(value);
    if (!token) return "";
    if (aliasMap && aliasMap.has(token)) return aliasMap.get(token) || token;
    if (aliasMap instanceof Map) {
      const variants = [
        token.replace(/[-_]+/g, " "),
        token.replace(/\s+/g, "-"),
        token.replace(/\s+/g, "_")
      ];
      for (const variant of variants) {
        const normalized = normalizeKeywordToken(variant);
        if (!normalized) continue;
        if (aliasMap.has(normalized)) return aliasMap.get(normalized) || normalized;
      }
    }
    return token;
  }

  function collectKeywordTokens(value, output = []) {
    if (value == null) return output;
    if (Array.isArray(value)) {
      for (const item of value) {
        collectKeywordTokens(item, output);
      }
      return output;
    }
    const valueType = typeof value;
    if (valueType === "string" || valueType === "number") {
      output.push(String(value));
      return output;
    }
    if (valueType !== "object") return output;

    const row = /** @type {Record<string, unknown>} */ (value);
    const directKeys = ["id", "key", "slug", "value", "name", "keyword"];
    for (const key of directKeys) {
      const candidate = row[key];
      if (typeof candidate === "string" || typeof candidate === "number") {
        output.push(String(candidate));
      }
    }
    if (typeof row.label === "string" || typeof row.label === "number") {
      output.push(String(row.label));
    } else if (row.label && typeof row.label === "object") {
      for (const candidate of Object.values(/** @type {Record<string, unknown>} */ (row.label))) {
        if (typeof candidate === "string" || typeof candidate === "number") {
          output.push(String(candidate));
        }
      }
    }
    return output;
  }

  function normalizeKeywords(values, aliasMap) {
    const rawKeywords = collectKeywordTokens(values, []);
    if (!rawKeywords.length) return [];
    const output = [];
    const seen = new Set();
    for (const rawValue of rawKeywords) {
      const normalized = canonicalizeKeyword(rawValue, aliasMap);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      output.push(normalized);
    }
    return output;
  }

  function normalizeArticleRecord(record, aliasMap) {
    if (!record || typeof record !== "object") return record;
    return {
      ...record,
      keywords: normalizeKeywords(record.keywords, aliasMap)
    };
  }

  function getLabels() {
    const node = document.getElementById("oa-labels");
    const custom = node ? parseJsonAttr(node.textContent, {}) : {};
    return { ...DEFAULT_LABELS, ...custom };
  }

  function parseDate(value) {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function byNewest(a, b) {
    return parseDate(b.source_date || b.submission_date) - parseDate(a.source_date || a.submission_date);
  }

  function normalize(value, valid, fallback) {
    return valid.has(value) ? value : fallback;
  }

  function normalizePageSize(value) {
    const parsed = Number.parseInt(String(value || ""), 10);
    return VALID_PAGE_SIZES.has(parsed) ? parsed : DEFAULT_PAGE_SIZE;
  }

  function normalizePage(value) {
    const parsed = Number.parseInt(String(value || ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PAGE;
  }

  function formatPageText(template, current, total) {
    return String(template || "Page %d of %d")
      .replace("%d", String(current))
      .replace("%d", String(total));
  }

  function getListStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return {
      sortBy: normalize(params.get(SORT_BY_KEY), VALID_SORT_BY, DEFAULT_SORT_BY),
      sortOrder: normalize(params.get(SORT_ORDER_KEY), VALID_SORT_ORDER, DEFAULT_SORT_ORDER),
      pageSize: normalizePageSize(params.get(PAGE_SIZE_KEY)),
      page: normalizePage(params.get(PAGE_KEY))
    };
  }

  function updateListStateInUrl(state) {
    const url = new URL(window.location.href);
    url.searchParams.set(SORT_BY_KEY, state.sortBy);
    url.searchParams.set(SORT_ORDER_KEY, state.sortOrder);
    url.searchParams.set(PAGE_SIZE_KEY, String(state.pageSize));
    url.searchParams.set(PAGE_KEY, String(state.page));
    window.history.replaceState({}, "", url);
  }

  function sortRecords(records, state) {
    const direction = state.sortOrder === "asc" ? 1 : -1;
    const primaryField = state.sortBy === "submission_date" ? "submission_date" : "source_date";
    return [...records].sort((a, b) => {
      const aDate = parseDate(a[primaryField] || a.source_date || a.submission_date);
      const bDate = parseDate(b[primaryField] || b.source_date || b.submission_date);
      if (aDate === bDate) {
        return String(a.slug || "").localeCompare(String(b.slug || ""));
      }
      return aDate < bDate ? -1 * direction : 1 * direction;
    });
  }

  function paginateRecords(records, state) {
    const totalPages = Math.max(1, Math.ceil(records.length / state.pageSize));
    const safePage = Math.min(Math.max(state.page, 1), totalPages);
    const start = (safePage - 1) * state.pageSize;
    return {
      page: safePage,
      totalPages,
      visible: records.slice(start, start + state.pageSize)
    };
  }

  function controlsTemplate(labels) {
    return `
      <section class="oa-sort-controls" data-oa-list-controls>
        <label class="oa-sort-label">
          ${escapeHtml(labels.sortBy)}
          <select class="oa-sort-select" data-oa-sort-by>
            <option value="source_date">${escapeHtml(labels.sourceDate)}</option>
            <option value="submission_date">${escapeHtml(labels.submissionDate)}</option>
          </select>
        </label>
        <label class="oa-sort-label">
          ${escapeHtml(labels.sortOrder)}
          <select class="oa-sort-select" data-oa-sort-order>
            <option value="desc">${escapeHtml(labels.sortNewestFirst)}</option>
            <option value="asc">${escapeHtml(labels.sortOldestFirst)}</option>
          </select>
        </label>
        <label class="oa-sort-label">
          ${escapeHtml(labels.itemsPerPage)}
          <select class="oa-sort-select" data-oa-page-size>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
      </section>
      <div class="oa-entry-list" data-oa-list-content></div>
      <nav class="oa-pagination" data-oa-pagination>
        <button class="oa-page-btn" type="button" data-oa-page-prev>${escapeHtml(labels.previousPage)}</button>
        <span class="oa-page-status" data-oa-page-status>${escapeHtml(labels.pageStatus)}</span>
        <button class="oa-page-btn" type="button" data-oa-page-next>${escapeHtml(labels.nextPage)}</button>
      </nav>
    `;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function buildChip(text, tone) {
    const toneClass = tone ? ` oa-chip-${tone}` : "";
    return `<span class="oa-chip${toneClass}">${escapeHtml(text)}</span>`;
  }

  function buildChipLink(text, href, tone) {
    const toneClass = tone ? ` oa-chip-${tone}` : "";
    return `<a class="oa-chip oa-chip-link${toneClass}" href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;
  }

  function articleHref(slug) {
    const encoded = encodeURIComponent(String(slug || ""));
    const currentLang = normalizeLang(document.documentElement.lang);
    const base = currentLang === "zh-tw" ? "/zh-tw/entry/" : "/entry/";
    return `${base}${encoded}/`;
  }

  function languagePath(path) {
    const currentLang = normalizeLang(document.documentElement.lang);
    const clean = String(path || "").replace(/^\/+/, "");
    return currentLang === "zh-tw" ? `/zh-tw/${clean}` : `/${clean}`;
  }

  function encodePathSegment(value) {
    return encodeURIComponent(String(value || "").trim());
  }

  function topicHref(topicId) {
    return languagePath(`topics/${encodePathSegment(topicId)}/`);
  }

  function termHref(termType, termValue) {
    return languagePath(`${encodePathSegment(termType)}/${encodePathSegment(termValue)}/`);
  }

  function filteredItemsHref(filters) {
    const url = new URL(languagePath("items/"), window.location.origin);
    for (const [key, value] of Object.entries(filters || {})) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
    return `${url.pathname}${url.search}`;
  }

  function normalizeArchiveMonth(value) {
    const token = String(value || "").trim();
    if (!/^\d{4}-\d{2}$/.test(token)) return "";
    const year = Number.parseInt(token.slice(0, 4), 10);
    const month = Number.parseInt(token.slice(5, 7), 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return "";
    return token;
  }

  function nextArchiveMonth(value) {
    const monthKey = normalizeArchiveMonth(value);
    if (!monthKey) return "";
    const year = Number.parseInt(monthKey.slice(0, 4), 10);
    const month = Number.parseInt(monthKey.slice(5, 7), 10);
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = String(month === 12 ? 1 : month + 1).padStart(2, "0");
    return `${nextYear}-${nextMonth}`;
  }

  function archiveMonthlyHref(month) {
    const url = new URL(languagePath("archive/monthly/"), window.location.origin);
    const normalized = normalizeArchiveMonth(month);
    if (normalized) {
      url.searchParams.set(MONTH_KEY, normalized);
    }
    return `${url.pathname}${url.search}`;
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString();
  }

  function formatDateOnly(value) {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      const token = String(value).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(token) ? token : "";
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function buildRecentDailyCounts(values, days = 30) {
    const counts = new Map();
    const now = new Date();
    for (let i = 0; i < days; i += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const key = formatDateOnly(date.toISOString());
      if (key) counts.set(key, 0);
    }
    for (const value of values) {
      const key = formatDateOnly(value);
      if (!key || !counts.has(key)) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([date, count]) => ({ date, count }));
  }

  function buildTopCounts(values, limit = 12) {
    const counts = new Map();
    for (const raw of values) {
      const key = String(raw || "").trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
      })
      .slice(0, limit);
  }

  function getUserProfile(user) {
    const metadata = user?.user_metadata || {};
    const email = normalizeEmail(user?.email || metadata.email || "");
    const displayName = String(metadata.full_name || metadata.name || metadata.user_name || email || "").trim();
    const avatar = String(metadata.avatar_url || metadata.picture || "").trim();
    return {
      email,
      displayName,
      avatar
    };
  }

  function getInitials(value) {
    const words = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return "U";
    return words
      .slice(0, 2)
      .map((word) => word[0] || "")
      .join("")
      .toUpperCase();
  }

  function renderAvatar(profile, sizeClass) {
    const label = profile.displayName || profile.email || "User";
    const initials = getInitials(label);
    const avatarSrc = sanitizeImageSrc(profile.avatar);
    if (avatarSrc) {
      return `<img class="oa-account-avatar ${sizeClass || ""}" src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(label)}" data-oa-avatar-img data-oa-avatar-initials="${escapeHtml(initials)}">`;
    }
    return `<span class="oa-account-avatar oa-account-avatar-fallback ${sizeClass || ""}" aria-hidden="true">${escapeHtml(initials)}</span>`;
  }

  function bindAvatarFallbacks(scope) {
    const root = scope && typeof scope.querySelectorAll === "function" ? scope : document;
    root.querySelectorAll("img[data-oa-avatar-img]").forEach((img) => {
      if (img.dataset.oaAvatarBound === "true") return;
      img.dataset.oaAvatarBound = "true";
      const initials = String(img.dataset.oaAvatarInitials || "U").trim() || "U";
      const swapToFallback = () => {
        if (!img.isConnected) return;
        const fallback = document.createElement("span");
        const sizeClass = img.classList.contains("oa-account-avatar-sm") ? " oa-account-avatar-sm" : "";
        fallback.className = `oa-account-avatar oa-account-avatar-fallback${sizeClass}`;
        fallback.setAttribute("aria-hidden", "true");
        fallback.textContent = initials;
        img.replaceWith(fallback);
      };
      img.addEventListener("error", swapToFallback, { once: true });
      if (img.complete && img.naturalWidth === 0) {
        swapToFallback();
      }
    });
  }

  function favoriteButton(slug, isSaved, labels) {
    const text = isSaved ? labels.saved : labels.save;
    return `<button class="oa-favorite-btn ${isSaved ? "is-saved" : ""}" type="button" data-oa-favorite-toggle data-slug="${escapeHtml(slug)}">${escapeHtml(text)}</button>`;
  }

  function deleteButton(record, labels, options = {}) {
    if (!options.canDelete) return "";
    return `<button class="oa-delete-btn" type="button" data-oa-article-delete data-slug="${escapeHtml(record.slug)}" data-language="${escapeHtml(record.language || "")}" data-title="${escapeHtml(record.title || record.slug)}">${escapeHtml(labels.delete)}</button>`;
  }

  function renderCard(record, labels, favoritesSet, options = {}) {
    const isSaved = favoritesSet.has(record.slug);
    const topicList = [];
    if (record.primary_topic) topicList.push(record.primary_topic);
    if (Array.isArray(record.topics)) topicList.push(...record.topics);

    const chips = [
      buildChip(`${labels.sourceDate} ${record.source_date || "-"}`),
      buildChip(`${labels.submissionDate} ${record.submission_date || "-"}`),
      buildChip(record.source_type || "-")
    ];
    for (const topic of topicList.slice(0, 3)) {
      chips.push(buildChip(topic));
    }

    return `
      <article class="oa-entry-card" data-oa-entry-card data-slug="${escapeHtml(record.slug)}" data-language="${escapeHtml(record.language || "")}">
        <div class="oa-entry-card-head">
          <h3><a class="oa-entry-title" href="${articleHref(record.slug)}">${escapeHtml(record.title || record.slug)}</a></h3>
          <div class="oa-entry-actions">
            ${favoriteButton(record.slug, isSaved, labels)}
            ${deleteButton(record, labels, options)}
          </div>
        </div>
        <p class="oa-meta">${chips.join("")}</p>
        <p class="oa-summary">${escapeHtml(record.executive_summary || "")}</p>
      </article>
    `;
  }

  function renderGuestState(root, labels) {
    root.innerHTML = `
      <section class="oa-auth-gate">
        <h2 class="oa-section-title">${escapeHtml(labels.loginRequired)}</h2>
        <p class="oa-page-subtitle">${escapeHtml(labels.requestLoginHint)}</p>
        <button class="oa-btn oa-btn-primary" type="button" data-oa-sign-in>${escapeHtml(labels.signIn)}</button>
      </section>
    `;
  }

  function renderUnauthorizedState(root, labels) {
    root.innerHTML = `
      <section class="oa-auth-gate">
        <h2 class="oa-section-title">${escapeHtml(labels.adminOnly)}</h2>
        <p class="oa-page-subtitle">${escapeHtml(labels.adminUnauthorized)}</p>
      </section>
    `;
  }

  function renderLoading(root, labels) {
    root.innerHTML = `<p class="oa-page-subtitle">${escapeHtml(labels.loading)}</p>`;
  }

  function updateItemsListHeading(root, filters, labels, keywordAliasMap) {
    const shell = root.closest(".oa-shell");
    const titleNode = shell ? shell.querySelector(".oa-page-title") : null;
    if (!titleNode) return;
    if (!titleNode.dataset.oaBaseTitle) {
      titleNode.dataset.oaBaseTitle = String(titleNode.textContent || "").trim();
    }
    const baseTitle = titleNode.dataset.oaBaseTitle;
    titleNode.textContent = baseTitle;

    if (filters.termType === "keywords" && filters.termValue) {
      const canonicalKeyword = canonicalizeKeyword(filters.termValue, keywordAliasMap);
      titleNode.textContent = `${labels.keywordLabel}: ${canonicalKeyword || filters.termValue}`;
      return;
    }

    if (filters.termType === "types" && filters.termValue) {
      titleNode.textContent = `${labels.typeLabel}: ${filters.termValue}`;
      return;
    }

    if (filters.view === "archive" && filters.month) {
      titleNode.textContent = `${baseTitle} · ${filters.month}`;
      return;
    }
  }

  function renderList(root, records, labels, favoritesSet, options = {}) {
    if (!records.length) {
      root.innerHTML = `<p>${escapeHtml(labels.noEntriesYet)}</p>`;
      return;
    }
    root.innerHTML = records.map((r) => renderCard(r, labels, favoritesSet, options)).join("\n");
  }

  function renderArchive(root, records, labels, favoritesSet, options = {}) {
    if (!records.length) {
      root.innerHTML = `<p>${escapeHtml(labels.noEntriesYet)}</p>`;
      return;
    }

    const groups = new Map();
    for (const record of records) {
      const key = (record.source_date || "").slice(0, 7) || "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    }

    const sections = Array.from(groups.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([month, entries]) => `
        <section class="oa-section">
          <h2 class="oa-section-title">${escapeHtml(month)} ${buildChip(String(entries.length))}</h2>
          <div class="oa-entry-list">
            ${entries.map((r) => renderCard(r, labels, favoritesSet, options)).join("\n")}
          </div>
        </section>
      `);

    root.innerHTML = sections.join("\n");
  }

  function renderArchiveMonthIndex(root, records, labels) {
    const groups = new Map();
    for (const record of records) {
      const month = normalizeArchiveMonth((record.source_date || "").slice(0, 7));
      if (!month) continue;
      groups.set(month, (groups.get(month) || 0) + 1);
    }

    const months = Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
    if (!months.length) {
      root.innerHTML = `<p>${escapeHtml(labels.noEntriesYet)}</p>`;
      return;
    }

    root.innerHTML = `
      <div class="oa-term-grid">
        ${months.map(([month, count]) => `
          <a class="oa-term-card" href="${escapeHtml(archiveMonthlyHref(month))}">
            <span class="oa-term-label">${escapeHtml(month)}</span>
            <span class="oa-term-count">${escapeHtml(String(count))}</span>
          </a>
        `).join("")}
      </div>
    `;
  }

  function renderSingle(root, record, labels, favoritesSet) {
    if (!record) {
      root.innerHTML = `<p>${escapeHtml(labels.noEntriesYet)}</p>`;
      return;
    }

    const isSaved = favoritesSet.has(record.slug);
    const keywords = Array.isArray(record.keywords) ? record.keywords : [];
    const topics = Array.isArray(record.topics) ? record.topics : [];
    const attachments = Array.isArray(record.attachments) ? record.attachments : [];
    const executiveSummary = formatMarkdownContent(record.executive_summary);
    const detailedNotes = formatMarkdownContent(record.detailed_notes);
    const takeAway = formatMarkdownContent(record.takeaway_html, { stripH2: true });
    const sourceType = String(record.source_type || "").trim();
    const primaryTopic = String(record.primary_topic || "").trim();
    const sourceHref = sanitizeHref(record.source_url || "");
    const sourceUrlText = escapeHtml(record.source_url || "-");

    root.innerHTML = `
      <article class="oa-single">
        <div class="oa-entry-card-head oa-single-head">
          <h1 class="oa-page-title">${escapeHtml(record.title || record.slug)}</h1>
          ${favoriteButton(record.slug, isSaved, labels)}
        </div>
        <dl class="oa-metadata oa-card">
          <dt>${escapeHtml(labels.sourceUrl)}</dt>
          <dd>${sourceHref ? `<a href="${escapeHtml(sourceHref)}" target="_blank" rel="noreferrer">${sourceUrlText}</a>` : sourceUrlText}</dd>
          <dt>${escapeHtml(labels.sourceType)}</dt>
          <dd>${sourceType ? buildChipLink(sourceType, filteredItemsHref({ term_type: "types", term_value: sourceType })) : "-"}</dd>
          <dt>${escapeHtml(labels.sourceDate)}</dt>
          <dd>${escapeHtml(record.source_date || "-")}</dd>
          <dt>${escapeHtml(labels.submissionDate)}</dt>
          <dd>${escapeHtml(record.submission_date || "-")}</dd>
          <dt>${escapeHtml(labels.primaryTopic)}</dt>
          <dd>${primaryTopic ? buildChipLink(primaryTopic, topicHref(primaryTopic)) : "-"}</dd>
          <dt>${escapeHtml(labels.otherTopics)}</dt>
          <dd class="oa-chip-wrap">${topics.length ? topics.map((topic) => buildChipLink(topic, topicHref(topic))).join("") : "-"}</dd>
          <dt>${escapeHtml(labels.keywords)}</dt>
          <dd class="oa-chip-wrap">${keywords.length ? keywords.map((k) => buildChipLink(k, filteredItemsHref({ term_type: "keywords", term_value: k }))).join("") : "-"}</dd>
        </dl>
        <section class="oa-section oa-card">
          <h2 class="oa-section-title">${escapeHtml(labels.executiveSummary)}</h2>
          <div class="oa-markdown">${executiveSummary || `<p>${escapeHtml(record.executive_summary || "")}</p>`}</div>
        </section>
        <section class="oa-section oa-card">
          <h2 class="oa-section-title">${escapeHtml(labels.detailedNotes)}</h2>
          <div class="oa-markdown">${detailedNotes || `<p>${escapeHtml(record.detailed_notes || "")}</p>`}</div>
        </section>
        ${takeAway ? `<section class="oa-section oa-card"><h2 class="oa-section-title">${escapeHtml(labels.takeAway)}</h2><div class="oa-markdown oa-takeaway">${takeAway}</div></section>` : ""}
        ${attachments.length ? `<section class="oa-section oa-card"><h2 class="oa-section-title">${escapeHtml(labels.attachments)}</h2><ul>${attachments.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul></section>` : ""}
      </article>
    `;
  }

  function formatMarkdownContent(value, options = {}) {
    const raw = String(value || "");
    const cleaned = raw
      .split(/\r?\n/)
      .filter((line) => !(options.stripH2 && /^\s*##\s+/.test(line)))
      .join("\n")
      .trim();

    if (!cleaned) return "";

    const blocks = [];
    let paragraphLines = [];
    let listType = "";
    let listItems = [];

    function flushParagraph() {
      if (!paragraphLines.length) return;
      const text = paragraphLines.join(" ").trim();
      if (text) {
        blocks.push(`<p>${renderInlineMarkdown(text)}</p>`);
      }
      paragraphLines = [];
    }

    function flushList() {
      if (!listItems.length || !listType) return;
      blocks.push(`<${listType}>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</${listType}>`);
      listItems = [];
      listType = "";
    }

    for (const line of cleaned.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        // Keep the current list open across blank lines so ordered numbering
        // does not reset to "1." for every item.
        if (!listType) {
          flushList();
        }
        continue;
      }

      const unorderedMatch = trimmed.match(/^[-*•]\s+(.*)$/);
      const orderedMatch = trimmed.match(/^\d+[.)]\s+(.*)$/);
      if (unorderedMatch || orderedMatch) {
        flushParagraph();
        const nextListType = unorderedMatch ? "ul" : "ol";
        if (listType && listType !== nextListType) {
          flushList();
        }
        listType = nextListType;
        listItems.push((unorderedMatch || orderedMatch)[1].trim());
        continue;
      }

      flushList();
      paragraphLines.push(trimmed);
    }

    flushParagraph();
    flushList();
    return blocks.join("");
  }

  function sanitizeHref(rawHref) {
    const trimmed = String(rawHref || "").trim();
    if (!trimmed) return "";
    if (/^mailto:/i.test(trimmed)) return trimmed;
    try {
      const parsed = new URL(trimmed, window.location.origin);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch (_error) {
      return "";
    }
    return "";
  }

  function sanitizeImageSrc(rawSrc) {
    const trimmed = String(rawSrc || "").trim();
    if (!trimmed) return "";
    if (/^data:image\//i.test(trimmed)) return trimmed;
    if (/^blob:/i.test(trimmed)) return trimmed;
    try {
      const parsed = new URL(trimmed, window.location.origin);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch (_error) {
      return "";
    }
    return "";
  }

  function sanitizeSameOriginRedirect(rawRedirect) {
    const fallback = window.location.href;
    const trimmed = String(rawRedirect || "").trim();
    if (!trimmed) return fallback;
    try {
      const parsed = new URL(trimmed, window.location.origin);
      if (parsed.origin !== window.location.origin) return fallback;
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return fallback;
      return parsed.href;
    } catch (_error) {
      return fallback;
    }
    return fallback;
  }

  function renderInlineMarkdown(value) {
    const source = String(value || "");
    const tokenPattern = /(`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_)/g;
    let output = "";
    let lastIndex = 0;

    for (const match of source.matchAll(tokenPattern)) {
      const index = match.index || 0;
      output += escapeHtml(source.slice(lastIndex, index));

      if (match[2] != null) {
        output += `<code>${escapeHtml(match[2])}</code>`;
      } else if (match[3] != null && match[4] != null) {
        const href = sanitizeHref(match[4]);
        const text = renderInlineMarkdown(match[3]);
        output += href
          ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${text}</a>`
          : text;
      } else if (match[5] != null || match[6] != null) {
        output += `<strong>${renderInlineMarkdown(match[5] || match[6] || "")}</strong>`;
      } else if (match[7] != null || match[8] != null) {
        output += `<em>${renderInlineMarkdown(match[7] || match[8] || "")}</em>`;
      }

      lastIndex = index + match[0].length;
    }

    output += escapeHtml(source.slice(lastIndex));
    return output;
  }

  function renderSingleUnavailable(root, labels, slug, reason) {
    const safeSlug = escapeHtml(slug || "-");
    const safeReason = escapeHtml(reason || "");
    root.innerHTML = `
      <section class="oa-section oa-card">
        <h2 class="oa-section-title">${escapeHtml(labels.noEntriesYet)}</h2>
        <p>Slug: <code>${safeSlug}</code></p>
        ${safeReason ? `<p>${safeReason}</p>` : ""}
      </section>
    `;
  }

  function renderAccessRequestState(root, labels, access) {
    const latestRequest = access.latestRequest || null;
    const canSubmit = !latestRequest || latestRequest.status === "denied";
    const statusLabel = latestRequest
      ? latestRequest.status === "approved"
        ? labels.requestStatusApproved
        : latestRequest.status === "denied"
          ? labels.requestStatusPending
          : labels.requestStatusPending
      : "";
    const message = latestRequest
      ? latestRequest.status === "approved"
        ? labels.accessApprovedMessage
        : latestRequest.status === "denied"
          ? labels.accessDeniedMessage
          : labels.accessPendingMessage
      : labels.accessApprovalDescription;
    const statusTone = latestRequest
      ? latestRequest.status === "approved"
        ? "success"
        : latestRequest.status === "denied"
          ? "warning"
          : "warning"
      : "";

    root.innerHTML = `
      <section class="oa-auth-gate oa-access-gate">
        <div class="oa-access-gate-head">
          <div>
            <h2 class="oa-section-title">${escapeHtml(labels.accessApprovalRequired)}</h2>
            <p class="oa-page-subtitle">${escapeHtml(message)}</p>
          </div>
          ${statusLabel ? buildChip(statusLabel, statusTone) : ""}
        </div>
        <div class="oa-access-meta">
          <p><strong>${escapeHtml(labels.signedInAs)}</strong> ${escapeHtml(access.profile.email || "-")}</p>
          ${latestRequest ? `<p><strong>${escapeHtml(labels.requestSubmittedAt)}</strong> ${escapeHtml(formatDateTime(latestRequest.created_at))}</p>` : ""}
          ${latestRequest?.reviewed_at && latestRequest.status !== "denied" ? `<p><strong>${escapeHtml(labels.requestReviewedAt)}</strong> ${escapeHtml(formatDateTime(latestRequest.reviewed_at))}</p>` : ""}
          ${latestRequest?.reason ? `<p><strong>${escapeHtml(labels.requestReason)}</strong> ${escapeHtml(latestRequest.reason)}</p>` : ""}
        </div>
        ${canSubmit ? `
          <form class="oa-stack" data-oa-access-request-form>
            <label class="oa-form-label" for="oa-access-reason">
              ${escapeHtml(labels.accessRequestReasonLabel)}
            </label>
            <textarea
              id="oa-access-reason"
              class="oa-textarea"
              name="reason"
              rows="5"
              placeholder="${escapeHtml(labels.accessRequestReasonPlaceholder)}"
              required
            ></textarea>
            <div class="oa-form-actions">
              <button class="oa-btn oa-btn-primary" type="submit">${escapeHtml(labels.submitAccessRequest)}</button>
            </div>
            <p class="oa-inline-feedback" data-oa-feedback></p>
          </form>
        ` : ""}
      </section>
    `;
  }

  function renderAdminStatsTable(labels, rows, nameLabel) {
    if (!rows.length) {
      return `<p>${escapeHtml(labels.adminStatNone)}</p>`;
    }
    const nameHeader = nameLabel || labels.adminStatName;
    return `
      <div class="oa-admin-table-wrap">
        <table class="oa-admin-table">
          <thead>
            <tr>
              <th>${escapeHtml(nameHeader)}</th>
              <th>${escapeHtml(labels.adminStatCount)}</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${escapeHtml(row.name || row.date || "-")}</td>
                <td>${escapeHtml(String(row.count || 0))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderAdminLineChart(labels, rows, options = {}) {
    const points = Array.isArray(rows) ? rows : [];
    if (!points.length) {
      return `<p>${escapeHtml(labels.adminStatNone)}</p>`;
    }

    const width = 720;
    const height = 240;
    const margin = { top: 16, right: 18, bottom: 36, left: 58 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const values = points.map((row) => Number(row.count || 0));
    const maxValue = Math.max(...values, 1);
    const midValue = Math.round(maxValue / 2);
    const yTitle = labels.adminStatCount || "Count";

    function xAt(index) {
      if (points.length <= 1) return margin.left + (plotWidth / 2);
      return margin.left + ((plotWidth * index) / (points.length - 1));
    }

    function yAt(value) {
      return margin.top + (plotHeight - ((Number(value || 0) / maxValue) * plotHeight));
    }

    const polyline = points
      .map((row, index) => `${xAt(index).toFixed(2)},${yAt(row.count).toFixed(2)}`)
      .join(" ");

    const firstLabel = String(points[0]?.name || points[0]?.date || "-");
    const lastLabel = String(points[points.length - 1]?.name || points[points.length - 1]?.date || "-");
    const lastValue = values[values.length - 1] || 0;

    const yTicks = [
      { value: maxValue, ratio: 0 },
      { value: midValue, ratio: 0.5 },
      { value: 0, ratio: 1 }
    ];

    const gridLines = yTicks.map((tick) => {
      const y = margin.top + (plotHeight * tick.ratio);
      return `<line x1="${margin.left}" y1="${y.toFixed(2)}" x2="${(margin.left + plotWidth).toFixed(2)}" y2="${y.toFixed(2)}"></line>`;
    }).join("");

    const dots = points.map((row, index) => {
      const cx = xAt(index);
      const cy = yAt(row.count);
      const label = String(row.name || row.date || "-");
      return `
        <circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="3.2">
          <title>${escapeHtml(label)}: ${escapeHtml(String(row.count || 0))}</title>
        </circle>
      `;
    }).join("");

    const yLabels = yTicks.map((tick) => {
      const y = margin.top + (plotHeight * tick.ratio);
      return `<text class="oa-admin-line-axis-label" x="${(margin.left - 8).toFixed(2)}" y="${(y + 4).toFixed(2)}" text-anchor="end">${escapeHtml(String(tick.value))}</text>`;
    }).join("");

    return `
      <div class="oa-admin-chart-wrap">
        <svg class="oa-admin-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(options.ariaLabel || labels.adminStatCount)}">
          <g class="oa-admin-line-grid">${gridLines}</g>
          ${yLabels}
          <polyline class="oa-admin-line-path" points="${polyline}"></polyline>
          <g class="oa-admin-line-dots">${dots}</g>
          <text class="oa-admin-line-axis-title" x="${(margin.left - 44).toFixed(2)}" y="${(margin.top + (plotHeight / 2)).toFixed(2)}" transform="rotate(-90 ${(margin.left - 44).toFixed(2)} ${(margin.top + (plotHeight / 2)).toFixed(2)})">${escapeHtml(yTitle)}</text>
          <text class="oa-admin-line-label" x="${margin.left}" y="${height - 10}">${escapeHtml(firstLabel)}</text>
          <text class="oa-admin-line-label" x="${(margin.left + plotWidth).toFixed(2)}" y="${height - 10}" text-anchor="end">${escapeHtml(lastLabel)}</text>
        </svg>
        <div class="oa-admin-chart-note">${escapeHtml(labels.adminStatCount)}: ${escapeHtml(String(lastValue))} · ${escapeHtml(lastLabel)}</div>
      </div>
    `;
  }

  function renderAdminPieChart(labels, rows, options = {}) {
    const slices = (Array.isArray(rows) ? rows : []).filter((row) => Number(row.count || 0) > 0);
    if (!slices.length) {
      return `<p>${escapeHtml(labels.adminStatNone)}</p>`;
    }

    const palette = ["#0f766e", "#0ea5a2", "#14b8a6", "#2dd4bf", "#06b6d4", "#0ea5e9", "#6366f1", "#8b5cf6"];
    const total = slices.reduce((sum, row) => sum + Number(row.count || 0), 0);
    const cx = 130;
    const cy = 130;
    const radius = 100;
    let startAngle = -Math.PI / 2;

    const paths = slices.map((row, index) => {
      const value = Number(row.count || 0);
      const ratio = value / total;
      const sweep = ratio * Math.PI * 2;
      const endAngle = startAngle + sweep;
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const largeArc = sweep > Math.PI ? 1 : 0;
      const color = palette[index % palette.length];
      const path = [
        `M ${cx} ${cy}`,
        `L ${x1.toFixed(3)} ${y1.toFixed(3)}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`,
        "Z"
      ].join(" ");
      startAngle = endAngle;
      return `<path d="${path}" fill="${color}"></path>`;
    }).join("");

    const legend = slices.map((row, index) => {
      const value = Number(row.count || 0);
      const color = palette[index % palette.length];
      const name = String(row.name || row.date || "-");
      const percent = ((value / total) * 100).toFixed(1);
      return `
        <li>
          <span class="oa-admin-pie-dot" style="background:${color}"></span>
          <span class="oa-admin-pie-name">${escapeHtml(name)}</span>
          <span class="oa-admin-pie-value">${escapeHtml(String(value))} (${escapeHtml(percent)}%)</span>
        </li>
      `;
    }).join("");
    const legendClass = slices.length >= 8 ? "oa-admin-pie-legend is-multi-column" : "oa-admin-pie-legend";

    return `
      <div class="oa-admin-pie-wrap">
        <svg class="oa-admin-pie-chart" viewBox="0 0 260 260" role="img" aria-label="${escapeHtml(options.ariaLabel || labels.adminStatCount)}">
          ${paths}
          <circle cx="${cx}" cy="${cy}" r="44" fill="#fff"></circle>
          <text x="${cx}" y="${cy - 3}" text-anchor="middle" class="oa-admin-pie-center-label">Total</text>
          <text x="${cx}" y="${cy + 16}" text-anchor="middle" class="oa-admin-pie-center-value">${escapeHtml(String(total))}</text>
        </svg>
        <ul class="${legendClass}">
          ${legend}
        </ul>
      </div>
    `;
  }

  function buildAdminStats(dashboard, explicitAdminIds) {
    const articles = Array.isArray(dashboard.articles) ? dashboard.articles : [];
    const users = Array.isArray(dashboard.users) ? dashboard.users : [];
    const requests = Array.isArray(dashboard.requests) ? dashboard.requests : [];
    const loginEvents = Array.isArray(dashboard.loginEvents) ? dashboard.loginEvents : [];
    const hasLoginEvents = Boolean(dashboard.hasLoginEvents);
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const explicitAdminCount = new Set([...explicitAdminIds]).size;
    const bootstrapUser = users.find((row) => normalizeEmail(row.email) === BOOTSTRAP_ADMIN_EMAIL) || null;
    const bootstrapAlreadyCounted = bootstrapUser?.id ? explicitAdminIds.has(bootstrapUser.id) : false;
    const totalAdmins = explicitAdminCount + (bootstrapAlreadyCounted ? 0 : 1);
    const activeUsers7d = users.filter((row) => parseDate(row.last_seen_at) >= sevenDaysAgo).length;
    const loginEvents7d = loginEvents.filter((row) => parseDate(row.occurred_at) >= sevenDaysAgo).length;
    const pendingRequests = requests.filter((row) => row.status === "pending").length;

    const articleDates = articles.map((row) => row.submission_date || row.created_at).filter(Boolean);
    const userDates = users.map((row) => row.created_at).filter(Boolean);
    const loginDates = loginEvents.map((row) => row.occurred_at).filter(Boolean);
    const articleTypes = articles.map((row) => row.source_type).filter(Boolean);
    const articleKeywords = [];
    for (const row of articles) {
      const keywords = Array.isArray(row.keywords) ? row.keywords : [];
      for (const keyword of keywords) {
        const token = normalizeKeywordToken(keyword);
        if (token) articleKeywords.push(token);
      }
    }

    return {
      summary: [
        { label: "adminTotalArticles", value: articles.length },
        { label: "adminTotalUsers", value: users.length },
        { label: "adminTotalAdmins", value: totalAdmins },
        { label: "adminActiveUsers7d", value: activeUsers7d },
        { label: "adminLoginEvents7d", value: hasLoginEvents ? loginEvents7d : "-" },
        { label: "adminPendingRequests", value: pendingRequests }
      ],
      hasLoginEvents,
      dailyArticles: buildRecentDailyCounts(articleDates, 30),
      dailyUsers: buildRecentDailyCounts(userDates, 30),
      dailyLogins: hasLoginEvents ? buildRecentDailyCounts(loginDates, 30) : [],
      byType: buildTopCounts(articleTypes, 20),
      byKeyword: buildTopCounts(articleKeywords, 20)
    };
  }

  function renderAdminDashboard(root, labels, dashboard, access) {
    const pendingRequests = dashboard.requests.filter((row) => row.status === "pending");
    const explicitAdminIds = new Set(
      dashboard.roles
        .filter((row) => row.role === "admin")
        .map((row) => row.user_id)
    );
    const allowlistedEmails = new Set(
      dashboard.allowlist
        .map((row) => normalizeEmail(row.email))
        .filter(Boolean)
    );
    const approvedRequestUserIds = new Set(
      dashboard.requests
        .filter((row) => row.status === "approved")
        .map((row) => row.requester_user_id)
        .filter(Boolean)
    );
    const knownAdmins = dashboard.users.filter((user) => explicitAdminIds.has(user.id));
    const bootstrapEntry =
      dashboard.users.find((user) => normalizeEmail(user.email) === BOOTSTRAP_ADMIN_EMAIL) ||
      { id: "", email: BOOTSTRAP_ADMIN_EMAIL, display_name: labels.adminBootstrap, avatar_url: "", last_seen_at: "" };
    const adminRows = [];
    adminRows.push({
      ...bootstrapEntry,
      isBootstrap: true,
      isExplicit: explicitAdminIds.has(bootstrapEntry.id)
    });
    for (const user of knownAdmins) {
      if (normalizeEmail(user.email) === BOOTSTRAP_ADMIN_EMAIL) continue;
      adminRows.push({ ...user, isBootstrap: false, isExplicit: true });
    }

    const allowlistRows = [...dashboard.allowlist].sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));
    const knownUsers = dashboard.users
      .filter((user) => {
        const email = normalizeEmail(user.email);
        return (
          email === BOOTSTRAP_ADMIN_EMAIL
          || explicitAdminIds.has(user.id)
          || allowlistedEmails.has(email)
          || approvedRequestUserIds.has(user.id)
        );
      })
      .sort((a, b) => parseDate(b.last_seen_at || b.created_at) - parseDate(a.last_seen_at || a.created_at));
    const deletionLogs = Array.isArray(dashboard.deletionLogs) ? dashboard.deletionLogs : [];
    const stats = buildAdminStats(dashboard, explicitAdminIds);

    root.innerHTML = `
      <section class="oa-admin-shell" data-oa-admin-tabs>
        <div class="oa-admin-card oa-card">
          <div class="oa-admin-card-head">
            <div>
              <h2 class="oa-section-title">${escapeHtml(labels.adminPanel)}</h2>
              <p class="oa-page-subtitle">${escapeHtml(labels.adminDashboardDescription)}</p>
              <p class="oa-page-subtitle">${escapeHtml(labels.signedInAs)} ${escapeHtml(access.profile.email || "-")}</p>
            </div>
            <button class="oa-btn oa-btn-secondary" type="button" data-oa-admin-refresh>${escapeHtml(labels.adminRefresh)}</button>
          </div>
          <nav class="oa-admin-tabs" role="tablist" aria-label="${escapeHtml(labels.adminPanel)}">
            <button class="oa-btn oa-btn-secondary is-active" type="button" role="tab" aria-selected="true" data-oa-admin-tab="overview">${escapeHtml(labels.adminTabOverview)}</button>
            <button class="oa-btn oa-btn-secondary" type="button" role="tab" aria-selected="false" data-oa-admin-tab="access">${escapeHtml(labels.adminTabAccess)}</button>
            <button class="oa-btn oa-btn-secondary" type="button" role="tab" aria-selected="false" data-oa-admin-tab="users">${escapeHtml(labels.adminTabUsers)}</button>
            <button class="oa-btn oa-btn-secondary" type="button" role="tab" aria-selected="false" data-oa-admin-tab="content">${escapeHtml(labels.adminTabContent)}</button>
          </nav>
        </div>

        <section class="oa-admin-grid oa-admin-panel is-active" data-oa-admin-panel="overview">
          <section class="oa-card oa-admin-card">
            <h2 class="oa-section-title">${escapeHtml(labels.adminArticlesDaily)}</h2>
            ${renderAdminLineChart(labels, stats.dailyArticles.map((row) => ({ name: row.date, count: row.count })), { ariaLabel: labels.adminArticlesDaily })}
          </section>

          <section class="oa-card oa-admin-card">
            <h2 class="oa-section-title">${escapeHtml(labels.adminUsersDaily)}</h2>
            ${renderAdminLineChart(labels, stats.dailyUsers.map((row) => ({ name: row.date, count: row.count })), { ariaLabel: labels.adminUsersDaily })}
          </section>

          <section class="oa-card oa-admin-card">
            <h2 class="oa-section-title">${escapeHtml(labels.adminLoginsDaily)}</h2>
            ${stats.hasLoginEvents
              ? renderAdminLineChart(labels, stats.dailyLogins.map((row) => ({ name: row.date, count: row.count })), { ariaLabel: labels.adminLoginsDaily })
              : `<p>${escapeHtml(labels.adminLoginEventsUnavailable)}</p>`}
          </section>

          <section class="oa-card oa-admin-card">
            <h2 class="oa-section-title">${escapeHtml(labels.adminArticlesByType)}</h2>
            ${renderAdminPieChart(labels, stats.byType, { ariaLabel: labels.adminArticlesByType })}
          </section>

          <section class="oa-card oa-admin-card">
            <h2 class="oa-section-title">${escapeHtml(labels.adminArticlesByKeyword)}</h2>
            ${renderAdminPieChart(labels, stats.byKeyword, { ariaLabel: labels.adminArticlesByKeyword })}
          </section>
        </section>

        <section class="oa-admin-grid oa-admin-panel" data-oa-admin-panel="access" hidden>
          <section class="oa-card oa-admin-card">
            <h2 class="oa-section-title">${escapeHtml(labels.adminPendingRequests)}</h2>
            ${pendingRequests.length ? `
            <div class="oa-admin-table-wrap">
              <table class="oa-admin-table">
                <thead>
                  <tr>
                    <th>${escapeHtml(labels.requestRequester)}</th>
                    <th>${escapeHtml(labels.requestReason)}</th>
                    <th>${escapeHtml(labels.requestSubmittedAt)}</th>
                    <th>${escapeHtml(labels.requestActions)}</th>
                  </tr>
                </thead>
                <tbody>
                  ${pendingRequests.map((row) => `
                    <tr>
                      <td>${escapeHtml(row.email || "-")}</td>
                      <td>${escapeHtml(row.reason || "-")}</td>
                      <td>${escapeHtml(formatDateTime(row.created_at))}</td>
                      <td>
                        <div class="oa-inline-actions">
                          <button class="oa-btn oa-btn-secondary" type="button" data-oa-admin-approve="${escapeHtml(row.id)}">${escapeHtml(labels.adminApprove)}</button>
                          <button class="oa-btn oa-btn-secondary" type="button" data-oa-admin-deny="${escapeHtml(row.id)}">${escapeHtml(labels.adminDeny)}</button>
                        </div>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : `<p>${escapeHtml(labels.adminNoPendingRequests)}</p>`}
          </section>

          <section class="oa-card oa-admin-card">
            <h2 class="oa-section-title">${escapeHtml(labels.adminAllowlist)}</h2>
            <form class="oa-stack" data-oa-allowlist-form>
              <label class="oa-form-label" for="oa-allowlist-email">${escapeHtml(labels.adminEmail)}</label>
              <div class="oa-inline-form">
                <input
                  id="oa-allowlist-email"
                  class="oa-input"
                  type="email"
                  name="email"
                  placeholder="${escapeHtml(labels.adminAllowlistPlaceholder)}"
                  required
                >
                <button class="oa-btn oa-btn-primary" type="submit">${escapeHtml(labels.adminAddAllowlist)}</button>
              </div>
              <p class="oa-inline-feedback" data-oa-feedback></p>
            </form>
            ${allowlistRows.length ? `
              <ul class="oa-admin-list">
                ${allowlistRows.map((row) => `
                  <li class="oa-admin-list-item">
                    <div>
                      <strong>${escapeHtml(row.email)}</strong>
                      <div class="oa-page-subtitle">${escapeHtml(formatDateTime(row.created_at))}</div>
                    </div>
                    <button class="oa-btn oa-btn-secondary" type="button" data-oa-allowlist-remove="${escapeHtml(row.email)}">${escapeHtml(labels.remove)}</button>
                  </li>
                `).join("")}
              </ul>
            ` : `<p>${escapeHtml(labels.adminAllowlistEmpty)}</p>`}
          </section>
        </section>

        <section class="oa-admin-grid oa-admin-panel" data-oa-admin-panel="users" hidden>
          <section class="oa-card oa-admin-card">
            <h2 class="oa-section-title">${escapeHtml(labels.adminAdmins)}</h2>
            ${adminRows.length ? `
              <ul class="oa-admin-list">
                ${adminRows.map((row) => `
                  <li class="oa-admin-list-item">
                    <div class="oa-account-row">
                      ${renderAvatar({ avatar: row.avatar_url || "", displayName: row.display_name || row.email || "", email: row.email || "" }, "oa-account-avatar-sm")}
                      <div>
                        <strong>${escapeHtml(row.display_name || row.email || labels.adminNoDisplayName)}</strong>
                        <div class="oa-page-subtitle">${escapeHtml(row.email || "-")}</div>
                        <div class="oa-chip-wrap">
                          ${row.isBootstrap ? buildChip(labels.adminBootstrap, "success") : ""}
                          ${row.isExplicit ? buildChip(labels.adminExplicitRole) : ""}
                        </div>
                      </div>
                    </div>
                    ${row.isExplicit ? `<button class="oa-btn oa-btn-secondary" type="button" data-oa-admin-remove="${escapeHtml(row.id)}">${escapeHtml(labels.adminRemoveAdmin)}</button>` : ""}
                  </li>
                `).join("")}
              </ul>
            ` : `<p>${escapeHtml(labels.adminNoAdmins)}</p>`}
          </section>

          <section class="oa-card oa-admin-card">
            <h2 class="oa-section-title">${escapeHtml(labels.adminKnownUsers)}</h2>
            ${knownUsers.length ? `
              <div class="oa-admin-table-wrap">
                <table class="oa-admin-table">
                  <thead>
                    <tr>
                      <th>${escapeHtml(labels.adminDisplayName)}</th>
                      <th>${escapeHtml(labels.adminEmail)}</th>
                      <th>${escapeHtml(labels.adminLastSeen)}</th>
                      <th>${escapeHtml(labels.requestActions)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${knownUsers.map((user) => `
                      <tr>
                        <td>${escapeHtml(user.display_name || labels.adminNoDisplayName)}</td>
                        <td>${escapeHtml(user.email || "-")}</td>
                        <td>${escapeHtml(formatDateTime(user.last_seen_at || user.created_at))}</td>
                        <td>
                          <div class="oa-inline-actions">
                            ${explicitAdminIds.has(user.id) || normalizeEmail(user.email) === BOOTSTRAP_ADMIN_EMAIL
                              ? buildChip(labels.adminPanel, "success")
                              : `<button class="oa-btn oa-btn-secondary" type="button" data-oa-admin-promote="${escapeHtml(user.id)}">${escapeHtml(labels.adminMakeAdmin)}</button>`}
                            ${normalizeEmail(user.email) === BOOTSTRAP_ADMIN_EMAIL || user.id === access.profile.id
                              ? ""
                              : `<button class="oa-btn oa-btn-secondary" type="button" data-oa-user-delete="${escapeHtml(user.id)}" data-oa-user-delete-email="${escapeHtml(user.email || "")}">${escapeHtml(labels.adminDeleteUser)}</button>`}
                          </div>
                        </td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            ` : `<p>${escapeHtml(labels.adminNoKnownUsers)}</p>`}
          </section>
        </section>

        <section class="oa-admin-grid oa-admin-panel" data-oa-admin-panel="content" hidden>
          <section class="oa-card oa-admin-card">
            <h2 class="oa-section-title">${escapeHtml(labels.adminDeletionLogs)}</h2>
          ${deletionLogs.length ? `
            <div class="oa-admin-table-wrap">
              <table class="oa-admin-table">
                <thead>
                  <tr>
                    <th>${escapeHtml(labels.adminDeletedAt)}</th>
                    <th>${escapeHtml(labels.adminDeletedBy)}</th>
                    <th>${escapeHtml(labels.adminDeletedEntry)}</th>
                  </tr>
                </thead>
                <tbody>
                  ${deletionLogs.map((row) => {
                    const deletedBy = String(row.deleted_by_account || "").trim() || "N/A";
                    const slug = String(row.slug || "").trim() || "N/A";
                    const language = String(row.language || "").trim() || "N/A";
                    const title = String(row.title || "").trim();
                    const entry = title ? `${title} (${slug}, ${language})` : `${slug} (${language})`;
                    return `
                      <tr>
                        <td>${escapeHtml(formatDateTime(row.deleted_at))}</td>
                        <td>${escapeHtml(deletedBy)}</td>
                        <td>${escapeHtml(entry)}</td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          ` : `<p>${escapeHtml(labels.adminNoDeletionLogs)}</p>`}
        </section>
      </section>
    `;
  }

  function mountCollectionControls(root, labels, state, onChange) {
    root.innerHTML = controlsTemplate(labels);
    const bySelect = root.querySelector("[data-oa-sort-by]");
    const orderSelect = root.querySelector("[data-oa-sort-order]");
    const pageSizeSelect = root.querySelector("[data-oa-page-size]");
    const prevBtn = root.querySelector("[data-oa-page-prev]");
    const nextBtn = root.querySelector("[data-oa-page-next]");

    if (!bySelect || !orderSelect || !pageSizeSelect || !prevBtn || !nextBtn) return null;
    bySelect.value = state.sortBy;
    orderSelect.value = state.sortOrder;
    pageSizeSelect.value = String(state.pageSize);

    bySelect.onchange = () => {
      state.sortBy = normalize(bySelect.value, VALID_SORT_BY, DEFAULT_SORT_BY);
      state.page = DEFAULT_PAGE;
      onChange();
    };
    orderSelect.onchange = () => {
      state.sortOrder = normalize(orderSelect.value, VALID_SORT_ORDER, DEFAULT_SORT_ORDER);
      state.page = DEFAULT_PAGE;
      onChange();
    };
    pageSizeSelect.onchange = () => {
      state.pageSize = normalizePageSize(pageSizeSelect.value);
      state.page = DEFAULT_PAGE;
      onChange();
    };
    prevBtn.onclick = () => {
      state.page = Math.max(DEFAULT_PAGE, state.page - 1);
      onChange();
    };
    nextBtn.onclick = () => {
      state.page += 1;
      onChange();
    };
    return {
      bySelect,
      orderSelect,
      pageSizeSelect,
      prevBtn,
      nextBtn,
      listRoot: root.querySelector("[data-oa-list-content]"),
      statusNode: root.querySelector("[data-oa-page-status]")
    };
  }

  function renderCollectionView(root, records, labels, state, renderPageItems, afterRender) {
    const controls = mountCollectionControls(root, labels, state, rerender);
    if (!controls) return;

    function rerender() {
      controls.bySelect.value = state.sortBy;
      controls.orderSelect.value = state.sortOrder;
      controls.pageSizeSelect.value = String(state.pageSize);

      const sorted = sortRecords(records, state);
      const paged = paginateRecords(sorted, state);
      state.page = paged.page;

      if (controls.statusNode) {
        controls.statusNode.textContent = formatPageText(labels.pageStatus, paged.page, paged.totalPages);
      }
      controls.prevBtn.disabled = paged.page <= 1;
      controls.nextBtn.disabled = paged.page >= paged.totalPages;
      updateListStateInUrl(state);

      renderPageItems(controls.listRoot, paged.visible);
      if (typeof afterRender === "function") {
        afterRender();
      }
    }

    rerender();
  }

  async function fetchArticlePageFromSupabase(client, keywordAliasMap, lang, filters, state, favoritesSet) {
    const key = normalizeLang(lang);
    const favoritesOnly = filters.view === "favorites";
    const favoriteList = Array.from(favoritesSet || []);
    const sortField = state.sortBy === "submission_date" ? "submission_date" : "source_date";
    const ascending = state.sortOrder === "asc";
    const start = Math.max(0, (state.page - 1) * state.pageSize);
    const end = start + state.pageSize - 1;
    if (favoritesOnly && !favoriteList.length) {
      return { rows: [], total: 0 };
    }

    const buildScopedQuery = (includeCount) => {
      let scopedQuery = client
        .from("articles");
      scopedQuery = includeCount
        ? scopedQuery.select(ARTICLE_LIST_FIELDS, { count: "exact" })
        : scopedQuery.select(ARTICLE_LIST_FIELDS);
      scopedQuery = scopedQuery.eq("language", key);

      if (filters.topic) {
        const topic = String(filters.topic || "").trim();
        if (topic) {
          scopedQuery = scopedQuery.or(`primary_topic.eq.${topic},topics.cs.${JSON.stringify([topic])}`);
        }
      }
      if (filters.termType === "types" && filters.termValue) {
        scopedQuery = scopedQuery.eq("source_type", filters.termValue);
      }
      if (favoritesOnly) {
        scopedQuery = scopedQuery.in("slug", favoriteList);
      }
      if (filters.month) {
        const monthStart = `${filters.month}-01`;
        const monthEnd = `${nextArchiveMonth(filters.month)}-01`;
        if (monthEnd) {
          scopedQuery = scopedQuery.gte("source_date", monthStart).lt("source_date", monthEnd);
        }
      }
      return scopedQuery;
    };

    let canonicalKeywordFilter = "";
    if (filters.termType === "keywords" && filters.termValue) {
      canonicalKeywordFilter = canonicalizeKeyword(filters.termValue, keywordAliasMap);
      if (!canonicalKeywordFilter) return { rows: [], total: 0 };
      const keywordQuery = buildScopedQuery(false)
        .order(sortField, { ascending, nullsFirst: false })
        .order("slug", { ascending: true });
      const { data: keywordRows, error: keywordError } = await keywordQuery;
      if (keywordError) throw keywordError;

      const matchedRows = [];
      for (const row of Array.isArray(keywordRows) ? keywordRows : []) {
        const normalized = normalizeKeywords(row?.keywords, keywordAliasMap);
        if (!normalized.includes(canonicalKeywordFilter)) continue;
        matchedRows.push({
          ...row,
          keywords: normalized
        });
      }
      return {
        rows: matchedRows.slice(start, end + 1),
        total: matchedRows.length
      };
    }

    let query = buildScopedQuery(true);

    query = query
      .order(sortField, { ascending, nullsFirst: false })
      .order("slug", { ascending: true })
      .range(start, end);

    const { data, error, count } = await query;
    if (error) throw error;
    return {
      rows: (Array.isArray(data) ? data : []).map((row) => normalizeArticleRecord(row, keywordAliasMap)),
      total: Number(count || 0)
    };
  }

  function renderServerCollectionView(root, labels, state, fetchPage, renderPageItems, afterRender) {
    const controls = mountCollectionControls(root, labels, state, rerender);
    if (!controls) return;

    let requestId = 0;
    async function rerender() {
      const thisRequest = ++requestId;
      controls.bySelect.value = state.sortBy;
      controls.orderSelect.value = state.sortOrder;
      controls.pageSizeSelect.value = String(state.pageSize);
      controls.prevBtn.disabled = true;
      controls.nextBtn.disabled = true;
      if (controls.statusNode) {
        controls.statusNode.textContent = labels.loading;
      }

      try {
        const pageData = await fetchPage({ ...state });
        if (thisRequest !== requestId) return;
        const totalPages = Math.max(1, Math.ceil(pageData.total / state.pageSize));
        const safePage = Math.min(Math.max(state.page, 1), totalPages);

        if (safePage !== state.page) {
          state.page = safePage;
          const correctedData = await fetchPage({ ...state });
          if (thisRequest !== requestId) return;
          renderPageItems(controls.listRoot, correctedData.rows);
          if (controls.statusNode) {
            controls.statusNode.textContent = formatPageText(labels.pageStatus, state.page, totalPages);
          }
        } else {
          renderPageItems(controls.listRoot, pageData.rows);
          if (controls.statusNode) {
            controls.statusNode.textContent = formatPageText(labels.pageStatus, state.page, totalPages);
          }
        }

        controls.prevBtn.disabled = state.page <= 1;
        controls.nextBtn.disabled = state.page >= totalPages;
        updateListStateInUrl(state);
        if (typeof afterRender === "function") {
          afterRender();
        }
      } catch (_error) {
        if (thisRequest !== requestId) return;
        controls.listRoot.innerHTML = `<p>${escapeHtml(labels.noEntriesYet)}</p>`;
        controls.prevBtn.disabled = true;
        controls.nextBtn.disabled = true;
        if (controls.statusNode) {
          controls.statusNode.textContent = formatPageText(labels.pageStatus, 1, 1);
        }
      }
    }

    rerender();
  }

  function applySearch(root, records, labels, favoritesSet, options = {}) {
    root.innerHTML = `
      <section class="oa-search-page">
        <div class="oa-search-input-wrap">
          <input class="oa-search-input" type="search" placeholder="${escapeHtml(labels.searchPlaceholder)}" data-oa-live-search-input />
        </div>
        <p class="oa-search-status" data-oa-live-search-status>${escapeHtml(labels.searchTypeToStart)}</p>
        <div class="oa-search-results" data-oa-live-search-results></div>
      </section>
    `;

    const input = root.querySelector("[data-oa-live-search-input]");
    const status = root.querySelector("[data-oa-live-search-status]");
    const result = root.querySelector("[data-oa-live-search-results]");
    if (!input || !status || !result) return;

    const searchable = records.map((record) => ({
      ...record,
      _text: [record.title || "", record.executive_summary || "", record.detailed_notes || "", record.slug || ""].join(" ").toLowerCase()
    }));

    input.addEventListener("input", () => {
      const q = (input.value || "").trim().toLowerCase();
      result.innerHTML = "";
      if (!q) {
        status.textContent = labels.searchTypeToStart;
        return;
      }

      const tokens = q.split(/\s+/).filter(Boolean);
      const matched = searchable
        .filter((record) => tokens.every((token) => record._text.includes(token)))
        .slice(0, 80);

      if (!matched.length) {
        status.textContent = labels.noResults;
        return;
      }

      status.textContent = `${matched.length} results`;
      result.innerHTML = matched.map((record) => renderCard(record, labels, favoritesSet, options)).join("\n");
    });
  }

  function collectFilters(root) {
    const params = new URLSearchParams(window.location.search);
    const view = root.dataset.oaProtectedView || "";
    const topic = root.dataset.oaTopic || params.get("topic") || "";
    const termType = root.dataset.oaTermType || params.get("term_type") || "";
    const termValue = root.dataset.oaTermValue || params.get("term_value") || "";
    const querySlug = params.get("slug") || "";
    const slug = root.dataset.oaSlug || querySlug || "";
    const month = normalizeArchiveMonth(params.get(MONTH_KEY) || "");
    return { view, topic, termType, termValue, slug, month };
  }

  function getTopicsCatalog() {
    const node = document.getElementById("oa-topics-catalog");
    const parsed = node ? parseJsonAttr(node.textContent, []) : [];
    return Array.isArray(parsed) ? parsed : [];
  }

  function renderTopicsCatalog(root, topics, records, labels) {
    const counts = new Map();
    for (const topic of topics) {
      counts.set(topic.id, 0);
    }
    for (const record of records) {
      const seen = new Set();
      if (record.primary_topic) {
        seen.add(record.primary_topic);
      }
      if (Array.isArray(record.topics)) {
        for (const topicId of record.topics) {
          seen.add(topicId);
        }
      }
      for (const topicId of seen) {
        counts.set(topicId, (counts.get(topicId) || 0) + 1);
      }
    }
    const chartRows = topics
      .map((topic) => ({
        name: topic.label || topic.id,
        count: counts.get(topic.id) || 0
      }))
      .filter((row) => Number(row.count || 0) > 0)
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });

    root.innerHTML = `
      <div class="oa-topic-grid">
        ${topics.map((topic) => `
          <a class="oa-topic-card" href="${escapeHtml(topic.href || languagePath(`topics/${topic.id}/`))}">
            <h3 class="oa-topic-title">${escapeHtml(topic.label || topic.id)}
              <span class="oa-topic-count">${counts.get(topic.id) || 0}</span>
            </h3>
            <p class="oa-topic-description">${escapeHtml(topic.description || "")}</p>
          </a>
        `).join("")}
      </div>
      ${chartRows.length ? `
      <section class="oa-card oa-section oa-catalog-chart">
        <h2 class="oa-section-title">${escapeHtml(`${labels.adminTotalArticles || "Total articles"} · ${labels.topics || "Topics"}`)}</h2>
        ${renderAdminPieChart(labels, chartRows, { ariaLabel: labels.topics || "Topics" })}
      </section>
      ` : ""}
    `;
  }

  function renderTermsCatalog(root, records, termType, labels) {
    const counts = new Map();
    if (termType === "keywords") {
      for (const record of records) {
        const terms = Array.isArray(record.keywords) ? record.keywords : [];
        for (const term of terms) {
          counts.set(term, (counts.get(term) || 0) + 1);
        }
      }
    } else if (termType === "types") {
      for (const record of records) {
        const term = String(record.source_type || "").trim();
        if (!term) continue;
        counts.set(term, (counts.get(term) || 0) + 1);
      }
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return String(a[0]).localeCompare(String(b[0]));
    });

    if (!sorted.length) {
      root.innerHTML = `<p>${escapeHtml(labels.noEntriesYet)}</p>`;
      return;
    }

    const chartRows = sorted.slice(0, 16).map(([term, count]) => ({
      name: String(term),
      count: Number(count || 0)
    }));

    root.innerHTML = `
      <div class="oa-term-grid">
        ${sorted.map(([term, count]) => `
          <a class="oa-term-card" href="${escapeHtml(languagePath(`items/?term_type=${encodeURIComponent(String(termType))}&term_value=${encodeURIComponent(String(term))}`))}">
            <span class="oa-term-label">${escapeHtml(term)}</span>
            <span class="oa-term-count">${count}</span>
          </a>
        `).join("")}
      </div>
      ${termType === "keywords" ? `
      <section class="oa-card oa-section oa-catalog-chart">
        <h2 class="oa-section-title">${escapeHtml(labels.adminArticlesByKeyword || labels.keywords)}</h2>
        ${renderAdminPieChart(labels, chartRows, { ariaLabel: labels.adminArticlesByKeyword || labels.keywords })}
      </section>
      ` : ""}
    `;
  }

  function filterRecords(records, filters, keywordAliasMap) {
    let output = [...records];
    if (filters.topic) {
      output = output.filter((record) => {
        const secondary = Array.isArray(record.topics) ? record.topics : [];
        return record.primary_topic === filters.topic || secondary.includes(filters.topic);
      });
    }
    if (filters.termType === "keywords" && filters.termValue) {
      const canonicalKeyword = canonicalizeKeyword(filters.termValue, keywordAliasMap);
      output = output.filter((record) => Array.isArray(record.keywords) && record.keywords.includes(canonicalKeyword));
    }
    if (filters.termType === "types" && filters.termValue) {
      output = output.filter((record) => record.source_type === filters.termValue);
    }
    return output;
  }

  function syncLanguageSwitchQueryParams() {
    const current = new URL(window.location.href);
    if (!current.search) return;
    const links = Array.from(document.querySelectorAll(".hextra-language-options a[href]"));
    for (const link of links) {
      const rawHref = link.getAttribute("href") || "";
      if (!rawHref || rawHref.startsWith("#")) continue;
      let target;
      try {
        target = new URL(rawHref, window.location.origin);
      } catch (_error) {
        continue;
      }
      if (target.origin !== window.location.origin) continue;
      target.search = current.search;
      link.setAttribute("href", `${target.pathname}${target.search}${target.hash}`);
    }
  }

  function setFeedback(node, message, isError) {
    if (!node) return;
    node.textContent = message || "";
    node.dataset.error = isError ? "true" : "false";
  }

  function closeAllAccountMenus() {
    document.querySelectorAll("[data-oa-account-menu]").forEach((menu) => {
      menu.hidden = true;
    });
    document.querySelectorAll("[data-oa-account-toggle]").forEach((toggle) => {
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-oa-account-toggle]");
    if (toggle) {
      const shell = toggle.closest("[data-oa-account-shell]");
      const menu = shell?.querySelector("[data-oa-account-menu]");
      const willOpen = Boolean(menu?.hidden);
      closeAllAccountMenus();
      if (menu) {
        menu.hidden = !willOpen;
        toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
      }
      return;
    }

    if (!event.target.closest("[data-oa-account-shell]")) {
      closeAllAccountMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllAccountMenus();
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    syncLanguageSwitchQueryParams();

    const labels = getLabels();
    const keywordAliasMap = buildKeywordAliasMap(getKeywordCatalog());
    const roots = Array.from(document.querySelectorAll("[data-oa-protected-view]"));
    const supabaseUrl = document.querySelector('meta[name="oa-supabase-url"]')?.content || "";
    const supabaseAnonKey = document.querySelector('meta[name="oa-supabase-anon-key"]')?.content || "";
    const oauthRedirectTo = sanitizeSameOriginRedirect(
      document.querySelector('meta[name="oa-supabase-redirect-url"]')?.content
    );

    const authControls = Array.from(document.querySelectorAll("[data-oa-auth-controls]"));
    const listState = getListStateFromUrl();

    function renderAuthSkeleton(message) {
      for (const node of authControls) {
        node.innerHTML = `<span class="oa-auth-message">${escapeHtml(message)}</span>`;
      }
    }

    function renderAuthControls(user, access) {
      authControls.forEach((node, index) => {
        const compact = node.dataset.oaAuthCompact === "true";
        if (!user) {
          node.innerHTML = `<button class="oa-auth-btn" type="button" data-oa-sign-in>${escapeHtml(labels.signIn)}</button>`;
          return;
        }

        const profile = access?.profile || getUserProfile(user);
        const menuItems = [
          access?.isApproved
            ? `<a class="oa-account-link" href="${escapeHtml(languagePath("favorites/"))}">${escapeHtml(labels.myFavorites)}</a>`
            : "",
          access?.isAdmin
            ? `<a class="oa-account-link" href="${escapeHtml(languagePath("admin/"))}">${escapeHtml(labels.adminPanel)}</a>`
            : "",
          `<button class="oa-account-link oa-account-link-button" type="button" data-oa-sign-out>${escapeHtml(labels.signOut)}</button>`
        ].filter(Boolean);

        const statusText = access?.isAdmin
          ? labels.adminPanel
          : access?.isApproved
            ? labels.requestStatusApproved
            : access?.latestRequest?.status === "pending"
              ? labels.requestStatusPending
              : labels.accessApprovalRequired;

        if (compact) {
          node.innerHTML = `
            <div class="oa-account-shell" data-oa-account-shell>
              <button
                class="oa-account-toggle"
                type="button"
                aria-expanded="false"
                data-oa-account-toggle
                aria-label="${escapeHtml(profile.email || profile.displayName || "Account")}"
              >
                ${renderAvatar(profile, "")}
              </button>
              <div class="oa-account-menu" data-oa-account-menu hidden>
                <div class="oa-account-menu-head">
                  ${renderAvatar(profile, "oa-account-avatar-sm")}
                  <div>
                    <strong>${escapeHtml(profile.displayName || profile.email || labels.signedInAs)}</strong>
                    <div class="oa-account-email">${escapeHtml(profile.email || "-")}</div>
                    <div class="oa-account-status">${escapeHtml(statusText)}</div>
                  </div>
                </div>
                <div class="oa-account-menu-body">
                  ${menuItems.join("")}
                </div>
              </div>
            </div>
          `;
        } else {
          node.innerHTML = `
            <div class="oa-account-inline">
              <div class="oa-account-row">
                ${renderAvatar(profile, "oa-account-avatar-sm")}
                <div>
                  <strong>${escapeHtml(profile.displayName || profile.email || labels.signedInAs)}</strong>
                  <div class="oa-account-email">${escapeHtml(profile.email || "-")}</div>
                  <div class="oa-account-status">${escapeHtml(statusText)}</div>
                </div>
              </div>
              <div class="oa-account-inline-actions">
                ${access?.isApproved ? `<a class="oa-auth-btn oa-auth-btn-link" href="${escapeHtml(languagePath("favorites/"))}">${escapeHtml(labels.myFavorites)}</a>` : ""}
                ${access?.isAdmin ? `<a class="oa-auth-btn oa-auth-btn-link" href="${escapeHtml(languagePath("admin/"))}">${escapeHtml(labels.adminPanel)}</a>` : ""}
                <button class="oa-auth-btn" type="button" data-oa-sign-out>${escapeHtml(labels.signOut)}</button>
              </div>
            </div>
          `;
        }
        bindAvatarFallbacks(node);
      });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      renderAuthSkeleton(labels.configMissing);
      for (const root of roots) {
        root.innerHTML = `<p class="oa-page-subtitle">${escapeHtml(labels.configMissing)}</p>`;
      }
      return;
    }

    if (!window.supabase?.createClient) {
      renderAuthSkeleton(labels.configMissing);
      return;
    }

    const client = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    let favoriteSlugs = new Set();
    const articleCache = new Map();

    async function fetchArticlesFromSupabase(lang) {
      const key = normalizeLang(lang);
      if (articleCache.has(key)) {
        return articleCache.get(key);
      }

      const { data, error } = await client
        .from("articles")
        .select(ARTICLE_LIST_FIELDS)
        .eq("language", key)
        .order("source_date", { ascending: false, nullsFirst: false })
        .order("submission_date", { ascending: false, nullsFirst: false });

      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      articleCache.set(key, rows);
      return rows;
    }

    async function fetchArticles(lang) {
      try {
        const data = await fetchArticlesFromSupabase(lang);
        const rows = data.map((row) => normalizeArticleRecord(row, keywordAliasMap));
        return { rows: rows.sort(byNewest), error: null };
      } catch (error) {
        return { rows: [], error };
      }
    }

    async function fetchArticleBySlug(slug, preferredLang) {
      if (!slug) return { row: null, error: null };
      const primaryLang = normalizeLang(preferredLang);
      const fallbackLang = primaryLang === "en" ? "zh-tw" : "en";
      const languages = [primaryLang, fallbackLang];
      let lastError = null;

      for (const lang of languages) {
        const { data, error } = await client
          .from("articles")
          .select(ARTICLE_DETAIL_FIELDS)
          .eq("language", lang)
          .eq("slug", slug)
          .limit(1);
        if (error) {
          lastError = error;
          continue;
        }
        const row = Array.isArray(data) ? data[0] : null;
        if (row) {
          return { row: normalizeArticleRecord(row, keywordAliasMap), error: null };
        }
      }

      if (lastError) {
        return { row: null, error: new Error(lastError.message || "Unable to fetch article.") };
      }
      return { row: null, error: null };
    }

    async function upsertCurrentUser(user) {
      const profile = getUserProfile(user);
      if (!user?.id || !profile.email) return;
      const nowIso = new Date().toISOString();
      await client.from("app_users").upsert({
        id: user.id,
        email: profile.email,
        display_name: profile.displayName || null,
        avatar_url: profile.avatar || null,
        last_seen_at: nowIso
      }, { onConflict: "id" });
      // Best-effort login event tracking for admin analytics.
      try {
        await client.from("login_events").insert({
          user_id: user.id,
          occurred_at: nowIso
        });
      } catch (_error) {
        // login_events is optional until schema migration is applied.
      }
    }

    async function loadAccessContext(user) {
      const profile = getUserProfile(user);
      await upsertCurrentUser(user);

      const [rolesResult, allowlistResult, requestResult] = await Promise.all([
        client.from("user_roles").select("role").eq("user_id", user.id),
        client.from("access_allowlist").select("email").eq("email", profile.email).limit(1),
        client.from("access_requests").select("id,status,reason,created_at,reviewed_at").eq("requester_user_id", user.id).order("created_at", { ascending: false }).limit(1)
      ]);

      const roles = (rolesResult.data || []).map((row) => row.role);
      const latestRequest = (requestResult.data || [])[0] || null;
      const isBootstrapAdmin = profile.email === BOOTSTRAP_ADMIN_EMAIL;
      const isAdmin = isBootstrapAdmin || roles.includes("admin");
      const isAllowlisted = Boolean((allowlistResult.data || []).length);
      const isApproved = isAdmin || isAllowlisted || latestRequest?.status === "approved";

      return {
        profile,
        roles,
        latestRequest,
        isBootstrapAdmin,
        isAdmin,
        isAllowlisted,
        isApproved
      };
    }

    async function loadFavorites(userId) {
      const { data, error } = await client
        .from("favorites")
        .select("article_slug")
        .eq("user_id", userId);
      if (error) return new Set();
      return new Set((data || []).map((row) => row.article_slug));
    }

    function updateFavoriteButtonsForSlug(slug) {
      const isSaved = favoriteSlugs.has(slug);
      const text = isSaved ? labels.saved : labels.save;
      document.querySelectorAll("[data-oa-favorite-toggle]").forEach((btn) => {
        if ((btn.dataset.slug || "") !== slug) return;
        btn.classList.toggle("is-saved", isSaved);
        btn.textContent = text;
      });
    }

    function removeEntryCardFromDom(slug, language) {
      const normalizedLang = normalizeLang(language);
      document.querySelectorAll("[data-oa-entry-card]").forEach((node) => {
        const nodeSlug = node.getAttribute("data-slug") || "";
        const nodeLang = normalizeLang(node.getAttribute("data-language") || "");
        if (nodeSlug === slug && nodeLang === normalizedLang) {
          node.remove();
        }
      });
    }

    async function toggleFavorite(slug, userId) {
      if (!slug || !userId) return;
      if (favoriteSlugs.has(slug)) {
        await client.from("favorites").delete().eq("user_id", userId).eq("article_slug", slug);
        favoriteSlugs.delete(slug);
      } else {
        await client.from("favorites").insert({ user_id: userId, article_slug: slug });
        favoriteSlugs.add(slug);
      }
      updateFavoriteButtonsForSlug(slug);
      const isFavoritesPage = roots.some((root) => collectFilters(root).view === "favorites");
      if (isFavoritesPage && !favoriteSlugs.has(slug)) {
        document.querySelectorAll("[data-oa-entry-card]").forEach((node) => {
          if ((node.getAttribute("data-slug") || "") === slug) {
            node.remove();
          }
        });
      }
    }

    async function deleteArticle(record, user, access) {
      if (!record?.slug || !record?.language || !user?.id || !access?.isAdmin) return;

      const title = String(record.title || record.slug || "").trim();
      const firstConfirmation = `${labels.deleteConfirm}\n\n${title || record.slug}`;
      if (!window.confirm(firstConfirmation)) return;
      if (!window.confirm(labels.deleteConfirmFinal)) return;

      const { error } = await client
        .from("articles")
        .delete()
        .eq("slug", record.slug)
        .eq("language", normalizeLang(record.language));

      if (error) {
        const details = String(error.message || "").trim();
        window.alert(details ? `${labels.deleteError}\n${details}` : labels.deleteError);
        return;
      }

      favoriteSlugs.delete(record.slug);
      const cacheKey = normalizeLang(record.language);
      if (articleCache.has(cacheKey)) {
        const cachedRows = articleCache.get(cacheKey) || [];
        articleCache.set(cacheKey, cachedRows.filter((row) => !(row.slug === record.slug && normalizeLang(row.language) === cacheKey)));
      }
      updateFavoriteButtonsForSlug(record.slug);
      removeEntryCardFromDom(record.slug, record.language);
      window.alert(labels.deleteSuccess);
    }

    async function fetchAdminDashboard() {
      const [requestsResult, allowlistResult, usersResult, rolesResult, deletionLogsResult, articlesResult, loginEventsResult] = await Promise.all([
        client.from("access_requests").select("id,requester_user_id,email,reason,status,created_at,reviewed_at,reviewer_user_id").order("created_at", { ascending: false }),
        client.from("access_allowlist").select("email,created_at,created_by").order("email", { ascending: true }),
        client.from("app_users").select("id,email,display_name,avatar_url,last_seen_at,created_at").order("last_seen_at", { ascending: false }),
        client.from("user_roles").select("user_id,role,created_at"),
        client.from("article_deletion_logs").select("slug,language,title,deleted_at,deleted_by_account").order("deleted_at", { ascending: false }).limit(200),
        client.from("articles").select("slug,source_type,submission_date,created_at,keywords"),
        client.from("login_events").select("user_id,occurred_at").order("occurred_at", { ascending: false }).limit(5000)
      ]);
      const hasLoginEvents = !loginEventsResult.error;

      return {
        requests: requestsResult.data || [],
        allowlist: allowlistResult.data || [],
        users: usersResult.data || [],
        roles: rolesResult.data || [],
        deletionLogs: deletionLogsResult.data || [],
        articles: articlesResult.data || [],
        loginEvents: hasLoginEvents ? (loginEventsResult.data || []) : [],
        hasLoginEvents
      };
    }

    async function signIn() {
      await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: oauthRedirectTo || window.location.href
        }
      });
    }

    async function signOut() {
      closeAllAccountMenus();
      await client.auth.signOut();
    }

    async function notifyAdminAccessRequest(payload) {
      try {
        await fetch("/api/access-request-notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          keepalive: true
        });
      } catch (_error) {
        // Do not block request submission UI when notification delivery fails.
      }
    }

    async function notifyRequesterAccessApproved(payload) {
      try {
        await fetch("/api/access-approved-notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          keepalive: true
        });
      } catch (_error) {
        // Do not block admin review flow when notification delivery fails.
      }
    }

    async function submitAccessRequest(form, user) {
      const feedback = form.querySelector("[data-oa-feedback]");
      const reason = String(new FormData(form).get("reason") || "").trim();
      if (!reason) {
        setFeedback(feedback, labels.reasonRequired, true);
        return;
      }
      setFeedback(feedback, "", false);
      const profile = getUserProfile(user);
      const { data, error } = await client
        .from("access_requests")
        .insert({
          requester_user_id: user.id,
          email: profile.email,
          reason,
          status: "pending"
        })
        .select("id,created_at")
        .single();
      if (error) {
        setFeedback(feedback, error.message || labels.requestSubmitError, true);
        return;
      }
      void notifyAdminAccessRequest({
        requestId: data?.id || "",
        requesterUserId: user.id,
        email: profile.email,
        reason,
        language: normalizeLang(document.documentElement.lang || "en"),
        submittedAt: data?.created_at || new Date().toISOString(),
        adminUrl: `${window.location.origin}${languagePath("admin/")}`
      });
      await renderViews();
    }

    async function reviewAccessRequest(requestId, approved, user) {
      const reviewedAt = new Date().toISOString();
      const { data, error } = await client
        .from("access_requests")
        .update({
          status: approved ? "approved" : "denied",
          reviewer_user_id: user.id,
          reviewed_at: reviewedAt
        })
        .eq("id", requestId)
        .select("id,email,reviewed_at")
        .single();
      if (!error) {
        if (approved) {
          const requesterEmail = normalizeEmail(data?.email || "");
          if (requesterEmail) {
            void notifyRequesterAccessApproved({
              email: requesterEmail,
              reviewedAt: data?.reviewed_at || reviewedAt,
              loginUrl: `${window.location.origin}/`
            });
          }
        }
        await renderViews();
      }
    }

    async function addAllowlistEntry(form, user) {
      const feedback = form.querySelector("[data-oa-feedback]");
      const email = normalizeEmail(String(new FormData(form).get("email") || ""));
      if (!email) {
        setFeedback(feedback, labels.adminActionError, true);
        return;
      }
      const { error } = await client.from("access_allowlist").upsert({
        email,
        created_by: user.id
      }, { onConflict: "email" });
      if (error) {
        setFeedback(feedback, error.message || labels.adminActionError, true);
        return;
      }
      await renderViews();
    }

    async function removeAllowlistEntry(email) {
      const { error } = await client.from("access_allowlist").delete().eq("email", normalizeEmail(email));
      if (!error) {
        await renderViews();
      }
    }

    async function promoteAdmin(userId, currentUser) {
      const { error } = await client.from("user_roles").upsert({
        user_id: userId,
        role: "admin",
        created_by: currentUser.id
      }, { onConflict: "user_id,role" });
      if (!error) {
        await renderViews();
      }
    }

    async function removeAdmin(userId) {
      if (!userId) return;
      const { error } = await client.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (!error) {
        await renderViews();
      }
    }

    async function removeKnownUser(userId, email, currentUser) {
      const normalizedEmail = normalizeEmail(email);
      if (!userId) return;
      if (!currentUser?.id) return;
      if (userId === currentUser.id || normalizedEmail === BOOTSTRAP_ADMIN_EMAIL) {
        window.alert(labels.adminDeleteUserBlocked);
        return;
      }

      const firstConfirmation = `${labels.adminDeleteUserConfirm}\n\n${normalizedEmail || userId}`;
      if (!window.confirm(firstConfirmation)) return;
      if (!window.confirm(labels.adminDeleteUserConfirmFinal)) return;

      // Remove allowlist entry first so re-registered users must request approval again.
      if (normalizedEmail) {
        const { error: allowlistError } = await client
          .from("access_allowlist")
          .delete()
          .eq("email", normalizedEmail);
        if (allowlistError) {
          const details = String(allowlistError.message || "").trim();
          window.alert(details ? `${labels.adminActionError}\n${details}` : labels.adminActionError);
          return;
        }
      }

      // Revoke request-based approval so re-registered users must request again.
      const reviewedAt = new Date().toISOString();
      const { error: requestRevokeError } = await client
        .from("access_requests")
        .update({
          status: "denied",
          reviewer_user_id: currentUser.id,
          reviewed_at: reviewedAt
        })
        .eq("requester_user_id", userId)
        .in("status", ["approved", "pending"]);
      if (requestRevokeError) {
        const details = String(requestRevokeError.message || "").trim();
        window.alert(details ? `${labels.adminActionError}\n${details}` : labels.adminActionError);
        return;
      }

      // Ensure admin role is removed if present.
      const { error: roleRevokeError } = await client
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      if (roleRevokeError) {
        const details = String(roleRevokeError.message || "").trim();
        window.alert(details ? `${labels.adminActionError}\n${details}` : labels.adminActionError);
        return;
      }

      const { error } = await client.from("app_users").delete().eq("id", userId);
      if (error) {
        const details = String(error.message || "").trim();
        window.alert(details ? `${labels.adminActionError}\n${details}` : labels.adminActionError);
        return;
      }
      await renderViews();
    }

    function bindAdminTabs() {
      document.querySelectorAll("[data-oa-admin-tabs]").forEach((container) => {
        const buttons = Array.from(container.querySelectorAll("[data-oa-admin-tab]"));
        const panels = Array.from(container.querySelectorAll("[data-oa-admin-panel]"));
        if (!buttons.length || !panels.length) return;

        const setActive = (key) => {
          buttons.forEach((button) => {
            const isActive = (button.dataset.oaAdminTab || "") === key;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", isActive ? "true" : "false");
          });
          panels.forEach((panel) => {
            const isActive = (panel.dataset.oaAdminPanel || "") === key;
            panel.classList.toggle("is-active", isActive);
            panel.hidden = !isActive;
          });
        };

        const initial = (buttons.find((button) => button.classList.contains("is-active"))?.dataset.oaAdminTab || buttons[0].dataset.oaAdminTab || "overview");
        setActive(initial);
        buttons.forEach((button) => {
          button.onclick = () => {
            const key = button.dataset.oaAdminTab || "";
            if (!key) return;
            setActive(key);
          };
        });
      });
    }

    function bindGlobalActions(user, access) {
      bindAdminTabs();
      document.querySelectorAll("[data-oa-sign-in]").forEach((btn) => {
        btn.onclick = () => {
          signIn();
        };
      });
      document.querySelectorAll("[data-oa-sign-out]").forEach((btn) => {
        btn.onclick = () => {
          signOut();
        };
      });
      document.querySelectorAll("[data-oa-favorite-toggle]").forEach((btn) => {
        btn.onclick = () => toggleFavorite(btn.dataset.slug || "", user?.id || "");
      });
      document.querySelectorAll("[data-oa-article-delete]").forEach((btn) => {
        btn.onclick = async () => {
          if (!user || !access?.isAdmin) return;
          const slug = btn.dataset.slug || "";
          const language = btn.dataset.language || "";
          const title = btn.dataset.title || slug;
          if (!slug || !language) return;
          btn.disabled = true;
          try {
            await deleteArticle({ slug, language, title }, user, access);
          } finally {
            btn.disabled = false;
          }
        };
      });
      document.querySelectorAll("[data-oa-access-request-form]").forEach((form) => {
        form.onsubmit = async (event) => {
          event.preventDefault();
          if (!user) return;
          await submitAccessRequest(form, user);
        };
      });
      document.querySelectorAll("[data-oa-admin-approve]").forEach((btn) => {
        btn.onclick = async () => {
          if (!user || !access?.isAdmin) return;
          await reviewAccessRequest(btn.dataset.oaAdminApprove || "", true, user);
        };
      });
      document.querySelectorAll("[data-oa-admin-deny]").forEach((btn) => {
        btn.onclick = async () => {
          if (!user || !access?.isAdmin) return;
          await reviewAccessRequest(btn.dataset.oaAdminDeny || "", false, user);
        };
      });
      document.querySelectorAll("[data-oa-allowlist-form]").forEach((form) => {
        form.onsubmit = async (event) => {
          event.preventDefault();
          if (!user || !access?.isAdmin) return;
          await addAllowlistEntry(form, user);
        };
      });
      document.querySelectorAll("[data-oa-allowlist-remove]").forEach((btn) => {
        btn.onclick = async () => {
          if (!access?.isAdmin) return;
          await removeAllowlistEntry(btn.dataset.oaAllowlistRemove || "");
        };
      });
      document.querySelectorAll("[data-oa-admin-promote]").forEach((btn) => {
        btn.onclick = async () => {
          if (!user || !access?.isAdmin) return;
          await promoteAdmin(btn.dataset.oaAdminPromote || "", user);
        };
      });
      document.querySelectorAll("[data-oa-admin-remove]").forEach((btn) => {
        btn.onclick = async () => {
          if (!access?.isAdmin) return;
          await removeAdmin(btn.dataset.oaAdminRemove || "");
        };
      });
      document.querySelectorAll("[data-oa-user-delete]").forEach((btn) => {
        btn.onclick = async () => {
          if (!user || !access?.isAdmin) return;
          btn.disabled = true;
          try {
            await removeKnownUser(
              btn.dataset.oaUserDelete || "",
              btn.dataset.oaUserDeleteEmail || "",
              user
            );
          } finally {
            btn.disabled = false;
          }
        };
      });
      document.querySelectorAll("[data-oa-admin-refresh]").forEach((btn) => {
        btn.onclick = async () => {
          if (!access?.isAdmin) return;
          await renderViews();
        };
      });
    }

    async function renderViews() {
      const { data: sessionData } = await client.auth.getSession();
      const user = sessionData?.session?.user || null;

      if (!user) {
        favoriteSlugs = new Set();
        renderAuthControls(null, null);
        for (const root of roots) {
          const filters = collectFilters(root);
          if (filters.view === "admin") {
            renderGuestState(root, labels);
          } else {
            renderGuestState(root, labels);
          }
        }
        bindGlobalActions(null, null);
        return;
      }

      const access = await loadAccessContext(user);
      renderAuthControls(user, access);

      if (!roots.length) {
        bindGlobalActions(user, access);
        return;
      }

      const lang = normalizeLang(document.documentElement.lang);
      const needsProtectedContent = access.isApproved && roots.some((root) => collectFilters(root).view !== "admin");
      const hasCatalogViews = roots.some((root) => {
        const view = collectFilters(root).view;
        return view === "search" || view === "topics_catalog" || view === "terms_catalog" || view === "archive";
      });
      const articleResult = needsProtectedContent && hasCatalogViews ? await fetchArticles(lang) : { rows: [], error: null };
      const articles = articleResult.rows;
      const renderOptions = { canDelete: access.isAdmin };
      favoriteSlugs = needsProtectedContent ? await loadFavorites(user.id) : new Set();

      let adminDashboard = null;

      for (const root of roots) {
        renderLoading(root, labels);
        const filters = collectFilters(root);

        if (filters.view === "admin") {
          if (!access.isAdmin) {
            renderUnauthorizedState(root, labels);
          } else {
            adminDashboard = adminDashboard || await fetchAdminDashboard();
            renderAdminDashboard(root, labels, adminDashboard, access);
          }
          continue;
        }

        if (!access.isApproved) {
          renderAccessRequestState(root, labels, access);
          continue;
        }

        if (filters.view === "item_single") {
          let target = null;
          let reason = "";
          if (filters.slug) {
            const single = await fetchArticleBySlug(filters.slug, lang);
            target = single?.row || null;
            if (single?.error) {
              reason = `Query error: ${single.error.message || "unknown error"}`;
            }
          } else {
            reason = "Missing slug query parameter.";
          }
          if (!target) {
            target = articles.find((record) => record.slug === filters.slug) || null;
          }
          if (!target && !reason && articleResult.error) {
            reason = `List query error: ${articleResult.error.message || "unknown error"}`;
          }
          if (!target) {
            renderSingleUnavailable(root, labels, filters.slug, reason);
          } else {
            renderSingle(root, target, labels, favoriteSlugs);
          }
          continue;
        }

        if (filters.view === "search") {
          applySearch(root, articles, labels, favoriteSlugs, renderOptions);
          continue;
        }

        if (filters.view === "topics_catalog") {
          renderTopicsCatalog(root, getTopicsCatalog(), articles, labels);
          continue;
        }

        if (filters.view === "terms_catalog") {
          renderTermsCatalog(root, articles, filters.termType, labels);
          continue;
        }

        if (filters.view === "home_recent") {
          renderServerCollectionView(root, labels, listState, async (stateSnapshot) => {
            return fetchArticlePageFromSupabase(client, keywordAliasMap, lang, filters, stateSnapshot, favoriteSlugs);
          }, (node, pageItems) => {
            renderList(node, pageItems, labels, favoriteSlugs, renderOptions);
          }, () => bindGlobalActions(user, access));
          continue;
        }

        if (filters.view === "favorites") {
          renderServerCollectionView(root, labels, listState, async (stateSnapshot) => {
            return fetchArticlePageFromSupabase(client, keywordAliasMap, lang, filters, stateSnapshot, favoriteSlugs);
          }, (node, pageItems) => {
            renderList(node, pageItems, labels, favoriteSlugs, renderOptions);
          }, () => bindGlobalActions(user, access));
          continue;
        }

        if (filters.view === "archive") {
          updateItemsListHeading(root, filters, labels, keywordAliasMap);
          if (!filters.month) {
            renderArchiveMonthIndex(root, articles, labels);
            continue;
          }
          renderServerCollectionView(root, labels, listState, async (stateSnapshot) => {
            return fetchArticlePageFromSupabase(client, keywordAliasMap, lang, filters, stateSnapshot, favoriteSlugs);
          }, (node, pageItems) => {
            renderList(node, pageItems, labels, favoriteSlugs, renderOptions);
          }, () => bindGlobalActions(user, access));
          continue;
        }

        updateItemsListHeading(root, filters, labels, keywordAliasMap);
        renderServerCollectionView(root, labels, listState, async (stateSnapshot) => {
          return fetchArticlePageFromSupabase(client, keywordAliasMap, lang, filters, stateSnapshot, favoriteSlugs);
        }, (node, pageItems) => {
          renderList(node, pageItems, labels, favoriteSlugs, renderOptions);
        }, () => bindGlobalActions(user, access));
      }

      bindGlobalActions(user, access);
    }

    client.auth.onAuthStateChange(() => {
      renderViews();
    });

    renderViews();
  });
})();
