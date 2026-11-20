import { test } from "node:test";
import assert from "node:assert/strict";
import { moveRow } from "../js/reorder.js";

const ROWS = ["home", "a", "b", "c", "d"];

test("moving down shifts the rows between up", () => assert.deepEqual(moveRow(ROWS, 1, 3), ["home", "b", "c", "a", "d"]));
test("moving up shifts the rows between down", () => assert.deepEqual(moveRow(ROWS, 3, 1), ["home", "c", "a", "b", "d"]));
test("moving to the last index", () => assert.deepEqual(moveRow(ROWS, 2, 4), ["home", "a", "c", "d", "b"]));
test("a target at the fixed rows is clamped to the first movable row", () => assert.deepEqual(moveRow(ROWS, 3, 0), ["home", "c", "a", "b", "d"]));
test("a target above the list is clamped to the first movable row", () => assert.deepEqual(moveRow(ROWS, 4, -2), ["home", "d", "a", "b", "c"]));
test("a target past the end is clamped to the last index", () => assert.deepEqual(moveRow(ROWS, 1, 9), ["home", "b", "c", "d", "a"]));
test("the same index leaves the order unchanged", () => assert.deepEqual(moveRow(ROWS, 2, 2), ROWS));
test("a from inside the fixed rows leaves the order unchanged", () => assert.deepEqual(moveRow(ROWS, 0, 3), ROWS));
test("a null target (cancel) leaves the order unchanged", () => assert.deepEqual(moveRow(ROWS, 2, null), ROWS));
test("the result is a new array", () => assert.notEqual(moveRow(ROWS, 2, null), ROWS));
test("the input is not mutated", () => {
  const list = ["home", "a", "b", "c"];
  const next = moveRow(list, 1, 3);
  assert.deepEqual(list, ["home", "a", "b", "c"]);
  assert.deepEqual(next, ["home", "b", "c", "a"]);
});
