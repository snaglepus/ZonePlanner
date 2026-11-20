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
export const SLOT_MS = 900000;
/** Fractional 15-minute slot of instant t in a day of n slots from t0, or null outside it. */
export const slotAt = (t, t0, n) => (t >= t0 && t < t0 + n * SLOT_MS ? (t - t0) / SLOT_MS : null);
/** Whether an Intl hourCycle is a 12-hour clock; unknown or missing means 24-hour. */
export const hour12For = (hourCycle) => hourCycle === "h11" || hourCycle === "h12";
/** The locale's default clock (undefined: the runtime's locale); hourCycle is only reported when an hour is requested. */
export const localeHour12 = (locale) => hour12For(new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle);
/** A short zone name kept as an abbreviation, or null when empty or GMT/UTC-style ("GMT", "UTC+11", "GMT−3", "GMT+5:45"). */
export const abbrOf = (name) => (!name || /^(GMT|UTC)([+\-−]\d{1,2}(:?\d{2})?)?$/.test(name) ? null : name);
const ABBR_LOCALES = ["en-AU", "en-GB", "en-US"];
const abbrCache = new Map();
const abbrFmt = (locale, tz) => {
  const key = `${locale} ${tz}`;
  if (!abbrCache.has(key)) abbrCache.set(key, new Intl.DateTimeFormat(locale, { timeZone: tz, timeZoneName: "short" }));
  return abbrCache.get(key);
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
/** The zone's abbreviation at t ("AEDT", "PST") from Intl, trying en-AU, en-GB then en-US; null for fixed offsets and GMT-style names. */
export const zoneAbbr = (tz, t) => {
  if (typeof tz === "number") return null;
  for (const locale of ABBR_LOCALES) {
    const part = abbrFmt(locale, tz).formatToParts(new Date(t)).find((x) => x.type === "timeZoneName");
    const abbr = abbrOf(part && part.value);
    if (abbr) return abbr;
  }
  return null;
};
/** Header tag: "AEDT · UTC+11", or the offset alone ("UTC+5:45") when there's no abbreviation. */
export const zoneTag = (tz, t) => {
  const abbr = zoneAbbr(tz, t);
  const off = offLabel(offsetMin(tz, t));
  return abbr ? `${abbr} · ${off}` : off;
};
const dayNumber = (dayKey) => Date.UTC(Math.floor(dayKey / 10000), Math.floor(dayKey / 100) % 100 - 1, dayKey % 100) / 86400000;
/** Calendar days the zone's local date is ahead of the home zone's at t (+1 tomorrow, −1 yesterday). */
export const dayDiff = (tz, homeTz, t) => dayNumber(localParts(tz, t).dayKey) - dayNumber(localParts(homeTz, t).dayKey);

const DAY_MS = 86400000;
/** First UTC offset change in (from, from + spanMs] as {at, before, after}, or null; steps a day at a time, then bisects to the minute. */
export const nextTransition = (tz, from, spanMs) => {
  if (typeof tz === "number") return null;
  const before = offsetMin(tz, from);
  const end = from + spanMs;
  for (let lo = from; lo < end;) {
    let hi = Math.min(lo + DAY_MS, end);
    if (offsetMin(tz, hi) === before) { lo = hi; continue; }
    while (hi - lo > 60000) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (offsetMin(tz, mid) === before) lo = mid; else hi = mid;
    }
    let at = Math.floor(lo / 60000) * 60000 + 60000;
    while (offsetMin(tz, at) === before) at += 60000;
    return { at, before, after: offsetMin(tz, at) };
  }
  return null;
};
/** The zone's standard offset for a UTC year: the lowest offset at 00:00 UTC on the 1st and 15th of each month. */
export const standardOffset = (tz, year) => {
  if (typeof tz === "number") return tz;
  let min = Infinity;
  for (let m = 0; m < 12; m++) for (const d of [1, 15]) min = Math.min(min, offsetMin(tz, Date.UTC(year, m, d)));
  return min;
};
/** Whether the zone is ahead of its standard offset at t; never for fixed offsets. */
export const isDst = (tz, t) => typeof tz !== "number" && offsetMin(tz, t) > standardOffset(tz, new Date(t).getUTCFullYear());
export const WARN_MS = 14 * DAY_MS;
/** Per-zone DST status cached by UTC day: status(tz, now) gives {dst, change}, with change the next offset change within WARN_MS of now, else null. */
export const createDstWatch = ({ transition = nextTransition, standard = standardOffset } = {}) => {
  const cache = new Map();
  let day = null;
  return {
    status(tz, now) {
      const d = Math.floor(now / DAY_MS);
      if (d !== day) { cache.clear(); day = d; }
      if (!cache.has(tz)) {
        const start = d * DAY_MS;
        cache.set(tz, { std: standard(tz, new Date(start).getUTCFullYear()), change: transition(tz, start, 15 * DAY_MS) });
      }
      const { std, change } = cache.get(tz);
      return {
        dst: typeof tz !== "number" && offsetMin(tz, now) > std,
        change: change && now < change.at && change.at <= now + WARN_MS ? change : null
      };
    }
  };
};
/** Local wall-clock time and date of a change, read on the old clock: {h, m, date} with a UTC-based date. */
export const changeWall = ({ at, before }) => {
  const l = new Date(at + before * 60000);
  return { h: l.getUTCHours(), m: l.getUTCMinutes(), date: l };
};
