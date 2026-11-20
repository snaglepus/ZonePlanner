---
name: ZonePlanner
description: Compare up to 8 time zones (home plus up to 7) and find the meeting hour that works for everyone.
colors:
  paper: "#F4EDE2"
  paper-deep: "#EADFD1"
  card: "#FBF7F0"
  ink: "#2A2C28"
  ink-soft: "#4A4B45"
  muted: "#66625A"
  line: "#E3D8CA"
  sage: "#3E5248"
  sage-press: "#33453C"
  sage-tint: "#E3E9E3"
  on-sage: "#F4EDE2"
  best: "#56705F"
  good: "#E6B089"
  good-hatch: "#D99C72"
  good-1: "#D4976B"
  good-1-hatch: "#C88B60"
  good-2: "#E6B089"
  good-2-hatch: "#D99C72"
  good-3: "#F0D2B8"
  good-3-hatch: "#E7C2A2"
  night: "#EBE2D7"
  night-line: "#DDD1C3"
  gold: "#C99247"
  terra: "#A65A3F"
  terra-tint: "#F6E3D9"
typography:
  display:
    fontFamily: "Libre Baskerville, Georgia, serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Libre Baskerville, Georgia, serif"
    fontSize: "clamp(26px, 7.6vw, 34px)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
    fontFeature: "lnum, tnum"
  title:
    fontFamily: "Libre Baskerville, Georgia, serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "Hanken Grotesk, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Hanken Grotesk, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 650
    letterSpacing: "0.005em"
    fontFeature: "tnum"
  caption:
    fontFamily: "Hanken Grotesk, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    fontFeature: "tnum"
rounded:
  badge: "6px"
  track: "9px"
  field: "14px"
  card: "22px"
  sheet: "26px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "14px"
  card-x: "18px"
  gutter: "16px"
  gutter-wide: "24px"
components:
  button-primary:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.on-sage}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.sage-press}"
  button-on-band:
    backgroundColor: "{colors.good}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.sage}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.sage-tint}"
  icon-button:
    backgroundColor: "{colors.card}"
    textColor: "{colors.sage}"
    rounded: "{rounded.pill}"
    size: "44px"
  icon-button-soft:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.sage}"
    rounded: "{rounded.pill}"
    size: "44px"
  date-pill:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "44px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px 0 10px"
    height: "40px"
  chip-selected:
    backgroundColor: "{colors.sage-tint}"
    textColor: "{colors.sage}"
  segmented:
    backgroundColor: "{colors.paper-deep}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px"
  segmented-selected:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.on-sage}"
    rounded: "{rounded.pill}"
    height: "38px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "20px 18px 18px"
  verdict-best:
    backgroundColor: "{colors.sage-tint}"
    textColor: "{colors.sage}"
    rounded: "{rounded.field}"
    padding: "11px 14px"
  verdict-unsuitable:
    backgroundColor: "{colors.terra-tint}"
    textColor: "{colors.terra}"
    rounded: "{rounded.field}"
    padding: "11px 14px"
  input-search:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 14px"
    height: "48px"
  sheet:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    width: "560px"
  toast:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.on-sage}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
  hour-track:
    backgroundColor: "{colors.night}"
    rounded: "{rounded.track}"
    height: "32px"
    width: "44px per hour"
  now-line:
    backgroundColor: "{colors.ink}"
    width: "2px"
    cap: "8px round dot"
---

# Design System: ZonePlanner

## Overview

**Creative North Star: "The Paper Valley at Dawn"**

ZonePlanner is a working instrument dressed in warm, layered paper. A cut-paper sunrise valley in peach, clay and sage crowns the page; the sage band closes in a waved paper contour, and the instrument's first cream card rests on that contour. Everything below the masthead is calm and legible: one meeting answer, then an hour grid that scrolls sideways under a fixed column of zone names, with one gold bar standing across every row. The world comes from the user's inspiration image and keeps its materials (paper grain, soft sage-tinted lift, pill controls, a serif voice for answers) while dropping its decoration (rays, birds, trees, waterfalls).

Density is mobile-first and moderate: a single 720px column, 44px touch targets, 14px between stacked cards. The serif is reserved for what the page is saying (the wordmark, the meeting time, section titles); the grotesk carries every control and every number a person scans. Colour carries meaning first and mood second: sage is Best hours and action, peach is the Good hours either side, pale clay is the Unsuitable hours to avoid, gold is the thing you are holding, terracotta is the cost someone pays.

