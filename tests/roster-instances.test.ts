import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,removeSelectionUnit} from '../src/catalog';
import {expandRoster,setInstanceAttachment} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('individual Necron squads',()=>{
 const base=()=>{
  let a=addSelectionUnit(newSelection(),'Immortals',2);
  a=addSelectionUnit(a,'Technomancer',2);
  return {...a,instances:expandRoster(a)};
 };
 it('migrates aggregate counts to stable independent IDs',()=>{
  const a=base();expect(a.instances.map(x=>x.id)).toEqual(['Immortals#1','Immortals#2','Technomancer#1','Technomancer#2']);
  expect(validateSelection(a)).toBe(true);
 });
 it('assigns different copies of a Leader to different squads',()=>{
  let a=setInstanceAttachment(base(),'Technomancer#1','Immortals#1');
  a=setInstanceAttachment(a,'Technomancer#2','Immortals#2');
  expect(generateReminders(a).filter(r=>r.id.startsWith('attached-technomancer-fnp')).map(r=>r.units)).toEqual([
   ['Technomancer#1','Immortals#1'],['Technomancer#2','Immortals#2']
  ]);
 });
 it('rejects incompatible attachment and cleans removed bodyguards',()=>{
  const a=setInstanceAttachment(base(),'Technomancer#1','Immortals#1');
  expect(()=>setInstanceAttachment(a,'Technomancer#2','Technomancer#1')).toThrow();
  const b=removeSelectionUnit(a,'Immortals');
  expect(b.instances?.some(x=>x.attachedTo)).toBe(false);
  expect(validateSelection(b)).toBe(true);
 });
});
