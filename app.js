import { BAND_NAME, changeWall, classify, createDstWatch, dayDiff, dayStarts, goodStep, homeDay, localParts, localeHour12, pad, offLabel, weekday, slotAt, zoneTag } from "./js/time.js";
import { createClock } from "./js/clock.js";
import * as S from "./js/strings.js";
import { MAX_USER_ZONES, validTz, rowsToLink, rawParam, linkToRows, followHome, replaceRow } from "./js/zones.js";
import { STATE_KEY, BACKUP_KEY, LEGACY_KEY, LENS, FILTERS, loadState, serializeState, createSaver } from "./js/state.js";
import { wheelScroll } from "./js/scroll.js";
import { moveRow } from "./js/reorder.js";
import { keptSlots, windowKept } from "./js/filter.js";
import { zoneInfo, abbreviationZones, searchCities } from "./js/search.js";
import { weekendSlots, scoredBands, overlapBands } from "./js/weekend.js";

const SLOT_MIN = 15;
const SLOT_MS = SLOT_MIN * 60000;
const DAY_LABEL_SLOTS = 6;

// ---------- State ----------
const deviceTz = () => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return validTz(tz) ? tz : "Europe/London";
};
const todayISO = () => {
  const p = localParts(deviceTz(), Date.now());
  return `${p.date.getUTCFullYear()}-${pad(p.date.getUTCMonth() + 1)}-${pad(p.date.getUTCDate())}`;
};

const state = { zones: [], date: todayISO(), len: 4, hour12: null, filter: "all", start: null, editing: false };

const mkZone = (tz, name) => zoneInfo(tz, name);
/** A fixed-offset row: its name always comes from the validated minutes, never from stored or linked text. */
const mkOffset = (offsetMin) => ({ offsetMin, name: S.offsetName(offsetMin), country: "" });
/** The zone the time engine takes for a row: an IANA ID, or minutes for an offset row. */
const zoneOf = (z) => ("offsetMin" in z ? z.offsetMin : z.tz);

let store = null;
try { store = localStorage; } catch { /* storage blocked: saves become no-ops */ }
const saver = createSaver({ storage: store, key: STATE_KEY });

// The home row is always the device zone; storage and links only supply the user rows.
const load = () => {
  saver.flush();
  const home = deviceTz();
  const hash = new URLSearchParams(location.hash.slice(1));
  let text = null;
  let legacyText = null;
  try { text = localStorage.getItem(STATE_KEY); } catch { /* storage unavailable */ }
  try { legacyText = localStorage.getItem(LEGACY_KEY); } catch { /* storage unavailable */ }
  const stored = loadState(text, legacyText, home);
  if (stored.status === "reset") {
    try { localStorage.setItem(BACKUP_KEY, text); } catch { /* ignore */ }
    toast(S.STATE_RESET);
  }
  state.len = stored.state.len;
  state.hour12 = stored.state.hour12;
  state.filter = stored.state.filter;
  let rows = stored.state.zones;
  if (hash.get("z")) {
    const picked = linkToRows(rawParam(location.hash.slice(1), "z"), home);
    rows = picked.rows;
    if (/^\d{4}-\d{2}-\d{2}$/.test(hash.get("d") || "")) state.date = hash.get("d");
    if (LENS.map(String).includes(hash.get("l"))) state.len = +hash.get("l");
    if (picked.dropped > 0) toast(S.linkDropped(picked.dropped));
  }
  state.zones = [mkZone(home), ...rows.map((z) => ("tz" in z ? mkZone(z.tz, z.name) : mkOffset(z.offsetMin)))];
};
const save = () => {
  const zones = state.zones.slice(1).map((z) => ("offsetMin" in z ? { offsetMin: z.offsetMin } : { tz: z.tz, name: z.name }));
  saver.save(serializeState({ zones, hour12: state.hour12, filter: state.filter, len: state.len }));
};
/** The clock in use: the user's choice, or the locale's while hour12 is null. */
const hour12 = () => state.hour12 ?? localeHour12();
const timeText = (p) => S.clock(p, hour12());
const shareURL = () => `${location.origin}${location.pathname}#z=${rowsToLink(state.zones)}&d=${state.date}&l=${state.len}`;

// ---------- Model ----------
let model = null;
const buildModel = () => {
  const [y, m, d] = state.date.split("-").map(Number);
  const home = state.zones[0];
  const { t0, t1, slots: n, cols } = homeDay(home.tz, y, m, d);
  const grid = state.zones.map((z) => {
    const bands = new Array(n);
    const heat = new Array(n);
    const parts = new Array(n);
    for (let i = 0; i < n; i++) {
      const p = localParts(zoneOf(z), t0 + i * SLOT_MS);
      parts[i] = p;
      bands[i] = classify(p.mod);
      heat[i] = goodStep(p.mod);
    }
    const weekend = weekendSlots(zoneOf(z), z.cc, t0, n);
    return { bands, heat, parts, weekend, score: scoredBands(bands, weekend) };
  });
  const all = overlapBands(grid);
  model = { t0, t1, n, cols, grid, all, kept: keptSlots(all, state.filter) };
};

