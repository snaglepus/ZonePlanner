// The core use cases: glance, find a slot, confirm it, travel.
import { test, expect } from "@playwright/test";
import { expandMeeting, open, pickSlot, row, rowNames } from "./helpers.js";

test.use({ timezoneId: "Australia/Sydney" });

test("UC1 Glance: home and default rows show their live local time", async ({ page }) => {
  await open(page);
  const home = row(page, 0);
  await expect(home.getByRole("img", { name: "Home zone" })).toBeVisible();
  await expect(home.locator(".row-name > b")).toHaveText("Sydney");
  await expect(home.locator(".row-time")).toHaveText("09:30");
  expect(await rowNames(page)).toEqual(["Sydney", "New York", "London", "Singapore"]);
  await expect(row(page, 1).locator(".row-time")).toHaveText("19:30");
  await expect(row(page, 2).locator(".row-time")).toHaveText("00:30");
  await expect(row(page, 3).locator(".row-time")).toHaveText("07:30");
});

test("UC2 Find a slot: the Best filter keeps the shared Best hours", async ({ page }) => {
  await open(page, { hash: "#z=Asia%2FSingapore~Singapore" });
  await page.locator('#filterSeg [data-filter="best"]').click();
  await expect(page.locator('#filterSeg [data-filter="best"]')).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("#filterEmpty")).toBeHidden();
  await expandMeeting(page);
  const chips = page.locator("#suggestions .chip");
  await expect(page.locator("#suggestions .chips-empty")).toHaveCount(0);
  expect(await chips.count()).toBeGreaterThan(0);
  // Sydney Best (09–17) overlaps Singapore Best (11–19 Sydney time) from 11:00 to 17:00, so a 1h window starts 11:00–16:00.
  for (const text of await chips.allTextContents()) {
    const [h, m] = text.trim().slice(0, 5).split(":").map(Number);
    const min = h * 60 + m;
    expect(min, text).toBeGreaterThanOrEqual(11 * 60);
    expect(min, text).toBeLessThanOrEqual(16 * 60);
  }
  expect(await row(page, 0).locator(".bands .dim").count()).toBeGreaterThan(0);
});

test("UC3 Confirm a slot: tapping the track selects that hour in every row", async ({ page }, testInfo) => {
  await open(page, { hash: "#z=Asia%2FSingapore~Singapore" });
  await pickSlot(page, 0, 14 * 4, testInfo.project.name);
  await expect(page.locator("#meetingTime")).toHaveText(/^14:00/);
  await expect(row(page, 0).locator("[data-at] b")).toHaveText("14:00–15:00");
  await expect(row(page, 1).locator("[data-at] b")).toHaveText("12:00–13:00");
});

test.describe("travel", () => {
  // Playwright's own timezoneId override blocks a second one from a test's CDP session, so this test pins Sydney
  // through CDP before its first navigation instead, and then moves the same override to Los Angeles.
  test.use({ timezoneId: undefined });

  test("UC4 Travel: the home row follows a new device zone", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "changing timezoneId on a live page needs CDP");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTimezoneOverride", { timezoneId: "Australia/Sydney" });
    await open(page);
    await expect(row(page, 0).locator(".row-name > b")).toHaveText("Sydney");
    await cdp.send("Emulation.setTimezoneOverride", { timezoneId: "America/Los_Angeles" });
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(row(page, 0).locator(".row-name > b")).toHaveText("Los Angeles");
    await expect(page.locator("#toast")).toHaveText("You're now in Los Angeles time");
  });
});
