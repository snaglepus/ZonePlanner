import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { siteFiles, writeSite } from "../scripts/pages-site.js";
import { precacheFiles } from "../scripts/sw-manifest.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const workflow = readFileSync(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");

// Every file under dir, as sorted paths relative to it.
function listFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => relative(dir, join(d.parentPath, d.name)).split("\\").join("/"))
    .sort();
}

// Each run: script's body (the inline value or the indented block under it).
function runScripts(src) {
  const lines = src.split("\n");
  const out = [];
  lines.forEach((line, i) => {
    const m = line.match(/^(\s*)(?:- )?run:\s*(.*)$/);
    if (!m) return;
    const indent = m[1].length;
    const body = [m[2]];
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j];
      if (next.trim() && next.search(/\S/) <= indent) break;
      body.push(next);
    }
    out.push(body.join("\n"));
  });
  return out;
}

const count = (src, needle) => src.split(needle).length - 1;

test("siteFiles is the precache list plus sw.js, sorted", () => {
  const files = siteFiles(ROOT);
  assert.deepEqual(files, [...precacheFiles(ROOT), "sw.js"].sort());
  for (const f of ["index.html", "sw.js", "app.js", "styles.css"]) assert.ok(files.includes(f), f);
  for (const f of files) {
    assert.doesNotMatch(f, /^(factory|docs|\.claude|\.github|test|scripts|e2e)\//, f);
    assert.ok(!["package.json", "AGENTS.md", "PRODUCT.md"].includes(f), f);
  }
});

test("writeSite copies exactly the site files, byte for byte, into a new directory", () => {
  const tmp = mkdtempSync(join(tmpdir(), "zoneplanner-pages-"));
  try {
    const out = join(tmp, "site");
    writeSite(ROOT, out);
    const files = siteFiles(ROOT);
    assert.deepEqual(listFiles(out), files);
    for (const f of files) assert.ok(readFileSync(join(out, f)).equals(readFileSync(join(ROOT, f))), f);
    assert.throws(() => writeSite(ROOT, out), /already exists/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("every action is GitHub-owned and pinned to a full commit SHA", () => {
  const uses = [...workflow.matchAll(/^\s*(?:- )?uses:\s*(.*)$/gm)].map((m) => m[1].replace(/\s+#.*$/, "").trim());
  assert.ok(uses.length > 0);
  for (const u of uses) assert.match(u, /^actions\/[A-Za-z0-9-]+@[0-9a-f]{40}$/);
});

test("the workflow has no PR triggers or secrets and runs only on push and workflow_dispatch", () => {
  assert.ok(!workflow.includes("pull_request"));
  assert.ok(!workflow.includes("secrets."));
  const on = workflow.match(/^on:\n((?:[ \t]+.*\n|\n)*)/m);
  assert.ok(on, "no on: block");
  const events = [...on[1].matchAll(/^  ([\w-]+):/gm)].map((m) => m[1]);
  assert.deepEqual(events.sort(), ["push", "workflow_dispatch"]);
});

test("permissions are read-only by default and Pages write only once", () => {
  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.equal(count(workflow, "id-token: write"), 1);
  assert.equal(count(workflow, "pages: write"), 1);
});

test("the workflow runs the checks and builds the site", () => {
  assert.ok(workflow.includes("bash factory/checks.sh"));
  assert.ok(workflow.includes("node scripts/pages-site.js"));
});

test("runs queue per ref and are never cancelled", () => {
  assert.ok(workflow.includes("cancel-in-progress: false"));
  assert.ok(workflow.includes("queue: max"));
  assert.ok(workflow.includes("group: pages-${{ github.ref }}"));
  assert.ok(!workflow.includes("cancel-in-progress: true"));
});

test("publishing is gated on the freshness check", () => {
  assert.ok(workflow.includes("heads/main"));
  assert.ok(workflow.includes("$GITHUB_SHA"));
  assert.ok(workflow.includes("set -euo pipefail"));
  assert.equal(count(workflow, "steps.fresh.outputs.current == 'true'"), 2);
  const fresh = workflow.indexOf("id: fresh");
  assert.ok(fresh !== -1 && fresh < workflow.indexOf("actions/upload-pages-artifact"));
});

test("no run: script contains an expression", () => {
  const scripts = runScripts(workflow);
  assert.ok(scripts.length > 0);
  for (const s of scripts) assert.ok(!s.includes("${{"), s);
});
