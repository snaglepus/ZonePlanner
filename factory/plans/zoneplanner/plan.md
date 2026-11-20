# Plan: ZonePlanner

## Summary
- 21 tickets in 6 waves, revised after operator feedback round 1. Each ticket now names what the prototype already does and only asks for what is missing.
- The risk sits in four places: T3 (the board becomes a horizontally scrolling hour grid, which every later UI ticket builds on), T5 (new storage format with migration of existing saved zones), T11 (drag to reorder without fighting timeline scrolling) and T19 (the service worker, where a mistake leaves users stuck on a stale copy).
- T1 goes first and alone: it splits app.js into ES modules and adds the first unit tests. Nothing else can be tested without it.
- New in this revision: T19 adds a service worker so the app loads offline. The share link stays; T2, T5 and T16 say how it works with the automatic home row, the new state and offset zones. Keyboard reordering is dropped from T11.
- The PRD still has missing sections (4.7, 5, 8.1, 9, 10.2, 10.4, 12). The operator has agreed the recommendations that fill them; they are recorded under Decisions.

## Prerequisites
1. **Gate runs tests.** Being handled: `factory/checks.sh` will run `npm test` when `package.json` exists. After T1 merges, a person may also want to widen the script's id check, which only reads `app.js`.
2. **GeoNames source file for T4.** The generator needs `cities15000.zip` from GeoNames. If the build environment has no network access, download it by hand and give the builder the path.
3. **HTTPS hosting for T19.** Service workers only run over HTTPS or on localhost. Wherever the static files are deployed must serve HTTPS, and should not cache `sw.js` for long. Hosting itself is outside this plan.
4. **Playwright for T21.** `npm install` and `npx playwright install` need network access and about 300 MB of browsers. Decide whether the gate should run `npm run test:e2e`; if yes, add it to `factory/checks.sh` by hand after T21 merges.

## Already delivered
These PRD items are met by index.html, styles.css and app.js on main. They were removed from ticket scope and acceptance criteria; tickets only keep them working.

