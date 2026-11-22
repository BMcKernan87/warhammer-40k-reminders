import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection,removeSelectionUnit,validateSelection} from '../src/catalog';
import {attachLeader,eligibleBodyguards} from '../src/attachments';
import {generateReminders} from '../src/generated-reminders';
describe('Necron attached-unit interactions',()=>{
 const base=()=>addSelectionUnit(addSelectionUnit(addSelectionUnit(newSelection(),'Technomancer'),'Canoptek Wraiths'),'Immortals');
 it('offers only compatible selected bodyguards',()=>expect(eligibleBodyguards(base(),'Technomancer')).toEqual(['Canoptek Wraiths','Immortals']));
 it('adds a Feel No Pain reminder only when attached',()=>{
  const army=base();expect(generateReminders(army).some(r=>r.id.includes('technomancer-fnp'))).toBe(false);
  const attached=attachLeader(army,'Technomancer','Canoptek Wraiths');
  expect(generateReminders(attached).some(r=>r.id.includes('technomancer-fnp')&&r.units?.includes('Canoptek Wraiths'))).toBe(true);
  expect(validateSelection(attached)).toBe(true);
 });
 it('rejects illegal bodyguards and removes dangling links',()=>{
  expect(()=>attachLeader(base(),'Technomancer','Lychguard')).toThrow();
  const linked=attachLeader(base(),'Technomancer','Immortals');
  expect(removeSelectionUnit(linked,'Immortals').attachments).toEqual({});
 });
 it('generates Plasmancer critical-hit synergy for Immortals',()=>{
  const army=addSelectionUnit(addSelectionUnit(newSelection(),'Plasmancer'),'Immortals');
  expect(generateReminders(attachLeader(army,'Plasmancer','Immortals')).some(r=>r.id.includes('plasmancer-critical'))).toBe(true);
 });
});