**Key Characteristics:**
- Warm paper neutrals only; no cool greys and no pure white surfaces.
- A layered-paper landscape masthead, sun without rays, five clay-to-sage ridges closed by a waved paper contour, each layer casting a soft upward paper shadow.
- Pills for every control; generous radii (22px cards, 26px sheet).
- Hour bands encoded twice: fill plus pattern or outline, never colour alone.
- One gold selection bar spanning every zone row; gold doubles as the focus ring.
- Tabular lining numerals everywhere a time appears.

## Colors

A warm-paper palette with one deep sage voice, a peach-and-clay band pair, and two sparing signal colours (gold for selection, terracotta for cost).

### Primary
- **Valley Sage** (`sage`): the shell and action colour. Primary pill buttons, the selected meeting-length segment, the toast, card titles in the sheet, the darkest masthead ridge and the wordmark. Presses to **Deep Fold Sage** (`sage-press`). Text on it is **Paper on Sage** (`on-sage`), the same warm paper as the ground.
- **Best Sage** (`best`): the solid fill of Best-hour segments (09–17), the filled Best mark and its legend swatch. A shade lighter than Valley Sage so the bands read as data, not chrome.
- **Sage Wash** (`sage-tint`): selected chips, ghost-button hover, and the Best-tone verdict panel.

### Secondary
- **Dawn Peach** (`good`): Good hours (06–09, 17–20), always laid as a 135° hatch with **Baked Peach** (`good-hatch`). On the sage band at the top of the page it becomes the fill of the primary action, because sage-on-sage would vanish there.
- **Good heat steps**: zone rows shade Good hours by how far they sit from the Best window, each step still a 135° hatch of a base and a hatch token. **Ember Peach** (`good-1`, `good-1-hatch`) covers 08–09 and 17–18, nearest Best; **Dawn Peach** (`good-2`, `good-2-hatch`, the same values as `good` and `good-hatch`) covers 07–08 and 18–19; **Faded Peach** (`good-3`, `good-3-hatch`) covers 06–07 and 19–20, nearest Unsuitable. The Everyone row and the marks use flat Dawn Peach, with no steps. The legend's Good swatch shows the three steps side by side, nearest Best on the left.

### Tertiary
- **Lantern Gold** (`gold`): the selection bar, its tab, and every focus ring. Nothing else.
- **Terracotta** (`terra`): cost and warning. The Unsuitable verdict, the "no shared hours" overlap answer, the next/previous-day badge, and the Unsuitable label at a row's selected time. Its panel and badge ground is **Clay Blush** (`terra-tint`).

### Neutral
- **Warm Paper** (`paper`): page ground, soft icon buttons, the search field.
- **Pressed Paper** (`paper-deep`): segmented-control track, soft icon-button hover.
- **Cream Card** (`card`): every card, the sheet, the date pill and floating icon buttons.
- **Pale Clay** (`night`): Unsuitable-hour segments (20–06) and empty overlap tracks. Outlined by **Clay Rule** (`night-line`), the 1px inset that keeps pale tracks from dissolving into the card.
- **Ink** (`ink`): primary text and the now line with its dot cap. **Soft Ink** (`ink-soft`): legend and small headings. **Field Grey-Brown** (`muted`): secondary text, unselected segments.
- **Paper Rule** (`line`): row dividers, chip borders, the sheet grip.

### Named Rules
**The Two-Channel Band Rule.** Every hour band carries a second channel besides hue: Best is solid, Good is hatched at 135° on every heat step, Unsuitable is pale and outlined (hollow in marks). A band that only differs by colour is a bug.

**The Gold Is the Hand Rule.** Gold marks only what the user is holding or focusing: the selection bar and focus rings. It never decorates, labels or warns.

**The Terracotta Is a Cost Rule.** Terracotta appears only when someone pays for the chosen hour. It is never an accent, a button or a brand colour.

## Typography

**Display Font:** Libre Baskerville (with Georgia, serif)
**Body Font:** Hanken Grotesk (with system-ui, -apple-system, Segoe UI, sans-serif)

Both are self-hosted variable WOFF2 files (Latin and Latin Extended subsets), preloaded, `font-display: swap`.

**Character:** A bookish, unhurried serif states the answer; a crisp, slightly technical grotesk does the work. The pairing reads like a printed almanac with a precise instrument tucked inside.

