# Living Residents Implementation Plan

**Goal:** Give all four residents purposeful visible lives and a shared lantern clearing.
**Architecture:** Pure schedule and persistent movement state separated from Three.js presentation. Cached walkable graph on the inhabited hemisphere, with sampled safe edges and exact destination connections. Existing story reducers remain authoritative.
**Tech Stack:** TypeScript, Three.js, node:test, Vite.
**Spec:** ../specs/2026-09-06-living-residents-design.md

## Constraints and decisions
Continue in the current user project: existing uncommitted rivers/terrain work is the required baseline and must be preserved. No publish, reset, or unrelated cleanup. The user explicitly authorized execution of the reviewed design; no repeated approval gate. Noah uses north cart and village outings, no new remote settlement. Implement campfire visual module independently through subagent-driven-development; parent owns navigation/integration.

- [x] Add src/resident-life.ts: catalog of four residents, houses, activity points; local daily clock and per-resident schedule; graph with obstacle/terrain-safe edges; bounded movement, arrival states, greetings/knocking, versioned snapshot restore. Tests in tests/resident-life.test.ts: assert all four IDs; schedule at day/night; repeated updates physically reach destinations; every edge dry and slope-safe; changed clock never moves farther than speed*dt; corrupt saves fall back.
- [x] Add src/hearth.ts and tests/hearth.test.ts: ring of sitting logs, walkable gaps, stone fire bowl, coals/firewood, evening flame/light/sparks and deterministic procedural crackle buffer. Test finite geometry, toggling, seats. Independently delegated.
- [x] Integrate src/view.ts, src/adventure-view.ts, src/night.ts and new resident presentation: relocate western house, clear activity areas of random trees, four animated models and props, actual seats, home occupancy windows. Remove old teleporting Ada and duplicate static Noah/guests.
- [x] Integrate src/main.ts and src/adventure-ui.ts: actual resident coordinates for interactions, door knock, journal/map statuses, schedule update during map/time controls, freeze in conversations, save/load/reset, memory greetings, telescope arrival detection, fire audio lifecycle.
- [x] Run focused then full tests, production build, browser day/night/door/map checks, independent review. Repair findings. Update README and record evidence here.


## Verification and review

- `npm test`: 132 passed, 0 failed (final full run).
- `npm run build`: TypeScript and Vite production bundle passed; navigation worker emitted as a separate asset.
- `git diff --check`: clean.
- Browser: game starts with existing quest progress; journal lists four residents and activities; night jump shows them walking, followed by Mira/Lev indoors and Noah reaching his cart while Ada observes. Reload preserves night/time and resident positions. Console contained no errors or warnings in the checked game session.
- Visual fixture using actual world/model builders: four residents seated on log surfaces around lit hearth; daytime clearing; Ada house beside telescope. Temporary fixture removed after inspection.
- Independent review: fixed Ada's festival departure cutoff, pending-route retry at 0.13 m from home, and door transition cleanup. Regression tests cover all three; reviewer confirmed the final two fixes.
- Route investigation: the new tributaries isolated Noah's northern starting area. A small timber crossing over the conifer stream connects it to the village; all exact home, work and seating destinations pass navigation with actual obstacles.
- Existing uncommitted terrain/swimming work preserved. Work remains local, without publishing or committing unrelated changes.


### Уточнение Ноя и посиделки — выполнено

Обычные истории тетради доступны днём и вечером. Только выступление у костра ограничено 18–22 по местному времени поляны и фактической посадкой Ноя. Оно зажигает огонь и приглашает соседей из домов. Герой выбирает «Подсесть», подходит через обычную физику с проверкой препятствий и садится рядом; три отдельные истории не меняют прогресс тетради. Можно встать через диалог или управление.

Проверка: 139 тестов проходят, production build проходит. Расширенная проверка диалога также проходит отдельно. В браузере на отдельном тестовом origin проверены приглашение, подход, сидячая поза, отдельный рассказ, прибытие Миры и Льва и кнопка вставания. Ошибок и предупреждений консоли нет. Независимое ревью существенных дефектов не выявило. Временная тестовая страница удалена.
