import { test } from "node:test";
import assert from "node:assert/strict";
import { AM, PM, clock, clockRange, dayDiffLabel, legendBest, legendGood, meridiem } from "../js/strings.js";
import { localParts, zonedMidnight } from "../js/time.js";

const t = (h, m) => ({ h, m });
const HOUR = 3600000;
const JAN_15 = Date.UTC(2026, 0, 15);
const SYD_9AM = zonedMidnight("Australia/Sydney", 2027, 1, 15) + 9 * HOUR;

test("clock on a 24-hour clock", () => {
  assert.equal(clock(t(0, 0), false), "00:00");
  assert.equal(clock(t(12, 0), false), "12:00");
  assert.equal(clock(t(12, 30), false), "12:30");
  assert.equal(clock(t(23, 45), false), "23:45");
  assert.equal(clock(t(15, 0), false), "15:00");
});
test("clock on a 12-hour clock", () => {
  assert.equal(clock(t(0, 0), true), "12:00 am");
  assert.equal(clock(t(12, 0), true), "12:00 pm");
  assert.equal(clock(t(12, 30), true), "12:30 pm");
  assert.equal(clock(t(23, 45), true), "11:45 pm");
  assert.equal(clock(t(15, 0), true), "3:00 pm");
});
test("clock cell labels on a 24-hour clock", () => {
  assert.equal(clock(t(0, 0), false, { cell: true }), "0");
  assert.equal(clock(t(12, 0), false, { cell: true }), "12");
  assert.equal(clock(t(12, 30), false, { cell: true }), "12:30");
  assert.equal(clock(t(23, 45), false, { cell: true }), "23:45");
  assert.equal(clock(t(15, 0), false, { cell: true }), "15");
  assert.equal(clock(t(3, 30), false, { cell: true }), "3:30");
});
test("clock cell labels on a 12-hour clock have no meridiem", () => {
  assert.equal(clock(t(0, 0), true, { cell: true }), "12");
  assert.equal(clock(t(12, 0), true, { cell: true }), "12");
  assert.equal(clock(t(12, 30), true, { cell: true }), "12:30");
  assert.equal(clock(t(23, 45), true, { cell: true }), "11:45");
  assert.equal(clock(t(15, 0), true, { cell: true }), "3");
  assert.equal(clock(t(15, 30), true, { cell: true }), "3:30");
});

test("cell label shows a whole hour without minutes", () => {
  assert.equal(clock(localParts("Australia/Sydney", SYD_9AM), false, { cell: true }), "9");
  assert.equal(clock(localParts("Asia/Tokyo", SYD_9AM), false, { cell: true }), "7");
});
test("cell label shows 3:30 in Kolkata at 09:00 Sydney", () => assert.equal(clock(localParts("Asia/Kolkata", SYD_9AM), false, { cell: true }), "3:30"));
test("cell label shows 3:45 in Kathmandu at 09:00 Sydney", () => assert.equal(clock(localParts("Asia/Kathmandu", SYD_9AM), false, { cell: true }), "3:45"));
test("cell label shows :30 for a -210 fixed offset at a whole UTC hour", () => assert.equal(clock(localParts(-210, JAN_15), false, { cell: true }), "20:30"));
test("a +345 fixed offset reads 05:45", () => assert.equal(clock(localParts(345, JAN_15), false), "05:45"));

test("meridiem splits the day at noon", () => {
  assert.equal(meridiem(0), AM);
  assert.equal(meridiem(11), AM);
  assert.equal(meridiem(12), PM);
  assert.equal(meridiem(23), PM);
  assert.equal(AM, "am");
  assert.equal(PM, "pm");
});

test("clockRange", () => {
  assert.equal(clockRange(t(15, 0), t(16, 0), false), "15:00–16:00");
  assert.equal(clockRange(t(15, 0), t(16, 0), true), "3:00–4:00 pm");
  assert.equal(clockRange(t(9, 0), t(10, 30), true), "9:00–10:30 am");
  assert.equal(clockRange(t(11, 30), t(12, 30), true), "11:30 am–12:30 pm");
  assert.equal(clockRange(t(23, 0), t(0, 0), true), "11:00 pm–12:00 am");
});

test("legend ranges", () => {
  assert.equal(legendBest(false), "9–17");
  assert.equal(legendBest(true), "9 am–5 pm");
  assert.equal(legendGood(false), "6–9, 17–20");
  assert.equal(legendGood(true), "6–9 am, 5–8 pm");
});
test("dayDiffLabel words a zone's date against home", () => {
  assert.equal(dayDiffLabel(-2), "−2 days");
  assert.equal(dayDiffLabel(-1), "Yesterday");
  assert.equal(dayDiffLabel(0), "");
  assert.equal(dayDiffLabel(1), "Tomorrow");
  assert.equal(dayDiffLabel(2), "+2 days");
});
