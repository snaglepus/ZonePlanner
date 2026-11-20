import { test } from "node:test";
import assert from "node:assert/strict";
import { BAND, cellLabel, classify, dayStarts, goodStep, homeDay, hhmm, localParts, offLabel, offsetMin, zonedMidnight } from "../js/time.js";

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

const SYD_9AM = zonedMidnight("Australia/Sydney", 2027, 1, 15) + 9 * HOUR;
test("cellLabel shows a whole hour without minutes", () => {
  assert.equal(cellLabel("Australia/Sydney", SYD_9AM), "9");
  assert.equal(cellLabel("Asia/Tokyo", SYD_9AM), "7");
});
test("cellLabel shows 3:30 in Kolkata at 09:00 Sydney", () => assert.equal(cellLabel("Asia/Kolkata", SYD_9AM), "3:30"));
test("cellLabel shows 3:45 in Kathmandu at 09:00 Sydney", () => assert.equal(cellLabel("Asia/Kathmandu", SYD_9AM), "3:45"));

test("homeDay Sydney 2027-01-15 has 24 columns", () => assert.equal(homeDay("Australia/Sydney", 2027, 1, 15).cols, 24));
test("homeDay Sydney 2027-04-04 has 25 columns", () => assert.equal(homeDay("Australia/Sydney", 2027, 4, 4).cols, 25));
test("homeDay Sydney 2027-10-03 has 23 columns", () => assert.equal(homeDay("Australia/Sydney", 2027, 10, 3).cols, 23));

test("a numeric zone is a fixed offset", () => {
  assert.equal(offsetMin(330, JAN_15), 330);
  const p = localParts(345, JAN_15);
  assert.equal(hhmm(p), "05:45");
});
test("cellLabel shows :30 for a -210 fixed offset at a whole UTC hour", () => assert.equal(cellLabel(-210, JAN_15), "20:30"));
test("fixed offsets keep their gap across DST while Los Angeles shifts", () => {
  const JUL_15 = Date.UTC(2026, 6, 15);
  const gap = (a, b, t) => (offsetMin(a, t) - offsetMin(b, t)) / 60;
  const hourGap = (a, b, t) => (localParts(a, t).h - localParts(b, t).h + 24) % 24;
  assert.equal(hourGap(-420, 0, JAN_15), 17);
  assert.equal(hourGap(-420, 0, JUL_15), 17);
  assert.equal(gap("America/Los_Angeles", 0, JAN_15), -8);
  assert.equal(gap("America/Los_Angeles", 0, JUL_15), -7);
});

const iso = (s) => Date.parse(s);
const SYD = homeDay("Australia/Sydney", 2026, 11, 18);
const starts = (tz, day, locale = "en-AU") => dayStarts(tz, day.t0, day.t1, locale);
test("dayStarts: London changes date at Sydney 11:00", () => {
  assert.deepEqual(starts("Europe/London", SYD), [{ t: SYD.t0 + 11 * HOUR, label: "Wed 18" }]);
});
test("dayStarts: Kathmandu changes date a quarter into a column", () => {
  assert.deepEqual(starts("Asia/Kathmandu", SYD), [{ t: iso("2026-11-17T18:15Z"), label: "Wed 18" }]);
  assert.equal(SYD.t0 + 5.25 * HOUR, iso("2026-11-17T18:15Z"));
});
test("dayStarts: the home zone changes date at t0", () => {
  assert.deepEqual(starts("Australia/Sydney", SYD).map((e) => e.t), [SYD.t0]);
});
test("dayStarts: London midnight under BST on a 23-hour Sydney day", () => {
  assert.deepEqual(starts("Europe/London", homeDay("Australia/Sydney", 2026, 10, 4)), [{ t: iso("2026-10-03T23:00Z"), label: "Sun 4" }]);
});
test("dayStarts: New York with its own DST change inside the home day", () => {
  assert.deepEqual(starts("America/New_York", homeDay("Australia/Sydney", 2026, 11, 1)).map((e) => e.t), [iso("2026-11-01T04:00Z")]);
});
test("dayStarts: Santiago's missing midnight as a row", () => {
  assert.deepEqual(starts("America/Santiago", homeDay("Australia/Sydney", 2026, 9, 6)), [{ t: iso("2026-09-06T04:00Z"), label: "Sun 6" }]);
});
test("dayStarts: Santiago's missing midnight as home", () => {
  const day = homeDay("America/Santiago", 2026, 9, 6);
  assert.deepEqual(starts("America/Santiago", day), [{ t: day.t0, label: "Sun 6" }]);
  assert.equal(day.t0, iso("2026-09-06T04:00Z"));
});
test("dayStarts: an offset ID changing date inside the last slot", (t) => {
  try { new Intl.DateTimeFormat("en", { timeZone: "+00:01" }); } catch { t.skip("Intl rejects +00:01"); return; }
  assert.deepEqual(starts("+00:01", homeDay("UTC", 2026, 11, 18)), [{ t: iso("2026-11-18T23:59Z"), label: "Thu 19" }]);
});
test("dayStarts: the label follows the locale", () => {
  const [e] = starts("Europe/London", SYD, "en-US");
  assert.equal(e.label, new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", timeZone: "Europe/London" }).format(e.t));
  assert.equal(starts("Europe/London", SYD)[0].label, "Wed 18");
});
test("dayStarts: never returns t1", () => {
  const list = starts("Australia/Melbourne", SYD);
  assert.equal(list.length, 1);
  assert.ok(list.every((e) => e.t !== SYD.t1));
});

test("homeDay starts at Santiago's 01:00 when midnight is missing", () => {
  const day = homeDay("America/Santiago", 2026, 9, 6);
  assert.equal(day.t0, iso("2026-09-06T04:00Z"));
  assert.equal(day.t1, iso("2026-09-07T03:00Z"));
  assert.equal(day.slots, 92);
  assert.equal(day.cols, 23);
  assert.equal(localParts("America/Santiago", day.t0).dayKey, 20260906);
});
test("homeDay before Santiago's missing midnight ends where the next date starts", () => {
  const day = homeDay("America/Santiago", 2026, 9, 5);
  assert.equal(day.t0, iso("2026-09-05T04:00Z"));
  assert.equal(day.t1, iso("2026-09-06T04:00Z"));
  assert.equal(day.slots, 96);
});
