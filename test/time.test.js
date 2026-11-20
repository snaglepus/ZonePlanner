import { test } from "node:test";
import assert from "node:assert/strict";
import { BAND, cellLabel, classify, homeDay, localParts, offLabel, offsetMin, zonedMidnight } from "../js/time.js";

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

test("06:00 is the night/edge boundary", () => {
  assert.equal(classify(359), BAND.night);
  assert.equal(classify(360), BAND.edge);
});
test("09:00 is the edge/business boundary", () => {
  assert.equal(classify(539), BAND.edge);
  assert.equal(classify(540), BAND.biz);
});
test("17:00 is the business/edge boundary", () => {
  assert.equal(classify(1019), BAND.biz);
  assert.equal(classify(1020), BAND.edge);
});
test("20:00 is the edge/night boundary", () => {
  assert.equal(classify(1199), BAND.edge);
  assert.equal(classify(1200), BAND.night);
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
