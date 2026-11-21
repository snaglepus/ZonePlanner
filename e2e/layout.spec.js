// The phone fold: at the iPhone 13's own 390x664 Safari viewport a first load shows the Everyone row and the whole home row.
import { test, expect } from "@playwright/test";
import { open } from "./helpers.js";

test.use({ timezoneId: "Australia/Sydney", viewport: { width: 390, height: 664 } });

/** 09:30 on Sunday 21 June 2026 in Sydney: every slot of the home day is a weekend slot in all four default zones. */
const SYDNEY_SUNDAY = "2026-06-20T23:30:00Z";

/** The Everyone row inside the viewport, the home row's bottom at or above 620 and no horizontal page scroll. */
const expectFold = async (page) => {
  const m = await page.evaluate(() => {
    const all = document.querySelector("#rows .row-all").getBoundingClientRect();
    const home = document.querySelector('#rows .row[data-idx="0"]').getBoundingClientRect();
    return {
      scrollY: window.scrollY, allTop: all.top, allBottom: all.bottom, homeBottom: home.bottom,
      height: window.innerHeight, scrollWidth: document.documentElement.scrollWidth
    };
  });
  expect(m.scrollY).toBe(0);
  expect(m.allTop).toBeGreaterThanOrEqual(0);
  expect(m.allBottom).toBeLessThanOrEqual(m.height);
  expect(m.homeBottom).toBeLessThanOrEqual(620);
  expect(m.scrollWidth).toBeLessThanOrEqual(390);
};

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
  const box = await verdict.evaluate((v) => {
    const cs = getComputedStyle(v);
    const pad = ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"].reduce((sum, k) => sum + parseFloat(cs[k]), 0);
    return { height: v.getBoundingClientRect().height, line: parseFloat(cs.lineHeight), pad };
  });
  expect(box.line).toBeGreaterThan(0);
  expect(box.height).toBeLessThanOrEqual(2 * box.line + box.pad + 1);
  await expectFold(page);
});
