# Little Orbit — recorded sound credits

All shipped sounds are derivatives of real recordings. No waveform synthesis or generated noise was used. Licenses and author statements were checked against the linked primary publication pages on 2026-09-06. `manifest.json` records every derivative, its original file, author, license, processing, and loop flag.

## Water

`river.mp3` — **kurt**, [Stream Sounds](https://opengameart.org/content/stream-sounds), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The author describes a recording made while camping. Download: [stream-waterfall.zip](https://opengameart.org/sites/default/files/stream-waterfall.zip). Original member: `stream-waterfall/stream1.ogg`. Selected 2–30 s, high-pass 85 Hz, low-pass 5.5 kHz, 2-second wrap crossfade. This water-only source was selected instead of the park river recording that explicitly includes birds and frogs.

## Wind, foliage rustle, and occasional birds

`wind.mp3`, `leaves.mp3`, `bird-1.mp3`, `bird-2.mp3`, `bird-3.mp3` — **Thimras**, [Park ambiences](https://opengameart.org/content/park-ambiences), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Recorded in a public park in Adelaide, Australia.

- [park_ambience_wind.wav](https://opengameart.org/sites/default/files/park_ambience_wind.wav): `wind.mp3` uses 20–48 s with 140 Hz–4.5 kHz filtering; `leaves.mp3` uses 50–72 s with 500 Hz–6.5 kHz filtering. Both have 2-second wrap crossfades. The foliage layer is an excerpt of recorded open-field wind rustle, **not a separate close-microphone leaf recording**.
- [park_ambience_birds.wav](https://opengameart.org/sites/default/files/park_ambience_birds.wav): three 1.25-second call excerpts beginning at 18.65, 20.0, and 27.45 seconds, filtered to 1.8–8 kHz with spectral noise reduction and 90 ms/200 ms edge fades. These are short ambient field-recorded call phrases, not a continuously looping bird bed.

## Night insects

`crickets.mp3` — **dklon**, [Crickets](https://opengameart.org/content/crickets), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Original [crickets_0.mp3](https://opengameart.org/sites/default/files/crickets_0.mp3), recorded with a Zoom H4N. Selected 0.6–17.6 s, high-pass 1.2 kHz, 2-second wrap crossfade. Attribution requested by the author: **dklon**.

## Bell

`bell.mp3` — **laleksic**, [Various Sound Effects](https://opengameart.org/node/143670), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Original [sounds_8.zip](https://opengameart.org/sites/default/files/sounds_8.zip), member `bell.wav`. The author states that these sounds were recorded on a phone and cleaned in Audacity. Converted full 2.285-second bell recording with 100 Hz high-pass and short edge fades. The source names this sound “bell”; it does not specify the physical bell type.

## Footsteps

`step-grass-1.mp3` through `step-grass-3.mp3`, `step-stone-1.mp3` through `step-stone-3.mp3`, and `step-wood-1.mp3` through `step-wood-3.mp3` — original recordings by **swuing**, mastering and supplied variations by **congusbongus**. Downloaded from [Footsteps on different surfaces](https://opengameart.org/content/footsteps-on-different-surfaces), [footsteps_0.zip](https://opengameart.org/sites/default/files/footsteps_0.zip), under the pack's [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) license.

Original provenance, as preserved in the archive's per-surface `license.txt`:

- Grass: [footstep-grass.wav by swuing](https://freesound.org/people/swuing/sounds/38874/); selected `footsteps/grass/0.ogg`, `1.ogg`, `2.ogg`.
- Stone/hard ground: [footstep-concrete.wav by swuing](https://freesound.org/people/swuing/sounds/38873/); selected `footsteps/boots/0.ogg`, `1.ogg`, `2.ogg`. Concrete recordings represent the game's stone paths.
- Wood: [footstep-wood.wav by swuing](https://freesound.org/people/swuing/sounds/38876/); selected `footsteps/wood/0.ogg`, `1.ogg`, `2.ogg`.

Each is a supplied variation derived from its named recording, not a claim of three separately recorded takes. Applied 65 Hz high-pass and short edge fades. Original Freesound pages currently display CC BY 4.0; the downloaded OGA derivative pack and included license files explicitly grant CC BY 3.0, which is the license used here.

## Shared preparation and verification

Every output is 44.1 kHz mono MP3 at 96 kbps with peak normalization below full scale. Loop wrap crossfades shorten the selected excerpt by two seconds and preserve a continuous transition from end back to start. MP3 carries encoder padding metadata for gapless Web Audio decoding. Processing utility: `scripts/prepare-sounds.py`. Every shipped MP3 was decoded to completion with ffmpeg; duration, channel count, file existence and total size were checked. Spectrograms were inspected to select short bird phrases and avoid prominent bird signatures in continuous water/wind layers; no claim of a human listening review is made.

Source downloads are build inputs kept outside the shipped app; SHA-256 hashes follow for reproducible provenance.

| Original download | SHA-256 |
| --- | --- |
| `footsteps.zip` | `542564e7f6b3a0b89a0d08542438e030e77a46303855fe5bf1644a48185861e9` |
| `stream.zip` | `71d64573330b49de83e648ca86331d38f5b7147f75873708495e2fffb01f9ac3` |
| `bell.zip` | `82c945e5f3c97e4d38dbf18fa27bcea78dbed73b4078c5bbafc04ad89b4096db` |
| `crickets.mp3` | `90cc63e7f9aef02d2c3bee846639bd3884018a1ad1279b1faff6cb79246eb176` |
| `birds.wav` | `dc1a5ac34b89cab7f8f261b53a23da7c1c5e3cc895aae4cb6fb4a1a04001b2af` |
| `wind.wav` | `5c381856745b4706e7eba55eb9271a61a530e90c05df8126adb2db89ecfa6c5a` |
