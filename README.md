# ZonePlanner

A mobile-first time zone meeting planner. Compare up to 8 time zones (your
own plus up to 7 more) on one screen and see, at a glance, which hours work
for everyone.

ZonePlanner focuses on the human cost of an hour, not just the clock
arithmetic. Every hour in every zone is classified, and the overlap across all
zones is the main result.

## What it does

- **Hour bands, local to each zone**
  - **Best:** 09:00–17:00
  - **Good:** 06:00–09:00 and 17:00–20:00, shaded in three heat steps by
    distance from the Best window
  - **Unsuitable:** 20:00–06:00
- **Everyone row:** the overlap across all zones, showing where every zone is
  in Best hours and where every zone is at least in Good hours.
- **Hour filter:** show All, Good or Best hours only.
- **Meeting picker:** choose a date, start time and length (15-minute slots
  across the home zone's day) and get a verdict on who it suits and who it
  costs.
- **Zones:** the home row is always your device's time zone and follows it
  live if you travel. Add cities through a ranked search of about 500 cities
  (with abbreviations such as `PST` or `AEST`) or type a fixed offset such as
  `GMT+11`, `UTC-7` or `+5:30`. Drag rows to reorder them.
- **Share and copy:** copy the meeting times as text, or copy a link that
  carries the zone list in the URL hash.
- **Correct time maths:** DST and half-hour or 45-minute offsets (India
  +5:30, Nepal +5:45) are handled by the browser's `Intl` APIs.
- **Accessible:** bands never rely on colour alone (solid, hatched, pale),
  touch targets are at least 44px, and contrast targets WCAG 2.2 AA.

Your zones, 12/24-hour preference, filter and meeting length are saved in
`localStorage`. Nothing is sent to a server.

## How it works

ZonePlanner is plain static HTML, CSS and vanilla JavaScript ES modules: no
build step, no framework and no runtime dependencies. Fonts are self-hosted,
and a strict Content-Security-Policy blocks inline scripts, inline styles and
third-party requests.

| File | Role |
| --- | --- |
| `index.html` | Markup, the SVG icon sprite and the CSP `<meta>` tag |
| `styles.css` | All styles; design tokens are on `:root` |
| `app.js` | Entry point: DOM, state, load/save/share, scoring, rendering, interactions |
| `js/time.js` | Time engine: offsets, local parts, zoned midnight, band classification |
| `js/zones.js` | Zone validation, typed-offset parsing, share-link encoding |
| `js/state.js` | Stored state shape, validation, migration and debounced saving |
| `js/filter.js` | The All / Good / Best hour filter |
| `js/search.js` | City search and zone naming |
| `js/cities.js` | Generated city data (from GeoNames, CC BY 4.0) |
| `js/strings.js` | Every user-facing string (en-AU) |
| `js/scroll.js`, `js/reorder.js` | Wheel-to-horizontal scroll and drag-to-reorder logic |
| `test/` | Unit tests (`node:test`) |
| `e2e/`, `playwright.config.js` | End-to-end tests (Playwright, dev only): WebKit phone and Chromium desktop |

The modules under `js/` don't touch the DOM, so they import and test cleanly
in Node. All DOM work lives in `app.js`.

More detail:

- [`PRODUCT.md`](PRODUCT.md): product context, users and principles
- [`DESIGN.md`](DESIGN.md): the design system (tokens, type, components)
- [`docs/ZonePlanner-PRD.md`](docs/ZonePlanner-PRD.md): the full PRD
- [`AGENTS.md`](AGENTS.md): conventions and rules for contributors and agents

## Running it in dev

You need `python3` (for a static server) and `node` (for the checks and
tests). The app, the unit tests and the checks need nothing installed. Only
the end-to-end tests do, once (network, about 300 MB):

```bash
npm install
npx playwright install chromium webkit
```

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080/index.html>. The page loads ES modules, so it
must be served over HTTP; opening it from `file://` won't work.

### Tests and checks

```bash
npm test                  # unit tests in test/ via node --test
bash factory/checks.sh    # syntax check, file references, ids, then npm test
npm run test:e2e          # Playwright end-to-end tests in e2e/ (needs the install above)
```

The checks don't run the end-to-end tests. They cover the core flows on a
390px WebKit phone and a Chromium desktop; check layout and anything else in
the browser too.

### Regenerating the city data

`js/cities.js` is generated; don't edit it by hand.

```bash
node scripts/build-city-data.js                     # downloads cities15000.zip from GeoNames
node scripts/build-city-data.js path/to/cities15000.zip
```

Pinned cities live in `scripts/pinned-cities.js`.

## Credits

City data from [GeoNames](https://www.geonames.org/), licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
