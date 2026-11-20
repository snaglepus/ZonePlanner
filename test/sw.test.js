import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { precacheFiles, versionHash } from "../scripts/sw-manifest.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const STAMP = "run `npm run sw:stamp` and commit sw.js";

const stamped = (name) => {
  const m = sw.match(new RegExp(`^const ${name} = (.*);$`, "m"));
  assert.ok(m, `sw.js has no ${name} line`);
  return JSON.parse(m[1]);
};

// A throwaway site in the OS temp directory; files maps paths to contents.
function fixture(files, fn) {
  const dir = mkdtempSync(join(tmpdir(), "zp-sw-"));
  try {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const SITE = {
  "index.html": `<!doctype html>
<link rel="icon" href="data:image/svg+xml,%3Csvg%3E%3C/svg%3E">
<link rel="stylesheet" href="styles.css">
<link rel="preconnect" href="https://example.com">
<img src="//example.com/x.png">
<img src="img/logo.png#frag">
<svg><use href="#i-x"></use></svg>
<script type="module" src="app.js"></script>`,
  "styles.css": `/* url("ignored.woff2") */
@font-face { src: url("fonts/a.woff2") format("woff2"); }
.x { background: url(data:image/png;base64,AAAA); }
.y { background: url('https://example.com/b.png'); }
.z { mask: url(#m); }`,
  "app.js": `import { b } from "./js/b.js";\nimport "./js/side.js";\nconsole.log(b);\n`,
  "js/b.js": `export { c } from "../lib/c.js";\nexport const b = 1;\n`,
  "js/side.js": `const m = () => import("./lazy.js");\n`,
  "js/lazy.js": ``,
  "lib/c.js": `export const c = 2;\n`,
  "img/logo.png": "png",
  "fonts/a.woff2": "font",
  "sw.js": "",
};

test(`sw.js PRECACHE matches the files the page loads (${STAMP})`, () => {
  assert.deepEqual(stamped("PRECACHE"), precacheFiles(ROOT), `sw.js PRECACHE is stale: ${STAMP}`);
});

test(`sw.js VERSION matches the precached content (${STAMP})`, () => {
  const precache = stamped("PRECACHE");
  assert.match(stamped("VERSION"), /^[0-9a-f]{12,16}$/);
  assert.equal(stamped("VERSION"), versionHash(ROOT, precache), `sw.js VERSION is stale: ${STAMP}`);
});

test("PRECACHE is sorted, unique and relative", () => {
  const precache = stamped("PRECACHE");
  assert.deepEqual(precache, [...new Set(precache)].sort());
  for (const url of precache) assert.doesNotMatch(url, /^(\.\/|\/)/, url);
  assert.ok(!precache.includes("sw.js"));
});

test("sw.js has no storage, takeover or absolute URLs", () => {
  assert.doesNotMatch(sw, /localStorage/);
  assert.doesNotMatch(sw, /skipWaiting/);
  assert.doesNotMatch(sw, /clients\.claim/);
  assert.doesNotMatch(sw, /https?:/);
});

test("manifest follows html, css and the module graph", () => fixture(SITE, (dir) => {
  assert.deepEqual(precacheFiles(dir), [
    "app.js", "fonts/a.woff2", "img/logo.png", "index.html", "js/b.js", "js/lazy.js", "js/side.js", "lib/c.js", "styles.css",
  ]);
}));

test("manifest rejects a local reference with a query string", () => {
  const cases = [
    { "index.html": SITE["index.html"].replace('href="styles.css"', 'href="styles.css?v=2"') },
    { "styles.css": SITE["styles.css"].replace('"fonts/a.woff2"', '"fonts/a.woff2?v=2"') },
    { "js/b.js": SITE["js/b.js"].replace('"../lib/c.js"', '"../lib/c.js?v=2"') },
  ];
  for (const change of cases) {
    fixture({ ...SITE, ...change }, (dir) => assert.throws(() => precacheFiles(dir), /\?v=2.*query strings are not supported/));
  }
});

test("manifest rejects a missing file", () => fixture(SITE, (dir) => {
  rmSync(join(dir, "fonts/a.woff2"));
  assert.throws(() => precacheFiles(dir), /fonts\/a\.woff2.*does not exist/);
}));

test("changing one byte or a name changes the hash", () => fixture(SITE, (dir) => {
  const files = precacheFiles(dir);
  const before = versionHash(dir, files);
  assert.equal(versionHash(dir, files), before);
  writeFileSync(join(dir, "lib/c.js"), "export const c = 3;\n");
  assert.notEqual(versionHash(dir, files), before);
  writeFileSync(join(dir, "lib/c.js"), "export const c = 2;\n");
  assert.equal(versionHash(dir, files), before);
  writeFileSync(join(dir, "lib/d.js"), "export const c = 2;\n");
  assert.notEqual(versionHash(dir, files.map((f) => (f === "lib/c.js" ? "lib/d.js" : f))), before);
}));
