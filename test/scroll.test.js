import { test } from "node:test";
import assert from "node:assert/strict";
import { wheelScroll } from "../js/scroll.js";

test("vertical down mid-range scrolls by dy", () => assert.equal(wheelScroll(0, 100, 300, 1000), 100));
test("vertical up mid-range scrolls by dy", () => assert.equal(wheelScroll(0, -100, 300, 1000), -100));
test("horizontal-dominant delta is left alone", () => assert.equal(wheelScroll(50, 10, 300, 1000), 0));
test("equal deltas are left alone", () => assert.equal(wheelScroll(40, 40, 300, 1000), 0));
test("at the start, wheel going back is left alone", () => assert.equal(wheelScroll(0, -100, 0, 1000), 0));
test("at the start, wheel going forward scrolls", () => assert.equal(wheelScroll(0, 100, 0, 1000), 100));
test("at the end, wheel going forward is left alone", () => assert.equal(wheelScroll(0, 100, 1000, 1000), 0));
test("at the end, wheel going back scrolls", () => assert.equal(wheelScroll(0, -100, 1000, 1000), -100));
test("overshooting the end is clamped to the remaining distance", () => assert.equal(wheelScroll(0, 100, 960, 1000), 40));
test("nothing to scroll is left alone", () => assert.equal(wheelScroll(0, 100, 0, 0), 0));
