import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {individualArmy} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
describe('detachment enhancements produce per-unit reminders',()=>{
 it('Tools of Dominion appears only for the upgraded Immortals instance',()=>{
  const base=individualArmy(addSelectionUnit(addSelectionUnit(newSelection('Necrons'),'Immortals'),'Necron Warriors'));
  const immortal=base.instances!.find(s=>s.unit==='Immortals')!;
  const army={...base,detachments2026:['Hand of the Dynasty'],upgrades2026:{[immortal.id]:'Tools of Dominion'}};
  const matches=generate11thReminders(army).filter(r=>r.id.startsWith('11e-necron-hod-tools'));
  expect(matches).toHaveLength(1);
  expect(matches[0].units).toEqual([immortal.id]);
  expect(matches[0].title).toContain(immortal.id);
 });
});
