import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const root = css.match(/:root\s*\{([^}]*)\}/)[1];
const tokens = Object.fromEntries([...root.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));
const HEAT = ["good-1", "good-1-hatch", "good-2", "good-2-hatch", "good-3", "good-3-hatch"];

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lin = (c) => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const luminance = (hex) => { const [r, g, b] = rgb(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const dist = (a, b) => { const p = rgb(a), q = rgb(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

test("the six Good heat tokens are defined on :root", () => {
  for (const name of HEAT) assert.match(tokens[name] ?? "", /^#/, `--${name}`);
});

test("ink reaches 4.5:1 on the card and on every heat step", () => {
  for (const name of ["card", ...HEAT]) {
    assert.ok(contrast(tokens.ink, tokens[name]) >= 4.5, `--ink on --${name}: ${contrast(tokens.ink, tokens[name]).toFixed(2)}`);
  }
});

test("heat steps run from Best to Unsuitable", () => {
  assert.ok(dist(tokens["good-1"], tokens.best) < dist(tokens["good-3"], tokens.best), "step 1 nearer Best than step 3");
  assert.ok(dist(tokens["good-3"], tokens.night) < dist(tokens["good-1"], tokens.night), "step 3 nearer Unsuitable than step 1");
});

test("the old --biz and --edge tokens are gone", () => {
  assert.doesNotMatch(css, /--(biz|edge|edge-hatch)\b/);
});
