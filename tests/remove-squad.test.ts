import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection} from '../src/catalog';
import {expandRoster,removeRosterInstance,setInstanceAttachment,setInstanceEnhancement} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('single-squad removal',()=>{
 it('removes only the chosen duplicate and its reminder',()=>{
  let a=addSelectionUnit(newSelection(),'Immortals',3);
  a={...a,instances:expandRoster(a)};
  a=removeRosterInstance(a,'Immortals#2');
  expect(a.units.Immortals).toBe(2);
  expect(a.instances?.map(x=>x.id)).toEqual(['Immortals#1','Immortals#3']);
  expect(generateReminders(a).filter(r=>r.id.startsWith('immortals-eradication-')).map(r=>r.units?.[0])).toEqual(['Immortals#1','Immortals#3']);
  expect(validateSelection(a)).toBe(true);
 });
 it('detaches a Leader when its Bodyguard is removed',()=>{
  let a=addSelectionUnit(newSelection(),'Immortals');
  a=addSelectionUnit(a,'Technomancer');
  a={...a,instances:expandRoster(a)};
  a=setInstanceAttachment(a,'Technomancer#1','Immortals#1');
  a=removeRosterInstance(a,'Immortals#1');
  expect(a.instances?.[0].attachedTo).toBeUndefined();
  expect(a.units.Immortals).toBeUndefined();
  expect(validateSelection(a)).toBe(true);
 });
 it('preserves enhancements on surviving Character instances',()=>{
  let a=addSelectionUnit(newSelection(),'Technomancer',2);
  a={...a,instances:expandRoster(a)};
  a=setInstanceEnhancement(a,'Technomancer#2','Veil of Darkness');
  a=removeRosterInstance(a,'Technomancer#1');
  expect(a.instances?.[0].enhancement).toBe('Veil of Darkness');
  expect(validateSelection(a)).toBe(true);
 });
});
