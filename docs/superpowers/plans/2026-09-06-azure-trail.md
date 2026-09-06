# Azure coast trail implementation plan

Goal: Populate the quiet hemisphere between the astronomer's camp and Azure Sea with six explorable natural places, without NPCs.
Architecture: A separate authored regional data/view module feeds existing landmark discovery, journal and map UI. Original three postcard landmarks retain their IDs and quest rules. Trail follows dry terrain; decorations respect its corridor. Beacon state persists separately.

- [x] Define six sites and a connected dry trail; test continuous walkability and spacing.
- [x] Build spruce/birch groves, pass cairns, shelter, cove finds and a coastal beacon with an overlook; merge static decorations through existing sectors.
- [x] Integrate discovery, descriptions, map and journal, beacon switch and resting interactions without changing original quests.
- [x] Verify collision routes in built world, save compatibility, full suite/build and browser visuals; document result.

Validation: 144 tests passed; production build passed. Added continuous dry-route, world obstacle clearance, swimming entry, discovery save/quest isolation and rear log approach tests. Expanded the whole-world reachability grid to cover the remote hemisphere. Independent review found the bounded village navigation issue; fixed with a local spherical frame and confirmed by regression tests. Browser checks covered spruce grove/rest, cove, lighthouse illumination persistence, ascent and descent. No browser warnings/errors. Temporary QA fixture and isolated server removed after testing.
