// Weekend rules: which slots fall on a zone's weekend, and scoring them as Unsuitable. No DOM.
import { BAND, localParts } from "./time.js";
import { weekendFor } from "./cities.js";

const SLOT_MS = 15 * 60000;

/** Per 15-minute slot from t0: true when the local weekday in tz is a weekend day for country cc (Sat-Sun when unknown). */
export const weekendSlots = (tz, cc, t0, n) => {
  const days = weekendFor(cc);
  return Array.from({ length: n }, (_, i) => days.includes(localParts(tz, t0 + i * SLOT_MS).date.getUTCDay()));
};

/** A copy of bands with every weekend slot scored Unsuitable. */
export const scoredBands = (bands, weekend) => bands.map((b, i) => (weekend[i] ? BAND.night : b));

/** Per-slot minimum of each row's scored bands: the Everyone row. */
export const overlapBands = (rows) => {
  const scored = rows.map((r) => scoredBands(r.bands, r.weekend));
  const n = rows.length ? rows[0].bands.length : 0;
  return Array.from({ length: n }, (_, i) => Math.min(...scored.map((s) => s[i])));
};
