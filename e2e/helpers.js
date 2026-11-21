// Shared helpers for the e2e specs. Each test pins the clock here and the zone with test.use; the config pins the locale.
import { expect } from "@playwright/test";

/** 09:30 on Tuesday 16 June 2026 in Sydney. */
export const SYDNEY_MORNING = "2026-06-15T23:30:00Z";

/** Pin the clock, then load the app (with an optional hash) and wait for the grid. */
export const open = async (page, { at = SYDNEY_MORNING, hash = "" } = {}) => {
  await page.clock.setFixedTime(at);
  await page.goto(`index.html${hash}`);
  await expect(page.locator("#rows .row[data-idx]").first()).toBeVisible();
};

/** The zone row at an index (0 is home). */
export const row = (page, idx) => page.locator(`#rows .row[data-idx="${idx}"]`);

/** Every zone row's name, home first. */
export const rowNames = (page) => page.locator("#rows .row[data-idx] .row-name > b").allTextContents();

/** Scroll slot `s` of a row's track into view and tap it (phone) or click it (desktop). */
export const pickSlot = async (page, idx, s, project) => {
  const head = row(page, idx).locator(".row-head");
  await head.scrollIntoViewIfNeeded();
  await page.evaluate(([i, slot]) => {
    const rows = document.getElementById("rows");
    const bands = rows.querySelector(`.row[data-idx="${i}"] .bands`);
    const w = bands.offsetWidth / Number(getComputedStyle(rows).getPropertyValue("--n"));
    rows.scrollLeft = Math.max(0, bands.offsetLeft + slot * w - (rows.clientWidth + bands.offsetLeft) / 2);
  }, [idx, s]);
  const { box, n } = await row(page, idx).locator(".bands").evaluate((b) => {
    const r = b.getBoundingClientRect();
    return { box: { x: r.x, y: r.y, width: r.width, height: r.height }, n: Number(getComputedStyle(b).getPropertyValue("--n")) };
  });
  const x = box.x + (s + 0.5) * (box.width / n);
  const y = box.y + box.height / 2;
  if (project === "phone") await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
};

/** Open Add City, type a query and choose the matching result. */
export const addBySearch = async (page, query, result) => {
  if (!(await page.locator("#zoneSheet").isVisible())) await page.locator("#addZone").click();
  await page.locator("#zoneSearch").fill(query);
  await page.locator(`#results ${result}`).click();
};
