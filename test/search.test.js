import { test } from "node:test";
import assert from "node:assert/strict";
import { CITIES } from "../js/cities.js";
import { abbreviationZones, prettyTz, searchCities, zoneInfo } from "../js/search.js";

const names = (list) => list.map((c) => c.name);
const at = (list, name) => list.findIndex((c) => c.name === name);
const rankOf = (c) => CITIES.find((x) => x.name === c.name && x.tz === c.tz).rank;

test("empty query lists the popular cities by rank", () => {
  const want = CITIES.filter((c) => c.popular).sort((a, b) => a.rank - b.rank);
  for (const q of ["", "   "]) {
    const got = searchCities(q);
    assert.equal(got.length, 100);
    assert.deepEqual(got.map((c) => `${c.name}|${c.tz}`), want.map((c) => `${c.name}|${c.tz}`));
  }
});

test("prefix matches come before substring matches", () => {
  const got = searchCities("lon");
  const barcelona = at(got, "Barcelona");
  assert.ok(barcelona > -1);
  assert.ok(at(got, "London") > -1 && at(got, "London") < barcelona);
  assert.ok(at(got, "Longyearbyen") > -1 && at(got, "Longyearbyen") < barcelona);
});

test("popular before obscure, prefix group in rank order", () => {
  const got = searchCities("san");
  assert.ok(at(got, "Santiago") > -1 && at(got, "Santiago") < at(got, "San Francisco"));
  const prefix = got.filter((c) => {
    const city = CITIES.find((x) => x.name === c.name && x.tz === c.tz);
    return [city.name, city.ascii, ...city.aliases].some((n) => n.toLowerCase().startsWith("san"));
  });
  const ranks = prefix.map(rankOf);
  assert.deepEqual(ranks, ranks.slice().sort((a, b) => a - b));
  assert.deepEqual(got.slice(0, prefix.length), prefix);
});

test("ascii name matches", () => assert.ok(names(searchCities("sao paulo")).includes("São Paulo")));

test("alias matches", () => {
  const got = searchCities("bombay");
  assert.equal(got[0].name, "Mumbai");
  assert.equal(got[0].country, "India");
});

test("cities missing from the old list are found", () => {
  assert.ok(searchCities("osaka").some((c) => c.name === "Osaka" && c.tz === "Asia/Tokyo"));
});

test("IANA ID matches, and zones with no bundled city come last", () => {
  assert.ok(names(searchCities("Europe/Lisbon")).includes("Lisbon"));
  const got = searchCities("hobart", { zones: ["Australia/Hobart"] });
  const i = got.findIndex((c) => c.name === "Hobart" && c.tz === "Australia/Hobart");
  assert.ok(i > -1);
  assert.ok(got.slice(i + 1).every((c) => !CITIES.some((x) => x.tz === c.tz)));
  assert.ok(got.slice(0, i).every((c) => CITIES.some((x) => x.name === c.name && x.tz === c.tz)));
  assert.ok(names(searchCities("Australia/Hobart", { zones: ["Australia/Hobart"] })).includes("Hobart"));
});

test("abbreviations list one option per zone first", () => {
  for (const q of ["IST", "ist"]) {
    assert.deepEqual(searchCities(q).slice(0, 3).map((c) => c.tz), ["Asia/Kolkata", "Europe/Dublin", "Asia/Jerusalem"]);
  }
  const ist = searchCities("IST");
  assert.deepEqual(names(ist.slice(0, 3)), ["Mumbai", "Dublin", "Jerusalem"]);
  assert.equal(ist[2].country, "Asia");
  assert.deepEqual(searchCities("AEDT")[0], { name: "Sydney", country: "Australia", tz: "Australia/Sydney" });
  assert.deepEqual(searchCities("CST").slice(0, 4).map((c) => c.tz), ["America/Chicago", "America/Mexico_City", "Asia/Shanghai", "Asia/Taipei"]);
  assert.ok(abbreviationZones("IST").length > 1);
  assert.deepEqual(abbreviationZones(" ist "), abbreviationZones("IST"));
  assert.deepEqual(abbreviationZones("london"), []);
});

test("abbreviation options are never cut by the limit", () => {
  assert.equal(searchCities("CST", { limit: 0 }).length, 4);
  assert.equal(searchCities("a", { limit: 5 }).length, 5);
});

test("no name and zone pair appears twice", () => {
  const zones = Intl.supportedValuesOf("timeZone");
  for (const q of ["", "IST", "ist", "AEDT", "CST", "lon", "san", "bombay", "sao paulo", "osaka", "Europe/Lisbon", "hobart", "australia", "a"]) {
    const keys = searchCities(q, { zones }).map((c) => `${c.name}|${c.tz}`);
    assert.equal(new Set(keys).size, keys.length, q);
  }
});

test("a query that matches nothing returns []", () => assert.deepEqual(searchCities("zzzz"), []));

test("zoneInfo names rows", () => {
  assert.deepEqual(zoneInfo("Asia/Kolkata"), { tz: "Asia/Kolkata", name: "Mumbai", country: "India" });
  assert.deepEqual(zoneInfo("America/Chicago", "Austin"), { tz: "America/Chicago", name: "Austin", country: "United States" });
  assert.deepEqual(zoneInfo("Asia/Tokyo", "Office"), { tz: "Asia/Tokyo", name: "Office", country: "" });
  assert.deepEqual(zoneInfo("Australia/Hobart"), { tz: "Australia/Hobart", name: "Hobart", country: "" });
});

test("prettyTz uses the last ID segment", () => {
  assert.equal(prettyTz("America/Argentina/Buenos_Aires"), "Buenos Aires");
  assert.equal(prettyTz("UTC"), "UTC");
});

test("zone aliases find the same city", () => {
  assert.equal(zoneInfo("Asia/Calcutta").name, "Mumbai");
  assert.equal(zoneInfo("Europe/Kiev").name, "Kyiv");
  assert.ok(!searchCities("calcutta", { zones: ["Asia/Calcutta"] }).some((c) => c.tz === "Asia/Calcutta"));
});