/** Lower cost is better. Each zone costs its worst scored slot in the window (weekend slots are Unsuitable). */
const PENALTY = { 2: 0, 1: 2, 0: 9 };
const windowStats = (s) => {
  const L = state.len;
  const worst = model.grid.map((g) => { let w = 2; for (let i = s; i < s + L; i++) w = Math.min(w, g.score[i]); return w; });
  const soft = model.grid.reduce((acc, g) => { for (let i = s; i < s + L; i++) acc += PENALTY[g.bands[i]]; return acc; }, 0);
  const cost = worst.reduce((a, w) => a + PENALTY[w], 0);
  return { s, worst, cost, soft, biz: worst.filter((w) => w === 2).length, edge: worst.filter((w) => w === 1).length, night: worst.filter((w) => w === 0).length };
};
const suggestions = () => {
  const out = [];
  const L = state.len;
  const mid = model.n / 2 + 4; // nudge toward home afternoon
  for (let s = 0; s + L <= model.n; s += 2) if (windowKept(model.kept, s, L)) out.push(windowStats(s));
  out.sort((a, b) => a.cost - b.cost || a.soft - b.soft || Math.abs(a.s - mid) - Math.abs(b.s - mid));
  const picked = [];
  for (const w of out) {
    if (picked.length >= 4) break;
    if (picked.some((p) => Math.abs(p.s - w.s) < L)) continue;
    if (picked.length && w.night > 0 && picked[0].night === 0) continue;
    picked.push(w);
  }
  return picked;
};

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const el = {
  rows: $("rows"), scrub: $("scrub"), selbar: $("selbar"), nowLine: $("nowLine"), nowBtn: $("nowBtn"), timeline: $("timeline"),
  meetingTime: $("meetingTime"), meetingSub: $("meetingSub"), verdict: $("verdict"), suggestions: $("suggestions"),
  lengthSeg: $("lengthSeg"), filterSeg: $("filterSeg"), filterEmpty: $("filterEmpty"), clockSeg: $("clockSeg"), legendBest: $("legendBest"), legendGood: $("legendGood"), dateInput: $("dateInput"), dateLabel: $("dateLabel"), zoneCount: $("zoneCount"),
  addZone: $("addZone"), zoneLimit: $("zoneLimit"), editBtn: $("editBtn"), copyBtn: $("copyBtn"), shareBtn: $("shareBtn"),
  sheet: $("zoneSheet"), sheetTitle: $("sheetTitle"), search: $("zoneSearch"), results: $("results"), sheetNote: $("sheetNote"), toast: $("toast"),
  dstSheet: $("dstSheet"), dstTitle: $("dstTitle"), dstText: $("dstText")
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (id) => `<svg class="ico" aria-hidden="true"><use href="#i-${id}"/></svg>`;

const SVG_NS = "http://www.w3.org/2000/svg";
const make = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};
const svgUse = (id) => {
  const svg = document.createElementNS(SVG_NS, "svg");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", `#i-${id}`);
  svg.append(use);
  return svg;
};
const actBtn = (act, idx, label, id) => {
  const b = make("button", "icon-btn icon-btn-soft");
  b.type = "button";
  b.dataset.act = act;
  b.dataset.idx = String(idx);
  b.setAttribute("aria-label", label);
  b.append(svgUse(id));
  return b;
};

/** One hour cell per column over the 15-minute band runs; labels and day dividers only when a zone is given, Good heat steps only when heat is, a weekend overlay only when weekend is. Slots the filter drops are dimmed.
 * On a 12-hour clock the first cell and each cell where am/pm changes carry the meridiem cue. */
const trackEl = (bands, z, heat, weekend) => {
  const track = make("div", "track");
  track.setAttribute("aria-hidden", "true");
  const runs = make("div", "bands");
  for (let i = 0; i < model.n;) {
    let j = i;
    while (j < model.n && bands[j] === bands[i] && (!heat || heat[j] === heat[i]) && model.kept[j] === model.kept[i]) j++;
    const seg = make("div", `seg-${BAND_NAME[bands[i]]}${heat && heat[i] ? ` heat-${heat[i]}` : ""}${model.kept[i] ? "" : " dim"}`);
    seg.style.setProperty("--w", String(j - i));
    runs.append(seg);
    i = j;
  }
  const cells = make("div", "cells");
  const h12 = hour12();
  let prev = null;
  for (let c = 0; c < model.cols; c++) {
    const cell = make("div", "cell");
    if (z) {
      const p = localParts(zoneOf(z), model.t0 + c * 3600000);
      const label = make("span", null, S.clock(p, h12, { cell: true }));
      if (h12 && (!prev || S.meridiem(p.h) !== S.meridiem(prev.h))) label.append(make("small", null, S.meridiem(p.h)));
      cell.append(label);
      prev = p;
    }
    const w = Math.min(4, model.n - 4 * c);
    if (w < 4) cell.style.setProperty("--w", String(w));
    cells.append(cell);
  }
  // a divider at each local date change, at its exact slot position; near the track's end its label goes on the left
  if (z) for (const { t, label } of dayStarts(zoneOf(z), model.t0, model.t1)) {
    const x = (t - model.t0) / SLOT_MS;
    const mark = make("div", model.n - x < DAY_LABEL_SLOTS ? "daymark daymark-lead" : "daymark");
    mark.style.setProperty("--x", String(x));
    mark.append(make("span", null, label));
    cells.append(mark);
  }
  track.append(runs);
  if (weekend) {
    const shade = make("div", "weekend");
    for (let i = 0; i < model.n;) {
      let j = i;
      while (j < model.n && weekend[j] === weekend[i]) j++;
      const seg = make("div", weekend[i] ? "wk-on" : "wk-off");
      seg.style.setProperty("--w", String(j - i));
      shade.append(seg);
      i = j;
    }
    track.append(shade);
  }
  track.append(cells);
  return track;
};

