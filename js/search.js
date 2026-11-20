// City search and zone naming over the bundled data. DOM-free; the caller
// passes in the zone list (Intl.supportedValuesOf) so this imports in Node.
import { CITIES, COUNTRIES, ABBREVIATIONS } from "./cities.js";
import { parseOffset } from "./zones.js";

// The engine's id for a zone, so aliases match: Chrome and Node report
// Asia/Kolkata as Asia/Calcutta.
const CANON = new Map();
const canon = (tz) => {
  if (!CANON.has(tz)) {
    try { CANON.set(tz, new Intl.DateTimeFormat("en", { timeZone: tz }).resolvedOptions().timeZone); } catch { CANON.set(tz, tz); }
  }
  return CANON.get(tz);
};

const byRank = CITIES.slice().sort((a, b) => a.rank - b.rank);
// Top-ranked city for each zone (byRank sees it first), keyed by canon(tz).
const TOP = new Map();
for (const c of byRank) if (!TOP.has(canon(c.tz))) TOP.set(canon(c.tz), c);
const topCity = (tz) => TOP.get(canon(tz));
const ABBR = new Map(Object.entries(ABBREVIATIONS).map(([k, zones]) => [k.toLowerCase(), zones]));

export const norm = (s) => s.trim().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const prettyTz = (tz) => tz.split("/").pop().replace(/_/g, " ");
const tzCountry = (tz) => tz.split("/")[0].replace(/_/g, " ");
const entry = (c) => ({ name: c.name, country: COUNTRIES[c.cc] ?? "", tz: c.tz });
const zoneEntry = (tz) => (topCity(tz) ? entry(topCity(tz)) : { name: prettyTz(tz), country: tzCountry(tz), tz });

/** Row naming: a known name keeps its city's country, an unknown one is kept with no country. */
export const zoneInfo = (tz, name) => {
  if (name) {
    const c = CITIES.find((x) => x.tz === tz && x.name === name);
    return { tz, name, country: c ? COUNTRIES[c.cc] ?? "" : "" };
  }
  const c = topCity(tz);
  return c ? { tz, name: c.name, country: COUNTRIES[c.cc] ?? "" } : { tz, name: prettyTz(tz), country: "" };
};

export const abbreviationZones = (query) => ABBR.get(query.trim().toLowerCase()) ?? [];

/**
 * Ordered results for the Add City sheet: popular cities for a blank query;
 * otherwise a typed offset (`{offsetMin}`), abbreviation options, then name prefix, then substring matches,
 * then zones with no bundled city. Groups after the first are cut to `limit`.
 */
export const searchCities = (query, { zones = [], limit = 50 } = {}) => {
  const q = norm(query);
  if (!q) return byRank.filter((c) => c.popular).map(entry);
  const names = (c) => [c.name, c.ascii, ...c.aliases].map(norm);
  const abbr = abbreviationZones(query).map(zoneEntry);
  const prefix = byRank.filter((c) => names(c).some((n) => n.startsWith(q)));
  const sub = byRank.filter((c) => [...names(c), norm(COUNTRIES[c.cc] ?? ""), norm(c.tz)].some((n) => n.includes(q)));
  const bare = zones.filter((tz) => !topCity(tz)).map((tz) => ({ name: prettyTz(tz), country: tzCountry(tz), tz }))
    .filter((z) => [z.name, z.country, z.tz].some((s) => norm(s).includes(q)));
  const seen = new Set();
  const fresh = (e) => { const k = `${e.name}|${e.tz}`; if (seen.has(k)) return false; seen.add(k); return true; };
  const off = parseOffset(query);
  const head = [...(off === null ? [] : [{ offsetMin: off }]), ...abbr.filter(fresh)];
  const rest = [...prefix.map(entry), ...sub.map(entry), ...bare].filter(fresh).slice(0, limit);
  return [...head, ...rest];
};
