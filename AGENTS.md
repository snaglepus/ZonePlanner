# ZonePlanner

A mobile-first time zone meeting planner: compare up to 8 zones (home plus up to
7) and find the hour that works for everyone. Product context is in `PRODUCT.md`; the design
system (tokens, type, components) is in `DESIGN.md`. The visual direction comes
from `docs/inspiraton.jpg` and is binding.

## Stack

Plain static HTML, CSS and vanilla JavaScript ES modules. No build step and no
runtime dependencies; `package.json` exists only so `npm test` runs the unit
tests and `npm run sw:stamp` stamps `sw.js`.

- `index.html`: markup and the SVG icon sprite. Loads `app.js` with
  `<script type="module">`.
- `styles.css`: all styles; design tokens are on `:root` at the top.
- `app.js`: the entry point. DOM lookups, state, load/save/share, scoring,
  rendering and interactions.
- `js/time.js`: the time engine (`Intl.DateTimeFormat`): offsets, local parts,
  zoned midnight, the home day (which starts where the home zone's date
  really starts, even when local midnight doesn't exist), date changes (day
  dividers, `dayStarts`), band classification, Good heat steps, UTC offset
  labels, the slot position of an instant (`slotAt`), the locale's default
  clock (`localeHour12`, from the `hourCycle`), the zone abbreviation
  (`zoneAbbr`/`zoneTag`: `Intl` short names tried in `en-AU`, `en-GB`,
  `en-US` order; GMT/UTC-style names fall back to the UTC offset alone),
  the day difference from home (`dayDiff`) and daylight saving: the next
  offset change found by scanning `Intl` (`nextTransition`, a day at a time
  then bisected to the minute; no bundled tz rules), the year's standard
  offset and DST now (`standardOffset`/`isDst`), a per-zone watch cached by
  UTC day (`createDstWatch`: DST now and any change within 14 days) and a
  change's wall time on the old clock (`changeWall`). A zone is an IANA ID string
  or a fixed offset as a number of minutes from UTC (no `Etc/GMT` IDs).
- `js/clock.js`: the shared minute clock: aligned to the wall-clock minute,
  pause and resume, injectable time source.
- `js/zones.js`: the zone list rules: zone validation, the typed-offset
  parser (`parseOffset`: `GMT+11`, `UTC-7`, `+5:30`, `-0330`), user rows (home
  dropped, capped at 7), share-link `z` encoding and parsing (`tz~name` per
  city row, `@<minutes>` per offset row), following a new device zone, and
  swapping one row in place (`replaceRow`).
- `js/state.js`: the stored state shape, its load, validation and
  version-driven migration, and the debounced (250 ms) saver.
- `js/strings.js`: every user-facing string JavaScript builds (en-AU),
  including the single time formatter: `clock` (full or hour-cell form, 12-
  or 24-hour) and `clockRange` built on it.
- `js/scroll.js`: the wheel-to-horizontal scroll decision for the hour grid
  (`wheelScroll`).
- `js/reorder.js`: the pure row reorder for drag-to-reorder (`moveRow`); the
  home row stays fixed at index 0.
- `js/weekend.js`: weekend rules (`weekendSlots`, `scoredBands`,
  `overlapBands`): which slots fall on each zone's weekend, scored Unsuitable.
- `js/filter.js`: the All / Good / Best hour filter (`keptSlots`,
  `windowKept`): which slots of the overlap row are kept, and whether a
  meeting span lies entirely in kept slots.
- `js/search.js`: city search and zone naming (pure, reads `js/cities.js`).
- `js/cities.js`: generated city data (about 500 cities), the country-to-weekend
  map and the time zone abbreviation table. DOM-free. City data from GeoNames,
  licensed CC BY 4.0; the credit is in its header and the page footnote.
