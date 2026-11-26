import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection} from '../src/catalog';
import {expandRoster,setInstanceEquipment,setInstanceModelCount,setInstanceWeaponCounts} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('Necron Warrior squad configuration',()=>{
 it('accepts ten and twenty model squads with independent flayer/reaper reminders',()=>{
  let a=addSelectionUnit(newSelection(),'Necron Warriors',2);
  a={...a,instances:expandRoster(a)};
  a=setInstanceModelCount(a,'Necron Warriors#2',20);
  a=setInstanceEquipment(a,'Necron Warriors#2','Gauss reaper');
  expect(validateSelection(a)).toBe(true);
  const reminders=generateReminders(a);
  expect(reminders.find(r=>r.id==='equipment-Necron Warriors#1-Gauss flayer')?.summary).toContain('24″');
  expect(reminders.find(r=>r.id==='equipment-Necron Warriors#2-Gauss reaper')?.summary).toContain('12″');
 });
 it('rejects illegal squad sizes and permits legal mixed-weapon configurations',()=>{
  let a=addSelectionUnit(newSelection(),'Necron Warriors');
  a={...a,instances:expandRoster(a)};
  expect(()=>setInstanceModelCount(a,'Necron Warriors#1',21)).toThrow();
  a=setInstanceWeaponCounts(a,'Necron Warriors#1',{'Gauss flayer':5,'Gauss reaper':5});
  expect(validateSelection(a)).toBe(true);
  const reminders=generateReminders(a);
  expect(reminders.find(r=>r.id==='equipment-Necron Warriors#1-Gauss flayer')?.title).toContain('5 ×');
  expect(reminders.find(r=>r.id==='equipment-Necron Warriors#1-Gauss reaper')?.summary).toContain('S4');
 });
});
