import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {individualArmy} from '../src/roster-instances';
describe('11e detachment upgrades belong to the eligible unit',()=>{
 it('does not grant Tools of Dominion to Immortals when another unit owns the upgrade',()=>{
  const base=individualArmy(addSelectionUnit(addSelectionUnit(newSelection('Necrons'),'Immortals'),'Necron Warriors'));
  const warriors=base.instances!.find(s=>s.unit==='Necron Warriors')!;
  const immortals=base.instances!.find(s=>s.unit==='Immortals')!;
  const wrong={...base,detachments2026:['Hand of the Dynasty'],upgrades2026:{[warriors.id]:'Tools of Dominion'}};
  const right={...base,detachments2026:['Hand of the Dynasty'],upgrades2026:{[immortals.id]:'Tools of Dominion'}};
  expect(generate11thReminders(wrong).some(r=>r.id==='11e-necron-hod-tools')).toBe(false);
  expect(generate11thReminders(right).some(r=>r.id==='11e-necron-hod-tools')).toBe(true);
 });
});
