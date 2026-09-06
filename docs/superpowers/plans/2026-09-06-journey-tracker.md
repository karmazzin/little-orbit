# Unified journey tracker

Goal: Make every implemented story and discovery visible, with accurate progress, next actions and persistent manual tracking.
Architecture: Pure journey.ts projects existing saved states into entries; journey-ui.ts renders the HUD selector and journal overview. Existing quest stores remain authoritative. No location-driven switching. Repeatable activities and exploration are distinct from ten finite stories.

- [x] Test full catalog, return-to-NPC stages, timing gates, completion totals and optional activities.
- [x] Implement catalog and accessible HUD/journal UI; persist selected entry only.
- [x] Remove competing HUD writes and wire the unified tracker to current states.
- [x] Check tests/build and browser desktop usability and compact touch styling.

Validation: all 156 tests pass and production build passes. Browser checks confirmed thirteen catalog entries, ready-to-deliver postcard state, a manual switch to bell tracking and its persistence across reload; no console warnings/errors. Reviewer caught native selector arrow/Space handling, corrected by exempting form controls before gameplay key handling. Completion of the Azure story now contributes to the same festival condition both in tracker and gameplay. Touch styling is compact and scrollable; browser visual check used desktop viewport. Separate QA origin preserved user saves.
