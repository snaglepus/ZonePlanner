// A clock-change day, offline reload, and privacy and CSP.
import { test, expect } from "@playwright/test";
import { addBySearch, open, pickSlot, row } from "./helpers.js";

test.describe("London spring forward", () => {
  test.use({ timezoneId: "Europe/London" });

  test("DST day: a 23-hour day lines up hour for hour", async ({ page }, testInfo) => {
    await open(page, { at: "2026-03-29T12:00:00Z", hash: "#z=Asia%2FTokyo~Tokyo" });
    const london = row(page, 0).locator(".cell");
    const tokyo = row(page, 1).locator(".cell");
    await expect(london).toHaveCount(23);
    await expect(tokyo).toHaveCount(23);
    const hours = (from, n) => Array.from({ length: n }, (_, i) => String((from + i) % 24));
    // 01:00 doesn't exist in London, so column c is the same instant in both rows
    expect(await london.allTextContents()).toEqual(["0", ...hours(2, 22)]);
    expect(await tokyo.allTextContents()).toEqual(hours(9, 23));
    // 14:00 BST is 13 hours after London midnight on this day
    await pickSlot(page, 0, 13 * 4, testInfo.project.name);
    await expect(row(page, 0).locator("[data-at] b")).toHaveText("14:00–15:00");
    await expect(row(page, 1).locator("[data-at] b")).toHaveText("22:00–23:00");
  });
});

test.describe("Sydney", () => {
  test.use({ timezoneId: "Australia/Sydney" });

  test("Offline reload: the cached app still renders and searches", async ({ page, context }) => {
    await open(page);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await context.setOffline(true);
    await page.reload();
    await expect(row(page, 0)).toBeVisible();
    await expect(page.locator("#rows .row[data-idx]")).toHaveCount(4);
    await page.locator("#addZone").click();
    await page.locator("#zoneSearch").fill("Tokyo");
    await expect(page.locator('#results .result[data-name="Tokyo"]')).toBeVisible();
  });

  test("Privacy and CSP: no third-party requests and no violations", async ({ page, context }, testInfo) => {
    const requests = [];
    context.on("request", (r) => requests.push(r.url()));
    const cspConsole = [];
    page.on("console", (m) => { if (/Content Security Policy/i.test(m.text())) cspConsole.push(m.text()); });
    await page.addInitScript(() => {
      window.cspViolations = [];
      document.addEventListener("securitypolicyviolation", (e) => window.cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    await open(page);
    await addBySearch(page, "Tokyo", '.result[data-name="Tokyo"]');
    await page.keyboard.press("Escape");
    await page.locator('#filterSeg [data-filter="good"]').click();
    await pickSlot(page, 0, 14 * 4, testInfo.project.name);
    await expect(page.locator("#meetingTime")).toHaveText(/^14:00/);

    const origin = new URL(testInfo.project.use.baseURL).origin;
    const foreign = requests.filter((u) => !u.startsWith("data:") && !u.startsWith("blob:") && new URL(u).origin !== origin);
    expect(foreign).toEqual([]);
    expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
    expect(cspConsole).toEqual([]);
  });
});
