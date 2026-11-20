// Zone list rules: the home row is the device zone, the rest are at most 7 user rows. No DOM.

export const MAX_USER_ZONES = 7;

export const validTz = (tz) => {
  if (typeof tz !== "string" || !tz) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
};

/** Valid user rows in order, minus the home zone, cut to `max`. `dropped` counts what the cap removed. */
export const userRows = (entries, homeTz, max = MAX_USER_ZONES) => {
  const ok = entries
    .filter((e) => e !== null && typeof e === "object" && validTz(e.tz) && e.tz !== homeTz)
    .map((e) => ({ tz: e.tz, name: typeof e.name === "string" ? e.name : undefined }));
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
      const name = cut < 0 ? undefined : decodeURIComponent(s.slice(cut + 1)).slice(0, 60);
      parsed.push({ tz, name });
    } catch { /* malformed entry: discard */ }
  }
  return userRows(parsed, homeTz, max);
};

/** User rows after the device moves to `newHomeTz`: any row in that zone goes, the rest keep their order. */
export const followHome = (rows, newHomeTz) => rows.filter((r) => r.tz !== newHomeTz);
