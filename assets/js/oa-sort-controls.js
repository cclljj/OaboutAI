(() => {
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
  const VALID_PAGE_SIZES = new Set([10, 20, 50, 100]);

  function parseDate(value) {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return null;
    return parsed;
  }

  function normalize(value, valid, fallback) {
    return valid.has(value) ? value : fallback;
  }

  function normalizePageSize(value) {
    const parsed = Number.parseInt(value || "", 10);
    return VALID_PAGE_SIZES.has(parsed) ? parsed : DEFAULT_PAGE_SIZE;
  }

  function normalizePage(value) {
    const parsed = Number.parseInt(value || "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PAGE;
  }

  function updateUrl(state) {
    const url = new URL(window.location.href);
    url.searchParams.set(SORT_BY_KEY, state.sortBy);
    url.searchParams.set(SORT_ORDER_KEY, state.sortOrder);
    url.searchParams.set(PAGE_SIZE_KEY, String(state.pageSize));
    url.searchParams.set(PAGE_KEY, String(state.page));
    window.history.replaceState({}, "", url);
  }

  function reorder(list, sortBy, sortOrder) {
    const cards = Array.from(list.querySelectorAll(".oa-entry-card"));
    const direction = sortOrder === "asc" ? 1 : -1;
    const dateField = sortBy === "submission_date" ? "submissionDate" : "sourceDate";
    cards.sort((a, b) => {
      const aDate = parseDate(a.dataset[dateField] || a.dataset.sourceDate);
      const bDate = parseDate(b.dataset[dateField] || b.dataset.sourceDate);
      if (aDate === bDate) {
        const aIndex = Number.parseInt(a.dataset.sortIndex || "0", 10);
        const bIndex = Number.parseInt(b.dataset.sortIndex || "0", 10);
        return aIndex - bIndex;
      }
      if (aDate === null) return 1;
      if (bDate === null) return -1;
      return aDate < bDate ? -1 * direction : 1 * direction;
    });
    cards.forEach((card) => list.appendChild(card));
  }

  function formatPageText(template, current, total) {
    return template.replace("%d", String(current)).replace("%d", String(total));
  }

  function paginate(list, pagination, state) {
    if (!pagination) return;

    const cards = Array.from(list.querySelectorAll(".oa-entry-card"));
    if (cards.length === 0) {
      pagination.hidden = true;
      return;
    }

    pagination.hidden = false;
    const prevBtn = pagination.querySelector("[data-oa-page-prev]");
    const nextBtn = pagination.querySelector("[data-oa-page-next]");
    const pageStatus = pagination.querySelector("[data-oa-page-status]");
    const statusTemplate = pageStatus?.dataset.template || "Page %d of %d";

    const totalPages = Math.max(1, Math.ceil(cards.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    cards.forEach((card, idx) => {
      card.hidden = !(idx >= start && idx < end);
    });

    if (pageStatus) {
      pageStatus.textContent = formatPageText(statusTemplate, state.page, totalPages);
    }
    if (prevBtn) prevBtn.disabled = state.page <= 1;
    if (nextBtn) nextBtn.disabled = state.page >= totalPages;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const controls = document.querySelector("[data-oa-sort-controls]");
    const list = document.querySelector("[data-oa-sort-list]");
    const pagination = document.querySelector("[data-oa-pagination]");
    if (!controls || !list) return;

    const bySelect = controls.querySelector("[data-oa-sort-by]");
    const orderSelect = controls.querySelector("[data-oa-sort-order]");
    const pageSizeSelect = controls.querySelector("[data-oa-page-size]");
    if (!bySelect || !orderSelect || !pageSizeSelect) return;

    const params = new URLSearchParams(window.location.search);
    const state = {
      sortBy: normalize(params.get(SORT_BY_KEY), VALID_SORT_BY, DEFAULT_SORT_BY),
      sortOrder: normalize(params.get(SORT_ORDER_KEY), VALID_SORT_ORDER, DEFAULT_SORT_ORDER),
      pageSize: normalizePageSize(params.get(PAGE_SIZE_KEY)),
      page: normalizePage(params.get(PAGE_KEY))
    };

    const render = () => {
      bySelect.value = state.sortBy;
      orderSelect.value = state.sortOrder;
      pageSizeSelect.value = String(state.pageSize);
      reorder(list, state.sortBy, state.sortOrder);
      paginate(list, pagination, state);
      updateUrl(state);
    };

    bySelect.addEventListener("change", () => {
      state.sortBy = normalize(bySelect.value, VALID_SORT_BY, DEFAULT_SORT_BY);
      state.page = DEFAULT_PAGE;
      render();
    });

    orderSelect.addEventListener("change", () => {
      state.sortOrder = normalize(orderSelect.value, VALID_SORT_ORDER, DEFAULT_SORT_ORDER);
      state.page = DEFAULT_PAGE;
      render();
    });

    pageSizeSelect.addEventListener("change", () => {
      state.pageSize = normalizePageSize(pageSizeSelect.value);
      state.page = DEFAULT_PAGE;
      render();
    });

    const prevBtn = pagination?.querySelector("[data-oa-page-prev]");
    const nextBtn = pagination?.querySelector("[data-oa-page-next]");
    prevBtn?.addEventListener("click", () => {
      state.page = Math.max(DEFAULT_PAGE, state.page - 1);
      render();
    });
    nextBtn?.addEventListener("click", () => {
      state.page += 1;
      render();
    });

    render();
  });
})();
