// Stored state, corrupt-state recovery, opening a share link and copying the meeting times.
import { test, expect } from "@playwright/test";
import { addBySearch, expandMeeting, open, rowNames } from "./helpers.js";

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

test("Share link opens: rows, date and length, and the hash follows changes", async ({ page }) => {
  await open(page, { hash: "#z=America%2FNew_York~New%20York,@330&d=2026-06-17&l=8" });
  expect(await rowNames(page)).toEqual(["Sydney", "New York", "UTC+05:30"]);
  await expect(page.locator("#dateInput")).toHaveValue("2026-06-17");
  await expect(page.locator('#lengthSeg [data-len="8"]')).toHaveAttribute("aria-checked", "true");
  await expandMeeting(page);
  await page.locator('#lengthSeg [data-len="4"]').click();
  await expect(page.locator('#lengthSeg [data-len="4"]')).toHaveAttribute("aria-checked", "true");
  await expect.poll(() => page.evaluate(() => location.hash)).toContain("l=4");
});

test("Copy times: one line per row and a toast", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text) => { window.copied = text; } } });
  });
  await open(page);
  const names = await rowNames(page);
  await page.getByRole("button", { name: "Copy times" }).click();
  await expect.poll(() => page.evaluate(() => window.copied)).toBeTruthy();
  const lines = (await page.evaluate(() => window.copied)).split("\n");
  // the config's en-GB locale gives 24-hour times
  const parsed = lines.map((l) => l.match(/^(.+): (Mon|Tue|Wed|Thu|Fri|Sat|Sun) (\d\d:\d\d)–(\d\d:\d\d)$/));
  for (const [i, m] of parsed.entries()) expect(m, lines[i]).not.toBeNull();
  expect(parsed.map((m) => m[1])).toEqual(names);
  // the home line matches the card's meeting time on the pinned Tuesday
  const [start, end] = (await page.locator("#meetingTime").textContent()).split(" – ");
  expect(lines[0]).toBe(`Sydney: Tue ${start}–${end}`);
  await expect(page.locator("#toast")).toHaveText("Meeting times copied");
});
