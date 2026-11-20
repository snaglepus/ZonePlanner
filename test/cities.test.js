import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ABBREVIATIONS, CITIES, COUNTRIES, weekendFor } from "../js/cities.js";
import { PINNED_CITIES } from "../scripts/pinned-cities.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const validTz = (tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } };

test("about 500 cities", () => assert.ok(CITIES.length >= 450 && CITIES.length <= 550, `${CITIES.length}`));

test("about 100 popular cities", () => {
  const n = CITIES.filter((c) => c.popular === true).length;
  assert.ok(n >= 90 && n <= 110, `${n}`);
});

test("every city zone is valid", () => {
  for (const c of CITIES) assert.ok(validTz(c.tz), `${c.name}: ${c.tz}`);
});

test("every country code has a name", () => {
  for (const c of CITIES) assert.ok(Object.hasOwn(COUNTRIES, c.cc), `${c.name}: ${c.cc}`);
});

test("no two cities share a name and zone", () => {
  const keys = CITIES.map((c) => `${c.name}|${c.tz}`);
  assert.equal(new Set(keys).size, keys.length);
});

test("every ascii name is printable ASCII", () => {
  for (const c of CITIES) assert.match(c.ascii, /^[\x20-\x7e]+$/, c.name);
});

test("ranks are unique integers from 1", () => {
  const ranks = CITIES.map((c) => c.rank).sort((a, b) => a - b);
  assert.ok(ranks.every(Number.isInteger));
  assert.deepEqual(ranks, ranks.map((_, i) => i + 1));
});

test("weekends: Fri–Sat for SA, IL, EG; Sat–Sun default", () => {
  for (const cc of ["SA", "IL", "EG"]) assert.deepEqual(weekendFor(cc), [5, 6], cc);
  for (const cc of ["ZZ", "AU"]) assert.deepEqual(weekendFor(cc), [6, 0], cc);
});

test("IST covers India, Ireland and Israel", () => {
  for (const tz of ["Asia/Kolkata", "Europe/Dublin", "Asia/Jerusalem"]) assert.ok(ABBREVIATIONS.IST.includes(tz), tz);
});

test("AEDT includes Sydney", () => assert.ok(ABBREVIATIONS.AEDT.includes("Australia/Sydney")));

test("CST is ambiguous", () => assert.ok(ABBREVIATIONS.CST.length > 1));

test("every abbreviation zone is valid", () => {
  for (const [abbr, zones] of Object.entries(ABBREVIATIONS)) for (const tz of zones) assert.ok(validTz(tz), `${abbr}: ${tz}`);
});

test("all 68 pinned cities keep their name and zone", () => {
  assert.equal(PINNED_CITIES.length, 68);
  for (const [name, , tz] of PINNED_CITIES) assert.ok(CITIES.some((c) => c.name === name && c.tz === tz), `${name} (${tz})`);
  for (const name of ["Bengaluru", "Ho Chi Minh City", "St. John's", "Reykjavík", "Zürich", "Kyiv"]) {
    assert.ok(PINNED_CITIES.some(([n]) => n === name), name);
  }
});

test("curated aliases", () => {
  assert.ok(CITIES.find((c) => c.name === "Bengaluru").aliases.includes("Bangalore"));
  assert.ok(CITIES.find((c) => c.name === "Ho Chi Minh City").aliases.includes("Saigon"));
});

test("js/cities.js is under 80,000 bytes", () => {
  const size = readFileSync(new URL("../js/cities.js", import.meta.url)).length;
  assert.ok(size < 80000, `${size}`);
});

test("index.html does not reference the generator", () => {
  const html = read("index.html");
  assert.ok(!html.includes("build-city-data"));
  assert.ok(!html.includes("scripts/"));
});

test("GeoNames CC BY 4.0 credit in the data and the page", () => {
  for (const path of ["js/cities.js", "index.html"]) {
    const src = read(path);
    assert.ok(src.includes("GeoNames"), path);
    assert.ok(src.includes("CC BY 4.0"), path);
  }
});
