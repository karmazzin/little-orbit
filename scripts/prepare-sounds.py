#!/usr/bin/env python3
"""Prepare recorded sound derivatives. Sources are downloaded separately to /tmp/orbit-sources."""
from pathlib import Path
import subprocess, array, math, json
FFMPEG='/opt/homebrew/bin/ffmpeg'
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/sounds'
RATE=44100

def recorded_clip(source, name, start=0, duration=None, loop=False, filters='', target_peak=.7):
    args=[FFMPEG,'-v','error','-ss',str(start),'-i',str(source)]
    if duration: args += ['-t',str(duration)]
    args += ['-ac','1','-ar',str(RATE)]
    if filters: args += ['-af',filters]
    raw=subprocess.check_output(args+['-f','f32le','-'])
    samples=array.array('f'); samples.frombytes(raw)
    if loop:
        # Wrap-aware overlap: head follows the tail/head blend continuously.
        n=min(RATE*2,len(samples)//6)
        blended=array.array('f',(samples[len(samples)-n+i]*(1-i/n)+samples[i]*(i/n) for i in range(n)))
        samples=samples[n:len(samples)-n]+blended
    else:
        n=min(int(RATE*.008),len(samples)//8)
        for i in range(n):
            samples[i]*=i/n
            samples[-i-1]*=i/n
    peak=max(abs(v) for v in samples) or 1
    samples=array.array('f',(v*target_peak/peak for v in samples))
    OUT.mkdir(exist_ok=True,parents=True)
    subprocess.run([FFMPEG,'-v','error','-y','-f','f32le','-ar',str(RATE),'-ac','1','-i','-','-codec:a','libmp3lame','-b:a','96k',str(OUT/(name+'.mp3'))],input=samples.tobytes(),check=True)
    subprocess.run([FFMPEG,'-v','error','-i',str(OUT/(name+'.mp3')),'-f','null','-'],check=True)
    return len(samples)/RATE

if __name__=='__main__':
    print('Import recorded_clip(source, name, start, duration, loop, filters) to prepare verified source recordings.')
