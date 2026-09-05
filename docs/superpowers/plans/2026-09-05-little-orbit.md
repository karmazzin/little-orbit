# Little Orbit Implementation Plan

> Execute inline using superpowers:executing-plans. User approved the design; no further design gate is needed.

**Goal:** Deliver a playable local spherical exploration game.
**Architecture:** Pure terrain, simulation and story state; procedural Three.js rendering; DOM interface.
**Tech Stack:** TypeScript, Three.js, Vite, tsx tests, Playwright.
**Spec:** docs/superpowers/specs/2026-09-05-little-orbit-design.md

## Global Constraints
Russian UI. Desktop keyboard/mouse. No swimming, terrain destruction or multiplayer in v1. No external art dependencies. Stable seeded world. Character moves around entire sphere.

## Tasks
- [x] 1. Domain: create src/terrain.ts, src/simulation.ts, src/story.ts. First add tests/domain.test.ts, run npm test (red), implement then run green. terrain.sample(Vector3) returns height, waterDepth, bridge; simulation.step(player,input,dt,obstacles) changes normalized up vector and radial jump; story reducer accepts talk/collect and validates saved IDs.
- [x] 2. World: src/view.ts generates faceted mesh sampled from terrain, lakes/river, bridge, trees, rocks, homes, animated backpack characters, letters. Obstacles share placement data with simulation. Validate via build and browser render.
- [x] 3. Game: src/main.ts runs fixed step, transported tangent frame, follow camera, contextual interactions and save/load. index.html and src/style.css supply start overlay, journal, help, overview and dialogue. Check keyboard controls, camera orbit, water, jump, dialogue, quest and reset.
- [x] 4. Verify: run npm test and npm run build; browser smoke check for WebGL errors and functional controls. Document npm install / npm run dev and limitations in README.md. Leave local server running and open playable game.


## Verification results

- 2026-09-05: `npm test` passed 11/11 tests, including full generated-world reachability for every resident and letter and a clear bridge lane.
- `npm run build` passed TypeScript checks and Vite production bundling without warnings.
- In-app browser: initial 3D rendering, start button, journal open/close, keyboard overview toggle, overview screenshot and walking-view screenshots checked. Browser console had no errors or warnings after final reload.
- Continuous held-key movement and complete quest walkthrough were not automated in the browser; the actual simulation, quest state transitions and navigability are covered by the Node tests.
- Independent read-only reviewer reported no critical or important correctness issues.
- No Git repository exists in the supplied empty workspace; files are delivered in place, without commits or deployment. Vite remains running at http://127.0.0.1:5173/.
