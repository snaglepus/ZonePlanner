// Dev-only generator for js/cities.js. Never loaded by the page.
//
//   node scripts/build-city-data.js [path-to-cities15000.zip-or-.txt]
//
// With no argument it downloads GeoNames cities15000.zip to the OS temp
// directory. City data from GeoNames (https://www.geonames.org/), licensed
// CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL = "https://download.geonames.org/export/dump/cities15000.zip";
const APP_JS = fileURLToPath(new URL("../app.js", import.meta.url));
const OUT = fileURLToPath(new URL("../js/cities.js", import.meta.url));
const PINNED_COUNT = 68;
const TOTAL = 500;
const POPULAR = 100;

// Curated aliases, keyed by "name|cc": well-known former or English names.
const ALIASES = {
  "Bengaluru|IN": ["Bangalore"],
  "Mumbai|IN": ["Bombay"],
  "Kolkata|IN": ["Calcutta"],
  "Chennai|IN": ["Madras"],
  "Ho Chi Minh City|VN": ["Saigon", "HCMC"],
  "Kyiv|UA": ["Kiev"],
  "Beijing|CN": ["Peking"],
  "Yangon|MM": ["Rangoon"],
  "New York|US": ["NYC", "New York City"],
  "Los Angeles|US": ["LA"],
  "San Francisco|US": ["SF"],
};

// Weekend days by country (0 = Sunday). Source: Wikipedia, "Workweek and
// weekend" (https://en.wikipedia.org/wiki/Workweek_and_weekend), accessed
// 2026-11-19: the summary table (Sunday–Thursday workweek gives a Fri–Sat
// weekend, Saturday–Thursday gives Friday only, Sunday–Friday gives Saturday
// only) and the lead's list of Sunday-only countries. The UAE moved to
// Sat–Sun in 2022, so AE uses the default.
const WEEKENDS = {
  default: [6, 0],
  AF: [5, 6], BD: [5, 6], BH: [5, 6], DZ: [5, 6], EG: [5, 6], IL: [5, 6],
  IQ: [5, 6], JO: [5, 6], KW: [5, 6], LY: [5, 6], MV: [5, 6], OM: [5, 6],
  QA: [5, 6], SA: [5, 6], SD: [5, 6], SY: [5, 6], YE: [5, 6],
  BN: [5, 0],
  DJ: [5], IR: [5], PS: [5], SO: [5],
  NP: [6],
  CO: [0], ER: [0], GQ: [0], IN: [0], MX: [0], PH: [0], UG: [0],
};

