import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as simulation from '../src/simulation.ts';
const advance=simulation.advanceJump;
test('jump buffers a press just before landing and consumes it once',()=>{
 const p=simulation.createPlayer(),ground=p.position.length();p.jumpHeight=.04;p.verticalSpeed=-2;p.grounded=false;
 advance(p,ground,true,1/60);advance(p,ground,false,1/60);
 assert.ok(p.verticalSpeed>0);const speed=p.verticalSpeed;advance(p,ground,true,1/60);assert.ok(p.verticalSpeed<speed);
});
test('coyote jump works shortly after leaving a ledge but not after timeout',()=>{
 for(const delay of [3,10]){const p=simulation.createPlayer(),ground=p.position.length();
 for(let i=0;i<delay;i++)advance(p,ground-2,false,1/60);
 advance(p,ground-2,true,1/60);assert.equal(p.verticalSpeed>0,delay===3);
 }
});
test('expired early jump input does not bounce on landing',()=>{
 const p=simulation.createPlayer(),ground=p.position.length();p.jumpHeight=2;p.verticalSpeed=-1;p.grounded=false;p.coyoteTime=0;
 advance(p,ground,true,1/60);for(let i=0;i<120;i++)advance(p,ground,false,1/60);
 assert.equal(p.jumpHeight,0);assert.equal(p.verticalSpeed,0);
});
