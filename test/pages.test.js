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

// Each 2-space-indented key under jobs: mapped to its indented block, in file order.
function jobs(src) {
  const block = src.match(/^jobs:\n((?:[ \t]+.*\n|\n)*)/m);
  assert.ok(block, "no jobs: block");
  const out = new Map();
  let name = null;
  for (const line of block[1].split("\n")) {
    const m = line.match(/^  ([\w-]+):\s*$/);
    if (m) {
      name = m[1];
      out.set(name, "");
    } else if (name) out.set(name, out.get(name) + line + "\n");
  }
  return out;
}

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
  const upload = jobs(workflow).get("upload");
  const fresh = upload.indexOf("id: fresh");
  assert.ok(fresh !== -1 && fresh < upload.indexOf("actions/upload-pages-artifact"));
  assert.match(upload, /actions\/upload-pages-artifact@\S+.*\n\s+if: steps\.fresh\.outputs\.current == 'true'\n/);
  assert.match(upload, /^    outputs:\n(?:      .*\n)*      current: \$\{\{ steps\.fresh\.outputs\.current \}\}\n/m);
  assert.match(upload, /^    outputs:\n(?:      .*\n)*      attempt: \$\{\{ github\.run_attempt \}\}\n/m);
});

test("the upload and the deploy run in separate jobs", () => {
  const all = jobs(workflow);
  assert.deepEqual([...all.keys()], ["test", "upload", "deploy"]);
  for (const [name, body] of all) {
    assert.equal(body.includes("actions/upload-pages-artifact"), name === "upload", name);
    assert.equal(body.includes("actions/deploy-pages"), name === "deploy", name);
  }
  const deploy = all.get("deploy");
  for (const s of ["actions/checkout", "actions/setup-node", "actions/upload-pages-artifact", "run:", "pages-site.js"]) {
    assert.ok(!deploy.includes(s), s);
  }
});

test("the deploy runs only after a fresh upload in the same attempt", () => {
  const deploy = jobs(workflow).get("deploy");
  assert.match(deploy, /^    needs: upload$/m);
  const cond = deploy.match(/^    if: (.*)$/m);
  assert.ok(cond, "deploy has no if:");
  for (const s of [
    "github.ref == 'refs/heads/main'",
    "needs.upload.outputs.current == 'true'",
    "needs.upload.outputs.attempt == github.run_attempt",
  ]) {
    assert.ok(cond[1].includes(s), s);
  }
});

test("only the deploy job can write to Pages", () => {
  const all = jobs(workflow);
  assert.equal(count(workflow, "pages: write"), 1);
  assert.equal(count(workflow, "id-token: write"), 1);
  assert.ok(all.get("deploy").includes("pages: write"));
  assert.ok(all.get("deploy").includes("id-token: write"));
  assert.match(all.get("upload"), /^    permissions:\n      contents: read\n    (?! )/m);
});

test("no run: script contains an expression", () => {
  const scripts = runScripts(workflow);
  assert.ok(scripts.length > 0);
  for (const s of scripts) assert.ok(!s.includes("${{"), s);
});
