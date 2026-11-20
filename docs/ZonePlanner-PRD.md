# PRD — Zone Planner

## 1. Overview

**App name:** TZ Overlap

**Problem.** Coordinating meetings across 3–8 time zones is slow and error-prone. Existing tools are either heavy (ads, accounts, server round-trips) or don't make the *mutually acceptable* window obvious at a glance, and most handle daylight saving changes silently — which is exactly when meetings get missed.

**Product.** TZ Overlap is a lightweight, client-side-only web app that lays out the user's current time zone plus up to seven others as horizontal, scrollable timelines aligned on the same moment in time. Colour coding, including a form of a heat map for the shoulder hours, shows which hours are ideal, acceptable or unacceptable in each zone and across all of them. Selecting a slot shows the exact local time in every zone.

**Goals**

1. Find a time that works for everyone in under 10 seconds, on any device.
2. Zero server dependency: no back end, no accounts, no tracking; works fully offline once loaded.
3. Be tiny and fast: interactive in under 1 second on a mid-range phone on 4G.
5. Never get daylight saving wrong

## 2. Users and use cases

**Primary user:** a professional who works with colleagues, clients and suppliers across several continents and travels often (e.g. an executive or consultant based in Sydney working with teams in the US, UK and Asia).

**Core use cases**

- **UC1 — Glance:** "What time is it for the London team right now, and are they still at work?"
- **UC2 — Find a slot:** "When this week can Sydney, Singapore, London and San Francisco all meet within acceptable hours?"
- **UC3 — Confirm a slot:** "Tap a slot and read off the exact local time in each zone."
- **UC4 — Travel:** "I've landed in Los Angeles; my home row should now be LA without me doing anything."

## 3. Scope

**In scope (v1)**

- Horizontal, scrollable multi-zone timeline with a live current-time indicator.
- Current-location row (automatic, not editable) plus up to 7 user-selected zones (8 rows maximum).
- Add zone by city (browse popular list or type to search) or by UTC/GMT offset (e.g. GMT+11, UTC-7, +5:30).
- Change, delete and drag-to-reorder user zones.
- Meeting-suitability colour coding with a heat map across the Good hours, an overlap row across all zones, and an All / Good / Best filter.
- 12/24-hour toggle.
- Phone-first text and layout (the phone is the most common device).
- Local persistence of settings and zones.
- Full DST awareness, including DST-change warnings.

**Out of scope (v1) — candidates for later**

- shareable meeting proposal (link plus copy as text) and calendar export (.ics). Requirement IDs FR-37 to FR-43 are reserved for these.
- Per-zone labels (e.g. person or team names) and custom working hours per zone.
- Public holidays (needs a maintained dataset).
- Calendar integration (reading free/busy) — would need OAuth and a server.
- Accounts, sync across devices, analytics or telemetry.
- Multiple saved zone sets (e.g. one per client).

## 4. Functional requirements

Priority: **M** = must for v1, **S** = should for v1.

### 4.1 Timeline

- **FR-1 (M)** Each zone is a horizontal row. All rows are aligned on absolute time (UTC), so a vertical line through the grid is the same instant in every zone.
- **FR-2 (M)** The grid scrolls horizontally with a finger or trackpad (native scrolling), mouse wheel (vertical wheel mapped to horizontal), click-and-drag on desktop, and arrow keys. All rows scroll together.
- **FR-3 (M)** Hour cells are labelled with that zone's local hour (e.g. `9`, `9:30` or `9:45` for non-hour offsets — see section 5).
- **FR-4 (M)** A vertical "now" line crosses all rows and moves every minute. A **Now** button returns to it whenever it is off screen.
- **FR-5 (M)** The rendered range covers 24 hours of the home zone

### 4.2 Home zone (current location)

- **FR-8 (M)** The first row is always the device's current time zone, from `Intl.DateTimeFormat().resolvedOptions().timeZone`. No location permission is requested.
- **FR-9 (M)** The home row cannot be edited, deleted or moved, and is visually marked (location symbol).
- **FR-10 (M)** The app re-checks the device time zone on launch, on `visibilitychange`/`focus`, and every minute. If it has changed (travel), the home row updates automatically and a brief toast says so (e.g. "You're now in Los Angeles time").
- **FR-12 (M)** The home row shows a friendly city name derived from the IANA ID (e.g. `Australia/Sydney` → Sydney), using the bundled city list where possible.

### 4.3 Adding zones

- **FR-13 (M)** An **Add City** button opens a sheet 
- **FR-14 (M)** The sheet shows a scrollable list of about 100 popular cities
- **FR-15 (M)** A search field (auto-focused on desktop) filters as the user types: by city, country, IANA ID (e.g. `Europe/Lisbon`). It searches a bundled list of about 500 cities.
- **FR-16 (M)** The user can type a fixed offset in flexible formats: `GMT+11`, `UTC-7`, `+5:30`, `GMT+05:45`, `-0330`. A parsed offset appears as the top result ("UTC+11:00 (fixed, no daylight saving)").
- **FR-17 (S)** Ambiguous abbreviations (e.g. IST, CST) show all matching options rather than guessing.
- **FR-18 (M)** Maximum 7 user zones. At 7, Add City is disabled with a note: "Maximum of 7 time zones. Remove one to add another."

