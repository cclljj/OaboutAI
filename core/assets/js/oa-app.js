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
    adminActionSuccess: "Saved.",
    adminActionError: "Unable to save that change right now."
  };

  const ARTICLE_COLUMNS = [
    "slug",
    "language",
    "title",
    "source_url",
    "source_type",
    "source_date",
    "submission_date",
    "executive_summary",
    "detailed_notes",
    "takeaway_html",
    "keywords",
    "primary_topic",
    "topics",
    "attachments"
  ].join(",");
  const SORT_BY_KEY = "sort_by";
  const SORT_ORDER_KEY = "sort_order";
  const PAGE_SIZE_KEY = "page_size";
  const PAGE_KEY = "page";
  const DEFAULT_SORT_BY = "source_date";
  const DEFAULT_SORT_ORDER = "desc";
  const DEFAULT_PAGE_SIZE = 20;
  const DEFAULT_PAGE = 1;
  const VALID_SORT_BY = new Set(["source_date", "submission_date"]);
  const VALID_SORT_ORDER = new Set(["asc", "desc"]);
  const VALID_PAGE_SIZES = new Set([20, 50, 100]);

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
    const base = currentLang === "zh-tw" ? "/zh-tw/item/" : "/item/";
    return `${base}?slug=${encoded}`;
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

  function formatDateTime(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString();
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
    if (profile.avatar) {
      return `<img class="oa-account-avatar ${sizeClass || ""}" src="${escapeHtml(profile.avatar)}" alt="${escapeHtml(label)}">`;
    }
    return `<span class="oa-account-avatar oa-account-avatar-fallback ${sizeClass || ""}" aria-hidden="true">${escapeHtml(getInitials(label))}</span>`;
  }

  function favoriteButton(slug, isSaved, labels) {
    const text = isSaved ? labels.saved : labels.save;
    return `<button class="oa-favorite-btn ${isSaved ? "is-saved" : ""}" type="button" data-oa-favorite-toggle data-slug="${escapeHtml(slug)}">${escapeHtml(text)}</button>`;
  }

  function renderCard(record, labels, favoritesSet) {
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
      <article class="oa-entry-card">
        <div class="oa-entry-card-head">
          <h3><a class="oa-entry-title" href="${articleHref(record.slug)}">${escapeHtml(record.title || record.slug)}</a></h3>
          ${favoriteButton(record.slug, isSaved, labels)}
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

  function updateItemsListHeading(root, filters, labels) {
    const shell = root.closest(".oa-shell");
    const titleNode = shell ? shell.querySelector(".oa-page-title") : null;
    if (!titleNode) return;

    if (filters.termType === "keywords" && filters.termValue) {
      titleNode.textContent = `${labels.keywordLabel}: ${filters.termValue}`;
      return;
    }

    if (filters.termType === "types" && filters.termValue) {
      titleNode.textContent = `${labels.typeLabel}: ${filters.termValue}`;
    }
  }

  function renderList(root, records, labels, favoritesSet) {
    if (!records.length) {
      root.innerHTML = `<p>${escapeHtml(labels.noEntriesYet)}</p>`;
      return;
    }
    root.innerHTML = records.map((r) => renderCard(r, labels, favoritesSet)).join("\n");
  }

  function renderArchive(root, records, labels, favoritesSet) {
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
            ${entries.map((r) => renderCard(r, labels, favoritesSet)).join("\n")}
          </div>
        </section>
      `);

    root.innerHTML = sections.join("\n");
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
    const detailedNotes = formatMarkdownContent(record.detailed_notes);
    const takeAway = formatMarkdownContent(record.takeaway_html, { stripH2: true });
    const sourceType = String(record.source_type || "").trim();
    const primaryTopic = String(record.primary_topic || "").trim();

    root.innerHTML = `
      <article class="oa-single">
        <div class="oa-entry-card-head oa-single-head">
          <h1 class="oa-page-title">${escapeHtml(record.title || record.slug)}</h1>
          ${favoriteButton(record.slug, isSaved, labels)}
        </div>
        <dl class="oa-metadata oa-card">
          <dt>${escapeHtml(labels.sourceUrl)}</dt>
          <dd><a href="${escapeHtml(record.source_url || "#")}" target="_blank" rel="noreferrer">${escapeHtml(record.source_url || "-")}</a></dd>
          <dt>${escapeHtml(labels.sourceType)}</dt>
          <dd>${sourceType ? buildChipLink(sourceType, termHref("types", sourceType)) : "-"}</dd>
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
          <p>${escapeHtml(record.executive_summary || "")}</p>
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
        flushList();
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
    if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
    return "";
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

    root.innerHTML = `
      <section class="oa-admin-grid">
        <section class="oa-card oa-admin-card">
          <div class="oa-admin-card-head">
            <div>
              <h2 class="oa-section-title">${escapeHtml(labels.adminPendingRequests)}</h2>
              <p class="oa-page-subtitle">${escapeHtml(labels.adminDashboardDescription)}</p>
            </div>
            <button class="oa-btn oa-btn-secondary" type="button" data-oa-admin-refresh>${escapeHtml(labels.adminRefresh)}</button>
          </div>
          <p class="oa-page-subtitle">${escapeHtml(labels.signedInAs)} ${escapeHtml(access.profile.email || "-")}</p>
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
                        ${explicitAdminIds.has(user.id) || normalizeEmail(user.email) === BOOTSTRAP_ADMIN_EMAIL
                          ? buildChip(labels.adminPanel, "success")
                          : `<button class="oa-btn oa-btn-secondary" type="button" data-oa-admin-promote="${escapeHtml(user.id)}">${escapeHtml(labels.adminMakeAdmin)}</button>`}
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : `<p>${escapeHtml(labels.adminNoKnownUsers)}</p>`}
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

  function applySearch(root, records, labels, favoritesSet) {
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
      _text: [record.title, record.executive_summary, record.detailed_notes, record.slug].join(" ").toLowerCase()
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
      result.innerHTML = matched.map((record) => renderCard(record, labels, favoritesSet)).join("\n");
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
    return { view, topic, termType, termValue, slug };
  }

  function getTopicsCatalog() {
    const node = document.getElementById("oa-topics-catalog");
    const parsed = node ? parseJsonAttr(node.textContent, []) : [];
    return Array.isArray(parsed) ? parsed : [];
  }

  function renderTopicsCatalog(root, topics, records) {
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

    root.innerHTML = `
      <div class="oa-term-grid">
        ${sorted.map(([term, count]) => `
          <a class="oa-term-card" href="${escapeHtml(languagePath(`items/?term_type=${encodeURIComponent(String(termType))}&term_value=${encodeURIComponent(String(term))}`))}">
            <span class="oa-term-label">${escapeHtml(term)}</span>
            <span class="oa-term-count">${count}</span>
          </a>
        `).join("")}
      </div>
    `;
  }

  function filterRecords(records, filters) {
    let output = [...records];
    if (filters.topic) {
      output = output.filter((record) => {
        const secondary = Array.isArray(record.topics) ? record.topics : [];
        return record.primary_topic === filters.topic || secondary.includes(filters.topic);
      });
    }
    if (filters.termType === "keywords" && filters.termValue) {
      output = output.filter((record) => Array.isArray(record.keywords) && record.keywords.includes(filters.termValue));
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
    const roots = Array.from(document.querySelectorAll("[data-oa-protected-view]"));
    const supabaseUrl = document.querySelector('meta[name="oa-supabase-url"]')?.content || "";
    const supabaseAnonKey = document.querySelector('meta[name="oa-supabase-anon-key"]')?.content || "";
    const oauthRedirectTo = document.querySelector('meta[name="oa-supabase-redirect-url"]')?.content || window.location.origin;

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

    async function fetchArticles(lang) {
      const { data, error } = await client
        .from("articles")
        .select(ARTICLE_COLUMNS)
        .eq("language", lang);
      if (error) return { rows: [], error };
      return { rows: (data || []).sort(byNewest), error: null };
    }

    async function fetchArticleBySlug(slug, preferredLang) {
      if (!slug) return null;
      const { data, error } = await client
        .from("articles")
        .select(ARTICLE_COLUMNS)
        .eq("slug", slug);
      if (error) return { row: null, error };
      const rows = data || [];
      return {
        row: rows.find((row) => normalizeLang(row.language) === preferredLang) || rows[0] || null,
        error: null
      };
    }

    async function upsertCurrentUser(user) {
      const profile = getUserProfile(user);
      if (!user?.id || !profile.email) return;
      await client.from("app_users").upsert({
        id: user.id,
        email: profile.email,
        display_name: profile.displayName || null,
        avatar_url: profile.avatar || null,
        last_seen_at: new Date().toISOString()
      }, { onConflict: "id" });
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

    async function toggleFavorite(slug, userId) {
      if (!slug || !userId) return;
      if (favoriteSlugs.has(slug)) {
        await client.from("favorites").delete().eq("user_id", userId).eq("article_slug", slug);
        favoriteSlugs.delete(slug);
      } else {
        await client.from("favorites").insert({ user_id: userId, article_slug: slug });
        favoriteSlugs.add(slug);
      }
      await renderViews();
    }

    async function fetchAdminDashboard() {
      const [requestsResult, allowlistResult, usersResult, rolesResult] = await Promise.all([
        client.from("access_requests").select("id,requester_user_id,email,reason,status,created_at,reviewed_at,reviewer_user_id").order("created_at", { ascending: false }),
        client.from("access_allowlist").select("email,created_at,created_by").order("email", { ascending: true }),
        client.from("app_users").select("id,email,display_name,avatar_url,last_seen_at,created_at").order("last_seen_at", { ascending: false }),
        client.from("user_roles").select("user_id,role,created_at")
      ]);

      return {
        requests: requestsResult.data || [],
        allowlist: allowlistResult.data || [],
        users: usersResult.data || [],
        roles: rolesResult.data || []
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

    async function submitAccessRequest(form, user) {
      const feedback = form.querySelector("[data-oa-feedback]");
      const reason = String(new FormData(form).get("reason") || "").trim();
      if (!reason) {
        setFeedback(feedback, labels.reasonRequired, true);
        return;
      }
      setFeedback(feedback, "", false);
      const profile = getUserProfile(user);
      const { error } = await client.from("access_requests").insert({
        requester_user_id: user.id,
        email: profile.email,
        reason,
        status: "pending"
      });
      if (error) {
        setFeedback(feedback, error.message || labels.requestSubmitError, true);
        return;
      }
      await renderViews();
    }

    async function reviewAccessRequest(requestId, approved, user) {
      const { error } = await client
        .from("access_requests")
        .update({
          status: approved ? "approved" : "denied",
          reviewer_user_id: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", requestId);
      if (!error) {
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

    function bindGlobalActions(user, access) {
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
      const articleResult = needsProtectedContent ? await fetchArticles(lang) : { rows: [], error: null };
      const articles = articleResult.rows;
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
          applySearch(root, articles, labels, favoriteSlugs);
          continue;
        }

        if (filters.view === "topics_catalog") {
          renderTopicsCatalog(root, getTopicsCatalog(), articles);
          continue;
        }

        if (filters.view === "terms_catalog") {
          renderTermsCatalog(root, articles, filters.termType, labels);
          continue;
        }

        let scoped = filterRecords(articles, filters);

        if (filters.view === "home_recent") {
          renderCollectionView(root, scoped, labels, listState, (node, pageItems) => {
            renderList(node, pageItems, labels, favoriteSlugs);
          }, () => bindGlobalActions(user, access));
          continue;
        }

        if (filters.view === "favorites") {
          scoped = scoped.filter((record) => favoriteSlugs.has(record.slug));
          renderCollectionView(root, scoped, labels, listState, (node, pageItems) => {
            renderList(node, pageItems, labels, favoriteSlugs);
          }, () => bindGlobalActions(user, access));
          continue;
        }

        if (filters.view === "archive") {
          renderCollectionView(root, scoped, labels, listState, (node, pageItems) => {
            renderArchive(node, pageItems, labels, favoriteSlugs);
          }, () => bindGlobalActions(user, access));
          continue;
        }

        updateItemsListHeading(root, filters, labels);
        renderCollectionView(root, scoped, labels, listState, (node, pageItems) => {
          renderList(node, pageItems, labels, favoriteSlugs);
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
