// Time engine: pure functions over Intl.DateTimeFormat, no DOM.
// A zone is an IANA ID string or a fixed offset as a number of minutes from UTC.

// Best 09–17, Good 06–09 & 17–20, everything else Unsuitable.
export const BAND = { biz: 2, edge: 1, night: 0 };
export const BAND_NAME = { 2: "biz", 1: "edge", 0: "night" };
export const classify = (minuteOfDay) => {
  if (minuteOfDay >= 540 && minuteOfDay < 1020) return BAND.biz;
  if ((minuteOfDay >= 360 && minuteOfDay < 540) || (minuteOfDay >= 1020 && minuteOfDay < 1200)) return BAND.edge;
  return BAND.night;
};
/** Good-hours heat step: hours from the Best window (1 nearest, 3 farthest), 0 outside Good. */
export const goodStep = (minuteOfDay) => {
  if (classify(minuteOfDay) !== BAND.edge) return 0;
  return minuteOfDay < 540 ? Math.ceil((540 - minuteOfDay) / 60) : Math.floor((minuteOfDay - 1020) / 60) + 1;
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
/** Minutes the zone (IANA ID or fixed minutes) is ahead of UTC at instant t. */
export const offsetMin = (tz, t) => {
  if (typeof tz === "number") return tz;
  const p = {};
  for (const { type, value } of partsFmt(tz).formatToParts(new Date(t))) p[type] = value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUTC - Math.floor(t / 1000) * 1000) / 60000);
};
/** UTC instant of local midnight on y-m-d in tz (IANA ID or fixed minutes). */
export const zonedMidnight = (tz, y, m, d) => {
  const wall = Date.UTC(y, m - 1, d);
  let t = wall - offsetMin(tz, wall) * 60000;
  t = wall - offsetMin(tz, t) * 60000;
  return t;
};
/** Local wall-clock parts at t in tz (IANA ID or fixed minutes). */
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
const MINUTE = 60000;
const SLOT = 15 * MINUTE;
/** First whole minute in (a, b] whose local date differs from a's, where a and b are whole minutes on different dates. */
const dateChange = (tz, a, b) => {
  const k = localParts(tz, a).dayKey;
  while (b - a > MINUTE) {
    const mid = a + Math.floor((b - a) / MINUTE / 2) * MINUTE;
    if (localParts(tz, mid).dayKey === k) a = mid;
    else b = mid;
  }
  return b;
};
/** First instant of y-m-d in tz, even where local midnight doesn't exist. */
const dateStart = (tz, y, m, d) => {
  const key = y * 10000 + m * 100 + d;
  const t = zonedMidnight(tz, y, m, d);
  if (localParts(tz, t).dayKey >= key) return t;
  let b = t + SLOT;
  while (localParts(tz, b).dayKey < key) b += SLOT;
  return dateChange(tz, b - SLOT, b);
};
/** Home-zone day on y-m-d: where its date starts and ends, 15-minute slots and hour columns (23–25 on DST days). */
export const homeDay = (tz, y, m, d) => {
  const t0 = dateStart(tz, y, m, d);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const t1 = dateStart(tz, next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
  const slots = Math.round((t1 - t0) / 900000);
  return { t0, t1, slots, cols: Math.ceil(slots / 4) };
};
/** Local time at t in tz (IANA ID or fixed minutes) as a grid cell label: "9", "3:30", "3:45". */
export const cellLabel = (tz, t) => {
  const p = localParts(tz, t);
  return p.m ? `${p.h}:${pad(p.m)}` : String(p.h);
};
/** Every instant in [t0, t1) where tz's local date changes, to the minute, with that date's weekday and day in locale. */
export const dayStarts = (tz, t0, t1, locale) => {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", timeZone: typeof tz === "number" ? "UTC" : tz });
  const label = (t) => fmt.format(typeof tz === "number" ? t + tz * MINUTE : t);
  const out = [];
  if (localParts(tz, t0 - MINUTE).dayKey !== localParts(tz, t0).dayKey) out.push(t0);
  const samples = [];
  for (let t = t0; t < t1; t += SLOT) samples.push(t);
  if (t1 - MINUTE > samples[samples.length - 1]) samples.push(t1 - MINUTE);
  for (let i = 1; i < samples.length; i++) {
    if (localParts(tz, samples[i - 1]).dayKey !== localParts(tz, samples[i]).dayKey) out.push(dateChange(tz, samples[i - 1], samples[i]));
  }
  return out.map((t) => ({ t, label: label(t) }));
};
