import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_USER_ZONES, followHome, linkToRows, rawParam, rowsToLink, userRows, validTz } from "../js/zones.js";

const tzs = (rows) => rows.map((r) => r.tz);

test("followHome removes the row in the new home zone and keeps the order", () => {
  const rows = [{ tz: "Europe/Paris", name: "Paris" }, { tz: "Europe/London", name: "London" }, { tz: "Asia/Tokyo", name: "Tokyo" }];
  assert.deepEqual(followHome(rows, "Europe/London"), [rows[0], rows[2]]);
});

test("linkToRows drops the home zone", () => {
  const { rows, dropped } = linkToRows("Australia/Sydney~Sydney,America/Los_Angeles~Los%20Angeles,Europe/London~London", "America/Los_Angeles");
  assert.deepEqual(rows, [{ tz: "Australia/Sydney", name: "Sydney" }, { tz: "Europe/London", name: "London" }]);
  assert.equal(dropped, 0);
});

test("linkToRows discards invalid zones and malformed encodings, keeping the rest", () => {
  const { rows } = linkToRows("Asia/Tokyo~Tokyo,Not/AZone~X,Europe/Paris~%E0%A4%A,Europe/London~London", "America/Los_Angeles");
  assert.deepEqual(rows, [{ tz: "Asia/Tokyo", name: "Tokyo" }, { tz: "Europe/London", name: "London" }]);
});

const NINE = ["Europe/Paris", "Europe/London", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney", "America/New_York", "Asia/Dubai", "Africa/Cairo", "Pacific/Auckland"];

test("the cap keeps the first 7 and counts the rest as dropped", () => {
  assert.equal(MAX_USER_ZONES, 7);
  const { rows, dropped } = userRows(NINE.map((tz) => ({ tz })), "America/Los_Angeles");
  assert.deepEqual(tzs(rows), NINE.slice(0, 7));
  assert.equal(dropped, 2);
});

test("the home zone among 8 entries leaves 7 and drops none", () => {
  const eight = [...NINE.slice(0, 3), "America/Los_Angeles", ...NINE.slice(3, 7)];
  const { rows, dropped } = userRows(eight.map((tz) => ({ tz })), "America/Los_Angeles");
  assert.deepEqual(tzs(rows), NINE.slice(0, 7));
  assert.equal(dropped, 0);
});

test("validTz rejects missing and empty zones", () => {
  assert.equal(validTz(undefined), false);
  assert.equal(validTz(""), false);
  assert.equal(validTz(null), false);
  assert.equal(validTz("Europe/Paris"), true);
});

test("userRows rejects entries that are not zone objects", () => {
  const { rows } = userRows([{}, null, 5, { name: "X" }, { tz: "Europe/Paris", name: "Paris" }], "America/Los_Angeles");
  assert.deepEqual(rows, [{ tz: "Europe/Paris", name: "Paris" }]);
});

test("names with %, comma and ~ round-trip through the share link hash", () => {
  const rows = [{ tz: "Europe/London", name: "100%" }, { tz: "Europe/Paris", name: "A, B" }, { tz: "Asia/Tokyo", name: "x~y" }];
  const { rows: back } = linkToRows(rawParam("z=" + rowsToLink(rows) + "&d=2026-12-01&l=4", "z"), "America/Los_Angeles");
  assert.deepEqual(back, rows);
});

test("rawParam returns the first match undecoded, or null", () => {
  assert.equal(rawParam("d=2026-12-01&z=a%2Cb&z=c", "z"), "a%2Cb");
  assert.equal(rawParam("d=2026-12-01", "z"), null);
});