### Hierarchy
- **Display** (400, 32px, rising to 40px at 560px+, 1.05, -0.015em): the ZonePlanner wordmark in Valley Sage, on the masthead sky.
- **Headline** (400, clamp(26px, 7.6vw, 34px), 42px at 560px+, 1.05, -0.02em, lining tabular numerals): the meeting time range, the page's answer.
- **Title** (400, 20px, 1.2; 22px in the sheet): card and sheet titles ("Zones", "Add City"), and the serif "Everyone" row name that sets the overlap row apart.
- **Body** (400, 15px, 1.45): running text and footnotes (footnote at 12.5px, max 60ch).
- **Label** (650, 14px, 0.005em): buttons, chips, segments, date pill, toast. Zone names step up to 16px/650 and row times to 16px/700.
- **Caption** (500, 12.5–13px, Field Grey-Brown): offsets, country lines, meeting sub-line, chip notes; hour-cell labels at 10.5px/700, in Ink on their Cream Card backing.

### Named Rules
**The Serif Speaks the Answer Rule.** Libre Baskerville is used only at 400 weight and only for the wordmark, the meeting time and section titles. Controls, zone names, data and labels are always Hanken Grotesk.

**The Tabular Time Rule.** Every time, offset and hour-cell label uses tabular figures (`font-variant-numeric: tabular-nums`) so columns of times align and the headline does not jitter as the selection moves.

## Layout

A single centred column, max 720px, with a 16px side gutter that widens to 24px at 560px. The masthead is 268px tall (284px at 560px+); the app column pulls up 94px into it so the toolbar sits on the darkest sage ridge and the meeting card rests on the paper contour that closes the band. Cards stack with a 14px gap; card interiors pad 20px top and 18px sides; the zone board is one horizontal scroller that runs edge to edge across the card, with an 18px pad before the zone names and after the last hour, so the selection bar and every row's hour cells share exact coordinates.

Above 560px the meeting card's time and actions move side by side and buttons stop stretching; when a long time (a 12-hour `11:30 am – 12:30 pm`) leaves no room, the actions wrap below it; otherwise the layout is the same at every width. Safe-area insets pad the masthead top, the column bottom, the sheet and the toast. Horizontal page scroll is clipped; the suggestion chip rail scrolls on its own and bleeds to the card edges.

**The Answer-Above-the-Grid Rule.** The meeting card (time, verdict, length, suggestions) always comes before the zone rows; the rows explain the answer, they never precede it.

## Elevation & Depth

Depth is paper, not glass. Cards and floating controls lift on a single soft, sage-tinted shadow that reads as paper resting on paper; the masthead ridges, and the paper contour that closes them, cast a faint upward shadow onto each other like stacked cut paper. Pale tracks get a 1px inset Clay Rule rather than a shadow. The sheet throws a larger ink-tinted shadow upward over a 38% ink scrim.