const renderRows = () => {
  const homeName = state.zones[0].name;
  const ov = overlapSummary();
  const allRow = make("div", "row row-all");
  allRow.dataset.all = ov.tone;
  const allHead = make("div", "row-head");
  const allName = make("div", "row-name");
  allName.append(make("b", null, S.EVERYONE));
  const allAt = make("div", "row-at");
  allAt.append(make("b", null, ov.text));
  allHead.append(allName, allAt);
  allRow.append(allHead, trackEl(model.all));
  const rows = [allRow];
  state.zones.forEach((z, idx) => {
    const row = make("div", "row");
    row.dataset.idx = String(idx);
    const head = make("div", "row-head");
    const name = make("div", "row-name");
    const b = make("b", null, z.name);
    if (idx === 0) {
      const homeIco = svgUse("home");
      homeIco.setAttribute("role", "img");
      homeIco.setAttribute("aria-label", S.HOME_ZONE);
      b.prepend(homeIco);
    }
    const live = make("span", "row-live");
    live.append(make("small", null, S.NOW), " ", make("span", "row-time"));
    const day = make("span", "row-day");
    day.hidden = true;
    const dst = make("span", "row-dst", S.DST);
    dst.hidden = true;
    const warn = actBtn("dst", idx, "", "alert");
    warn.className = "row-warn";
    warn.hidden = true;
    name.append(b, live);
    const at = make("div", "row-at");
    at.dataset.at = "";
    const meta = make("div", "row-meta");
    meta.append(make("span", "row-band"), make("span", "row-tag"), day, dst, warn);
    const actions = make("div", "row-actions");
    if (idx !== 0) actions.append(actBtn("change", idx, S.changeZone(z.name), "edit"), actBtn("remove", idx, S.removeZone(z.name), "x"));
    head.append(name, at, meta, actions);
    if (idx !== 0) {
      const grip = make("div", "row-grip");
      grip.setAttribute("aria-hidden", "true");
      grip.append(svgUse("grip"));
      head.append(grip);
    }
    row.append(head, trackEl(model.grid[idx].bands, z, model.grid[idx].heat, model.grid[idx].weekend));
    rows.push(row);
  });
  el.rows.style.setProperty("--n", String(model.n));
  el.rows.replaceChildren(...rows, el.selbar, el.nowLine);
  const users = state.zones.length - 1;
  el.zoneCount.textContent = S.zoneCount(users, MAX_USER_ZONES);
  el.addZone.disabled = users >= MAX_USER_ZONES;
  el.zoneLimit.textContent = S.ZONES_FULL;
  el.zoneLimit.hidden = users < MAX_USER_ZONES;
  el.rows.setAttribute("aria-label", S.rowsLabel(homeName));
  renderLive();
};

const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
const setHidden = (node, hidden) => { if (node.hidden !== hidden) node.hidden = hidden; };
// One cached DST watch: scans each zone once per UTC day, so a tick does no scanning.
const dstWatch = createDstWatch();
/** A clock change's local date on the old clock: "Sun 25 Oct". */
const changeDate = (change) => changeWall(change).date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
// The rows' warnings ("idx:at" per row with one) as renderLive last saw them.
let lastWarnings = "";
/** Each row header's live time, abbreviation and offset, day difference and DST badges; writes only what changed, never rebuilds rows.
 * Returns whether the rows' warnings changed since the last run. */
const renderLive = () => {
  if (lift) return false;
  const now = Date.now();
  const home = zoneOf(state.zones[0]);
  const h12 = hour12();
  const warnings = [];
  el.rows.querySelectorAll(".row[data-idx]").forEach((row) => {
    const idx = +row.dataset.idx;
    const z = state.zones[idx];
    const tz = zoneOf(z);
    setText(row.querySelector(".row-time"), S.clock(localParts(tz, now), h12));
    setText(row.querySelector(".row-tag"), zoneTag(tz, now));
    const label = idx === 0 ? "" : S.dayDiffLabel(dayDiff(tz, home, now));
    const day = row.querySelector(".row-day");
    setText(day, label);
    setHidden(day, !label);
    const { dst, change } = dstWatch.status(tz, now);
    setHidden(row.querySelector(".row-dst"), !dst);
    const warn = row.querySelector(".row-warn");
    setHidden(warn, !change);
    if (!change) return;
    warnings.push(`${idx}:${change.at}`);
    const name = S.clockChangeLabel(z.name, changeDate(change));
    if (warn.getAttribute("aria-label") !== name) warn.setAttribute("aria-label", name);
  });
  const key = warnings.join(" ");
  const changed = key !== lastWarnings;
  lastWarnings = key;
  return changed;
};
/** A live refresh: the row headers, then the readouts once when a warning appeared, moved or lapsed. */
const liveTick = () => { if (renderLive()) renderSelection(); };

/** Longest run where every zone is at least `min`. */
const longestRun = (min) => {
  let best = null, i = 0;
  while (i < model.n) {
    if (model.all[i] < min) { i++; continue; }
    let j = i; while (j < model.n && model.all[j] >= min) j++;
    if (!best || j - i > best[1] - best[0]) best = [i, j];
    i = j;
  }
  return best;
};
const runLabel = ([i, j]) => {
  const a = model.grid[0].parts[i];
  const b = localParts(state.zones[0].tz, model.t0 + j * SLOT_MS);
  return S.clockRange(a, b, hour12());
};
const overlapSummary = () => {
  const biz = longestRun(2);
  if (biz) return { tone: "biz", text: S.overlapBiz(runLabel(biz)) };
  const edge = longestRun(1);
  if (edge) return { tone: "edge", text: S.overlapEdge(runLabel(edge)) };
  return { tone: "none", text: S.NO_SHARED };
};

const renderSuggestions = (list) => {
  if (!list.length) { el.suggestions.innerHTML = `<span class="chips-empty">${esc(S.NO_WINDOWS)}</span>`; return; }
  el.suggestions.innerHTML = list.map((w) => {
    const p = model.grid[0].parts[w.s];
    const tone = w.night ? "night" : w.edge ? "edge" : "biz";
    const bad = state.zones.map((z, i) => (w.worst[i] === 0 ? `${z.name} ${timeText(model.grid[i].parts[w.s])}` : null)).filter(Boolean);
    const note = w.night ? (bad.length > 1 ? S.inconvenientCount(bad.length) : S.inconvenientOne(bad[0])) : w.edge ? S.bizEdgeCount(w.biz, w.edge) : S.ALL_BUSINESS;
    return `<button type="button" class="chip" data-s="${w.s}" aria-pressed="${w.s === state.start}"><span class="mark mark-${tone}" aria-hidden="true"></span>${esc(timeText(p))} <small>${esc(note)}</small></button>`;
  }).join("");
};