| PRD item | What exists | Removed from |
|---|---|---|
| FR-8 (no location permission), FR-9 (home row marked) | Device zone read from `Intl`; home symbol on the first row | T2 (keeps only: always derive from device, no controls on home row) |
| FR-12 friendly city name | City list lookup with IANA fallback | T2 |
| FR-13 sheet opens from a button; FR-15 type-to-search by city, country and IANA ID, diacritics ignored, autofocus on desktop only | Zone sheet and search | T9 (keeps only: 100 popular, 500 cities, aliases, abbreviations, rename) |
| FR-18 row limit | 8 rows total enforced, button disabled at the limit | T2 (keeps only the PRD's wording) |
| FR-22 delete immediately | Remove button with toast | T10 (keeps only: lift the 3-zone minimum) |
| FR-28 band colouring by local hour, with a non-colour channel and legend | Band classes and legend | T12 (keeps only: heat map and rename) |
| Overlap row (§3) | Everyone row with shared-hours summary | T17 (keeps only the filter) |
| UC3 exact local time per zone at the selected slot | Selection bar, per-row readout, meeting card | T3 (keeps only: selection by tap in the new grid) |
| FR-24 name and UTC offset in the header | Row header | T15 (keeps only: live time, abbreviation, day difference) |
| §8.2 load before first render; save on change | `localStorage` load and save | T5 (keeps only: new key, version, validation, backup, debounce) |
| §10.3 no third-party requests, no cookies, user text escaped | Self-hosted fonts, `esc()` | T8 (keeps only: CSP meta tag, inline styles, regression test) |
| DST-correct and non-hour-offset arithmetic (Goal 5) | Time engine built on `Intl` | T1 (adds tests only) |
| Phone-first layout and 44px targets (§3) | Existing layout | no ticket; each UI ticket keeps it |

No whole ticket was dropped: every ticket still has work the prototype does not do.

## Waves
### Wave 1
- T1 (medium) Split app.js into ES modules with a unit-tested time engine and strings module: every other ticket needs testable modules and the test runner.

### Wave 2
- T2 (medium) Make the first row the device's time zone and follow it when it changes: after T1; defines what a user zone is and how share links open.
- T3 (high) Rebuild the board as a horizontally scrolling hour grid aligned on absolute time: after T1; the foundation for all grid features.
- T4 (medium) Add the bundled city dataset, weekend map and abbreviation table: after T1; data only.

### Wave 3
- T5 (high) Store versioned state in zoneplanner.state with validation and migration: after T2.
- T6 (medium) Add the live now line, the Now button and a shared one-minute clock tick: after T3.
- T7 (medium) Scroll the timeline with mouse wheel, click-and-drag and arrow keys: after T3.
- T8 (medium) Enforce the strict Content-Security-Policy and remove inline styles: after T3, which removes the inline style rendering.
- T9 (medium) Add City sheet: popular cities list and search by city, country or zone ID: after T4.
- T10 (medium) Change a zone in place and allow deleting below three zones: after T2.
- T11 (high) Drag to reorder user rows from the header column: after T2 and T3.
- T12 (medium) Add the Good-hours heat map and rename the bands Best, Good and Unsuitable: after T3.
- T13 (low) Draw local-midnight dividers with each zone's date label: after T3.
- T14 (medium) Shade weekend hours per zone and count them as Unsuitable in the overlap row: after T3 and T4.

### Wave 4
- T15 (medium) Show live local time, abbreviation, UTC offset and day difference in row headers: after T6 (uses the minute tick).
- T16 (medium) Add fixed-offset zones typed as GMT+11, UTC-7, +5:30 or -0330: after T5 (stored offset form).
- T17 (medium) Add an All / Good / Best filter driven by the overlap row: after T3 and T5 (saved filter).
- T18 (medium) Add a 12/24-hour toggle: after T3 and T5 (saved setting).
- T19 (high) Add a service worker so the app loads and works offline: after T4 (city data to cache) and T8 (must run under the CSP).

### Wave 5
- T20 (medium) Show a DST badge and a warning when a zone's clocks change within 14 days: after T15 (header layout).

### Wave 6
- T21 (medium) Add a small Playwright end-to-end suite for the core use cases: after the flows it exercises exist.

## Coverage
| PRD section | Tickets |
|---|---|
| §1 Goals 1 (find a time in under 10 s) | T3, T17 |
| §1 Goals 2 (no server, works offline) | T19 (offline), T8, T21 |
| §1 Goals 3 (tiny and fast) | T1, T3, T6 (budgets as acceptance criteria), T19 (repeat visits) |
| §1 Goals 5 (never get DST wrong) | arithmetic delivered; T1 (tests), T3, T20 |
| §2 UC1 Glance | T6, T15 |
| §2 UC2 Find a slot | T3, T17 |
| §2 UC3 Confirm a slot | delivered; kept by T3 |
| §2 UC4 Travel | T2 |
| §3 In scope: timeline with now indicator | T3, T6, T7 |
| §3 In scope: home row plus up to 7 zones | T2 |
| §3 In scope: add by city or by offset | T9, T16 |
| §3 In scope: change, delete, reorder | T10, T11 |
| §3 In scope: colour coding, heat map, overlap row, filter | colour coding and overlap row delivered; T12, T17 |
| §3 In scope: 12/24-hour toggle | T18 |
| §3 In scope: phone-first layout | delivered; kept by each UI ticket's 390px criteria |
| §3 In scope: local persistence | T5 |
| §3 In scope: DST awareness and warnings | T1, T20 |
| §3 Out of scope (share link, copy as text, .ics, FR-37 to FR-43) | the existing share link and Copy times stay by operator decision (T2, T5, T16 keep the link working); .ics left out |
| §4.1 FR-1, FR-3, FR-5 | T3 |
| §4.1 FR-2 | T3 (native), T7 (wheel, drag, keys) |
| §4.1 FR-4 | T6 |
| §4.1 FR-6, FR-7 | not in the PRD (numbers skipped) |
| §4.2 FR-8, FR-9, FR-10 | T2 (FR-8 and FR-9 partly delivered) |
| §4.2 FR-11 | not in the PRD (number skipped) |
| §4.2 FR-12 | delivered; T9 moves it to the bundled data |
| §4.3 FR-13, FR-15 | largely delivered; T9 |
| §4.3 FR-14, FR-17 | T9 |
| §4.3 FR-16 | T16 |
| §4.3 FR-18 | limit delivered; T2 (wording) |
| §4.3 FR-19 | not in the PRD (number skipped) |
| §4.4 FR-20, FR-21 | T10 (change), T11 (move) |
| §4.4 FR-22 | delivered; T10 lifts the 3-zone minimum |
| §4.4 FR-23, FR-23a, FR-23b | T11 |
| §4.5 FR-24, FR-25 | T15 (name and offset delivered) |
| §4.5 FR-26 | T20 |
| §4.5 FR-27 | not in the PRD (number skipped) |
| §4.6 FR-28 | delivered; T12 renames the bands |
| §4.6 FR-28a | T12 |
| §4.7 (FR-29 to FR-32, overlap row and filter) | section missing from the PRD; overlap row delivered, T17 adds the filter (decision 2) |
| §4.8 FR-33 | T13 |
| §4.8 FR-34, FR-35, FR-36 | T14 (FR-36 also T16) |
| §5 (non-hour offsets) | section missing; behaviour covered by T3 and T16 (decision 8) |
| §6 UX and UI guidelines | every UI ticket follows DESIGN.md and PRODUCT.md; T3 and T12 update DESIGN.md |
| §7.1 Hard constraints | T1, T4, T8, T19 |
| §7.1 Optional minify to /dist | left out: optional, and the unminified app is already small |
| §8.1 Stored state | schema block empty; T5 (decision 3) |
| §8.2 Persistence rules | T5 (T11 for save on drop) |
| §8.3 Bundled city data | T4 |
| §9 | section missing from the PRD |
| §10.1 Performance | T3 (transform/opacity only), T6 (tick under 4 ms), T19 (repeat visits from cache); Lighthouse FCP/TTI and 60 fps measurement left out as a manual check before release |
| §10.2 | section missing from the PRD (accessibility criteria are carried per ticket from PRODUCT.md) |
| §10.3 Privacy and security | mostly delivered; T8 (CSP), T5 (state and link validation) |
| §10.4 | section missing from the PRD |
| §10.5 Localisation | T1 (strings module, en-AU), T13 and T18 (Intl formats) |
| §11 Test plan | T1 (unit harness), unit tests in every ticket, T21 (end to end) |
| §12 Build plan | section empty; this plan stands in for it |

## Decisions
Answers from operator feedback round 1, in the order of the original questions.

1. **Name.** The app is called ZonePlanner. The backup key is `zoneplanner.state.bak`. (T5)
2. **Overlap row and filter.** The Everyone row shows the worst band per slot; the filter dims columns below the chosen level and limits suggestions. (T17)
3. **State schema.** `{version: 1, zones: [{tz, name} | {offsetMin}], hour12, filter, len}`; home zone never stored; old `zoneplanner:v1` data migrated once. (T5, T16, T17, T18)
4. **Rendered range.** The grid shows the selected home-zone local day; the date toolbar stays. (T3, T6)
5. **Prototype features.** The meeting card, selection bar, share link and Copy times all stay. A link's zones open as user rows under the recipient's own device-zone home row. (T2, T3, T5, T16)
6. **Band names.** Best / Good / Unsuitable replace Business / Edge / Inconvenient in the UI and docs. (T12)
7. **Zone minimum.** No minimum; default zones are seeded on first run only. (T2, T10)
8. **Non-hour offsets.** Columns are home-zone hours; other rows are labelled with their local time at the column start; selection stays at 15-minute precision. (T3, T12, T13, T16)
9. **Offline.** The app must load and work with no network after the first visit, so a service worker is added. (T19)
10. **Keyboard reordering.** Not included. (T11)
11. **End-to-end tests.** One small Playwright suite, dev dependency only, run by `npm run test:e2e`. (T21)
12. **City data licence.** Use GeoNames (CC BY 4.0) with a credit line in the repo and the page footnote. (T4)
13. **Opening from disk.** No longer supported once ES modules land; a static server is required. (T1)
14. **12/24 default.** Follows the locale on first run, then the saved choice. (T18)

## Open questions
1. A share link made on a device with 7 user zones carries 8 zones. Opened on a device in a different zone, that is one more than the 7 user rows allowed. Recommended: keep the first 7 in link order, drop the last and say so in a toast. Affects: T2, T5.
