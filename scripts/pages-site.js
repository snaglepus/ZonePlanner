// Dev-only: builds the GitHub Pages site. Never loaded by the page.
//
//   node scripts/pages-site.js <out-dir>
//
// The site is every file the page loads (the precache list) plus sw.js,
// copied byte for byte. Used by .github/workflows/deploy.yml.
import { copyFileSync, existsSync, mkdirSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { precacheFiles } from "./sw-manifest.js";

/** The sorted repo-relative paths the Pages site publishes. */
export function siteFiles(root) {
  return [...precacheFiles(root), "sw.js"].sort();
}

/** Copies siteFiles(root) into out, which must not exist yet. Returns the paths. */
export function writeSite(root, out) {
  if (existsSync(out)) throw new Error(`${out} already exists`);
  const files = siteFiles(root);
  for (const file of files) {
    const dest = join(out, file);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(root, file), dest);
  }
  return files;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) {
    console.error("usage: node scripts/pages-site.js <out-dir>");
    process.exit(1);
  }
  try {
    const files = writeSite(fileURLToPath(new URL("..", import.meta.url)), out);
    console.log(`pages site ${out}: ${files.length} files`);
  } catch (err) {
    console.error(`pages-site failed: ${err.message}`);
    process.exit(1);
  }
}
