// Zone list rules: the home row is the device zone, the rest are at most 7 user rows. No DOM.

export const MAX_USER_ZONES = 7;

const MAX_OFFSET_MIN = 14 * 60;
const MAX_NAME_LEN = 60;

let supported = new Set();
try { supported = new Set(Intl.supportedValuesOf("timeZone")); } catch { /* constructor check alone */ }
const OFFSET_ID = /^[+-](\d{2})(?::?(\d{2}))?$/;
const OFFSET_TEXT = /^(?:(?:gmt|utc)\s*)?(?:([+\-\u2212])(\d{1,2})(?::(\d{2}))?|([+\-\u2212])(\d{2})(\d{2}))$/i;

/** Minutes from UTC typed as `GMT+11`, `UTC-7`, `+5:30` or `-0330` (bare `GMT`/`UTC` is 0); null otherwise. */
export const parseOffset = (text) => {
  const t = String(text).trim();
  if (/^(?:gmt|utc)$/i.test(t)) return 0;
  const m = OFFSET_TEXT.exec(t);
  if (!m) return null;
  const sign = m[1] ?? m[4];
  const h = +(m[2] ?? m[5]);
  const min = +(m[3] ?? m[6] ?? 0);
  if (min % 15 !== 0 || min >= 60) return null;
  const total = h * 60 + min;
  if (total > MAX_OFFSET_MIN) return null;
  return sign === "+" || !total ? total : -total;
};

/** A zone ID the engine knows (listed or accepted by the constructor); offset-form IDs only within ±14:00. */
export const validTz = (tz) => {
  if (typeof tz !== "string" || !tz) return false;
  const m = OFFSET_ID.exec(tz);
  if (m && +m[1] * 60 + +(m[2] || 0) > MAX_OFFSET_MIN) return false;
  if (supported.has(tz)) return true;
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
};

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const loneSurrogate = (c) => c.length === 1 && c >= "\ud800" && c <= "\udfff";
/** Name without lone surrogates, cut to 60 code points, so it is always well-formed. */
const cleanName = (name) => Array.from(name).filter((c) => !loneSurrogate(c)).slice(0, MAX_NAME_LEN).join("");

/**
 * The one validator for stored and link entries: zone entries `{tz, name}` (valid, not home) and offset
 * entries `{offsetMin}` (a multiple of 15 within ±14:00), in order, cut to `max`. `dropped` counts what the cap removed.
 */
export const userRows = (entries, homeTz, max = MAX_USER_ZONES) => {
  if (!Array.isArray(entries)) return { rows: [], dropped: 0 };
  const ok = [];
  for (const e of entries) {
    if (!isPlainObject(e)) continue;
    if ("tz" in e) {
      if (validTz(e.tz) && e.tz !== homeTz) ok.push({ tz: e.tz, name: typeof e.name === "string" ? cleanName(e.name) : undefined });
    } else if ("offsetMin" in e) {
      if (Number.isInteger(e.offsetMin) && e.offsetMin % 15 === 0 && Math.abs(e.offsetMin) <= MAX_OFFSET_MIN) ok.push({ offsetMin: e.offsetMin });
    }
  }
  return { rows: ok.slice(0, max), dropped: Math.max(0, ok.length - max) };
};

/** The share link's `z` value: `<tz>~<name>` per row (each part encoded once) or `@<minutes>` per offset row, joined with ",". */
export const rowsToLink = (rows) => rows.map((x) => ("offsetMin" in x ? `@${x.offsetMin}` : `${encodeURIComponent(x.tz)}~${encodeURIComponent(x.name)}`)).join(",");

/** The raw, still-encoded value of `key` in a hash without its leading "#", or null. */
export const rawParam = (hash, key) => {
  const part = hash.split("&").find((p) => p.startsWith(`${key}=`));
  return part === undefined ? null : part.slice(key.length + 1);
};

/** Parses a raw `z` value (decoded exactly once here) into user rows against `homeTz`. */
export const linkToRows = (z, homeTz, max = MAX_USER_ZONES) => {
  const parsed = [];
  for (const s of z.split(",")) {
    const off = /^@(-?\d{1,3})$/.exec(s);
    if (off) { parsed.push({ offsetMin: Number(off[1]) }); continue; }
    const cut = s.indexOf("~");
    try {
      const tz = decodeURIComponent(cut < 0 ? s : s.slice(0, cut));
      const name = cut < 0 ? undefined : decodeURIComponent(s.slice(cut + 1));
      parsed.push({ tz, name });
    } catch { /* malformed entry: discard */ }
  }
  return userRows(parsed, homeTz, max);
};

/** User rows after the device moves to `newHomeTz`: any row in that zone goes, the rest keep their order. */
export const followHome = (rows, newHomeTz) => rows.filter((r) => r.tz !== newHomeTz);
