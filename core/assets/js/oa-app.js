(() => {
  /**
   * @typedef {Object} AuthUser
   * @property {string} id
   * @property {string} [email]
   * @property {string} [avatar]
   * @property {string} [displayName]
   */

  /** @typedef {"loading" | "signed_out" | "signed_in"} AuthState */

  const DEFAULT_LABELS = {
    loading: "Loading protected content...",
    loginRequired: "Please sign in with Google to view this content.",
    configMissing: "Supabase is not configured yet. Please set SUPABASE_URL and SUPABASE_ANON_KEY.",
    signIn: "Sign in with Google",
    signOut: "Sign out",
    signedInAs: "Signed in as",
    myFavorites: "My Favorites",
    sourceDate: "Source date",
    submissionDate: "Submitted on",
    sourceType: "Source type",
    sourceUrl: "Source URL",
    keywords: "Keywords",
    primaryTopic: "Primary topic",
    otherTopics: "Other topics",
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
    pageStatus: "Page %d of %d"
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

  function buildChip(text) {
    return `<span class=\"oa-chip\">${escapeHtml(text)}</span>`;
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

  function favoriteButton(slug, isSaved, labels) {
    const text = isSaved ? labels.saved : labels.save;
    return `<button class=\"oa-favorite-btn ${isSaved ? "is-saved" : ""}\" type=\"button\" data-oa-favorite-toggle data-slug=\"${escapeHtml(slug)}\">${escapeHtml(text)}</button>`;
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
        <button class="oa-btn oa-btn-primary" type="button" data-oa-sign-in>${escapeHtml(labels.signIn)}</button>
      </section>
    `;
  }

  function renderLoading(root, labels) {
    root.innerHTML = `<p class="oa-page-subtitle">${escapeHtml(labels.loading)}</p>`;
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
    const takeAway = String(record.takeaway_html || "").trim();

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
          <dd>${escapeHtml(record.source_type || "-")}</dd>
          <dt>${escapeHtml(labels.sourceDate)}</dt>
          <dd>${escapeHtml(record.source_date || "-")}</dd>
          <dt>${escapeHtml(labels.submissionDate)}</dt>
          <dd>${escapeHtml(record.submission_date || "-")}</dd>
          <dt>${escapeHtml(labels.primaryTopic)}</dt>
          <dd>${escapeHtml(record.primary_topic || "-")}</dd>
          <dt>${escapeHtml(labels.otherTopics)}</dt>
          <dd class="oa-chip-wrap">${topics.length ? topics.map((topic) => buildChip(topic)).join("") : "-"}</dd>
          <dt>${escapeHtml(labels.keywords)}</dt>
          <dd class="oa-chip-wrap">${keywords.length ? keywords.map((k) => buildChip(k)).join("") : "-"}</dd>
        </dl>
        <section class="oa-section oa-card">
          <h2 class="oa-section-title">${escapeHtml(labels.executiveSummary)}</h2>
          <p>${escapeHtml(record.executive_summary || "")}</p>
        </section>
        <section class="oa-section oa-card">
          <h2 class="oa-section-title">${escapeHtml(labels.detailedNotes)}</h2>
          <p>${escapeHtml(record.detailed_notes || "")}</p>
        </section>
        ${takeAway ? `<section class=\"oa-section oa-card\"><h2 class=\"oa-section-title\">${escapeHtml(labels.takeAway)}</h2><div class=\"oa-takeaway\">${takeAway}</div></section>` : ""}
        ${attachments.length ? `<section class=\"oa-section oa-card\"><h2 class=\"oa-section-title\">${escapeHtml(labels.attachments)}</h2><ul>${attachments.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul></section>` : ""}
      </article>
    `;
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
    const view = root.dataset.oaProtectedView || "";
    const topic = root.dataset.oaTopic || "";
    const termType = root.dataset.oaTermType || "";
    const termValue = root.dataset.oaTermValue || "";
    const querySlug = new URLSearchParams(window.location.search).get("slug") || "";
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
          <a class="oa-term-card" href="${escapeHtml(languagePath(`${termType}/${encodeURIComponent(String(term))}/`))}">
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

  document.addEventListener("DOMContentLoaded", async () => {
    const labels = getLabels();
    const roots = Array.from(document.querySelectorAll("[data-oa-protected-view]"));
    if (!roots.length) return;

    const supabaseUrl = document.querySelector('meta[name="oa-supabase-url"]')?.content || "";
    const supabaseAnonKey = document.querySelector('meta[name="oa-supabase-anon-key"]')?.content || "";
    const oauthRedirectTo = document.querySelector('meta[name="oa-supabase-redirect-url"]')?.content || window.location.origin;

    const authControls = Array.from(document.querySelectorAll("[data-oa-auth-controls]"));
    const favoritesNav = Array.from(document.querySelectorAll("[data-oa-favorites-nav]"));

    function renderAuthSkeleton(message) {
      for (const node of authControls) {
        node.innerHTML = `<span class=\"oa-auth-message\">${escapeHtml(message)}</span>`;
      }
      for (const node of favoritesNav) {
        node.hidden = true;
      }
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      renderAuthSkeleton(labels.configMissing);
      for (const root of roots) {
        root.innerHTML = `<p class=\"oa-page-subtitle\">${escapeHtml(labels.configMissing)}</p>`;
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
    const listState = getListStateFromUrl();

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

    async function signIn() {
      await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: oauthRedirectTo || window.location.href
        }
      });
    }

    async function signOut() {
      await client.auth.signOut();
    }

    function bindGlobalActions(user) {
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
    }

    function renderAuthControls(user) {
      for (const node of authControls) {
        if (!user) {
          node.innerHTML = `<button class=\"oa-auth-btn\" type=\"button\" data-oa-sign-in>${escapeHtml(labels.signIn)}</button>`;
        } else {
          const email = user.email || "";
          node.innerHTML = `
            <span class="oa-auth-user">${escapeHtml(labels.signedInAs)} ${escapeHtml(email)}</span>
            <button class="oa-auth-btn" type="button" data-oa-sign-out>${escapeHtml(labels.signOut)}</button>
          `;
        }
      }
      for (const node of favoritesNav) {
        node.hidden = !user;
      }
    }

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

    async function renderViews() {
      const { data: sessionData } = await client.auth.getSession();
      const user = sessionData?.session?.user || null;
      renderAuthControls(user);

      if (!user) {
        for (const root of roots) {
          renderGuestState(root, labels);
        }
        bindGlobalActions(null);
        return;
      }

      favoriteSlugs = await loadFavorites(user.id);

      const lang = normalizeLang(document.documentElement.lang);
      const articleResult = await fetchArticles(lang);
      const articles = articleResult.rows;

      for (const root of roots) {
        renderLoading(root, labels);
        const filters = collectFilters(root);

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
          }, () => bindGlobalActions(user));
          continue;
        }

        if (filters.view === "favorites") {
          scoped = scoped.filter((record) => favoriteSlugs.has(record.slug));
          renderCollectionView(root, scoped, labels, listState, (node, pageItems) => {
            renderList(node, pageItems, labels, favoriteSlugs);
          }, () => bindGlobalActions(user));
          continue;
        }

        if (filters.view === "archive") {
          renderCollectionView(root, scoped, labels, listState, (node, pageItems) => {
            renderArchive(node, pageItems, labels, favoriteSlugs);
          }, () => bindGlobalActions(user));
          continue;
        }

        renderCollectionView(root, scoped, labels, listState, (node, pageItems) => {
          renderList(node, pageItems, labels, favoriteSlugs);
        }, () => bindGlobalActions(user));
      }

      bindGlobalActions(user);
    }

    client.auth.onAuthStateChange(() => {
      renderViews();
    });

    renderViews();
  });
})();
