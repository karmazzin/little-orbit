# Soundtrack loudness measurements

Measured 2026-09-06 using ffmpeg `loudnorm` integrated EBU R128 input measurements over each complete original MP3. Reproduce with `python3 scripts/analyze-music.py` (ffmpeg required).

Playback uses a static linear gain targeting the quietest track, **-25.09 LUFS**, before the user volume, fades and dialogue ducking. All gains are at most 1, so this cannot raise original peaks. This matches average perceived level while retaining each recording’s dynamics; moment-to-moment loudness still varies. Audio files and license attribution are unchanged.

| File | Integrated LUFS | True peak dBTP | Playback gain |
| --- | ---: | ---: | ---: |
| atlantean-twilight.mp3 | -25.09 | -3.76 | 1.000000 |
| dream-culture.mp3 | -17.28 | -0.82 | 0.406912 |
| dreams-become-real.mp3 | -24.39 | -9.36 | 0.922571 |
| floating-cities.mp3 | -19.82 | -5.43 | 0.545130 |
| meditation-impromptu-01.mp3 | -23.28 | -2.07 | 0.811895 |
