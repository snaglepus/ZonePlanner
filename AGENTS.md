# ZonePlanner

A mobile-first time zone meeting planner: compare 3 to 8 zones and find the
hour that works for everyone. Product context is in `PRODUCT.md`; the design
system (tokens, type, components) is in `DESIGN.md`. The visual direction comes
from `docs/inspiraton.jpg` and is binding.

## Stack

Plain static HTML, CSS and vanilla JavaScript. No build step, no dependencies,
no package manager.

- `index.html`: markup and the SVG icon sprite.
- `styles.css`: all styles; design tokens are on `:root` at the top.
- `app.js`: the time engine (`Intl.DateTimeFormat`), scoring, rendering and
  interactions, in one IIFE.
- `assets/fonts/`: self-hosted woff2 fonts. Don't add CDN or third-party requests.

Rules that hold across the app:

- Business 09:00–17:00, edge 06:00–09:00 and 17:00–20:00, inconvenient
  otherwise, local to each zone. 15-minute slots across the home zone's day.
- Bands never rely on colour alone (solid, hatched, pale).
- Any string from the share-link hash or localStorage goes through `esc()` or
  `textContent` before it reaches the DOM.
- Touch targets are at least 44px; no horizontal scroll at 390px wide.

## Setup

A fresh checkout needs nothing installed beyond `python3` (for the dev
server) and `node` (for the syntax check in `factory/checks.sh`).

## Dev server

```bash
python3 -m http.server <port>
```

Then open `http://localhost:<port>/index.html`. The page also works opened
straight from disk.

## Validation

```bash
bash factory/checks.sh
```

It runs `node --check` on every JS file, confirms every local file referenced
by `index.html` and `styles.css` exists, checks that `styles.css` has
balanced braces, and checks that every element id `app.js` looks up exists in
`index.html`. There is no unit test suite; verify behaviour in the browser.

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
