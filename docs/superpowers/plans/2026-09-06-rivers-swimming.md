# Rivers and Swimming Implementation Plan

> Execute in this session; use test-driven-development and verification-before-completion. A bounded movement subtask may use subagent-driven-development; review the integrated result.

**Goal:** Give the whole planet readable hills, mountain watersheds and navigable rivers.

**Architecture:** Authored spherical drainage segments and basins supply water levels and current vectors. Terrain carves their channels; rendering and simulation consume the same samples. Movement owns walk/swim transitions; the UI exposes only possible contextual actions.

**Tech Stack:** TypeScript, Three.js, Vite, node:test.

**Spec:** docs/superpowers/specs/2026-09-06-rivers-swimming-design.md

## Global constraints
- Existing local game and quest progress remain usable; no dependencies, server publishing or unrelated changes.
- Work in the current checkout so the already-open local game receives the authorized update.
- No swimming on land, no wading, F/touch transitions and automatic recovery from a fall.

## Tasks
- [x] 1. Hydrology and terrain: add `src/hydrology.ts`, update `terrain.ts`, test elevation range, global water distribution, monotonic connected drainage, dry quest positions and spherical continuity.
- [x] 2. Movement: extend `simulation.ts` with `mode: 'walk'|'swim'`, optional `Input.toggleMode`, `movementAction(player, obstacles): 'swim'|'walk'|null`; update `persistence.ts`. Test shoreline blocking, deliberate transitions, falls, slope limits, currents and old/new saves.
- [x] 3. Rendering: build global clipped water geometry with local levels and downstream motion; tint terrain by altitude/slope; animate swimming and adjust cloud/atmosphere envelope.
- [x] 4. Integration: F/contextual desktop and mobile button, swimming camera, suppress footsteps in water, global water sound sources, useful location descriptions and README.
- [x] 5. Verify: full node tests and build; inspect globe, mountains, water and game start in browser; verify entry/swim/exit and touch control integration with tests and code review. Review diff and repair concrete issues.

## Shared interfaces
`sample(up)` retains height, waterDepth, wet, bridge, path; adds `waterLevel: number`, `flow: Vector3`, `biome: string`, `region: string`. Flow is tangent, in world units per second. Dry surfaces have zero waterDepth; bridges/stone crossing expose dry walkable height above water. `createPlayer` retains existing jump fields. Saves accept version 1 and migrate altitude to new ground, version 2 records movement mode.

## Verification commands
`node --import tsx --test tests/hydrology.test.ts tests/swimming.test.ts tests/persistence.test.ts`

`npm test`

`npm run build`

## Progress / decisions
- Design approved by user; proceed without another approval checkpoint.
- Current checkout is intentional: the task is to update the running local game. Existing untracked Python cache is unrelated and retained.

## Final verification
- `npm test`: 119 passed, 0 failed after the final landscape optimization.
- `npm run build`: passed; `git diff --check`: passed.
- Browser: game starts, globe/terrain/water inspected, dry-land F interaction checked, no browser error logs. Local server remains on port 5173.
- Entry, currents, exit, falls into water and save migration are covered by automated tests. Continuous swimming was not manually exercised through browser automation; physical touch hardware was not tested.
- Review found abrupt river/basin elevation transitions. Stations now meet basin elevations with a bounded downhill gradient; continuity tests and a follow-up independent review pass.
- Landscape uses 135,767 triangles with adaptive shoreline refinement and a 190,000-triangle regression budget. Browser observed approximately 30 FPS at 1280×800 on balanced settings; this is environment-specific.
