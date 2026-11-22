import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {expandRoster,setInstanceEquipment} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('Immortal weapon-specific rules',()=>{
 it('uses lethal hits only for Gauss and assault/sustained hits only for Tesla',()=>{
  let army=addSelectionUnit(newSelection(),'Immortals',2);
  army={...army,instances:expandRoster(army)};
  army=setInstanceEquipment(army,'Immortals#1','Gauss blaster');
  army=setInstanceEquipment(army,'Immortals#2','Tesla carbine');
  const a=generateReminders(army).find(r=>r.id==='equipment-Immortals#1-Gauss blaster');
  const b=generateReminders(army).find(r=>r.id==='equipment-Immortals#2-Tesla carbine');
  expect(a?.summary).toContain('LETHAL HITS');
  expect(a?.summary).not.toContain('SUSTAINED HITS');
  expect(b?.summary).toContain('SUSTAINED HITS 2');
  expect(b?.summary).toContain('ASSAULT');
  expect(b?.summary).not.toContain('LETHAL HITS');
 });
});