### Shadow Vocabulary
- **Paper Lift** (`box-shadow: 0 10px 28px -18px rgba(62,82,72,.45), 0 1px 2px rgba(62,82,72,.06)`): cards, floating icon buttons, the date pill, the toast.
- **Gold Glow** (`box-shadow: 0 6px 18px -8px rgba(201,146,71,.55)`): the selection bar only.
- **Sheet Rise** (`box-shadow: 0 -12px 40px -12px rgba(42,44,40,.35)`): the bottom sheet.
- **Ridge Shadow** (SVG `feDropShadow dx=0 dy=-1.5 stdDeviation=2.2`, #3B2A20 at 22%): between masthead ridges, including the closing paper contour.

### Named Rules
**The Flat-on-the-Band Rule.** Controls sitting on the sage masthead band drop Paper Lift; the band itself is their ground.

## Shapes

Soft, rounded paper. Every control is a full pill (999px); icon buttons are circles. Containers step up in radius with their size: day badge 6px, hour track 9px, selection bar 12px, verdict panel, search field and result rows 14px, cards 22px, the sheet's top corners 26px. Borders are rare and thin: 1.5px Paper Rule on unselected chips, 1px rules between rows, 2px gold on the selection bar. Marks are 10–12px circles: filled, hatched, or a 2px hollow ring. The masthead ridges are freehand cubic curves with no hard edges, and the last one is a Warm Paper contour that ends the sage band in a waved edge; the sun is a plain disc with a 10px pale halo and no rays.

## Components

### Buttons
Tactile, confident pills that compress slightly when pressed.
- **Shape:** full pill (999px), min-height 44px, 8px icon gap, 20px stroked icon.
- **Primary:** Valley Sage with Paper on Sage text, 18px side padding, Label type. Hover presses to Deep Fold Sage; `:active` scales to 0.97 on the shared ease. Disabled turns a flat grey-sage and stops scaling.
- **On the band:** the toolbar's primary (Add City) is Dawn Peach with dark brown text and no shadow, hovering lighter.
- **Ghost:** transparent with sage text, 14px padding; hover or pressed state fills with Sage Wash.
- **Icon button:** 44px circle in Cream Card with Paper Lift; the soft variant sits on Warm Paper without shadow and hovers to Pressed Paper. `:active` scales to 0.94.

### Chips
- **Style:** 40px pill, transparent, 1.5px Paper Rule border, a band mark at the left, the time in Label type and a 12px caption note.
- **State:** selected takes a sage border, Sage Wash fill and sage text. Hover darkens the border only.

### Segmented control
A Pressed Paper pill track with 4px inset; options are 38px pills in muted Label type. The selected option fills Valley Sage with Paper on Sage text.

The hour filter (All / Good / Best, named "Show hours") is the same control in the Zones board, just above the grid, with 44px options. It is a radio group: Tab lands on the checked option, and the arrow keys move and select without wrapping.

The time-format variant (`.seg-clock`, "12h / 24h") sits in the zone board header beside Edit; its two options are at least 44×44px.

### Cards / Containers
- **Corner Style:** 22px.
- **Background:** Cream Card on Warm Paper.
- **Shadow Strategy:** Paper Lift (see Elevation).
- **Border:** none.
- **Internal Padding:** 20px top, 18px sides and bottom.

### Verdict panel
A 14px-radius status panel led by a 10px mark that repeats the band's second channel: Sage Wash with a filled dot for Best, peach blush with a hatched dot for Good, Clay Blush with a hollow terracotta ring for Unsuitable.

### Inputs / Fields
- **Style:** the search field is a 48px Warm Paper well with 14px radius, a muted search icon and 16px text (prevents iOS zoom).
- **Focus:** 2.5px Lantern Gold outline, 1–2px offset; the date pill shows the same ring, and the keyboard scrubber (visually hidden) draws it around the selection bar.

### Navigation
There is no nav bar. The toolbar is the navigation: previous/next-day icon buttons around a cream date pill (calendar icon, native date input layered invisibly over it), and Add City at the right.

### Hour grid and selection bar (signature)
The board is one native horizontal scroller. Each row is a sticky header cell (176px, Cream Card, opaque) holding the zone name (ellipsis when long), the country and UTC offset, and the meeting readout, followed by a track of hour cells. Each user row's header ends in a 44px grab handle (≡, Field Grey-Brown) spanning its full height at the right edge; the home and Everyone rows have none. Columns are the home zone's hours of the selected day (23, 24 or 25 on daylight-saving days; a 30-minute change leaves a half-width last column), so each column is the same instant in every row. Full cells are 44px wide on a 32px, 9px-radius band inside a track at least 44px tall, separated by a faint 1px rule.

Each cell is labelled, left-aligned in 10.5px/700 tabular figures, with that zone's local time at the column start: `9` on the hour, `3:30` or `3:45` for offset zones. On a 12-hour clock the label is the bare 12-hour number (`3`, `12:30`), and an `am`/`pm` cue in 9px/700 sits under it on the same backing, only on the row's first cell and wherever am/pm changes (noon and midnight); full cells stay 44px. Bands keep their 15-minute accuracy under the cells, so an offset zone changes band or heat step part-way through a column: Best Sage solid, the Good heat steps 135° hatched, Pale Clay plain with the Clay Rule inset. Each label sits on its own small Cream Card backing (3px radius) in Ink, so it stays legible whatever band runs under it, including where the band changes inside the column. Checked contrast: Ink on Cream Card is 13.2:1, and Ink is at least 4.5:1 on every heat-step colour (4.9:1 at the darkest, `good-1-hatch`); `test/tokens.test.js` holds both. A 1px Paper Rule edges the header column.

Edit shows a Change (pencil) and a Remove (×) button, 44px each, on every user row in place of the meeting readout, and nothing on the home row.

The overlap row ("Everyone") sits first with a serif name and the shared-hours summary; its cells have no labels, since the home row's labels already mark the time. Swiping scrolls the cells of every row together while the header column stays put; tapping a cell starts the meeting at the quarter-hour under the finger. A single transparent bar with a 2px gold border, a gold tab on top and Gold Glow spans every row at the chosen time, passing under the header column; it moves on `transform` only, on the shared ease (0.45s), and its width changes without animation. When the selection changes from a chip, the length control, the keyboard or a new day, the grid scrolls just enough to show the whole bar.

The hour filter dims, in every row, each 15-minute slot where the Everyone row falls below the chosen band: Good keeps slots where the Everyone row is Good or Best, Best keeps only Best, All keeps everything. Dimming follows the slots, not the columns, so with a :30 or :45 zone it can start part-way through a column. Dimmed band segments drop to 30% opacity against the card, a luminance change rather than a hue change, so dimmed and kept slots stay apart in greyscale; kept segments and the hour labels are unchanged. Suggestions only come from spans that are entirely kept. When nothing is kept, the grid stays, fully dimmed, and a muted status line above it says "No hours are Best for everyone on this day" (or Good). Selection can still land on dimmed slots.

On desktop, a vertical mouse wheel over the grid scrolls it sideways until either end, then lets the page scroll. A mouse drag on the hour cells pans the grid without selecting (grab cursor at rest, grabbing while dragging, no text selection); a click without moving still selects. The grid itself takes focus: it shows the gold focus ring, inset so it stays inside the card, and Left/Right move it one hour column at a time.

User rows reorder from the header column only, never from the hour cells. Dragging the handle (any pointer), or a 400ms touch long press anywhere on a user row's header (with a light haptic where the device has one), lifts the row: it rides the pointer with a stronger sage-tinted Paper Lift shadow and a 1.02 scale, above the sticky column, and the gold bar steps aside while it is held. The rows it passes slide out of the way on `transform` (0.22s, shared ease). Holding near the top or bottom of the viewport scrolls the page, faster nearer the edge. Dropping inside the board saves the new order; Esc, a drop outside the board, a resize or toggling Edit cancels and the rows return. Nothing lands above the home row. Under reduced motion the lift has no scale and the rows jump into place.

On today's grid a 2px Ink now line crosses the Everyone row and every zone row at the current minute, capped by an 8px round Ink dot in the Everyone row's top padding; the round cap tells it apart from the bar's flat gold tab without relying on colour. It paints above the selection bar and under the header column, takes no pointer events, stays in edit mode, and moves on `transform` only, jumping one minute at a time with no animation. It is hidden on other days. On first load on today the grid opens with the line one hour column right of the header column. A ghost "Now" pill sits in the board header just before Edit, shown only when the line is scrolled off screen or the selected day is not today; it brings the grid back to today and the line, then hides.

### Bottom sheet
Zone search opens as a bottom sheet: Cream Card, 26px top corners, a 40px grip, a serif title, the search well, then 56px result rows that hover to Warm Paper. It enters by rising 40px over 0.42s. Changing a row opens the same sheet in replace mode: the title reads "Change <zone>", the note names the zone being replaced, results are not capped at seven, and picking one swaps that row in place. Closing without picking leaves the row as it was.

### Motion
One easing curve, `cubic-bezier(.16, 1, .3, 1)`, on 0.2–0.45s transitions. Reduced-motion collapses every transition and animation.

## Do's and Don'ts

### Do:
- **Do** encode every hour band twice: solid Best Sage, 135° hatched Good heat steps, plain outlined Pale Clay, with a legend on the board.
- **Do** keep every touch target at least 44px and every control a pill.
- **Do** set the meeting time and section titles in Libre Baskerville 400, and everything a user taps or scans in Hanken Grotesk with tabular figures.
- **Do** lift cards with Paper Lift only; let controls on the sage band sit flat.
- **Do** reserve Lantern Gold for the selection bar and focus rings, and Terracotta for a cost someone pays.
- **Do** keep neutrals warm: draw new greys from the paper and clay family.

### Don't:
- **Don't** distinguish bands by colour alone.
- **Don't** add rays, birds, trees or waterfalls to the masthead; the sun is a plain disc above layered ridges.
- **Don't** use gold or terracotta as decoration, branding or a button fill.
- **Don't** set controls, zone names or data in the serif, or the serif above 400 weight.
- **Don't** introduce cool greys, pure white surfaces or a second shadow style for cards.
