// Zone list rules: the home row is the device zone, the rest are at most 7 user rows. No DOM.

export const MAX_USER_ZONES = 7;

const MAX_OFFSET_MIN = 14 * 60;
const MAX_NAME_LEN = 60;

let supported = new Set();
try { supported = new Set(Intl.supportedValuesOf("timeZone")); } catch { /* constructor check alone */ }
const OFFSET_ID = /^[+-](\d{2})(?::?(\d{2}))?$/;

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
 * entries `{offsetMin}` (integer within ±14:00), in order, cut to `max`. `dropped` counts what the cap removed.
 */
export const userRows = (entries, homeTz, max = MAX_USER_ZONES) => {
  if (!Array.isArray(entries)) return { rows: [], dropped: 0 };
  const ok = [];
  for (const e of entries) {
    if (!isPlainObject(e)) continue;
    if ("tz" in e) {
      if (validTz(e.tz) && e.tz !== homeTz) ok.push({ tz: e.tz, name: typeof e.name === "string" ? cleanName(e.name) : undefined });
    } else if ("offsetMin" in e) {
      if (Number.isInteger(e.offsetMin) && Math.abs(e.offsetMin) <= MAX_OFFSET_MIN) ok.push({ offsetMin: e.offsetMin });
    }
  }
  return { rows: ok.slice(0, max), dropped: Math.max(0, ok.length - max) };
};

/** The share link's `z` value: `<tz>~<name>` per row, each part encoded once, joined with ",". */
export const rowsToLink = (rows) => rows.map((x) => `${encodeURIComponent(x.tz)}~${encodeURIComponent(x.name)}`).join(",");

/** The raw, still-encoded value of `key` in a hash without its leading "#", or null. */
export const rawParam = (hash, key) => {
  const part = hash.split("&").find((p) => p.startsWith(`${key}=`));
  return part === undefined ? null : part.slice(key.length + 1);
};

/** Parses a raw `z` value (decoded exactly once here) into user rows against `homeTz`. */
export const linkToRows = (z, homeTz, max = MAX_USER_ZONES) => {
  const parsed = [];
  for (const s of z.split(",")) {
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
