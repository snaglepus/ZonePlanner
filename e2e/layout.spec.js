// The phone fold: at the iPhone 13's own 390x664 Safari viewport a first load shows the collapsed meeting card, the Everyone row,
// the home row and the first two user rows. The card's disclosure button opens the full card; at 560px and wider it is hidden.
import { test, expect } from "@playwright/test";
import { open } from "./helpers.js";

test.use({ timezoneId: "Australia/Sydney", viewport: { width: 390, height: 664 } });

/** 09:30 on Sunday 21 June 2026 in Sydney: every slot of the home day is a weekend slot in all four default zones. */
const SYDNEY_SUNDAY = "2026-06-20T23:30:00Z";

/** The Everyone row and rows 0 to 2 inside the viewport without scrolling, and no horizontal page scroll. */
const expectFold = async (page) => {
  const m = await page.evaluate(() => {
    const bottom = (sel) => document.querySelector(sel).getBoundingClientRect().bottom;
    return {
      scrollY: window.scrollY, allTop: document.querySelector("#rows .row-all").getBoundingClientRect().top,
      bottoms: ["#rows .row-all", '#rows .row[data-idx="0"]', '#rows .row[data-idx="1"]', '#rows .row[data-idx="2"]'].map(bottom),
      height: window.innerHeight, scrollWidth: document.documentElement.scrollWidth
    };
  });
  expect(m.scrollY).toBe(0);
  expect(m.allTop).toBeGreaterThanOrEqual(0);
  for (const b of m.bottoms) expect(b).toBeLessThanOrEqual(m.height);
  expect(m.scrollWidth).toBeLessThanOrEqual(390);
};

/** How many lines the verdict may take: its height against its line-height plus padding and borders. */
const verdictLines = (page) => page.locator("#verdict").evaluate((v) => {
  const cs = getComputedStyle(v);
  const pad = ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"].reduce((sum, k) => sum + parseFloat(cs[k]), 0);
  return { height: v.getBoundingClientRect().height, line: parseFloat(cs.lineHeight), pad };
});

const lengths = (page) => page.locator("#lengthSeg button").evaluateAll((bs) => bs.map((b) => b.getAttribute("aria-checked")));

test("Phone fold: zones show on load in 24h, in 12h and with a long weekend verdict", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "the fold check is for the phone project");
  await open(page);
  await expectFold(page);

  await page.locator('#clockSeg [data-h12="true"]').click();
  await expect(page.locator('#clockSeg [data-h12="true"]')).toHaveAttribute("aria-checked", "true");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectFold(page);

  await open(page, { at: SYDNEY_SUNDAY });
  const verdict = page.locator("#verdict");
  await expect(verdict).toHaveAttribute("data-tone", "bad");
  const text = await verdict.textContent();
  for (const name of ["Sydney", "New York", "London", "Singapore"]) expect(text).toContain(name);
  expect(text.split(", weekend)").length - 1).toBe(4);
  const collapsed = await verdictLines(page);
  expect(collapsed.line).toBeGreaterThan(0);
  expect(collapsed.height).toBeLessThanOrEqual(collapsed.line + collapsed.pad + 1);
  await expectFold(page);

  // expanding shows the whole card and changes nothing else
  const toggle = page.locator("#meetingToggle");
  const time = await page.locator("#meetingTime").textContent();
  const checked = await lengths(page);
  await expect(page.locator("#lengthSeg")).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  for (const id of ["#meetingSub", "#lengthSeg", "#suggestions"]) await expect(page.locator(id)).toBeVisible();
  const expanded = await verdictLines(page);
  expect(expanded.height).toBeLessThanOrEqual(2 * expanded.line + expanded.pad + 1);
  await expect(page.locator("#meetingTime")).toHaveText(time);
  expect(await lengths(page)).toEqual(checked);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#lengthSeg")).toBeHidden();
});

test("Wide card: at 560px the disclosure button is hidden and the whole card shows", async ({ page }) => {
  await page.setViewportSize({ width: 560, height: 800 });
  await open(page);
  await expect(page.locator("#meetingToggle")).toBeHidden();
  for (const id of ["#meetingSub", "#lengthSeg", "#suggestions"]) await expect(page.locator(id)).toBeVisible();
});
