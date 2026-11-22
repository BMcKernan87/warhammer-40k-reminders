import {describe,it,expect} from 'vitest';
import {addUnit,advancePhase,createBattle,gainCommandCp,recordEvent,setWounds,spendCp} from '../src/engine';
const unit={id:'u1',name:'Necron Warriors',owner:'A' as const,wounds:10,maxWounds:10,battleShocked:false,destroyed:false};
describe('battle engine',()=>{
 it('advances both players and battle rounds',()=>{let b=createBattle();for(let i=0;i<5;i++)b=advancePhase(b);expect(b.player).toBe('B');expect(b.round).toBe(1);for(let i=0;i<5;i++)b=advancePhase(b);expect(b.player).toBe('A');expect(b.round).toBe(2);});
 it('gains CP once per command phase',()=>{const b=gainCommandCp(createBattle());expect(b.cp).toEqual({A:1,B:1});expect(()=>gainCommandCp(b)).toThrow();});
 it('rejects CP overspending',()=>expect(()=>spendCp(createBattle(),'A',1)).toThrow());
 it('validates unit identity and wounds',()=>{const b=addUnit(createBattle(),unit);expect(()=>addUnit(b,unit)).toThrow();expect(setWounds(b,'u1',0).units[0].destroyed).toBe(true);expect(()=>setWounds(b,'u1',11)).toThrow();});
 it('rejects events spoofing the current phase',()=>{const b=addUnit(createBattle(),unit);expect(()=>recordEvent(b,{id:'e1',round:1,player:'A',phase:'Fight',kind:'damage',unitId:'u1',description:'Hit'})).toThrow();expect(recordEvent(b,{id:'e1',round:1,player:'A',phase:'Command',kind:'ability',unitId:'u1',description:'Ability'}).events).toHaveLength(1);});
});
