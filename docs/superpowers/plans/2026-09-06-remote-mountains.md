# Remote mountains and discovered quests

Goal: Soften mountain relief, populate remote western mountains/coast with two stories and a ranger, and reveal tasks only once acquired.

- [x] Reduce mountain prominence about 15%, retaining rivers, crossings and walkable approaches; terrain tests.
- [x] Filter tracker and its journal summary to acquired quests, with spoiler-free empty state and no global totals. Retain old progressed saves; explicit discovery flags cover unstarted puzzles/invitations.
- [x] Add remote shelter, wind signal, archive hut, cove, watch ridge and two authored quests; ranger Savva uses existing resident schedule/house/knock/navigation.
- [x] Integrate automatic place reading, accepted quest actions and both quests into tracker; no continuous trail.
- [x] Validate reachability, saves, gating, schedule, full tests/build and browser checks.

Validation: production build passed; 163 tests passed, including full-world dry reachability, five residents, quest acceptance/proximity/save round trips and acquired-only tracker. Browser smoke check confirmed the game renders and existing acquired story is the only tracked story. Mesh budget expanded from 220 to 250 for the fifth animated resident and additional occupied terrain sectors (actual 240); batching and sector culling assertions remain enabled.
