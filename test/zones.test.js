import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_USER_ZONES, followHome, linkToRows, parseOffset, rawParam, replaceRow, rowsToLink, userRows, validTz } from "../js/zones.js";

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

test("validTz bounds offset-form IDs to ±14:00 and leaves named zones alone", () => {
  for (const tz of ["+14:00", "-14:00", "+05:30", "UTC", "Etc/GMT-14", "Asia/Kolkata"]) assert.equal(validTz(tz), true, tz);
  for (const tz of ["+15:00", "-14:01", "+1401"]) assert.equal(validTz(tz), false, tz);
});

test("userRows validates offset entries and ignores non-arrays", () => {
  assert.deepEqual(userRows({}, "America/Los_Angeles"), { rows: [], dropped: 0 });
  const { rows } = userRows([[], { offsetMin: 330, name: "x" }, { offsetMin: "330" }, { offsetMin: 841 }], "America/Los_Angeles");
  assert.deepEqual(rows, [{ offsetMin: 330 }]);
});

test("linkToRows drops unknown zones", () => {
  const { rows } = linkToRows("Asia/Tokyo~Tokyo,Not/AZone~X,Europe/Paris~Paris", "America/Los_Angeles");
  assert.deepEqual(tzs(rows), ["Asia/Tokyo", "Europe/Paris"]);
});

test("linkToRows caps nine valid zones at seven", () => {
  const { rows, dropped } = linkToRows(NINE.join(","), "America/Los_Angeles");
  assert.deepEqual(tzs(rows), NINE.slice(0, 7));
  assert.equal(dropped, 2);
});

test("linkToRows cuts a long encoded name to 60 characters", () => {
  const { rows } = linkToRows(`Asia/Tokyo~${encodeURIComponent("é".repeat(200))}`, "America/Los_Angeles");
  assert.equal(rows[0].name, "é".repeat(60));
});

test("linkToRows bounds offset-form zone IDs", () => {
  const { rows } = linkToRows("%2B15%3A00~X,%2B14%3A00~Y", "America/Los_Angeles");
  assert.deepEqual(rows, [{ tz: "+14:00", name: "Y" }]);
});

test("parseOffset reads GMT/UTC prefixes, signs and H, HH, H:MM, HH:MM or HHMM", () => {
  const want = { "GMT+11": 660, "UTC-7": -420, "+5:30": 330, "GMT+05:45": 345, "-0330": -210, utc: 0, GMT: 0, "UTC\u22127": -420, "+14:00": 840, " gmt +5 ": 300 };
  for (const [text, min] of Object.entries(want)) assert.equal(parseOffset(text), min, text);
});

test("parseOffset returns null for off-grid minutes, beyond ±14:00 and other shapes", () => {
  for (const text of ["+15", "GMT+5:99", "+", "+14:15", "+5:20", "+530", "", "+5:30x", "UTC 5", "5:30", "+5:60", "-14:45"]) assert.equal(parseOffset(text), null, text);
});

test("userRows keeps offset entries only in multiples of 15 within ±14:00", () => {
  const { rows } = userRows([{ offsetMin: 7 }, { offsetMin: 900 }, { offsetMin: -210 }], "America/Los_Angeles");
  assert.deepEqual(rows, [{ offsetMin: -210 }]);
});

test("offset rows round-trip through the share link as @<minutes>, in order", () => {
  const rows = [{ tz: "Asia/Tokyo", name: "Tokyo" }, { offsetMin: 330 }, { tz: "Europe/London", name: "London" }, { offsetMin: -420 }];
  const z = rowsToLink(rows);
  assert.equal(z, "Asia%2FTokyo~Tokyo,@330,Europe%2FLondon~London,@-420");
  assert.deepEqual(linkToRows(rawParam(`z=${z}&d=2026-12-01&l=4`, "z"), "America/Los_Angeles").rows, rows);
});

test("linkToRows drops malformed and invalid offset segments, keeping the rest", () => {
  const { rows } = linkToRows("@900,@7,Asia/Tokyo~Tokyo,@+330,@abc,%40330,@-210", "America/Los_Angeles");
  assert.deepEqual(rows, [{ tz: "Asia/Tokyo", name: "Tokyo" }, { offsetMin: -210 }]);
});

test("followHome keeps offset rows", () => {
  const rows = [{ offsetMin: 0 }, { tz: "Europe/London", name: "London" }, { offsetMin: 330 }];
  assert.deepEqual(followHome(rows, "Europe/London"), [rows[0], rows[2]]);
});

const THREE = [{ tz: "Europe/London", name: "London" }, { tz: "Asia/Tokyo", name: "Tokyo" }, { tz: "Australia/Sydney", name: "Sydney" }];
const PARIS = { tz: "Europe/Paris", name: "Paris" };

test("replaceRow swaps the middle row and keeps the others in place", () => {
  assert.deepEqual(replaceRow(THREE, 1, PARIS), [THREE[0], PARIS, THREE[2]]);
});

test("replaceRow does not mutate its input", () => {
  const rows = THREE.slice();
  const out = replaceRow(rows, 0, PARIS);
  assert.notEqual(out, rows);
  assert.deepEqual(rows, THREE);
});

test("replaceRow returns the input unchanged for an out-of-range index", () => {
  assert.equal(replaceRow(THREE, 3, PARIS), THREE);
  assert.equal(replaceRow(THREE, -1, PARIS), THREE);
});
