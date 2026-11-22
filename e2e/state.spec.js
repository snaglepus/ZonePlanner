// Stored state, corrupt-state recovery and the share link.
import { test, expect } from "@playwright/test";
import { SYDNEY_MORNING, addBySearch, expandMeeting, open, rowNames } from "./helpers.js";

test.use({ timezoneId: "Australia/Sydney" });

test("State survives reload: rows, filter and length", async ({ page }) => {
  await open(page);
  await addBySearch(page, "Tokyo", '.result[data-name="Tokyo"]');
  await page.keyboard.press("Escape");
  await page.locator('#filterSeg [data-filter="good"]').click();
  await expandMeeting(page);
  await page.locator('#lengthSeg [data-len="8"]').click();
  const names = await rowNames(page);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("zoneplanner.state") || "{}")))
    .toMatchObject({ filter: "good", len: 8, zones: expect.arrayContaining([{ tz: "Asia/Tokyo", name: "Tokyo" }]) });
  await page.reload();
  expect(await rowNames(page)).toEqual(names);
  await expect(page.locator('#filterSeg [data-filter="good"]')).toHaveAttribute("aria-checked", "true");
  await expect(page.locator('#lengthSeg [data-len="8"]')).toHaveAttribute("aria-checked", "true");
});

test("Corrupt state recovers to the defaults and keeps a backup", async ({ page }) => {
  const corrupt = "{not json";
  // the page loads once, so the corrupt text is only there for the app's first read
  await page.addInitScript((text) => localStorage.setItem("zoneplanner.state", text), corrupt);
  await open(page);
  expect(await rowNames(page)).toEqual(["Sydney", "New York", "London", "Singapore"]);
  await expect(page.locator("#toast")).toHaveText("Your saved zones couldn't be read, so the defaults are back.");
  expect(await page.evaluate(() => localStorage.getItem("zoneplanner.state.bak"))).toBe(corrupt);
});

test("Share link round trip: rows, date and length", async ({ page, browser }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text) => { window.copied = text; } } });
  });
  await open(page);
  await addBySearch(page, "+5:30", ".result[data-offset]");
  await page.keyboard.press("Escape");
  await expandMeeting(page);
  await page.locator('#lengthSeg [data-len="8"]').click();
  await page.locator("#dateInput").fill("2026-06-17");
  await page.locator("#dateInput").dispatchEvent("change");
  await expect(page.locator("#dateInput")).toHaveValue("2026-06-17");
  const names = await rowNames(page);
  await page.locator("#shareBtn").click();
  await expect.poll(() => page.evaluate(() => window.copied)).toBeTruthy();
  const url = await page.evaluate(() => window.copied);
  expect(url).toContain("d=2026-06-17");
  expect(url).toContain("l=8");

  const context = await browser.newContext({ timezoneId: "Australia/Sydney", locale: "en-GB", viewport: page.viewportSize() });
  const fresh = await context.newPage();
  await fresh.clock.setFixedTime(SYDNEY_MORNING);
  await fresh.goto(url);
  await expect(fresh.locator("#rows .row[data-idx]").first()).toBeVisible();
  expect(await rowNames(fresh)).toEqual(names);
  await expect(fresh.locator("#dateInput")).toHaveValue("2026-06-17");
  await expect(fresh.locator('#lengthSeg [data-len="8"]')).toHaveAttribute("aria-checked", "true");
  await context.close();
});
