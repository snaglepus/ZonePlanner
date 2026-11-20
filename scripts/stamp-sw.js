// Dev-only: stamps VERSION and PRECACHE into sw.js. Never loaded by the page.
//
//   npm run sw:stamp
//
// Rerun it after any change to a file the page loads, and commit the result.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { precacheFiles, versionHash } from "./sw-manifest.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SW = fileURLToPath(new URL("../sw.js", import.meta.url));
const VERSION_LINE = /^const VERSION = .*;$/m;
const PRECACHE_LINE = /^const PRECACHE = .*;$/m;

try {
  const files = precacheFiles(ROOT);
  const version = versionHash(ROOT, files);
  const src = readFileSync(SW, "utf8");
  if (!VERSION_LINE.test(src) || !PRECACHE_LINE.test(src)) throw new Error("sw.js has no VERSION or PRECACHE line to stamp");
  const out = src
    .replace(VERSION_LINE, `const VERSION = ${JSON.stringify(version)};`)
    .replace(PRECACHE_LINE, `const PRECACHE = ${JSON.stringify(files)};`);
  if (out !== src) writeFileSync(SW, out);
  console.log(`sw.js ${version}: ${files.length} files`);
} catch (err) {
  console.error(`sw:stamp failed: ${err.message}`);
  process.exit(1);
}