// Time zone abbreviations for search. Ambiguous ones list every match.
const ABBREVIATIONS = {
  AEST: ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Hobart"],
  AEDT: ["Australia/Sydney", "Australia/Melbourne", "Australia/Hobart"],
  ACST: ["Australia/Adelaide", "Australia/Darwin"],
  ACDT: ["Australia/Adelaide"],
  AWST: ["Australia/Perth"],
  NZST: ["Pacific/Auckland"],
  NZDT: ["Pacific/Auckland"],
  GMT: ["Europe/London", "Europe/Dublin", "Atlantic/Reykjavik", "Africa/Accra"],
  BST: ["Europe/London", "Asia/Dhaka"],
  IST: ["Asia/Kolkata", "Europe/Dublin", "Asia/Jerusalem"],
  WET: ["Europe/Lisbon", "Atlantic/Canary"],
  WEST: ["Europe/Lisbon", "Atlantic/Canary"],
  CET: ["Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam", "Europe/Brussels", "Europe/Vienna", "Europe/Zurich", "Europe/Stockholm", "Europe/Warsaw"],
  CEST: ["Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam", "Europe/Brussels", "Europe/Vienna", "Europe/Zurich", "Europe/Stockholm", "Europe/Warsaw"],
  EET: ["Europe/Athens", "Europe/Helsinki", "Europe/Kyiv", "Europe/Bucharest", "Africa/Cairo"],
  EEST: ["Europe/Athens", "Europe/Helsinki", "Europe/Kyiv", "Europe/Bucharest", "Africa/Cairo"],
  MSK: ["Europe/Moscow"],
  EST: ["America/New_York", "America/Toronto"],
  EDT: ["America/New_York", "America/Toronto"],
  CST: ["America/Chicago", "America/Mexico_City", "Asia/Shanghai", "Asia/Taipei"],
  CDT: ["America/Chicago"],
  MST: ["America/Denver", "America/Phoenix"],
  MDT: ["America/Denver"],
  PST: ["America/Los_Angeles", "America/Vancouver", "Asia/Manila"],
  PDT: ["America/Los_Angeles", "America/Vancouver"],
  AKST: ["America/Anchorage"],
  AKDT: ["America/Anchorage"],
  HST: ["Pacific/Honolulu"],
  AST: ["America/Halifax", "America/Puerto_Rico", "Asia/Riyadh", "Asia/Baghdad"],
  ADT: ["America/Halifax"],
  NST: ["America/St_Johns"],
  NDT: ["America/St_Johns"],
  JST: ["Asia/Tokyo"],
  KST: ["Asia/Seoul"],
  HKT: ["Asia/Hong_Kong"],
  SGT: ["Asia/Singapore"],
  MYT: ["Asia/Kuala_Lumpur"],
  PHT: ["Asia/Manila"],
  SAST: ["Africa/Johannesburg"],
  WAT: ["Africa/Lagos"],
  EAT: ["Africa/Nairobi"],
  PKT: ["Asia/Karachi"],
  NPT: ["Asia/Kathmandu"],
  ICT: ["Asia/Bangkok", "Asia/Ho_Chi_Minh"],
  WIB: ["Asia/Jakarta"],
  GST: ["Asia/Dubai", "Asia/Muscat"],
  IRST: ["Asia/Tehran"],
  BRT: ["America/Sao_Paulo"],
  ART: ["America/Argentina/Buenos_Aires"],
  UTC: ["UTC"],
};

const fail = (msg) => {
  console.error(`build-city-data: ${msg}`);
  process.exit(1);
};

const fold = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const printable = (s) => /^[\x20-\x7e]+$/.test(s);
const validTz = (tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } };

