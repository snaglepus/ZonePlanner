import { test } from "node:test";
import assert from "node:assert/strict";
import { BAND, SLOT_MS, abbrOf, classify, dayDiff, goodStep, homeDay, hour12For, localeHour12, localParts, offLabel, offsetMin, slotAt, zoneAbbr, zoneTag, zonedMidnight } from "../js/time.js";

const JAN_15 = Date.UTC(2026, 0, 15);
const HOUR = 3600000;

test("Kathmandu is UTC+5:45", () => {
  assert.equal(offsetMin("Asia/Kathmandu", JAN_15), 345);
  assert.equal(offLabel(345), "UTC+5:45");
});

test("Kolkata is UTC+5:30", () => {
  assert.equal(offsetMin("Asia/Kolkata", JAN_15), 330);
  assert.equal(offLabel(330), "UTC+5:30");
});

test("local parts at UTC midnight in Kathmandu are 05:45", () => {
  const p = localParts("Asia/Kathmandu", JAN_15);
  assert.equal(p.h, 5);
  assert.equal(p.m, 45);
});

const dayHours = (tz, y, m, d) => {
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const t1 = zonedMidnight(tz, next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
  return (t1 - zonedMidnight(tz, y, m, d)) / HOUR;
};

test("Sydney 2026-10-04 is 23 hours", () => assert.equal(dayHours("Australia/Sydney", 2026, 10, 4), 23));
test("Sydney 2026-04-05 is 25 hours", () => assert.equal(dayHours("Australia/Sydney", 2026, 4, 5), 25));
test("New York 2026-03-08 is 23 hours", () => assert.equal(dayHours("America/New_York", 2026, 3, 8), 23));
test("New York 2026-11-01 is 25 hours", () => assert.equal(dayHours("America/New_York", 2026, 11, 1), 25));

test("06:00 is the Unsuitable/Good boundary", () => {
  assert.equal(classify(359), BAND.night);
  assert.equal(classify(360), BAND.edge);
});
test("09:00 is the Good/Best boundary", () => {
  assert.equal(classify(539), BAND.edge);
  assert.equal(classify(540), BAND.biz);
});
test("17:00 is the Best/Good boundary", () => {
  assert.equal(classify(1019), BAND.biz);
  assert.equal(classify(1020), BAND.edge);
});
test("20:00 is the Good/Unsuitable boundary", () => {
  assert.equal(classify(1199), BAND.edge);
  assert.equal(classify(1200), BAND.night);
});

test("goodStep counts hours from the Best window across each Good hour", () => {
  const steps = { 6: 3, 7: 2, 8: 1, 17: 1, 18: 2, 19: 3 };
  for (const [h, step] of Object.entries(steps)) {
    assert.equal(goodStep(h * 60), step, `${h}:00`);
    assert.equal(goodStep(h * 60 + 59), step, `${h}:59`);
  }
});
test("goodStep boundaries match classify", () => {
  assert.equal(goodStep(359), 0);
  assert.equal(goodStep(539), 1);
  assert.equal(goodStep(540), 0);
  assert.equal(goodStep(1019), 0);
  assert.equal(goodStep(1020), 1);
  assert.equal(goodStep(1199), 3);
  assert.equal(goodStep(1200), 0);
});
test("goodStep is 0 in Best and Unsuitable hours", () => {
  for (const h of [0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23]) {
    assert.equal(goodStep(h * 60), 0, `${h}:00`);
    assert.equal(goodStep(h * 60 + 59), 0, `${h}:59`);
  }
});
test("goodStep is non-zero exactly when classify is Good", () => {
  for (let m = 0; m < 1440; m++) assert.equal(goodStep(m) !== 0, classify(m) === BAND.edge, `minute ${m}`);
});

test("homeDay Sydney 2027-01-15 has 24 columns", () => assert.equal(homeDay("Australia/Sydney", 2027, 1, 15).cols, 24));
test("homeDay Sydney 2027-04-04 has 25 columns", () => assert.equal(homeDay("Australia/Sydney", 2027, 4, 4).cols, 25));
test("homeDay Sydney 2027-10-03 has 23 columns", () => assert.equal(homeDay("Australia/Sydney", 2027, 10, 3).cols, 23));

test("a numeric zone is a fixed offset", () => {
  assert.equal(offsetMin(330, JAN_15), 330);
  const p = localParts(345, JAN_15);
  assert.equal(p.h, 5);
  assert.equal(p.m, 45);
});
test("fixed offsets keep their gap across DST while Los Angeles shifts", () => {
  const JUL_15 = Date.UTC(2026, 6, 15);
  const gap = (a, b, t) => (offsetMin(a, t) - offsetMin(b, t)) / 60;
  const hourGap = (a, b, t) => (localParts(a, t).h - localParts(b, t).h + 24) % 24;
  assert.equal(hourGap(-420, 0, JAN_15), 17);
  assert.equal(hourGap(-420, 0, JUL_15), 17);
  assert.equal(gap("America/Los_Angeles", 0, JAN_15), -8);
  assert.equal(gap("America/Los_Angeles", 0, JUL_15), -7);
});

const DAY = homeDay("Australia/Sydney", 2027, 1, 15);
test("slotAt is 0 at the start of the day", () => assert.equal(slotAt(DAY.t0, DAY.t0, DAY.slots), 0));
test("slotAt moves 1/15 slot (1/60 of a column) per minute", () => {
  assert.equal(slotAt(DAY.t0 + 60000, DAY.t0, DAY.slots) - slotAt(DAY.t0, DAY.t0, DAY.slots), 1 / 15);
  assert.equal(slotAt(DAY.t0 + 60000, DAY.t0, DAY.slots) / 4, 1 / 60);
  const t = DAY.t0 + 14 * HOUR + 30 * 60000;
  assert.ok(Math.abs(slotAt(t + 60000, DAY.t0, DAY.slots) - slotAt(t, DAY.t0, DAY.slots) - 1 / 15) < 1e-9);
});
test("slotAt at 14:30 is halfway through column 14", () => assert.equal(slotAt(DAY.t0 + 14.5 * HOUR, DAY.t0, DAY.slots) / 4, 14.5));
test("slotAt is null at the end of the day and before it", () => {
  assert.equal(slotAt(DAY.t0 + DAY.slots * SLOT_MS, DAY.t0, DAY.slots), null);
  assert.equal(slotAt(DAY.t0 - 1, DAY.t0, DAY.slots), null);
});
test("slotAt uses the DST day's own slot count", () => {
  const short = homeDay("Australia/Sydney", 2027, 10, 3);
  const long = homeDay("Australia/Sydney", 2027, 4, 4);
  assert.equal(short.slots, 92);
  assert.equal(long.slots, 100);
  assert.equal(slotAt(short.t1 - 60000, short.t0, short.slots), 92 - 1 / 15);
  assert.equal(slotAt(short.t1, short.t0, short.slots), null);
  assert.equal(slotAt(long.t1 - SLOT_MS, long.t0, long.slots), 99);
  assert.equal(slotAt(long.t1, long.t0, long.slots), null);
});
test("hour12For maps hour cycles to a 12-hour clock", () => {
  assert.equal(hour12For("h11"), true);
  assert.equal(hour12For("h12"), true);
  assert.equal(hour12For("h23"), false);
  assert.equal(hour12For("h24"), false);
  assert.equal(hour12For(undefined), false);
});
test("localeHour12 follows the locale's hour cycle", () => {
  assert.equal(localeHour12("en-US"), true);
  assert.equal(localeHour12("en-GB"), false);
});

const NOV_20 = Date.UTC(2026, 10, 20, 2);
const JUN_20 = Date.UTC(2026, 5, 20, 2);
test("abbrOf keeps real abbreviations", () => {
  assert.equal(abbrOf("AEDT"), "AEDT");
  assert.equal(abbrOf("PST"), "PST");
  assert.equal(abbrOf("BST"), "BST");
});
test("abbrOf drops GMT/UTC-style names and empty input", () => {
  for (const s of ["GMT+5:45", "GMT-8", "GMT", "UTC", "UTC+11", "GMT−3", "GMT+1", "GMT+0530", "", undefined]) assert.equal(abbrOf(s), null, String(s));
});
test("zoneAbbr and zoneTag for a fixed offset give the offset alone", () => {
  assert.equal(zoneAbbr(345, NOV_20), null);
  assert.equal(zoneTag(345, NOV_20), "UTC+5:45");
});
test("zoneTag pairs the abbreviation with the offset across daylight saving", () => {
  assert.equal(zoneTag("Australia/Sydney", NOV_20), "AEDT · UTC+11");
  assert.equal(zoneTag("Australia/Sydney", JUN_20), "AEST · UTC+10");
});
test("zoneTag falls back to the offset when Intl has only a GMT-style name", () => {
  assert.equal(zoneTag("Asia/Kathmandu", NOV_20), "UTC+5:45");
});
test("dayDiff: Sydney 09:00 on 20 Nov is the 19th in Los Angeles", () => {
  assert.equal(dayDiff("America/Los_Angeles", "Australia/Sydney", Date.UTC(2026, 10, 19, 22)), -1);
});
test("dayDiff: Los Angeles 18:00 on 19 Nov is the 20th in Sydney", () => {
  assert.equal(dayDiff("Australia/Sydney", "America/Los_Angeles", Date.UTC(2026, 10, 20, 2)), 1);
});
test("dayDiff is 0 on the same date", () => {
  assert.equal(dayDiff("Europe/Paris", "Europe/London", Date.UTC(2026, 10, 20, 12)), 0);
});
test("dayDiff crosses a year boundary", () => {
  assert.equal(dayDiff("Pacific/Auckland", "America/Los_Angeles", Date.UTC(2026, 11, 31, 12)), 1);
});
test("dayDiff can be two days", () => {
  assert.equal(dayDiff(840, -720, Date.UTC(2026, 0, 15, 11)), 2);
  assert.equal(dayDiff(-720, 840, Date.UTC(2026, 0, 15, 11)), -2);
});
