import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {expandRoster,setInstanceAttachment} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('instance-specific reminder generation',()=>{
 it('creates independent Immortal and Wraith abilities',()=>{
  let a=addSelectionUnit(newSelection(),'Immortals',2);
  a=addSelectionUnit(a,'Canoptek Wraiths',2);
  a={...a,instances:expandRoster(a)};
  const reminders=generateReminders(a);
  expect(reminders.filter(r=>r.id.startsWith('immortals-eradication-')).map(r=>r.units?.[0])).toEqual(['Immortals#1','Immortals#2']);
  expect(reminders.filter(r=>r.id.startsWith('wraith-form-')).map(r=>r.units?.[0])).toEqual(['Canoptek Wraiths#1','Canoptek Wraiths#2']);
 });
 it('creates one Chronomancer attachment reminder per attached squad',()=>{
  let a=addSelectionUnit(newSelection(),'Chronomancer',2);
  a=addSelectionUnit(a,'Immortals',2);
  a={...a,instances:expandRoster(a)};
  a=setInstanceAttachment(a,'Chronomancer#1','Immortals#1');
  a=setInstanceAttachment(a,'Chronomancer#2','Immortals#2');
  const reminders=generateReminders(a).filter(r=>r.id.includes('chronomancer-mantle'));
  expect(reminders.map(r=>r.units)).toEqual([['Chronomancer#1','Immortals#1'],['Chronomancer#2','Immortals#2']]);
 });
 it('preserves legacy aggregate reminder identifiers',()=>{
  const a=addSelectionUnit(newSelection(),'Immortals',2);
  expect(generateReminders(a).filter(r=>r.id==='immortals-eradication')).toHaveLength(1);
 });
});
