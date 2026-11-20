# Operator feedback, round 1 (verbatim)

Review the items that are in the PRD that have already been delivered, and don't do them again. Update the tickets accordingly.

Open questions
1. This app is going to be called ZonePlanner.
2. Happy with your recommendation.
3. Happy with your recommendation.
4. Happy with your recommendation.
5. Keep the meeting card and selection bar. Don't remove the share link, and leave copy times as it is.
6. Happy with your suggestion.
7. Yes, as you suggest.
8. Happy with what you suggest.
9. Not sure what you mean by this, but the app needs to work offline.
10. No need to include keyboard reordering.
11. Agree with your approach to end-to-end tests.
12. Happy with your recommendation.
13. Go ahead as suggested.
14. Yes, start with the locals default.

Otherwise, approved, then go ahead with the next steps.

# Orchestrator notes on the feedback

- Q9: "the app needs to work offline" means it must load and work with no network after the first visit, which needs a service worker (or equivalent) caching the page, scripts, styles, fonts and city data. Add a ticket for it, sized and placed in the waves where it fits (it must cover T8's CSP and T4's data).
- Q5: the share link stays, so T2 must not remove it; the share link must keep working with the new state (T5) and must not override the device-zone home row in a way that contradicts T2 without saying how. Resolve that interaction in the affected tickets.
- Q10: drop keyboard reordering from T11.
- "Already delivered": compare each ticket's acceptance criteria with what index.html, styles.css and app.js on main already do. Remove criteria (or whole tickets) already met, and say in plan.md what was dropped as delivered.
- Resolved open questions should move out of "Open questions" (record the decisions instead).
- Prerequisite 1 is being handled now: factory/checks.sh will run `npm test` when package.json exists.