- `scripts/build-city-data.js`: dev-only generator for `js/cities.js`, never
  loaded by the page. Regenerate with
  `node scripts/build-city-data.js [path-to-cities15000.zip]` (no path
  downloads it from GeoNames). Don't hand-edit `js/cities.js`; change the
  generator (or `scripts/pinned-cities.js`, the 68 cities it pins) and rerun it.
- `sw.js`: the service worker, registered from `app.js` (default scope, the
  directory it is in). It precaches every file the page loads (`index.html`,
  `styles.css`, the modules and the fonts) and serves them cache-first, with
  no runtime caching. Only navigations to the app's own page (the scope
  directory or its `index.html`, share links included) get the cached
  `index.html`; other navigations, such as `factory/dashboard.html`, go to the
  network. Caches are named `zoneplanner:<scope>:<VERSION>`. A new version
  installs in the background and takes control only once every page using
  the old one has closed; it then deletes its own scope's older caches.
- `scripts/stamp-sw.js` (`npm run sw:stamp`) and `scripts/sw-manifest.js`:
  dev-only, never precached. The manifest works out the precache list (from
  `index.html`, the `url()`s in `styles.css` and the import graph from
  `app.js`) and its content hash; the stamp writes both into `sw.js`'s
  `VERSION` and `PRECACHE` lines.
- `test/`: unit tests (`node:test`) for the time engine, the shared clock,
  the zone rules, the stored state, the city data, the wheel scroll decision, the row reorder,
  the hour filter, daylight saving (transitions, DST and the 14-day watch, in
  `test/time.test.js`), the time formatter (`test/strings.test.js`) and the
  weekend rules (`test/weekend.test.js`), plus a static
  CSP check of `index.html` (`test/csp.test.js`) and a static `styles.css`
  token check (heat-step contrast and order, `test/tokens.test.js`) and the
  service worker's stamp and manifest rules (`test/sw.test.js`).
- `assets/fonts/`: self-hosted woff2 fonts. Don't add CDN or third-party requests.

Rules that hold across the app:

- Best 09:00–17:00, Good 06:00–09:00 and 17:00–20:00, Unsuitable
  otherwise, local to each zone. 15-minute slots across the home zone's day.
- Bands never rely on colour alone (solid, hatched, pale). Zone rows shade
  Good runs in three hatched heat steps by local hour (`goodStep`); the
  Everyone row's Good is flat.
- Each row's weekend comes from its city's country (`cc` from `zoneInfo`)
  via `weekendFor`, Sat-Sun when unknown (offset rows have no country, so
  Sat-Sun), judged per slot by local weekday.
  Weekend slots carry a 45° line overlay on zone rows and score as
  Unsuitable in the Everyone row, the overlap summary, the verdict and the
  suggestions.
- The home row is always the device zone, recomputed on load and followed
  live; it is never stored or read from a link. The rest are at most 7 user
  rows.
- Stored state lives under `zoneplanner.state` as
  `{version: 1, zones, hour12, filter, len}`. State that can't be read is
  backed up to `zoneplanner.state.bak` and reset to the defaults; the old
  `zoneplanner:v1` key is migrated once and never written. Stored zones and
  link zones both go through `userRows` in `js/zones.js`.
- Every displayed time of day goes through `clock`/`clockRange` in
  `js/strings.js` with the effective clock, `state.hour12 ?? localeHour12()`.
  A stored `hour12: null` means follow the locale; the 12h/24h toggle stores
  `true` or `false`.
- Offset rows (`{offsetMin}`, a multiple of 15 within ±14:00) are named from
  their offset (`UTC+05:30`, via `offsetName`), never from stored or linked
  text, and have no country.
- Any string from the share-link hash or localStorage goes through `esc()` or
  `textContent` before it reaches the DOM. The page also enforces the PRD's
  Content-Security-Policy (§10.3) with a `<meta>` tag at the top of
  `index.html`'s `<head>`, so: no inline styles (`style` attributes or
  `<style>`), no inline scripts or inline event handlers (`on*`), and no URL
  that isn't same-origin. JavaScript sets styles only through the CSSOM
  (`el.style.*`, `style.setProperty`). The CSP doesn't replace escaping;
  `esc()`/`textContent` is still required. `test/csp.test.js` guards
  `index.html`.
