import {describe,it,expect} from 'vitest';
import {createBattle} from '../src/engine';
import {assess,applyStratagem,usageKey,STRATAGEMS,type Stratagem} from '../src/stratagems';
describe('event-triggered stratagem eligibility',()=>{
 it('never spends CP for unverified rule text',()=>{const b=createBattle();b.cp.A=2;const e={kind:'roll' as const,actor:'A' as const,facts:{'eligible-roll':true}};expect(assess(b,e,[])[0].status).toBe('conditional');expect(()=>applyStratagem(b,e,[],'command-reroll')).toThrow();expect(b.cp.A).toBe(2);});
 it('checks owner and reaction timing',()=>{const b=createBattle();b.phase='Fight';b.cp.B=2;const e={kind:'after-enemy-fights' as const,actor:'A' as const,facts:{'enemy-just-fought':true,'friendly-unit-can-fight':true}};const a=assess(b,e,[])[0];expect(a.owner).toBe('B');expect(a.status).toBe('conditional');});
 it('rejects insufficient CP and exhausted usage',()=>{const b=createBattle();const e={kind:'roll' as const,actor:'A' as const,facts:{'eligible-roll':true}};expect(assess(b,e,[])[0].status).toBe('ineligible');b.cp.A=2;const key=usageKey(b,STRATAGEMS[0],'A');expect(assess(b,e,[key])[0].reasons).toContain('Already used in this window');});
 it('allows verified synthetic rules and enforces once-per-phase',()=>{const b=createBattle();b.cp.A=2;const rule:Stratagem={...STRATAGEMS[0],verified:true};const e={kind:'roll' as const,actor:'A' as const,facts:{'eligible-roll':true}};const applied=applyStratagem(b,e,[],rule.id,[rule]);expect(applied.battle.cp.A).toBe(1);expect(applied.used).toHaveLength(1);expect(()=>applyStratagem(applied.battle,e,applied.used,rule.id,[rule])).toThrow();});
});
