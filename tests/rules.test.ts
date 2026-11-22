import {describe,it,expect} from 'vitest';
import {createBattle,advancePhase} from '../src/engine';
import {availableRules,markCompleted,isCompleted,completionKey} from '../src/rules';
describe('timed reminders',()=>{
 it('shows only relevant faction and phase',()=>{const b=createBattle();const ids=availableRules(b,'Necrons').map(r=>r.id);expect(ids).toContain('necron-reanimation');expect(ids).not.toContain('marine-oath');expect(ids).not.toContain('core-fight');});
 it('tracks completion once per active turn',()=>{let b=createBattle();const c=markCompleted([], 'core-cp',b);expect(isCompleted(c,'core-cp',b)).toBe(true);expect(markCompleted(c,'core-cp',b)).toHaveLength(1);for(let i=0;i<5;i++)b=advancePhase(b);expect(isCompleted(c,'core-cp',b)).toBe(false);expect(completionKey('core-cp',b)).not.toBe(c[0]);});
 it('rejects completing a rule outside its phase',()=>{let b=createBattle();b=advancePhase(b);expect(()=>markCompleted([],'core-cp',b)).toThrow();});
 it('filters start-of-phase timing',()=>{const ids=availableRules(createBattle(),'Other','start').map(r=>r.id);expect(ids).toEqual(['core-cp']);});
});
