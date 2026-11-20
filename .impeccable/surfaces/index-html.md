---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

# Surface: ZonePlanner planner (index.html)

Scope: the single-page planner, mobile-first. Mode: Operate.
Task: compare 3–8 zones for one day, see business / edge / inconvenient hours, find and copy the best overlap.
Quality bar: Every Time Zone (user-named): a continuous day bar per zone and one draggable time bar spanning every zone.
Constraints: plain HTML/CSS/vanilla JS, no build; hours fixed 9–17 business, 6–9 & 17–20 edge; bands never encoded by colour alone.

## Direction contract

THESIS: The category standard played straight: one aligned day strip per zone, a single meeting bar dragged across all of them. Refuses novelty layouts; the answer (best overlap) sits above the strips.
OWN-WORLD: From docs/inspiraton.jpg: warm paper ground #F4EDE2, cream cards, deep sage #3E5248 shell and primary pills, sage business bands, peach edge bands with hatching, pale clay for inconvenient, gold overlap frame, terracotta for warnings; Libre Baskerville display, Hanken Grotesk UI, tabular numerals; a layered-paper sunrise landscape (no rays) crowning the header.
STORY: Visitor sees which window works, how costly it is for each person, drags or taps a suggestion to adjust, copies the times.
FIRST VIEWPORT: Landscape header with serif wordmark, date pill and Add zone; best-overlap card with meeting length segments and Copy; then zone rows, each name + local time at the selected bar, full 24h strip; selection bar spans all rows; legend below.
FORM: canon (category standard, chosen on the decision page), seed: bed41b7c0f886112
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
