# ZonePlanner

A mobile-first time zone meeting planner: compare up to 8 zones (home plus up to
7) and find the hour that works for everyone. Product context is in `PRODUCT.md`; the design
system (tokens, type, components) is in `DESIGN.md`. The visual direction comes
from `docs/inspiraton.jpg` and is binding.

## Stack

Plain static HTML, CSS and vanilla JavaScript ES modules. No build step and no
runtime dependencies; `package.json` exists only so `npm test` runs the unit
tests.

- `index.html`: markup and the SVG icon sprite. Loads `app.js` with
  `<script type="module">`.
- `styles.css`: all styles; design tokens are on `:root` at the top.
- `app.js`: the entry point. DOM lookups, state, load/save/share, scoring,
  rendering and interactions.
- `js/time.js`: the time engine (`Intl.DateTimeFormat`): offsets, local parts,
  zoned midnight, band classification and UTC offset labels.
- `js/zones.js`: the zone list rules: zone validation, user rows (home
  dropped, capped at 7), share-link `z` encoding and parsing, and following a
  new device zone.
- `js/strings.js`: every user-facing string JavaScript builds (en-AU).
- `test/`: unit tests (`node:test`) for the time engine and the zone rules.
- `assets/fonts/`: self-hosted woff2 fonts. Don't add CDN or third-party requests.

Rules that hold across the app:

- Business 09:00–17:00, edge 06:00–09:00 and 17:00–20:00, inconvenient
  otherwise, local to each zone. 15-minute slots across the home zone's day.
- Bands never rely on colour alone (solid, hatched, pale).
- The home row is always the device zone, recomputed on load and followed
  live; it is never stored or read from a link. The rest are at most 7 user
  rows.
- Any string from the share-link hash or localStorage goes through `esc()` or
  `textContent` before it reaches the DOM.
- User-facing strings live in `js/strings.js`, whose functions return plain
  text and never escape. Any strings-module result that goes into `innerHTML`
  is wrapped in `esc()` at the call site in `app.js`, so it is escaped exactly
  once; `textContent`, `setAttribute` and `window.prompt` take it as is.
- `js/time.js` and `js/zones.js` stay DOM-free: no `document`, `window`, `location`,
  `localStorage`, `navigator` or `history`, so it imports in Node.
- Every `$("id")` / `getElementById` lookup stays in `app.js` with a literal id.
- Touch targets are at least 44px; no horizontal scroll at 390px wide.

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
