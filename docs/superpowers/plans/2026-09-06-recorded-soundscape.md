# Recorded soundscape implementation plan

**Goal:** Implement the approved sound improvements using recordings with open licences: local water and leaves, rare daylight birds, night insects and wind, material footsteps, plus quieter dynamic music.

**Architecture:** MusicPlayer remains a single streaming media element with a frame-driven fade/gap state machine. A pure soundscape model selects local sources on the spherical world and schedules discrete events from actual player displacement. A Web Audio renderer caches short recordings, uses separate ambience/effects buses and stereo positioning relative to the player's view. Existing mute and user-gesture start remain authoritative.

**Tech stack:** TypeScript, Three.js vectors, Web Audio, local MP3 recordings, ffmpeg asset inspection; no new runtime dependencies.

**Spec:** User-approved suggestions in this task: 20–60-second music gaps; 3–5-second fades; perceived loudness matching; separate volume; dialogue ducking; nearby river/leaves/bell; variant grass/stone/wood steps; rare recorded birds by day and quiet wind/insects at night.

## Constraints

- Preserve unrelated atmosphere work and world saves.
- Real recorded effects, CC0 or CC BY with source and derivative documentation.
- No new sources in each animation frame; decoded sample cache and bounded voices.
- Hidden tab or master mute stops effects and freezes music progression.
- No network audio hosts at playback time; lazy local assets only.

## Tasks

- [x] Prepare recorded assets in public/sounds, verify primary licences and decoding, derive compact loop/one-shot files and a manifest/credits file. Assigned independently to recorded_assets.
- [x] Extend src/music.ts and tests/music.test.ts with update(dt), setDucked, 4-second fades, 20–60-second gaps, hidden/muted freeze, safe next/error handling and measured track gain. Assigned independently to music_dynamics.
- [x] Implement src/soundscape.ts and tests/soundscape.test.ts: geodesic attenuation, relative pan, day/night scheduling, distance-driven steps, surface choice, bounded random variant selection. Test before implementation.
- [x] Implement src/world-audio.ts renderer: lazy AudioContext creation after user gesture, buses, sample promises deduplicated, loop/one-shot voice cleanup, bounded retries, lifecycle revision guard so delayed downloads never produce stale sounds.
- [x] Integrate main/view/UI narrowly: expose actual procedural tree positions; call music and soundscape updates; preserve default-start/mute; replace oscillator bell; add two sliders, source credits, help and README.
- [x] Verify focused tests, full suite/build on audio-only snapshot if concurrent work causes unrelated failures, browser controls and audio asset decode. Review final changes and correct findings.

Verification: pure model/transport/lifecycle tests and browser mixer/mute controls checked. Review caught slow-load fade consumption; fixed with playback readiness gating and regression test. Assets all decoded. Separate atmosphere and Russian branding changes belong to concurrent work.