const renderSelection = () => {
  const s = state.start;
  const L = state.len;
  const w = windowStats(s);
  const home = state.zones[0];
  const a = model.grid[0].parts[s];
  const endT = model.t0 + (s + L) * SLOT_MS;
  const b = localParts(home.tz, endT);
  el.meetingTime.textContent = `${timeText(a)} – ${timeText(b)}`;
  const dateTxt = new Date(model.t0 + 12 * 3600000).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: home.tz });
  el.meetingSub.textContent = S.meetingSub(home.name, dateTxt, S.durLabel(L * SLOT_MIN));

  // verdict
  const n = state.zones.length;
  const weekendIn = (i) => model.grid[i].weekend.slice(s, s + L).includes(true);
  const names = (band) => state.zones.filter((_, i) => w.worst[i] === band);
  if (w.biz === n) {
    el.verdict.dataset.tone = "biz";
    el.verdict.textContent = S.verdictAll(n);
  } else if (w.night === 0) {
    el.verdict.dataset.tone = "edge";
    const e = names(1).map((z) => z.name);
    el.verdict.textContent = S.verdictEdge(w.biz, n, e);
  } else {
    el.verdict.dataset.tone = "bad";
    const bad = names(0).map((z) => {
      const idx = state.zones.indexOf(z);
      const at = timeText(model.grid[idx].parts[s]);
      return weekendIn(idx) ? S.verdictWeekendItem(z.name, at) : S.verdictItem(z.name, at);
    });
    el.verdict.textContent = S.verdictBad(bad);
  }

  // per-row readouts
  const h12 = hour12();
  const homeKey = model.grid[0].parts[s].dayKey;
  const now = Date.now();
  const startT = model.t0 + s * SLOT_MS;
  el.rows.querySelectorAll(".row[data-idx]").forEach((row) => {
    const i = +row.dataset.idx;
    const g = model.grid[i];
    const p = g.parts[s];
    const q = localParts(zoneOf(state.zones[i]), endT);
    const band = w.worst[i];
    const label = weekendIn(i) ? S.WEEKEND : S.BAND_LABEL[band];
    row.dataset.at = BAND_NAME[band];
    const dayBadge = p.dayKey !== homeKey ? `<span class="day">${weekday(p.date)}</span>` : "";
    const { change } = dstWatch.status(zoneOf(state.zones[i]), now);
    const after = change && startT >= change.at ? `<span class="row-after">${esc(S.AFTER_CHANGE)}</span>` : "";
    row.querySelector("[data-at]").innerHTML = `<b>${dayBadge}${esc(S.clockRange(p, q, h12))}</b>${after}`;
    row.querySelector(".row-band").innerHTML = `<i class="mark mark-${BAND_NAME[band]}" aria-hidden="true"></i>${esc(label)}`;
  });

  // bar geometry, in slots from the start of the tracks
  const { left, slot } = trackGeom();
  el.selbar.style.width = `${L * slot}px`;
  el.selbar.style.transform = `translateX(${left + s * slot}px)`;
  el.scrub.max = String(model.n - L);
  el.scrub.value = String(s);
  el.scrub.setAttribute("aria-valuetext", S.scrubText(timeText(a), timeText(b), home.name, el.verdict.textContent));
  el.suggestions.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(+c.dataset.s === s)));
};

/** Track start inside the scroller and the width of one 15-minute slot. */
const trackGeom = () => {
  const runs = el.rows.querySelector(".bands");
  return { left: runs.offsetLeft, slot: runs.offsetWidth / model.n };
};
/** Scroll the grid, if needed, so the whole bar shows to the right of the header column. */
const revealSelection = () => {
  const { left, slot } = trackGeom();
  const a = state.start * slot;
  const b = (state.start + state.len) * slot;
  const x = el.rows.scrollLeft;
  const view = el.rows.clientWidth - left;
  if (a < x) el.rows.scrollLeft = a - slot;
  else if (b > x + view) el.rows.scrollLeft = b - view + slot;
};

// Line position in track coordinates and the track's offset, kept by placeNow() for the scroll check.
let nowX = null, nowLeft = 0;
/** Show the Now button unless the line is on screen on today's grid. */
const nowOffscreen = () => {
  if (state.date !== todayISO() || el.nowLine.hidden || nowX == null) return true;
  const x = el.rows.scrollLeft;
  return nowX < x || nowX > x + el.rows.clientWidth - nowLeft;
};
const updateNowBtn = () => { el.nowBtn.hidden = !nowOffscreen(); };
/** Move the now line to the current minute; writes only its transform and hidden, and the button's hidden. */
const placeNow = () => {
  const s = slotAt(Date.now(), model.t0, model.n);
  if (s == null) {
    el.nowLine.hidden = true;
    nowX = null;
  } else {
    const { left, slot } = trackGeom();
    nowX = s * slot;
    nowLeft = left;
    el.nowLine.hidden = false;
    el.nowLine.style.transform = `translateX(${left + nowX}px)`;
  }
  updateNowBtn();
};
/** Scroll the grid so the now line sits one hour column right of the header column. */
const revealNow = () => {
  const s = slotAt(Date.now(), model.t0, model.n);
  if (s == null) return;
  const { slot } = trackGeom();
  el.rows.scrollLeft = Math.max(0, s * slot - 4 * slot);
};

const renderDate = () => {
  el.dateInput.value = state.date;
  const [y, m, d] = state.date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const label = dt.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  el.dateLabel.textContent = state.date === todayISO() ? S.today(label.replace(/^\w+,?\s/, "")) : label;
};

const renderLength = () => {
  el.lengthSeg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(+b.dataset.len === state.len)));
};