- User-facing strings live in `js/strings.js`, whose functions return plain
  text and never escape. Any strings-module result that goes into `innerHTML`
  is wrapped in `esc()` at the call site in `app.js`, so it is escaped exactly
  once; `textContent`, `setAttribute` and `window.prompt` take it as is.
- `js/time.js`, `js/clock.js`, `js/zones.js`, `js/state.js`, `js/scroll.js`,
  `js/reorder.js`, `js/filter.js`, `js/weekend.js` and `js/cities.js` stay DOM-free: no `document`, `window`, `location`, `localStorage`, `navigator`
  or `history`, so they import in Node.
- Every `$("id")` / `getElementById` lookup stays in `app.js` with a literal id.
- Live updates (the now line, the home-zone re-check, the row headers' live
  time, abbreviation, day difference and DST and clock-change badges)
  subscribe to the one
  shared clock in `app.js`; don't add your own `setInterval` or minute timers.
- Touch targets are at least 44px; no horizontal scroll at 390px wide.
- Any change that adds, removes, renames or edits a file the page loads
  (`index.html`, `styles.css`, any module, any font) must rerun
  `npm run sw:stamp` and commit the updated `sw.js`; `npm test` fails
  otherwise. Local asset references carry no query strings (the stamp
  rejects them; the content hash versions the cache). `sw.js` is DOM-free and
  never touches `localStorage`.

## Setup

A fresh checkout needs nothing installed beyond `python3` (for the dev
server, `python3 -m http.server`; the page needs a static server) and `node`
(for the syntax check and `npm test` in `factory/checks.sh`). No `npm install`.

## Dev server

```bash
python3 -m http.server <port>
```

Then open `http://localhost:<port>/index.html`. The page loads ES modules, so
it needs a static server and no longer works opened from `file://`.

### Bypassing the service worker

Service workers need HTTPS or localhost, so the page registers `sw.js` on the
dev server too. Because the worker is cache-first, a normal reload on a
localhost port you visited before shows the old files until you bypass it:

- Shift-reload (force reload) bypasses the worker for that load in Chromium,
  Firefox and Safari.
- Chrome DevTools, Application, Service workers: tick "Bypass for network" (or
  "Update on reload").
- Use a fresh or private browser profile.
- Run this in the page's console. It is an origin-wide dev reset: it
  unregisters every registration and deletes every `zoneplanner:` cache, so it
  clears every copy of the app served from that origin.

  ```js
  (await navigator.serviceWorker.getRegistrations()).forEach((r) => r.unregister());
  for (const k of await caches.keys()) if (k.startsWith("zoneplanner:")) await caches.delete(k);
  ```

## Validation

```bash
bash factory/checks.sh
```

It runs `node --check` on every JS file, confirms every local file referenced
by `index.html` and `styles.css` exists, checks that `styles.css` has
balanced braces, checks that every element id `app.js` looks up exists in
`index.html`, and runs `npm test`.

```bash
npm test
```

runs the unit tests in `test/` with `node --test`; it needs no install.
Rendering and interaction have no automated tests; verify them in the browser.

## Software factory

`/factory run` builds open GitHub issues and Linear issues labeled `factory`,
and `/factory add <feature>` builds one described in conversation, through
intake → spec → spec review (medium/high risk) → build → gate → review →
approve, one PR per ticket. State is in `factory/jobs/` (gitignored);
`factory/bin/job` is its only writer. Checks: `factory/checks.sh`. Dashboard:
`cd factory && python3 -m http.server`, then open
http://localhost:8000/dashboard.html (`#history` for the table of finished
jobs).

Each job works in its own git worktree at `.worktrees/<job-id>` (gitignored).
A tool run from the repo root that doesn't read `.gitignore` sees those copies
too; exclude `.worktrees/` in its config.
