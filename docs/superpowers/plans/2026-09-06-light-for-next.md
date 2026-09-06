# Свет для следующего — implementation plan

Goal: Link the Azure trail into a saved environmental story with a player-written ending and no new NPCs.
Architecture: Pure quest reducer/text in azure-story.ts, host-driven dialogue adapter in azure-story-ui.ts, existing place interactions and a journal section in main.ts. Separate versioned save; existing beacon and discovery saves remain authoritative.

- [x] Test map, out-of-order marks, bottle, completion gating, old lit beacon, idempotence and save validation.
- [x] Write connected story and three selectable final journal entries; implement reducer and host dialogue actions with proximity guards.
- [x] Add journal progress/re-reading and nearby place actions; retain existing lighthouse/rest controls.
- [x] Run targeted/full tests and build, inspect browser, keep requested development server running.

Validation: 148 tests pass, production build passes. New tests cover out-of-order clues, early beacon, completion gates, idempotence, save sanitization and real dialogue callbacks/proximity checks. Independent review found no material issues. Browser checked beginning, journal entry, contextual objective and ending with an already lit beacon; no console warnings/errors. Main user server remains running on port 5173. Separate QA origin and fixture were used to preserve user progress.