const renderFilter = () => {
  el.filterSeg.querySelectorAll("button").forEach((b) => {
    const on = b.dataset.filter === state.filter;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  });
  const empty = state.filter !== "all" && !model.kept.includes(true);
  el.filterEmpty.textContent = empty ? S.filterEmpty(S.BAND_LABEL[state.filter === "best" ? 2 : 1]) : "";
  el.filterEmpty.hidden = !empty;
};

const renderClock = () => {
  const h12 = hour12();
  el.clockSeg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String((b.dataset.h12 === "true") === h12)));
  el.legendBest.textContent = S.legendBest(h12);
  el.legendGood.textContent = S.legendGood(h12);
};

const render = ({ keepStart = false } = {}) => {
  // state.zones may already be shorter than the old rows, so the rebuilt rows get the live refresh instead
  cancelReorder({ live: false });
  buildModel();
  renderDate();
  renderLength();
  renderFilter();
  renderClock();
  renderRows();
  const list = suggestions();
  if (!keepStart || state.start == null || state.start > model.n - state.len) state.start = list.length ? list[0].s : 0;
  renderSuggestions(list);
  renderSelection();
  revealSelection();
  el.timeline.classList.toggle("editing", state.editing);
  save();
  if (location.hash) history.replaceState(null, "", shareURL());
  placeNow();
};

// ---------- Interaction ----------
const setStart = (s) => {
  s = Math.max(0, Math.min(model.n - state.len, s));
  if (s === state.start) return;
  state.start = s;
  renderSelection();
};

el.scrub.addEventListener("input", () => { setStart(+el.scrub.value); revealSelection(); });

el.rows.addEventListener("click", (e) => {
  // a reorder that just ended never selects or removes
  if (reordered) { reordered = false; return; }
  const btn = e.target.closest("button[data-act]");
  if (!btn) {
    // a drag that just ended pans only; it never selects
    if (dragged) { dragged = false; return; }
    // tap a track: start at the quarter-hour under the pointer
    const track = e.target.closest(".track");
    if (!track || state.editing) return;
    const r = track.querySelector(".bands").getBoundingClientRect();
    setStart(Math.floor((e.clientX - r.left) / (r.width / model.n)));
    return;
  }
  const i = +btn.dataset.idx;
  const z = state.zones[i];
  if (btn.dataset.act === "dst") {
    if (z) openDst(i);
    return;
  }
  if (btn.dataset.act === "change" && i > 0 && z) {
    replacing = { idx: i, zone: zoneOf(z), name: z.name };
    openSheet(S.changeTitle(z.name));
    return;
  }
  if (btn.dataset.act === "remove" && i > 0 && z) {
    state.zones.splice(i, 1);
    toast(S.removed(z.name));
  }
  render();
});

// desktop scrolling: a vertical wheel pans sideways until an end, a mouse drag on the cells pans, arrows step an hour
const WHEEL_PX = { 0: 1, 1: 40 };
el.rows.addEventListener("wheel", (e) => {
  if (e.ctrlKey || e.metaKey || e.shiftKey) return;
  const k = WHEEL_PX[e.deltaMode] ?? el.rows.clientWidth;
  const d = wheelScroll(e.deltaX * k, e.deltaY * k, el.rows.scrollLeft, el.rows.scrollWidth - el.rows.clientWidth);
  if (!d) return;
  e.preventDefault();
  el.rows.scrollLeft += d;
}, { passive: false });

const DRAG_PX = 5;
let press = null;
let dragged = false;
const onPressMove = (e) => {
  if (!press || e.pointerId !== press.id) return;
  if (!(e.buttons & 1)) { endPress(); return; }
  const dx = e.clientX - press.startX;
  if (!press.dragging) {
    if (Math.abs(dx) <= DRAG_PX) return;
    press.dragging = true;
    dragged = true;
    el.rows.setPointerCapture(press.id);
    el.rows.classList.add("dragging");
  }
  el.rows.scrollLeft = press.startScrollLeft - dx;
};
const onPressEnd = (e) => { if (press && e.pointerId === press.id) endPress(); };
const endPress = () => {
  if (!press) return;
  const { id } = press;
  press = null;
  removeEventListener("pointermove", onPressMove);
  removeEventListener("pointerup", onPressEnd);
  removeEventListener("pointercancel", onPressEnd);
  el.rows.classList.remove("dragging");
  if (el.rows.hasPointerCapture(id)) el.rows.releasePointerCapture(id);
};
el.rows.addEventListener("pointerdown", (e) => {
  dragged = false;
  if (e.pointerType !== "mouse" || e.button !== 0 || !e.target.closest(".track")) return;
  endPress();
  press = { id: e.pointerId, startX: e.clientX, startScrollLeft: el.rows.scrollLeft, dragging: false };
  addEventListener("pointermove", onPressMove);
  addEventListener("pointerup", onPressEnd);
  addEventListener("pointercancel", onPressEnd);
});
el.rows.addEventListener("lostpointercapture", endPress);
addEventListener("blur", endPress);

// reorder: drag a user row's grip, or long-press its header on touch; the home and Everyone rows never move
const LIFT_MS = 400;
const SLOP_PX = 8;
const EDGE_PX = 60;
const EDGE_SPEED = 16;
let pending = null;
let lift = null;
let reordered = false;

const onPendingMove = (e) => {
  if (!pending || e.pointerId !== pending.id) return;
  if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > SLOP_PX) { endPending(); return; }
  pending.lastY = e.clientY;
};
const onPendingEnd = (e) => { if (pending && e.pointerId === pending.id) endPending(); };
const endPending = () => {
  if (!pending) return;
  clearTimeout(pending.timer);
  pending = null;
  removeEventListener("pointermove", onPendingMove);
  removeEventListener("pointerup", onPendingEnd);
  removeEventListener("pointercancel", onPendingEnd);
  removeEventListener("scroll", endPending, true);
};
// a touch press that holds still for LIFT_MS lifts the row, unless the browser took it for scrolling first
const startPending = (e, row) => {
  const timer = setTimeout(() => {
    const { id, lastY } = pending;
    endPending();
    startLift(id, row, lastY, true);
  }, LIFT_MS);
  pending = { id: e.pointerId, x: e.clientX, y: e.clientY, lastY: e.clientY, timer };
  addEventListener("pointermove", onPendingMove);
  addEventListener("pointerup", onPendingEnd);
  addEventListener("pointercancel", onPendingEnd);
  addEventListener("scroll", endPending, true);
};

