(() => {
  const SORT_BY_KEY = "sort_by";
  const SORT_ORDER_KEY = "sort_order";
  const DEFAULT_SORT_BY = "source_date";
  const DEFAULT_SORT_ORDER = "desc";
  const VALID_SORT_BY = new Set(["source_date", "submission_date"]);
  const VALID_SORT_ORDER = new Set(["asc", "desc"]);

  function parseDate(value) {
    if (!value) return null;
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return null;
    return parsed;
  }

  function normalize(value, valid, fallback) {
    return valid.has(value) ? value : fallback;
  }

  function updateUrl(sortBy, sortOrder) {
    const url = new URL(window.location.href);
    url.searchParams.set(SORT_BY_KEY, sortBy);
    url.searchParams.set(SORT_ORDER_KEY, sortOrder);
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

  document.addEventListener("DOMContentLoaded", () => {
    const controls = document.querySelector("[data-oa-sort-controls]");
    const list = document.querySelector("[data-oa-sort-list]");
    if (!controls || !list) return;

    const bySelect = controls.querySelector("[data-oa-sort-by]");
    const orderSelect = controls.querySelector("[data-oa-sort-order]");
    if (!bySelect || !orderSelect) return;

    const params = new URLSearchParams(window.location.search);
    let sortBy = normalize(params.get(SORT_BY_KEY), VALID_SORT_BY, DEFAULT_SORT_BY);
    let sortOrder = normalize(params.get(SORT_ORDER_KEY), VALID_SORT_ORDER, DEFAULT_SORT_ORDER);

    bySelect.value = sortBy;
    orderSelect.value = sortOrder;
    reorder(list, sortBy, sortOrder);
    updateUrl(sortBy, sortOrder);

    const onChange = () => {
      sortBy = normalize(bySelect.value, VALID_SORT_BY, DEFAULT_SORT_BY);
      sortOrder = normalize(orderSelect.value, VALID_SORT_ORDER, DEFAULT_SORT_ORDER);
      reorder(list, sortBy, sortOrder);
      updateUrl(sortBy, sortOrder);
    };

    bySelect.addEventListener("change", onChange);
    orderSelect.addEventListener("change", onChange);
  });
})();
