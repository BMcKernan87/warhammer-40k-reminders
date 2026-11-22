import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit,validateSelection} from '../src/catalog';
import {expandRoster,setInstanceEnhancement,setInstanceEquipment} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('per-instance configuration',()=>{
 const base=()=>{
  let a=addSelectionUnit(newSelection(),'Immortals',2);
  a=addSelectionUnit(a,'Technomancer',2);
  return {...a,instances:expandRoster(a)};
 };
 it('keeps separate Immortal weapon choices',()=>{
  let a=setInstanceEquipment(base(),'Immortals#1','Gauss blaster');
  a=setInstanceEquipment(a,'Immortals#2','Tesla carbine');
  expect(a.instances?.filter(x=>x.unit==='Immortals').map(x=>x.equipment)).toEqual(['Gauss blaster','Tesla carbine']);
  expect(validateSelection(a)).toBe(true);
 });
 it('assigns different enhancements to separate Technomancers',()=>{
  let a=setInstanceEnhancement(base(),'Technomancer#1','Veil of Darkness');
  a=setInstanceEnhancement(a,'Technomancer#2','Enaegic Dermal Bond');
  expect(generateReminders(a).filter(r=>r.id.startsWith('enhancement-')).length).toBe(2);
  expect(validateSelection(a)).toBe(true);
  expect(()=>setInstanceEnhancement(a,'Technomancer#2','Veil of Darkness')).toThrow();
 });
 it('rejects invalid wargear',()=>{
  expect(()=>setInstanceEquipment(base(),'Immortals#1','Imaginary weapon')).toThrow();
 });
});