const edgeSpeed = (y) => {
  if (y < EDGE_PX) return -Math.ceil(EDGE_SPEED * (EDGE_PX - y) / EDGE_PX);
  const d = innerHeight - y;
  return d < EDGE_PX ? Math.ceil(EDGE_SPEED * (EDGE_PX - d) / EDGE_PX) : 0;
};
const autoScroll = () => {
  if (!lift || lift.raf) return;
  lift.raf = requestAnimationFrame(() => {
    if (!lift) return;
    lift.raf = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    const top = Math.max(0, Math.min(max, scrollY + edgeSpeed(lift.y)));
    if (top === scrollY) return;
    scrollTo({ top, behavior: "instant" });
    placeLift();
  });
};
/** Move the lifted row under the pointer, slide the rows it passes and keep the page scrolling at the edges. */
const placeLift = () => {
  const { row, from, slots, h, startY } = lift;
  const at = lift.y + scrollY;
  const to = 1 + slots.filter((s) => s.idx !== from && s.mid < at).length;
  lift.to = to;
  row.style.setProperty("--dy", `${at - startY}px`);
  for (const s of slots) {
    if (s.idx === from) continue;
    const d = from < to && s.idx > from && s.idx <= to ? -h : to < from && s.idx >= to && s.idx < from ? h : 0;
    s.row.style.transform = d ? `translateY(${d}px)` : "";
  }
  autoScroll();
};
const onLiftMove = (e) => {
  if (!lift || e.pointerId !== lift.id) return;
  lift.y = e.clientY;
  placeLift();
};
const onLiftUp = (e) => {
  if (!lift || e.pointerId !== lift.id) return;
  lift.y = e.clientY;
  placeLift();
  const { from, to } = lift;
  const r = el.rows.getBoundingClientRect();
  const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  endLift();
  if (!inside) return;
  const next = moveRow(state.zones, from, to);
  if (next.every((z, i) => z === state.zones[i])) return;
  state.zones = next;
  render({ keepStart: true });
};
const onLiftCancel = (e) => { if (lift && e.pointerId === lift.id) endLift(); };
const onLiftKey = (e) => {
  if (e.key !== "Escape") return;
  e.preventDefault();
  endLift();
};
const startLift = (id, row, y, touch) => {
  const top = scrollY;
  const slots = [...el.rows.querySelectorAll(".row[data-idx]")].filter((r) => +r.dataset.idx >= 1).map((r) => {
    const b = r.getBoundingClientRect();
    return { row: r, idx: +r.dataset.idx, mid: b.top + top + b.height / 2 };
  });
  lift = { id, row, from: +row.dataset.idx, to: +row.dataset.idx, slots, h: row.getBoundingClientRect().height, startY: y + top, y, raf: 0 };
  reordered = true;
  row.style.transformOrigin = `${el.rows.scrollLeft + row.firstElementChild.offsetWidth / 2}px 50%`;
  row.classList.add("lifted");
  el.rows.classList.add("reordering");
  addEventListener("pointermove", onLiftMove);
  addEventListener("pointerup", onLiftUp);
  addEventListener("pointercancel", onLiftCancel);
  addEventListener("keydown", onLiftKey);
  addEventListener("scroll", placeLift);
  if (touch && typeof navigator.vibrate === "function") navigator.vibrate(10);
  placeLift();
};
/** End a lift without saving: every transform and listener goes, state.zones is untouched; `live` shows any live update held off during the lift. */
const endLift = ({ live = true } = {}) => {
  if (!lift) return;
  const { row, slots, raf } = lift;
  lift = null;
  cancelAnimationFrame(raf);
  removeEventListener("pointermove", onLiftMove);
  removeEventListener("pointerup", onLiftUp);
  removeEventListener("pointercancel", onLiftCancel);
  removeEventListener("keydown", onLiftKey);
  removeEventListener("scroll", placeLift);
  row.classList.remove("lifted");
  row.style.removeProperty("--dy");
  row.style.transformOrigin = "";
  for (const s of slots) s.row.style.transform = "";
  el.rows.classList.remove("reordering");
  // the click that follows this pointerup is swallowed; a later keyboard click is not
  setTimeout(() => { reordered = false; });
  if (live) liveTick();
};
const cancelReorder = ({ live } = {}) => { endPending(); endLift({ live }); };

el.rows.addEventListener("pointerdown", (e) => {
  endPending();
  if (lift || !e.isPrimary) return;
  reordered = false;
  const head = e.target.closest(".row-head");
  const row = head && head.parentElement;
  if (!row || !(+row.dataset.idx >= 1)) return;
  if (e.target.closest(".row-grip")) {
    if (e.button === 0) startLift(e.pointerId, row, e.clientY, e.pointerType === "touch");
    return;
  }
  if (e.pointerType === "touch" && !e.target.closest("button[data-act]")) startPending(e, row);
});
// registered up front so it is never passive: a pending press only watches, a lifted row owns the touch
el.rows.addEventListener("touchmove", (e) => {
  if (lift) { if (e.cancelable) e.preventDefault(); else endLift(); return; }
  if (pending && !e.cancelable) endPending();
}, { passive: false });
el.rows.addEventListener("contextmenu", (e) => {
  const head = e.target.closest(".row-head");
  if (head && +head.parentElement.dataset.idx >= 1) e.preventDefault();
});
addEventListener("blur", cancelReorder);

