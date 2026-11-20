import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ZONES, STATE_KEY, createSaver, defaultState, loadState, migrate, serializeState } from "../js/state.js";
import { rowsToLink } from "../js/zones.js";

const LA = "America/Los_Angeles";
const tzs = (rows) => rows.map((r) => r.tz ?? r.offsetMin);
const v1 = (zones, extra = {}) => JSON.stringify({ version: 1, zones, hour12: null, filter: "all", len: 4, ...extra });

test("a saved state round-trips through serializeState and loadState", () => {
  const s = {
    version: 1,
    zones: [{ tz: "Asia/Tokyo", name: "Tokyo" }, { tz: "Europe/Paris", name: "Paris" }, { offsetMin: 330 }, { tz: "Australia/Sydney", name: "Sydney" }],
    hour12: false,
    filter: "good",
    len: 6
  };
  const { state, status, dropped } = loadState(serializeState(s), null, LA);
  assert.equal(status, "ok");
  assert.equal(dropped, 0);
  assert.deepEqual(state, s);
});

test("an unknown zone ID is dropped and the rest keep their order", () => {
  const { state, status } = loadState(v1([{ tz: "Asia/Tokyo" }, { tz: "Not/AZone" }, { tz: "Europe/Paris" }]), null, LA);
  assert.equal(status, "ok");
  assert.deepEqual(tzs(state.zones), ["Asia/Tokyo", "Europe/Paris"]);
});

test("offset entries outside ±14:00 or not whole minutes are dropped", () => {
  const { state } = loadState(v1([{ offsetMin: 900 }, { offsetMin: 30.5 }, { offsetMin: -840 }, { offsetMin: 840 }]), null, LA);
  assert.deepEqual(state.zones, [{ offsetMin: -840 }, { offsetMin: 840 }]);
});

