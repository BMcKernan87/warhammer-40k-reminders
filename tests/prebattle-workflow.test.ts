import {describe,it,expect} from 'vitest';
import {advancePhase,createBattle,decidePrebattle,finishPrebattle,validateBattleState} from '../src/engine';
describe('pre-battle Scout workflow',()=>{
 it('requires an explicit decision for each eligible squad before Command',()=>{
  const fresh=createBattle();
  expect(validateBattleState(fresh)).toBe(true);
  expect(()=>advancePhase(fresh)).toThrow('Resolve pre-battle');
  expect(()=>finishPrebattle(fresh,['11e-scout-warriors-1'])).toThrow('Resolve each eligible');
  const decided=decidePrebattle(fresh,'11e-scout-warriors-1','declined');
  expect(validateBattleState(decided)).toBe(true);
  const started=finishPrebattle(decided,['11e-scout-warriors-1']);
  expect(started.prebattle?.resolved).toBe(true);
  expect(advancePhase(started).phase).toBe('Movement');
  expect(()=>decidePrebattle(started,'11e-scout-warriors-1','scouted')).toThrow();
 });
 it('allows armies without Scout grants to begin immediately',()=>{
  expect(finishPrebattle(createBattle(),[]).prebattle?.resolved).toBe(true);
 });
 it('accepts older saved battles without pre-battle state',()=>{
  const old={...createBattle()};delete (old as {prebattle?:unknown}).prebattle;
  expect(validateBattleState(old)).toBe(true);
  expect(advancePhase(old).phase).toBe('Movement');
 });
});