el.rows.addEventListener("keydown", (e) => {
  if (e.target !== el.rows || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  e.preventDefault();
  el.rows.scrollLeft += (e.key === "ArrowRight" ? 4 : -4) * trackGeom().slot;
});

el.suggestions.addEventListener("click", (e) => {
  const c = e.target.closest(".chip");
  if (!c) return;
  setStart(+c.dataset.s);
  revealSelection();
});

el.lengthSeg.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-len]");
  if (!b) return;
  state.len = +b.dataset.len;
  render();
});
el.lengthSeg.addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
  const opts = LENS;
  const i = opts.indexOf(state.len) + (e.key === "ArrowRight" ? 1 : -1);
  if (i < 0 || i >= opts.length) return;
  state.len = opts[i];
  render();
  el.lengthSeg.querySelector(`[data-len="${state.len}"]`).focus();
});

const setFilter = (f) => {
  state.filter = f;
  render({ keepStart: true });
  el.filterSeg.querySelector(`[data-filter="${f}"]`).focus();
};
el.filterSeg.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-filter]");
  if (b) setFilter(b.dataset.filter);
});
el.filterSeg.addEventListener("keydown", (e) => {
  const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
  if (!step) return;
  e.preventDefault();
  const i = FILTERS.indexOf(state.filter) + step;
  if (i < 0 || i >= FILTERS.length) return;
  setFilter(FILTERS[i]);
});

el.clockSeg.setAttribute("aria-label", S.TIME_FORMAT);
el.clockSeg.querySelectorAll("button").forEach((b) => {
  const on = b.dataset.h12 === "true";
  b.textContent = on ? S.CLOCK_12 : S.CLOCK_24;
  b.setAttribute("aria-label", on ? S.CLOCK_12_LABEL : S.CLOCK_24_LABEL);
});
el.clockSeg.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-h12]");
  if (!b) return;
  state.hour12 = b.dataset.h12 === "true";
  render({ keepStart: true });
});
el.clockSeg.addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
  const opts = [true, false];
  const i = opts.indexOf(hour12()) + (e.key === "ArrowRight" ? 1 : -1);
  if (i < 0 || i >= opts.length) return;
  state.hour12 = opts[i];
  render({ keepStart: true });
  el.clockSeg.querySelector(`[data-h12="${state.hour12}"]`).focus();
});

const shiftDay = (delta) => {
  const [y, m, d] = state.date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  state.date = dt.toISOString().slice(0, 10);
  render();
};
$("prevDay").addEventListener("click", () => shiftDay(-1));
$("nextDay").addEventListener("click", () => shiftDay(1));
el.dateInput.addEventListener("change", () => { if (el.dateInput.value) { state.date = el.dateInput.value; render(); } });

el.nowBtn.textContent = S.NOW;
el.nowBtn.addEventListener("click", () => {
  const hadFocus = document.activeElement === el.nowBtn;
  if (state.date !== todayISO()) {
    state.date = todayISO();
    render();
  }
  revealNow();
  updateNowBtn();
  if (hadFocus) el.editBtn.focus();
});
el.rows.addEventListener("scroll", updateNowBtn, { passive: true });

el.editBtn.addEventListener("click", () => {
  cancelReorder();
  state.editing = !state.editing;
  el.editBtn.setAttribute("aria-pressed", String(state.editing));
  el.editBtn.textContent = state.editing ? S.DONE : S.EDIT;
  el.timeline.classList.toggle("editing", state.editing);
});

const copyText = async (text, ok) => {
  try { await navigator.clipboard.writeText(text); toast(ok); return; } catch { /* fall through */ }
  const ta = document.createElement("textarea");
  ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0;top:0";
  document.body.appendChild(ta); ta.select();
  let done = false;
  try { done = document.execCommand("copy"); } catch { done = false; }
  ta.remove();
  if (done) toast(ok); else window.prompt(S.COPY_PROMPT, text.replace(/\n/g, " · "));
};
el.copyBtn.addEventListener("click", () => {
  const s = state.start;
  const endT = model.t0 + (s + state.len) * SLOT_MS;
  const lines = state.zones.map((z, i) => {
    const p = model.grid[i].parts[s];
    const q = localParts(zoneOf(z), endT);
    return `${z.name}: ${weekday(p.date)} ${timeText(p)}–${timeText(q)}`;
  });
  copyText(lines.join("\n"), S.TIMES_COPIED);
});
el.shareBtn.addEventListener("click", () => {
  const url = shareURL();
  history.replaceState(null, "", url);
  copyText(url, S.LINK_COPIED);
});

let toastTimer;
const toast = (msg) => {
  el.toast.textContent = msg;
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2400);
};

