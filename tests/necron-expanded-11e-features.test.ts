import {describe,it,expect} from 'vitest';
import {CATALOG,newSelection,addSelectionUnit} from '../src/catalog';
import {equipmentOption,setEquipment} from '../src/equipment';
import {eligibleBodyguards,attachLeader} from '../src/attachments';
import {generate11thReminders} from '../src/reminders-11th';
import {DATASHEETS_2026} from '../src/datasheets-2026';
describe('expanded Necron 11e playable integration',()=>{
 it('makes every priced Necron datasheet selectable in the army builder',()=>{
  const names=CATALOG.Necrons.units;
  for(const d of DATASHEETS_2026.filter(d=>d.faction==='Necrons'))expect(names).toContain(d.unit);
 });
 it('offers 11e weapon choices and rejects invalid wargear',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Tomb Blades');
  expect(equipmentOption(army,'Tomb Blades')?.choices).toContain('Particle beamer');
  expect(setEquipment(army,'Tomb Blades','Particle beamer').equipment?.['Tomb Blades']).toBe('Particle beamer');
  expect(()=>setEquipment(army,'Tomb Blades','Warscythe')).toThrow();
 });
 it('supports additional Necron Leader choices and conditional unit reminders',()=>{
  let army=addSelectionUnit(addSelectionUnit(newSelection('Necrons'),'Psychomancer'),'Immortals');
  expect(eligibleBodyguards(army,'Psychomancer')).toContain('Immortals');
  army=attachLeader(army,'Psychomancer','Immortals');
  expect(army.attachments?.Psychomancer).toBe('Immortals');
  expect(generate11thReminders(army).some(r=>r.id==='11e-necron-immortals-eradication')).toBe(true);
  expect(generate11thReminders(army).some(r=>r.id==='11e-necron-plasmancer-lightning')).toBe(false);
 });
});
