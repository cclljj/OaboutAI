(() => {
  const MAX_RESULTS = 50;

  function normalizeText(value) {
    return (value || "").toLowerCase().trim();
  }

  function tokenize(query) {
    return normalizeText(query).split(/\s+/).filter(Boolean);
  }

  function scoreRecord(record, tokens) {
    const title = normalizeText(record.title);
    const summary = normalizeText(record.executive_summary);
    const notes = normalizeText(record.detailed_notes);
    const content = normalizeText(record.content);
    let score = 0;

    for (const token of tokens) {
      if (!title.includes(token) && !summary.includes(token) && !notes.includes(token) && !content.includes(token)) {
        return -1;
      }
      if (title.includes(token)) score += 8;
      if (summary.includes(token)) score += 5;
      if (notes.includes(token)) score += 3;
      if (content.includes(token)) score += 1;
    }
    return score;
  }

  function renderStatus(target, text) {
    target.textContent = text;
  }

  function buildSnippet(record) {
    const source = record.executive_summary || record.detailed_notes || record.content || "";
    if (source.length <= 220) return source;
    return `${source.slice(0, 220)}...`;
  }

  function resultCard(record, labels) {
    const article = document.createElement("article");
    article.className = "oa-entry-card";

    const title = document.createElement("h2");
    const titleLink = document.createElement("a");
    titleLink.className = "oa-entry-title oa-search-result-title";
    titleLink.href = record.url;
    titleLink.textContent = record.title;
    title.appendChild(titleLink);
    article.appendChild(title);

    const meta = document.createElement("p");
    meta.className = "oa-meta";
    const chips = [
      `${labels.sourceDate} ${record.source_date || "-"}`,
      `${labels.submissionDate} ${record.submission_date || "-"}`,
      `${record.source_type || "-"}`
    ];
    for (const chipText of chips) {
      const chip = document.createElement("span");
      chip.className = "oa-chip";
      chip.textContent = chipText;
      meta.appendChild(chip);
    }
    for (const topic of record.topics || []) {
      const chipLink = document.createElement("a");
      chipLink.className = "oa-chip oa-chip-link";
      chipLink.href = topic.url;
      chipLink.textContent = topic.label || topic.id;
      meta.appendChild(chipLink);
    }
    const langChip = document.createElement("span");
    langChip.className = "oa-chip";
    langChip.textContent = `${labels.language} ${record.language_label || record.lang}`;
    meta.appendChild(langChip);
    article.appendChild(meta);

    const snippet = document.createElement("p");
    snippet.className = "oa-summary oa-search-result-snippet";
    snippet.textContent = buildSnippet(record);
    article.appendChild(snippet);

    return article;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const root = document.querySelector("[data-oa-search-page]");
    if (!root) return;

    const input = root.querySelector("[data-oa-search-input]");
    const status = root.querySelector("[data-oa-search-status]");
    const results = root.querySelector("[data-oa-search-results]");
    const indexUrl = root.dataset.indexUrl;
    const noResultsText = root.dataset.noResultsText || "No matching entries found.";
    const typeToStartText = root.dataset.typeToStartText || "Start typing to search.";
    const resultsCountTemplate = root.dataset.resultsCountTemplate || "%d results found";
    const labels = {
      language: root.dataset.languageLabel || "Language",
      sourceDate: root.dataset.sourceDateLabel || "Source date",
      submissionDate: root.dataset.submissionDateLabel || "Submitted on"
    };

    if (!input || !status || !results || !indexUrl) return;

    let index = [];
    try {
      const response = await fetch(indexUrl);
      if (!response.ok) throw new Error(`Failed to fetch index: ${response.status}`);
      index = await response.json();
    } catch (_error) {
      renderStatus(status, noResultsText);
      return;
    }

    renderStatus(status, typeToStartText);

    input.addEventListener("input", () => {
      const query = input.value.trim();
      results.textContent = "";
      if (!query) {
        renderStatus(status, typeToStartText);
        return;
      }

      const tokens = tokenize(query);
      const matched = index
        .map((record) => ({ record, score: scoreRecord(record, tokens) }))
        .filter((item) => item.score >= 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_RESULTS);

      if (matched.length === 0) {
        renderStatus(status, noResultsText);
        return;
      }

      const countText = resultsCountTemplate.replace("%d", String(matched.length));
      renderStatus(status, countText);
      for (const item of matched) {
        results.appendChild(resultCard(item.record, labels));
      }
    });
  });
})();
