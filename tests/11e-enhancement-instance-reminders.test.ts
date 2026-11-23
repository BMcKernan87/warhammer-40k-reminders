import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {individualArmy} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';

describe('11e detachment enhancement reminders target individual units',()=>{
 it('Tools of Dominion names only the Immortals unit carrying the upgrade',()=>{
  let army=individualArmy(addSelectionUnit(addSelectionUnit(newSelection('Necrons'),'Immortals'),'Immortals'));
  const immortals=army.instances!.filter(s=>s.unit==='Immortals');
  expect(immortals).toHaveLength(2);
  army={...army,detachments2026:['Hand of the Dynasty'],upgrades2026:{[immortals[1].id]:'Tools of Dominion'}};
  const reminders=generate11thReminders(army).filter(r=>r.title.includes('Tools of Dominion'));
  expect(reminders).toHaveLength(1);
  expect(reminders[0].units).toEqual([immortals[1].id]);
  expect(reminders[0].title).toContain(immortals[1].id);
 });
 it('no upgraded unit means no Tools of Dominion reminder',()=>{
  const army={...individualArmy(addSelectionUnit(newSelection('Necrons'),'Immortals')),detachments2026:['Hand of the Dynasty']};
  expect(generate11thReminders(army).some(r=>r.title.includes('Tools of Dominion'))).toBe(false);
 });
});