### 4.4 Editing zones

- **FR-20 (M)** Each user row can be deleted, changed or moved by dragging and dropping
- **FR-21 (M)** **Change** reopens the Add City sheet and replaces the zone in place, keeping its position.
- **FR-22 (M)** **Delete** removes the row immediately.
- **FR-23 (M) Drag to reorder.** Every user row has a grab handle (≡) in its header, available at all times. Dragging the handle picks the row up (lifted shadow, slight scale); the other rows animate out of the way and the new order saves on drop. On touch, a long press (\~400 ms) anywhere on the row header also picks the row up, with a light haptic where supported.
- **FR-23a (M)** While dragging, the view auto-scrolls when the row nears the top or bottom edge. Pressing Esc or dropping outside the list cancels and returns the row to where it was. The home row and the Overlap row are fixed: user rows cannot be dropped above them.
- **FR-23b (M)** Dragging must never conflict with horizontal timeline scrolling: a reorder only starts from the header column (handle or long press), never from the hour cells.

### 4.5 Zone row header

- **FR-24 (M)** Each row header shows: city or offset name, live local time (updates every minute), UTC offset and abbreviation where available (e.g. "AEDT · UTC+11").
- **FR-25 (M)** The header shows the day difference relative to home when different: "Tomorrow", "Yesterday" or "+1 day" / "−1 day".
- **FR-26 (S)** A small DST badge appears when that zone is currently observing daylight saving, and a warning badge when a DST change occurs within the next 14 days (tapping it explains the change).

### 4.6 Meeting suitability

- **FR-28 (M)** Every cell is colour-coded by its local hour: **Best** (09:00–17:00) ; **Good** (06:00–09:00 and 17:00–20:00) shown differently; **Unsuitable** (20:00–06:00) dimmed.
- **FR-28a (M) Good-hours heat map.** Within the Good bands, colour shifts with distance from the Best window.

### 4.8 Day-boundary and weekend markers

- **FR-33 (M)** At local midnight in each row, a divider is drawn with that zone's date label (e.g. "Wed 18").
- **FR-34 (M)** Weekend hours are shaded in each row according to that zone's weekend days (Sat–Sun by default; Fri–Sat for, for example, Saudi Arabia, Israel and Egypt; Sun only where applicable). The country-to-weekend map ships with the city data.
- **FR-35 (M)** Weekend slots count as **Unsuitable** in the overlap row.
- **FR-36 (S)** Fixed-offset zones default to a Sat–Sun weekend.

## 6. UX and UI guidelines

Follow the instructions and desigh that is already in place as per the current app as well as DESIGN.md and PRODUCT.md. Also the exiting prortype at index.html, styles.css, app.js and assets/fonts/

## 7. Technical architecture and constraints

### 7.1 Hard constraints

- **Client-side only.** No API calls, no back end, no third-party requests at runtime. Everything is served as static files.
- **No runtime libraries or frameworks.** Vanilla HTML, CSS and JavaScript. Dev-only tools for testing are allowed.
- **No build step required to run.** The app must run straight from the source folder on any static server. An optional minify step (e.g. esbuild as a dev dependency) may produce `/dist` for deployment.

## 8. Data model and persistence

### 8.1 Stored state

Stored in `localStorage` under the key `zoneplanner.state` as JSON:


### 8.2 Persistence rules

- Save on every change (debounced 250 ms), including each completed drag-reorder. Load synchronously at start-up before the first render to avoid a flash of empty state.
- `version` drives a simple migration function. Unknown or corrupt state is backed up to `tzoverlap.state.bak` and reset to defaults, with a toast.

### 8.3 Bundled city data 

- About 500 cities: name, ASCII name, aliases, country code, IANA zone, population rank, and a `popular` flag (about 100).
- A country-to-weekend map (e.g. `{"SA": [5,6], "IL": [5,6], "default": [6,0]}`, where 0 = Sunday).
- A small abbreviation table for search (e.g. AEST, AEDT, GMT, BST, CET, EST, PST, IST→\[India, Ireland, Israel\]).
- Generated once by a dev script from a public-domain source (e.g. GeoNames cities15000) and committed. Never fetched at runtime.


## 10. Non-functional requirements

### 10.1 Performance

- First contentful paint < 1.0 s and interactive < 1.5 s on a mid-range Android phone over 4G (Lighthouse mobile profile). Repeat visits from cache < 0.5 s.
- Scrolling at 60 fps on an iPhone 12-class device and above. No layout thrash: only `transform`/`opacity` animations.
- Main-thread work per clock tick < 4 ms.

### 10.3 Privacy and security

- No data leaves the device. No cookies, analytics or third-party requests.
- Strict Content-Security-Policy via meta tag: `default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'`.
- Stored state is validated on load (zone IDs checked against `Intl.supportedValuesOf`, offsets within ±14:00, at most 7 zones). User-typed text is never inserted with `innerHTML`.

### 10.5 Localisation

- v1 UI in English (en-AU spelling). Date and time formats follow the user's locale via `Intl`. Strings live in one module to allow translation later.

## 11. Acceptance criteria and test plan
Ensure adequate test coverage across unit and integration testing as well as end-to-end testing without it being overkill for the complexity of the application. 

## 12. Build plan for Claude Code
