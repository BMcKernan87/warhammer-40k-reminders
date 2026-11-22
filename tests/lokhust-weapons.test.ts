import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit,validateSelection} from '../src/catalog';
import {expandRoster,setInstanceEquipment} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('Lokhust Heavy Destroyer weapons',()=>{
 it('supports independent gauss and enmitic loadouts',()=>{
  let army=addSelectionUnit(newSelection(),'Lokhust Heavy Destroyers',2);
  army={...army,instances:expandRoster(army)};
  army=setInstanceEquipment(army,'Lokhust Heavy Destroyers#1','Gauss destructor');
  army=setInstanceEquipment(army,'Lokhust Heavy Destroyers#2','Enmitic exterminator');
  expect(validateSelection(army)).toBe(true);
  const reminders=generateReminders(army);
  const gauss=reminders.find(r=>r.id==='equipment-Lokhust Heavy Destroyers#1-Gauss destructor');
  const enmitic=reminders.find(r=>r.id==='equipment-Lokhust Heavy Destroyers#2-Enmitic exterminator');
  expect(gauss?.summary).toContain('LETHAL HITS');
  expect(gauss?.summary).toContain('48″');
  expect(gauss?.summary).not.toContain('SUSTAINED HITS');
  expect(enmitic?.summary).toContain('SUSTAINED HITS 1');
  expect(enmitic?.summary).toContain('RAPID FIRE 6');
  expect(enmitic?.summary).toContain('36″');
  expect(enmitic?.summary).not.toContain('LETHAL HITS');
 });
});
