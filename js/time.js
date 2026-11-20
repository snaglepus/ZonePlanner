// Time engine: pure functions over Intl.DateTimeFormat, no DOM.

// Business 09–17, edge 06–09 & 17–20, everything else inconvenient.
export const BAND = { biz: 2, edge: 1, night: 0 };
export const BAND_NAME = { 2: "biz", 1: "edge", 0: "night" };
export const classify = (minuteOfDay) => {
  if (minuteOfDay >= 540 && minuteOfDay < 1020) return BAND.biz;
  if ((minuteOfDay >= 360 && minuteOfDay < 540) || (minuteOfDay >= 1020 && minuteOfDay < 1200)) return BAND.edge;
  return BAND.night;
};

export const fmtCache = new Map();
export const partsFmt = (tz) => {
  if (!fmtCache.has(tz)) {
    fmtCache.set(tz, new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }));
  }
  return fmtCache.get(tz);
};
/** Minutes the zone is ahead of UTC at instant t. */
export const offsetMin = (tz, t) => {
  const p = {};
  for (const { type, value } of partsFmt(tz).formatToParts(new Date(t))) p[type] = value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUTC - Math.floor(t / 1000) * 1000) / 60000);
};
/** UTC instant of local midnight on y-m-d in tz. */
export const zonedMidnight = (tz, y, m, d) => {
  const wall = Date.UTC(y, m - 1, d);
  let t = wall - offsetMin(tz, wall) * 60000;
  t = wall - offsetMin(tz, t) * 60000;
  return t;
};
export const localParts = (tz, t) => {
  const off = offsetMin(tz, t);
  const l = new Date(t + off * 60000);
  return { h: l.getUTCHours(), m: l.getUTCMinutes(), mod: l.getUTCHours() * 60 + l.getUTCMinutes(), dayKey: l.getUTCFullYear() * 10000 + (l.getUTCMonth() + 1) * 100 + l.getUTCDate(), date: l, off };
};
export const pad = (n) => String(n).padStart(2, "0");
export const hhmm = (p) => `${pad(p.h)}:${pad(p.m)}`;
export const offLabel = (off) => {
  const s = off < 0 ? "−" : "+";
  const a = Math.abs(off);
  return `UTC${s}${Math.floor(a / 60)}${a % 60 ? ":" + pad(a % 60) : ""}`;
};
export const weekday = (d) => d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
