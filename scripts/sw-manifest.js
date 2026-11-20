// Dev-only: works out the service worker's precache list and content hash.
// Never loaded by the page. Used by scripts/stamp-sw.js and test/sw.test.js.
//
// The list is every local file referenced by index.html (href/src), the
// url()s in styles.css and the static module graph from app.js.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const HASH_LENGTH = 16;

const read = (root, path) => readFileSync(join(root, path), "utf8");

// A reference's repo-relative path, or null when it isn't a local file.
function localPath(ref, from) {
  const value = ref.trim();
  if (!value || value.startsWith("#") || value.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(value)) return null;
  const path = value.split("#")[0];
  if (!path) return null;
  if (path.includes("?")) throw new Error(`${from} references "${value}": query strings are not supported on local assets (the content hash versions the cache)`);
  const url = new URL(path, `file:///${from}`);
  return decodeURIComponent(url.pathname.slice(1));
}

function htmlRefs(src) {
  const body = src.replace(/<!--[\s\S]*?-->/g, "");
  return [...body.matchAll(/(?<=\s)(?:xlink:)?(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi)].map((m) => m[1] ?? m[2] ?? m[3]);
}

function cssRefs(src) {
  const body = src.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...body.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/g)].map((m) => m[1] ?? m[2] ?? m[3]);
}

function jsImports(src) {
  const out = [];
  for (const m of src.matchAll(/\b(?:import|export)\s*(?:[\w$*{}\s,]+?\s*from\s*)?["']([^"']+)["']/g)) out.push(m[1]);
  for (const m of src.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) out.push(m[1]);
  return out.filter((s) => s.startsWith("./") || s.startsWith("../"));
}

/** The sorted, de-duplicated repo-relative paths of every file the page loads. */
export function precacheFiles(root) {
  const files = new Set(["index.html"]);
  const add = (ref, from) => {
    const path = localPath(ref, from);
    if (path === null) return null;
    if (!existsSync(join(root, path))) throw new Error(`${from} references "${ref}", which does not exist`);
    files.add(path);
    return path;
  };
  for (const ref of htmlRefs(read(root, "index.html"))) add(ref, "index.html");
  for (const ref of cssRefs(read(root, "styles.css"))) add(ref, "styles.css");
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    files.add(file);
    for (const spec of jsImports(read(root, file))) walk(add(spec, file));
  };
  if (!existsSync(join(root, "app.js"))) throw new Error(`app.js does not exist`);
  walk("app.js");
  files.delete("sw.js");
  return [...files].sort();
}

/** SHA-256 over each file's path and exact bytes, in list order, cut to HASH_LENGTH hex characters. */
export function versionHash(root, files) {
  const hash = createHash("sha256");
  for (const file of files) {
    const bytes = readFileSync(join(root, file));
    hash.update(`${file}\0${bytes.length}\0`);
    hash.update(bytes);
  }
  return hash.digest("hex").slice(0, HASH_LENGTH);
}