function pinnedCities() {
  const src = readFileSync(APP_JS, "utf8");
  const block = src.match(/const CITIES = \[([\s\S]*?)\]\.map\(/);
  if (!block) fail("could not find the CITIES list in app.js");
  const triples = [...block[1].matchAll(/\[\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*\]/g)];
  if (triples.length !== PINNED_COUNT) fail(`expected ${PINNED_COUNT} cities in app.js, found ${triples.length}`);
  return triples.map(([, name, , tz]) => ({ name, tz }));
}

async function sourceText(path) {
  let zip = path;
  if (!path) {
    zip = join(tmpdir(), "cities15000.zip");
    try {
      const res = await fetch(SOURCE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
    } catch (e) {
      fail(`download of ${SOURCE_URL} failed (${e.message}). Download it yourself and pass the local path: node scripts/build-city-data.js /path/to/cities15000.zip`);
    }
  }
  try {
    if (zip.endsWith(".zip")) return execFileSync("unzip", ["-p", zip, "cities15000.txt"], { encoding: "utf8", maxBuffer: 1 << 28 });
    return readFileSync(zip, "utf8");
  } catch (e) {
    fail(`could not read ${zip}: ${e.message}`);
  }
}

function parseRows(text) {
  return text.split("\n").filter(Boolean).map((line) => {
    const f = line.split("\t");
    return {
      id: Number(f[0]), name: f[1], asciiname: f[2],
      alts: f[3] ? f[3].split(",") : [], capital: f[7] === "PPLC",
      cc: f[8], pop: Number(f[14]), tz: f[17],
    };
  });
}

const byPop = (a, b) => b.pop - a.pop || a.id - b.id;

function build(rows, pinned) {
  const sorted = rows.filter((r) => r.tz && r.cc).sort(byPop);

  const unmatched = [];
  const picked = pinned.map((p) => {
    const want = fold(p.name);
    const row = sorted.find((r) => r.tz === p.tz && [r.name, r.asciiname, ...r.alts].some((n) => fold(n) === want));
    if (!row) unmatched.push(`${p.name} (${p.tz})`);
    return row && { ...row, name: p.name, tz: p.tz, pinned: true };
  });
  if (unmatched.length) fail(`no GeoNames match for: ${unmatched.join(", ")}`);

  const ids = new Set(picked.map((c) => c.id));
  const keys = new Set(picked.map((c) => `${c.name}|${c.tz}`));
  if (keys.size !== picked.length) fail("app.js has a duplicate name+zone pair");
  const take = (r) => {
    const key = `${r.name}|${r.tz}`;
    if (picked.length >= TOTAL || ids.has(r.id) || keys.has(key)) return;
    ids.add(r.id);
    keys.add(key);
    picked.push({ ...r, pinned: false });
  };
  // The more populous row of a name+zone pair is always seen first.
  const firsts = new Map();
  for (const r of sorted) if (!firsts.has(`${r.name}|${r.tz}`)) firsts.set(`${r.name}|${r.tz}`, r);
  const unique = sorted.filter((r) => firsts.get(`${r.name}|${r.tz}`) === r);
  unique.filter((r) => r.capital).forEach(take);
  unique.forEach(take);
  if (picked.length !== TOTAL) fail(`only ${picked.length} cities available, need ${TOTAL}`);

  const popular = new Set(picked.filter((c) => c.pinned).map((c) => c.id));
  for (const c of [...picked].sort(byPop)) if (popular.size < POPULAR) popular.add(c.id);

  const used = new Set(Object.keys(ALIASES));
  const cities = [...picked].sort(byPop).map((c, i) => {
    const plain = c.name.normalize("NFD").replace(/\p{M}/gu, "");
    const ascii = printable(plain) ? plain : c.asciiname;
    if (!printable(ascii)) fail(`no printable ASCII name for ${c.name}`);
    const aliasKey = `${c.name}|${c.cc}`;
    used.delete(aliasKey);
    return { name: c.name, ascii, aliases: ALIASES[aliasKey] || [], cc: c.cc, tz: c.tz, rank: i + 1, popular: popular.has(c.id) };
  });
  if (used.size) fail(`curated aliases name cities not in the output: ${[...used].join(", ")}`);
  for (const [k, v] of Object.entries(ALIASES)) if (v.length > 3) fail(`more than 3 aliases for ${k}`);

  const badTz = [...new Set([...cities.map((c) => c.tz), ...Object.values(ABBREVIATIONS).flat()])].filter((tz) => !validTz(tz));
  if (badTz.length) fail(`zones rejected by Intl.DateTimeFormat: ${badTz.join(", ")}`);

  const regions = new Intl.DisplayNames(["en"], { type: "region" });
  const countries = {};
  for (const cc of [...new Set(cities.map((c) => c.cc))].sort()) countries[cc] = regions.of(cc).replace(/ SAR China$/, "");

  return { cities, countries };
}

function render({ cities, countries }) {
  const j = JSON.stringify;
  const obj = (o) => `{\n${Object.entries(o).map(([k, v]) => `  ${j(k)}: ${j(v)},`).join("\n")}\n}`;
  return `// Generated by scripts/build-city-data.js. Do not edit by hand; rerun the generator.
// City data from GeoNames (https://www.geonames.org/), licensed CC BY 4.0
// (https://creativecommons.org/licenses/by/4.0/).

export const CITIES = [
${cities.map((c) => `  ${j(c)},`).join("\n")}
];

export const COUNTRIES = ${obj(countries)};

export const WEEKENDS = ${obj(WEEKENDS)};

export const weekendFor = (cc) => (Object.hasOwn(WEEKENDS, cc) ? WEEKENDS[cc] : WEEKENDS.default);

export const ABBREVIATIONS = ${obj(ABBREVIATIONS)};
`;
}

const pinned = pinnedCities();
const text = await sourceText(process.argv[2]);
const out = render(build(parseRows(text), pinned));
writeFileSync(OUT, out);
console.log(`wrote ${OUT} (${Buffer.byteLength(out)} bytes)`);
