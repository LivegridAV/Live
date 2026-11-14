import assert from 'node:assert/strict';
import test from 'node:test';
import { createEntranceClock, advanceEntranceClock } from '../src/venue/systems/entranceFinishes.ts';

const arrival={mode:'arrival',paused:false,reducedMotion:false};
const step=(clock,state,seconds)=>{for(let i=0;i<Math.round(seconds*60);i++)advanceEntranceClock(clock,1/60,state);};
test('Two 24-second cycles close without accumulated phase drift',()=>{
  const c=createEntranceClock();step(c,arrival,48);
  assert.ok(Math.min(c.time,24-c.time)<1e-10);
});
test('Pause freezes phase, resume continues, static/reduced motion return to frame zero',()=>{
  const c=createEntranceClock();step(c,arrival,3);const held=c.time;
  step(c,{...arrival,paused:true},10);assert.equal(c.time,held);
  step(c,arrival,1);assert.ok(Math.abs(c.time-held-1)<1e-10);
  advanceEntranceClock(c,1/60,{...arrival,reducedMotion:true});assert.equal(c.time,0);
  step(c,arrival,2);advanceEntranceClock(c,1/60,{...arrival,mode:'static'});assert.equal(c.time,0);
});
test('Calm reaches 55 percent in two seconds while preserving the master phase',()=>{
  const c=createEntranceClock();step(c,arrival,3);step(c,{...arrival,mode:'calm'},1);
  assert.ok(Math.abs(c.gain-.775)<1e-10);step(c,{...arrival,mode:'calm'},1);
  assert.equal(c.gain,.55);assert.ok(Math.abs(c.time-5)<1e-10);
});
test('Background visibility never advances individual surfaces or causes a phase jump',()=>{
  const c=createEntranceClock();step(c,arrival,3);const held=c.time;
  advanceEntranceClock(c,90,arrival,false);assert.equal(c.time,held);
  advanceEntranceClock(c,90,arrival,true);assert.ok(Math.abs(c.time-held-.1)<1e-10);
});
