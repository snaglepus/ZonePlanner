// Editing the zone list: add, change, delete and reorder.
import { test, expect } from "@playwright/test";
import { moveRow } from "../js/reorder.js";
import { addBySearch, open, row, rowNames } from "./helpers.js";

test.use({ timezoneId: "Australia/Sydney" });

test("Add by search and by offset", async ({ page }) => {
  await open(page);
  await addBySearch(page, "Tokyo", '.result[data-name="Tokyo"]');
  await expect(page.locator("#toast")).toHaveText("Added Tokyo");
  await expect(page.locator("#zoneSearch")).toBeVisible();
  await addBySearch(page, "+5:30", ".result[data-offset]");
  await expect(page.locator("#toast")).toHaveText("Added UTC+05:30");
  expect(await rowNames(page)).toEqual(["Sydney", "New York", "London", "Singapore", "Tokyo", "UTC+05:30"]);
});

test("Change and delete in edit mode", async ({ page }) => {
  await open(page);
  const count = async () => parseInt(await page.locator("#zoneCount").textContent(), 10);
  await page.locator("#editBtn").click();
  await page.getByRole("button", { name: "Change London" }).click();
  await page.locator("#zoneSearch").fill("Paris");
  await page.locator('#results .result[data-name="Paris"]').click();
  await expect(page.locator("#toast")).toHaveText("Changed London to Paris");
  await expect(row(page, 2).locator(".row-name > b")).toHaveText("Paris");
  const before = await count();
  await page.getByRole("button", { name: "Remove New York" }).click();
  await expect(page.locator("#toast")).toHaveText("Removed New York");
  expect(await rowNames(page)).toEqual(["Sydney", "Paris", "Singapore"]);
  expect(await count()).toBe(before - 1);
});

test("Drag reorder: the last user row moves above the first", async ({ page }) => {
  await open(page);
  const names = await rowNames(page);
  const last = names.length - 1;
  const grip = row(page, last).locator(".row-grip");
  await grip.scrollIntoViewIfNeeded();
  const g = await grip.boundingBox();
  const first = await row(page, 1).boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, first.y + 4, { steps: 10 });
  await page.mouse.up();
  const after = await rowNames(page);
  expect(after).not.toEqual(names);
  expect(after).toEqual(moveRow(names, last, 1));
  expect(after[0]).toBe("Sydney");
});
