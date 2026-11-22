import {describe,it,expect} from 'vitest';
import {createBattle,addUnit,recordEvent,validateBattleState} from '../src/engine';
describe('saved battle validation',()=>{
 it('accepts an unmodified battle',()=>expect(validateBattleState(createBattle())).toBe(true));
 it('rejects invalid CP, phases, and rounds',()=>{const b=createBattle();expect(validateBattleState({...b,cp:{A:-1,B:0}})).toBe(false);expect(validateBattleState({...b,phase:'Psychic'})).toBe(false);expect(validateBattleState({...b,round:0})).toBe(false);});
 it('rejects duplicate units and inconsistent destruction',()=>{const u={id:'u1',name:'Immortals',owner:'A' as const,wounds:5,maxWounds:5,battleShocked:false,destroyed:false};const b=addUnit(createBattle(),u);expect(validateBattleState({...b,units:[u,u]})).toBe(false);expect(validateBattleState({...b,units:[{...u,destroyed:true}]})).toBe(false);});
 it('rejects events with missing units or duplicate IDs',()=>{const b=recordEvent(createBattle(),{id:'event1',round:1,player:'A',phase:'Command',kind:'note',description:'Start'});expect(validateBattleState({...b,events:[...b.events,b.events[0]]})).toBe(false);expect(validateBattleState({...b,events:[{...b.events[0],unitId:'missing'}]})).toBe(false);});
});
