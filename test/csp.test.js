import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'";
const CSP_TAG = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;
const URL_ATTRS = new Set(["href", "src", "srcset", "action", "formaction", "poster", "data", "xlink:href"]);
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

// Every start tag with its name and attributes (name, value or null).
function tags(src) {
  const out = [];
  const body = src.replace(/<!--[\s\S]*?-->/g, "");
  for (const m of body.matchAll(/<([a-zA-Z][\w:-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*\/?>/g)) {
    const attrs = [];
    for (const a of m[2].matchAll(/([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
      attrs.push({ name: a[1].toLowerCase(), value: a[2] ?? a[3] ?? a[4] ?? null });
    }
    out.push({ name: m[1].toLowerCase(), attrs, index: m.index, end: m.index + m[0].length });
  }
  return { body, list: out };
}

// Problems that would break or weaken the strict CSP in an HTML document.
function cspProblems(src) {
  const problems = [];
  const { body, list } = tags(src);

  const metas = list.filter((t) => t.name === "meta" && t.attrs.some((a) => a.name === "http-equiv" && a.value?.toLowerCase() === "content-security-policy"));
  if (metas.length !== 1) problems.push(`expected exactly one CSP meta tag, found ${metas.length}`);
  for (const meta of metas) {
    const content = meta.attrs.find((a) => a.name === "content")?.value;
    if (content !== CSP) problems.push(`CSP content differs: ${content}`);
    const first = list.find((t) => t.name === "link" || t.name === "script");
    if (first && first.index < meta.index) problems.push(`CSP meta comes after the first <${first.name}>`);
  }

  for (const t of list) {
    if (t.name === "style") problems.push("<style> element");
    for (const a of t.attrs) {
      if (a.name === "style") problems.push(`style attribute on <${t.name}>`);
      if (a.name.startsWith("on")) problems.push(`${a.name} handler on <${t.name}>`);
      if (URL_ATTRS.has(a.name) && a.value !== null && /^(https?:|\/\/)/i.test(a.value.trim())) {
        problems.push(`off-origin ${a.name} on <${t.name}>: ${a.value}`);
      }
    }
    if (t.name === "script") {
      if (!t.attrs.some((a) => a.name === "src")) problems.push("<script> without src");
      const close = body.slice(t.end).search(/<\/script\s*>/i);
      const inner = close < 0 ? body.slice(t.end) : body.slice(t.end, t.end + close);
      if (inner.trim()) problems.push("<script> with inline content");
    }
  }
  return problems;
}

test("index.html carries the strict CSP and nothing it would block", () => {
  assert.deepEqual(cspProblems(html), []);
});

test("index.html has the CSP meta tag word for word", () => {
  assert.equal(html.split(CSP_TAG).length, 2);
});

const mutations = {
  "CSP meta removed": (s) => s.replace(CSP_TAG, ""),
  "CSP content altered": (s) => s.replace(CSP_TAG, CSP_TAG.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")),
  "style attribute added": (s) => s.replace("<main", '<main style="color:red"'),
  "onclick handler added": (s) => s.replace("<main", '<main onclick="x()"'),
  "inline script added": (s) => s.replace("</body>", "<script>alert(1)</script></body>"),
  "off-origin stylesheet added": (s) => s.replace("</head>", '<link rel="stylesheet" href="https://example.com/a.css"></head>'),
  "protocol-relative image added": (s) => s.replace("</body>", '<img src="//example.com/a.png"></body>'),
  "style element added": (s) => s.replace("</head>", "<style>body{}</style></head>"),
  "CSP meta moved after a link": (s) => s.replace(CSP_TAG, "").replace("</head>", `${CSP_TAG}</head>`)
};

for (const [name, mutate] of Object.entries(mutations)) {
  test(`the CSP check catches: ${name}`, () => {
    const mutated = mutate(html);
    assert.notEqual(mutated, html);
    assert.ok(cspProblems(mutated).length > 0);
  });
}