// ---------- Zone sheet ----------
let allTz = [];
try { allTz = Intl.supportedValuesOf("timeZone"); } catch { allTz = []; }
// While a Change is open: the row being replaced, as it was when the sheet opened.
let replacing = null;
const renderResults = () => {
  const list = searchCities(el.search.value, { zones: allTz });
  const users = state.zones.length - 1;
  const full = !replacing && users >= MAX_USER_ZONES;
  el.sheetNote.textContent = replacing ? S.changeNote(replacing.name) : full ? S.ZONES_FULL : S.zonesAdded(users, MAX_USER_ZONES);
  if (!list.length) { el.results.innerHTML = `<li class="sheet-note">${esc(S.noMatch(el.search.value))}</li>`; return; }
  const now = Date.now();
  el.results.innerHTML = list.map((c) => {
    if ("offsetMin" in c) {
      const n = c.offsetMin;
      const taken = state.zones.slice(1).some((z) => z.offsetMin === n);
      const q = localParts(n, now);
      return `<li><button type="button" class="result" role="option" data-offset="${n}" ${taken || full ? "disabled" : ""} aria-selected="false">
      <span class="r-main"><b>${esc(S.offsetResult(n))}</b></span>
      ${taken ? icon("check") : `<span class="r-time">${esc(timeText(q))}<span>${esc(S.BAND_LABEL[classify(q.mod)])}</span></span>`}
    </button></li>`;
    }
    const added = state.zones.some((z) => z.tz === c.tz && z.name === c.name);
    const isHome = c.tz === state.zones[0].tz;
    const p = localParts(c.tz, now);
    return `<li><button type="button" class="result" role="option" data-tz="${esc(c.tz)}" data-name="${esc(c.name)}" ${added || isHome || full ? "disabled" : ""} aria-selected="false">
      <span class="r-main"><b>${esc(c.name)}</b><span>${esc(c.country)} · ${offLabel(p.off)}</span></span>
      ${added ? icon("check") : `<span class="r-time">${esc(timeText(p))}<span>${esc(S.BAND_LABEL[classify(p.mod)])}</span></span>`}
    </button></li>`;
  }).join("");
};
const openSheet = (title) => {
  el.sheetTitle.textContent = title;
  el.search.value = "";
  renderResults();
  el.sheet.showModal();
  if (matchMedia("(pointer: fine)").matches) el.search.focus();
};
el.addZone.addEventListener("click", () => {
  replacing = null;
  openSheet(S.ADD_TITLE);
});
el.search.addEventListener("input", renderResults);
el.search.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); if (abbreviationZones(el.search.value).length > 1) return; const first = el.results.querySelector(".result:not(:disabled)"); if (first) first.click(); }
});
// Whether `z` is the home zone or already a user row other than `skip`.
const clashes = (z, skip) => "offsetMin" in z
  ? state.zones.some((x, i) => i > 0 && i !== skip && x.offsetMin === z.offsetMin)
  : z.tz === state.zones[0].tz || state.zones.some((x, i) => i !== skip && x.tz === z.tz && x.name === z.name);
el.results.addEventListener("click", (e) => {
  const b = e.target.closest(".result");
  if (!b || b.disabled) return;
  const z = "offset" in b.dataset ? mkOffset(Number(b.dataset.offset)) : zoneInfo(b.dataset.tz, b.dataset.name);
  if (replacing) { replaceZone(z); return; }
  if (state.zones.length - 1 >= MAX_USER_ZONES || clashes(z, -1)) return;
  state.zones.push(z);
  render({ keepStart: true });
  toast(S.added(z.name));
  if (state.zones.length - 1 >= MAX_USER_ZONES) el.sheet.close(); else renderResults();
});
const replaceZone = (z) => {
  const { idx, zone, name } = replacing;
  const cur = state.zones[idx];
  if (!cur || zoneOf(cur) !== zone || cur.name !== name) { el.sheet.close(); return; }
  if (clashes(z, idx) || (zoneOf(z) === zone && z.name === name)) return;
  state.zones = replaceRow(state.zones, idx, z);
  render({ keepStart: true });
  toast(S.changed(name, z.name));
  el.sheet.close();
  const btn = el.rows.querySelector(`button[data-act="change"][data-idx="${idx}"]`);
  if (btn) btn.focus();
};
el.sheet.addEventListener("click", (e) => { if (e.target === el.sheet) el.sheet.close(); });
el.sheet.addEventListener("close", () => {
  replacing = null;
  el.sheetTitle.textContent = S.ADD_TITLE;
});

// ---------- Clock-change sheet ----------
el.dstTitle.textContent = S.CLOCK_CHANGE_TITLE;
// While it is open: the row whose warning opened it, as it was then.
let dstOpener = null;
const openDst = (idx) => {
  const z = state.zones[idx];
  const { change } = dstWatch.status(zoneOf(z), Date.now());
  if (!change) return;
  const minutes = Math.abs(change.after - change.before);
  el.dstText.textContent = S.clockChange(z.name, change.after > change.before, minutes, changeDate(change), S.clock(changeWall(change), hour12()));
  dstOpener = { idx, zone: zoneOf(z) };
  el.dstSheet.showModal();
};
el.dstSheet.addEventListener("click", (e) => { if (e.target === el.dstSheet) el.dstSheet.close(); });
el.dstSheet.addEventListener("close", () => {
  const opener = dstOpener;
  dstOpener = null;
  if (!opener) return;
  const btn = el.rows.querySelector(`button.row-warn[data-idx="${opener.idx}"]`);
  const cur = state.zones[opener.idx];
  if (btn && !btn.hidden && cur && zoneOf(cur) === opener.zone) btn.focus();
  else el.rows.focus();
});

// After the rows change underneath it: a Change closes, since its row may have moved; Add refreshes.
const refreshSheet = () => { if (replacing) el.sheet.close(); else renderResults(); };

addEventListener("resize", () => { cancelReorder(); renderSelection(); placeNow(); });
addEventListener("hashchange", () => { load(); render(); if (el.sheet.open) refreshSheet(); if (el.dstSheet.open) el.dstSheet.close(); });
addEventListener("pagehide", () => saver.flush());

// The home row follows the device zone, e.g. after travel.
const checkHome = () => {
  const tz = deviceTz();
  if (tz === state.zones[0].tz) return;
  state.zones = [mkZone(tz), ...followHome(state.zones.slice(1), tz)];
  render();
  if (el.sheet.open) refreshSheet();
  if (el.dstSheet.open) el.dstSheet.close();
  toast(S.nowIn(state.zones[0].name));
};

// One shared minute clock drives every live update.
const clock = createClock();
clock.subscribe(placeNow);
clock.subscribe(checkHome);
clock.subscribe(liveTick);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") clock.resume(); else clock.pause(); });
addEventListener("focus", () => { checkHome(); placeNow(); liveTick(); });

load();
render();
if (state.date === todayISO()) revealNow();
if (document.visibilityState === "hidden") clock.pause(); else clock.start();

// Offline support. Where service workers are unavailable or fail, the app runs as before.
if ("serviceWorker" in navigator) {
  try { navigator.serviceWorker.register("./sw.js").catch(() => {}); } catch { /* no service worker */ }
}
