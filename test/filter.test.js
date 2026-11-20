import { test } from "node:test";
import assert from "node:assert/strict";
import { keptSlots, windowKept } from "../js/filter.js";

const mixed = [0, 1, 2, 2, 1, 0];

test("all keeps every slot", () => assert.deepEqual(keptSlots(mixed, "all"), [true, true, true, true, true, true]));
test("good keeps Good and Best slots", () => assert.deepEqual(keptSlots(mixed, "good"), [false, true, true, true, true, false]));
test("best keeps only Best slots", () => assert.deepEqual(keptSlots(mixed, "best"), [false, false, true, true, false, false]));
test("best with no Best slots keeps nothing", () => assert.deepEqual(keptSlots([0, 1, 1, 0], "best"), [false, false, false, false]));

const kept = [false, true, true, true, false, true, true];
test("a fully kept span is kept", () => assert.equal(windowKept(kept, 1, 3), true));
test("a span with one dimmed slot is not kept", () => assert.equal(windowKept(kept, 2, 3), false));
test("a span at the array's end is kept when its slots are", () => assert.equal(windowKept(kept, 5, 2), true));
test("a span at the array's end with a dimmed slot is not kept", () => assert.equal(windowKept(kept, 4, 3), false));
