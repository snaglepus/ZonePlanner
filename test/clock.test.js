import { test } from "node:test";
import assert from "node:assert/strict";
import { createClock } from "../js/clock.js";

const MIN = 60000;
const NOON = Date.UTC(2026, 10, 19, 12, 0, 0);

/** A fake clock source and timer queue the test drives by hand. */
const fake = (start) => {
  const f = { t: start, timers: new Map(), next: 1 };
  f.now = () => f.t;
  f.setTimer = (fn, ms) => { const id = f.next++; f.timers.set(id, { fn, at: f.t + ms, ms }); return id; };
  f.clearTimer = (id) => f.timers.delete(id);
  f.pending = () => [...f.timers.values()];
  /** Move time to the earliest pending timer and run it. */
  f.fireNext = () => {
    const [id, tm] = [...f.timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    f.timers.delete(id);
    f.t = tm.at;
    tm.fn();
  };
  return f;
};
const make = (f) => createClock({ now: f.now, setTimer: f.setTimer, clearTimer: f.clearTimer });

test("first tick is scheduled at the next minute boundary", () => {
  const f = fake(NOON + 42500);
  const clock = make(f);
  clock.start();
  assert.equal(f.pending().length, 1);
  assert.equal(f.pending()[0].ms, 17500);
});

test("after a tick the next one re-aligns to the next boundary", () => {
  const f = fake(NOON + 42500);
  const clock = make(f);
  const calls = [];
  clock.subscribe((t) => calls.push(t));
  clock.start();
  f.fireNext();
  assert.deepEqual(calls, [NOON + MIN]);
  // the timer ran 120 ms late; the next delay makes up for it
  f.t += 120;
  f.timers.clear();
  clock.pause();
  clock.start();
  assert.equal(f.pending()[0].ms, MIN - 120);
});

test("a tick that runs late schedules the next one on the boundary", () => {
  const f = fake(NOON + 42500);
  const clock = make(f);
  clock.subscribe(() => { f.t += 300; });
  clock.start();
  f.fireNext();
  assert.equal(f.pending().length, 1);
  assert.equal(f.pending()[0].at, NOON + 2 * MIN);
});

test("while paused no listener is called", () => {
  const f = fake(NOON + 42500);
  const clock = make(f);
  let calls = 0;
  clock.subscribe(() => calls++);
  clock.start();
  const old = f.pending()[0].fn;
  clock.pause();
  assert.equal(f.pending().length, 0);
  f.t += 10 * MIN;
  old();
  assert.equal(calls, 0);
  assert.equal(f.pending().length, 0);
});

test("resume after 5 minutes hidden calls listeners once, now, and re-aligns", () => {
  const f = fake(NOON + 42500);
  const clock = make(f);
  const calls = [];
  clock.subscribe((t) => calls.push(t));
  clock.start();
  clock.pause();
  f.t += 5 * MIN;
  clock.resume();
  assert.deepEqual(calls, [NOON + 42500 + 5 * MIN]);
  assert.equal(f.pending().length, 1);
  assert.equal(f.pending()[0].at, NOON + 6 * MIN);
});

test("resume when not paused does nothing", () => {
  const f = fake(NOON + 42500);
  const clock = make(f);
  let calls = 0;
  clock.subscribe(() => calls++);
  clock.start();
  clock.resume();
  assert.equal(calls, 0);
  assert.equal(f.pending().length, 1);
});

test("start or resume twice never leaves two timers pending", () => {
  const f = fake(NOON + 42500);
  const clock = make(f);
  clock.start();
  clock.start();
  assert.equal(f.pending().length, 1);
  clock.pause();
  clock.resume();
  clock.resume();
  assert.equal(f.pending().length, 1);
});

test("unsubscribe stops calls", () => {
  const f = fake(NOON + 42500);
  const clock = make(f);
  let calls = 0;
  const off = clock.subscribe(() => calls++);
  clock.start();
  f.fireNext();
  off();
  f.fireNext();
  assert.equal(calls, 1);
});
