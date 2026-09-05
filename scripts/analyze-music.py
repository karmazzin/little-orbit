#!/usr/bin/env python3
"""Measure originals without rewriting them; requires ffmpeg on PATH."""
import json
import math
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1]
rows = []
for path in sorted((root / 'public/music').glob('*.mp3')):
    result = subprocess.run(
        ['ffmpeg', '-hide_banner', '-i', str(path), '-af',
         'loudnorm=print_format=json', '-f', 'null', '-'],
        capture_output=True, text=True, check=True)
    measured = json.JSONDecoder().raw_decode(result.stderr[result.stderr.rfind('{'):])[0]
    rows.append({'file': path.name, 'integrated_lufs': float(measured['input_i']),
                 'true_peak_dbtp': float(measured['input_tp'])})
target = min(row['integrated_lufs'] for row in rows)
for row in rows:
    row['gain'] = round(math.pow(10, (target - row['integrated_lufs']) / 20), 6)
print(json.dumps({'target_lufs': target, 'tracks': rows}, indent=2))
