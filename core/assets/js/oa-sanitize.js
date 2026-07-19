(() => {
  const DIGEST_ALLOWED_TAGS = [
    "a", "b", "blockquote", "br", "code", "del", "div", "em", "h1", "h2", "h3",
    "h4", "h5", "h6", "hr", "i", "li", "ol", "p", "pre", "span", "strong",
    "table", "tbody", "td", "th", "thead", "tr", "ul"
  ];
  const DIGEST_ALLOWED_ATTR = ["class", "href", "rel", "target", "title"];

  function sanitizeDigestHtml(value, purifier = window.DOMPurify) {
    const html = String(value || "");
    if (!html || !purifier || typeof purifier.sanitize !== "function") return "";
    return purifier.sanitize(html, {
      ALLOWED_TAGS: DIGEST_ALLOWED_TAGS,
      ALLOWED_ATTR: DIGEST_ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: false,
      FORBID_TAGS: ["embed", "form", "iframe", "input", "link", "meta", "object", "script", "style", "svg", "template"],
      FORBID_ATTR: ["style"]
    });
  }

  const api = { sanitizeDigestHtml };
  window.OASanitize = Object.freeze(api);
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
