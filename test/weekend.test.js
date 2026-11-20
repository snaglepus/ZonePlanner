import { test } from "node:test";
import assert from "node:assert/strict";
import { BAND, classify, homeDay, localParts } from "../js/time.js";
import { zoneInfo } from "../js/search.js";
import { overlapBands, scoredBands, weekendSlots } from "../js/weekend.js";

const SLOT_MS = 15 * 60000;
// 2026-01-15 is a Thursday.
const DAYS = { Thu: 15, Fri: 16, Sat: 17, Sun: 18, Mon: 19 };
/** Weekend slots for tz/cc over tz's own day, so every slot is that local weekday. */
const ownDay = (tz, cc, day) => {
  const { t0, slots } = homeDay(tz, 2026, 1, DAYS[day]);
  return weekendSlots(tz, cc, t0, slots);
};
const all = (arr) => arr.length > 0 && arr.every(Boolean);
const none = (arr) => arr.length > 0 && !arr.some(Boolean);
const row = (tz, cc, t0, n) => {
  const bands = Array.from({ length: n }, (_, i) => classify(localParts(tz, t0 + i * SLOT_MS).mod));
  return { bands, weekend: weekendSlots(tz, cc, t0, n) };
};

test("SA marks Friday and Saturday", () => {
  assert.ok(none(ownDay("Asia/Riyadh", "SA", "Thu")));
  assert.ok(all(ownDay("Asia/Riyadh", "SA", "Fri")));
  assert.ok(all(ownDay("Asia/Riyadh", "SA", "Sat")));
  assert.ok(none(ownDay("Asia/Riyadh", "SA", "Sun")));
});

test("GB marks Saturday and Sunday", () => {
  assert.ok(none(ownDay("Europe/London", "GB", "Fri")));
  assert.ok(all(ownDay("Europe/London", "GB", "Sat")));
  assert.ok(all(ownDay("Europe/London", "GB", "Sun")));
  assert.ok(none(ownDay("Europe/London", "GB", "Mon")));
});

test("a single-day country (IN) marks only Sunday", () => {
  for (const d of ["Thu", "Fri", "Sat", "Mon"]) assert.ok(none(ownDay("Asia/Kolkata", "IN", d)), d);
  assert.ok(all(ownDay("Asia/Kolkata", "IN", "Sun")));
});

test("an empty, missing or unknown country uses Sat-Sun", () => {
  for (const cc of ["", undefined, "ZZ"]) {
    assert.ok(none(ownDay("Asia/Riyadh", cc, "Fri")), String(cc));
    assert.ok(all(ownDay("Asia/Riyadh", cc, "Sat")), String(cc));
    assert.ok(all(ownDay("Asia/Riyadh", cc, "Sun")), String(cc));
    assert.ok(none(ownDay("Asia/Riyadh", cc, "Mon")), String(cc));
  }
});

test("an IANA-only zone has no country and uses Sat-Sun", () => {
  const z = zoneInfo("Australia/Hobart");
  assert.equal(z.cc, "");
  assert.ok(none(ownDay(z.tz, z.cc, "Fri")));
  assert.ok(all(ownDay(z.tz, z.cc, "Sat")));
  assert.ok(all(ownDay(z.tz, z.cc, "Sun")));
  assert.ok(none(ownDay(z.tz, z.cc, "Mon")));
});

test("an alias zone (Asia/Calcutta) with IN marks Sunday, not Saturday", () => {
  // London's Saturday runs from Calcutta Saturday 05:30 into Calcutta Sunday.
  const { t0, slots } = homeDay("Europe/London", 2026, 1, 17);
  const wk = weekendSlots("Asia/Calcutta", "IN", t0, slots);
  const days = Array.from({ length: slots }, (_, i) => localParts("Asia/Calcutta", t0 + i * SLOT_MS).date.getUTCDay());
  assert.ok(days.includes(6) && days.includes(0));
  days.forEach((d, i) => assert.equal(wk[i], d === 0, `slot ${i}`));
});

test("London and Riyadh overlap from Friday to Monday", () => {
  const max = {};
  for (const [day, d] of Object.entries(DAYS)) {
    if (day === "Thu") continue;
    const { t0, slots } = homeDay("Europe/London", 2026, 1, d);
    const london = row("Europe/London", "GB", t0, slots);
    const riyadh = row("Asia/Riyadh", "SA", t0, slots);
    const overlap = overlapBands([london, riyadh]);
    assert.equal(overlap.length, slots);
    max[day] = Math.max(...overlap);
    if (day === "Sat") {
      assert.equal(riyadh.weekend[83], true, "Riyadh 23:45 Saturday");
      assert.equal(riyadh.weekend[84], false, "Riyadh 00:00 Sunday");
    }
    if (day === "Mon") {
      const best = overlap.flatMap((b, i) => (b === BAND.biz ? [i] : []));
      assert.deepEqual(best, Array.from({ length: 20 }, (_, i) => 36 + i), "Best 09:00 to 14:00");
    }
  }
  assert.equal(max.Fri, BAND.night);
  assert.equal(max.Sat, BAND.night);
  assert.equal(max.Sun, BAND.night);
  assert.equal(max.Mon, BAND.biz);
});

test("scoredBands sets weekend slots Unsuitable and leaves the rest", () => {
  const bands = [2, 1, 0, 2, 1, 0];
  const weekend = [true, true, true, false, false, false];
  assert.deepEqual(scoredBands(bands, weekend), [0, 0, 0, 2, 1, 0]);
  assert.deepEqual(bands, [2, 1, 0, 2, 1, 0]);
  const { t0, slots } = homeDay("Europe/London", 2026, 1, 19);
  const london = row("Europe/London", "GB", t0, slots);
  assert.deepEqual(scoredBands(london.bands, london.weekend), london.bands);
});
