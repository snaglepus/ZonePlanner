# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Plain static HTML, CSS and vanilla JavaScript: one lightweight page with no build step, using the browser's built-in `Intl` time-zone APIs. The priority is a small footprint and excellent design.

## Users

The primary user is the owner, for personal use: coordinating calls with people in other countries, usually from a phone. A secondary audience is executive assistants who arrange meetings across several regions. They need choices that are quick to make and easy to justify.

## Product Purpose

ZonePlanner helps someone compare up to 8 time zones at once (home plus up to 7) and find the best times to hold a meeting. It succeeds when the user can see, in seconds and on a phone, which hours work for everyone, which are only a stretch, and which to avoid.

## Positioning

It focuses on the human cost of an hour, not just the clock arithmetic. Each hour in each zone gets a classification (business, edge or inconvenient). The overlap across all zones is the main output.

## Operating Context

- Mostly used on mobile, often quickly, between other tasks.
- Users pick a date and a set of zones, then scan for a slot to propose or copy into an invite.

## Capabilities and Constraints

- Up to 8 time zones at a time: the device's zone as home plus up to 7 more.
- Hour classification, the same for every zone (no per-zone settings):
  - **Business hours:** 09:00–17:00 local.
  - **Edge hours:** the 3 hours on either side of business hours, 06:00–09:00 and 17:00–20:00 local.
  - **Inconvenient hours:** 20:00–06:00 local.
- Shows where the zones overlap: the hours when every zone is in business hours, and the hours when every zone is at least in edge hours.
- Must handle DST and half-hour or 45-minute offsets correctly (for example India +5:30 and Nepal +5:45).
- Not decided yet: whether a picked slot can be exported to a calendar, and whether zone sets are saved or shared.

## Brand Commitments

- Name: ZonePlanner.
- The user supplied a visual reference, `docs/inspiraton.jpg`, as binding inspiration for colours, theming, buttons, layout and typography.

## Evidence on Hand

There are no users, testimonials or metrics yet. Do not invent any.

## Product Principles

1. The answer comes first. The best overlap should be visible without scrolling or doing any calculation.
2. Respect people's hours. Every suggestion should make clear what it costs someone in an awkward zone.
3. Stay light. Fast to load and with no dependencies, because it is used on the go.
4. Clear at a glance. The band colours and labels have to read correctly in sunlight, on a small screen, and for people with colour-vision deficiency.

## Accessibility & Inclusion

The hour bands cannot rely on colour alone, so they also use pattern, text or a legend. Target WCAG 2.2 AA contrast. Touch targets are at least 44px.