test("eight valid zones keep the first seven and count one dropped", () => {
  const eight = ["Europe/Paris", "Europe/London", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney", "America/New_York", "Asia/Dubai", "Africa/Cairo"];
  const { state, dropped } = loadState(v1(eight.map((tz) => ({ tz }))), null, LA);
  assert.deepEqual(tzs(state.zones), eight.slice(0, 7));
  assert.equal(dropped, 1);
});

test("a zone equal to the home zone is dropped", () => {
  const { state } = loadState(v1([{ tz: LA }, { tz: "Asia/Tokyo" }]), null, LA);
  assert.deepEqual(tzs(state.zones), ["Asia/Tokyo"]);
});

test("long names are cut to 60 characters and non-string names become undefined", () => {
  const long = "x".repeat(200);
  const { state } = loadState(v1([{ tz: "Asia/Tokyo", name: long }, { tz: "Europe/Paris", name: 42 }]), null, LA);
  assert.deepEqual(state.zones, [{ tz: "Asia/Tokyo", name: long.slice(0, 60) }, { tz: "Europe/Paris", name: undefined }]);
});

test("lone surrogates are removed from names, so the share link encodes", () => {
  const text = '{"version":1,"zones":[{"tz":"Asia/Tokyo","name":"Tokyo\\ud800"},{"tz":"Europe/Paris","name":"\\udc00Paris"}],"hour12":null,"filter":"all","len":4}';
  const { state } = loadState(text, null, LA);
  assert.deepEqual(state.zones.map((z) => z.name), ["Tokyo", "Paris"]);
  assert.doesNotThrow(() => rowsToLink(state.zones));
});

test("offset-form zone IDs are bounded to ±14:00", () => {
  const ids = ["+15:00", "-14:01", "+14:00", "-14:00", "+05:30"];
  const { state } = loadState(v1(ids.map((tz) => ({ tz }))), null, LA);
  assert.deepEqual(tzs(state.zones), ["+14:00", "-14:00", "+05:30"]);
});

test("bad fields fall back to defaults without a reset", () => {
  const { state, status } = loadState(v1([{ tz: "Asia/Tokyo" }], { hour12: "yes", filter: "worst", len: 5 }), null, LA);
  assert.equal(status, "ok");
  assert.equal(state.hour12, null);
  assert.equal(state.filter, "all");
  assert.equal(state.len, 4);
});

test("zones the engine accepts but does not list are kept", () => {
  const { state } = loadState(v1([{ tz: "Asia/Kolkata" }, { tz: "Europe/Kyiv" }]), null, LA);
  assert.deepEqual(tzs(state.zones), ["Asia/Kolkata", "Europe/Kyiv"]);
});

test("unreadable or unknown state resets to the defaults", () => {
  for (const text of ["{bad json", "5", "null", "[]", '{"version":1,"zones":{}}', '{"zones":[]}', '{"version":2,"zones":[]}']) {
    const { state, status } = loadState(text, null, LA);
    assert.equal(status, "reset", text);
    assert.deepEqual(state, defaultState(LA), text);
  }
});

test("no stored state is a first run with the defaults", () => {
  const { state, status } = loadState(null, null, LA);
  assert.equal(status, "new");
  assert.deepEqual(state, defaultState(LA));
  assert.deepEqual(tzs(state.zones), DEFAULT_ZONES);
});

test("defaultState leaves out the home zone", () => {
  assert.deepEqual(tzs(defaultState("Europe/London").zones), ["America/New_York", "Asia/Singapore", "Australia/Sydney"]);
});

test("migrate is driven by version", () => {
  assert.deepEqual(migrate({ version: 0, zones: [], len: 6, extra: 1 }), { version: 1, zones: [], len: 6 });
  const data = { version: 1, zones: [] };
  assert.equal(migrate(data), data);
  assert.equal(migrate({ zones: [] }), null);
  assert.equal(migrate({ version: 2, zones: [] }), null);
});

test("legacy zoneplanner:v1 state migrates once into version 1", () => {
  const more = ["Asia/Singapore", "Australia/Sydney", "America/New_York", "Asia/Dubai", "Africa/Cairo", "Pacific/Auckland", "Europe/Paris", "Europe/Berlin", "Asia/Seoul"];
  const zones = [{ tz: "Europe/London", name: "London" }, { tz: "Asia/Tokyo", name: "Tokyo" }, ...more.map((tz) => ({ tz }))];
  const { state, status } = loadState(null, JSON.stringify({ zones, len: 6 }), "Europe/London");
  assert.equal(status, "migrated");
  assert.deepEqual(tzs(state.zones), ["Asia/Tokyo", ...more].slice(0, 7));
  assert.equal(state.len, 6);
  assert.equal(state.hour12, null);
  assert.equal(state.filter, "all");
  assert.equal(state.version, 1);
});

test("unreadable legacy state is a first run", () => {
  assert.equal(loadState(null, "{bad json", LA).status, "new");
});

test("a legacy name ending in a split emoji migrates without the lone half", () => {
  const { state, status } = loadState(null, '{"zones":[{"tz":"Asia/Tokyo","name":"Tokyo \\ud83d"}],"len":4}', LA);
  assert.equal(status, "migrated");
  assert.equal(state.zones[0].name, "Tokyo ");
  assert.doesNotThrow(() => rowsToLink(state.zones));
});

const fakeClock = () => {
  let now = 0;
  let next = 1;
  const timers = new Map();
  return {
    setTimer: (fn, ms) => { timers.set(next, { fn, at: now + ms }); return next++; },
    clearTimer: (id) => { timers.delete(id); },
    tick(ms) {
      now += ms;
      for (const [id, t] of [...timers]) if (t.at <= now) { timers.delete(id); t.fn(); }
    }
  };
};
const fakeStorage = () => {
  const calls = [];
  return { calls, setItem: (k, v) => { calls.push([k, v]); } };
};

test("saves are debounced to one write of the latest text", () => {
  const clock = fakeClock();
  const storage = fakeStorage();
  const saver = createSaver({ storage, key: STATE_KEY, setTimer: clock.setTimer, clearTimer: clock.clearTimer });
  saver.save("a");
  clock.tick(100);
  saver.save("b");
  clock.tick(249);
  assert.equal(storage.calls.length, 0);
  clock.tick(1);
  assert.deepEqual(storage.calls, [[STATE_KEY, "b"]]);
});

test("flush writes at once and the timer then writes nothing", () => {
  const clock = fakeClock();
  const storage = fakeStorage();
  const saver = createSaver({ storage, key: STATE_KEY, setTimer: clock.setTimer, clearTimer: clock.clearTimer });
  saver.save("a");
  saver.flush();
  assert.deepEqual(storage.calls, [[STATE_KEY, "a"]]);
  clock.tick(1000);
  saver.flush();
  assert.equal(storage.calls.length, 1);
});

test("a throwing setItem is swallowed by the timer and by flush", () => {
  const clock = fakeClock();
  const storage = { setItem: () => { throw new Error("QuotaExceededError"); } };
  const saver = createSaver({ storage, key: STATE_KEY, setTimer: clock.setTimer, clearTimer: clock.clearTimer });
  saver.save("a");
  assert.doesNotThrow(() => clock.tick(250));
  saver.save("b");
  assert.doesNotThrow(() => saver.flush());
});
