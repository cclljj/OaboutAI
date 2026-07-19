const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const createDOMPurify = require("dompurify");

const dom = new JSDOM("<!doctype html><html><body></body></html>");
global.window = dom.window;
const { sanitizeDigestHtml } = require("../core/assets/js/oa-sanitize.js");
const purifier = createDOMPurify(dom.window);

test("digest sanitizer removes executable markup and unsafe URLs", () => {
  const dirty = [
    '<h2 onclick="alert(1)">Digest</h2>',
    '<script>alert(1)</script>',
    '<a href="javascript:alert(1)" onmouseover="alert(2)">bad</a>',
    '<img src=x onerror="alert(3)">',
    '<iframe src="https://example.com"></iframe>'
  ].join("");
  const clean = sanitizeDigestHtml(dirty, purifier);

  assert.match(clean, /<h2>Digest<\/h2>/);
  assert.doesNotMatch(clean, /script|onclick|onmouseover|onerror|javascript:|iframe|<img/i);
});

test("digest sanitizer preserves the supported article structure", () => {
  const clean = sanitizeDigestHtml(
    '<h2>References</h2><ol><li><a href="https://example.com/a">Source</a></li></ol><pre><code>x &lt; y</code></pre>',
    purifier
  );

  assert.match(clean, /<h2>References<\/h2>/);
  assert.match(clean, /<ol><li><a href="https:\/\/example\.com\/a">Source<\/a><\/li><\/ol>/);
  assert.match(clean, /<pre><code>x &lt; y<\/code><\/pre>/);
});

test("digest sanitizer fails closed when DOMPurify is unavailable", () => {
  assert.equal(sanitizeDigestHtml("<p>private digest</p>", null), "");
});
