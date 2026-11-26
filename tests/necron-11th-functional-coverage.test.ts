import {describe,it,expect} from 'vitest';
import {CATALOG,newSelection,addSelectionUnit} from '../src/catalog';
import {DATASHEETS_2026} from '../src/datasheets-2026';
import {eligibleBodyguards} from '../src/attachments';
import {generate11thReminders} from '../src/reminders-11th';
describe('11e Necron functional coverage',()=>{
 it('exposes all registered datasheets in army selection',()=>{
  for(const d of DATASHEETS_2026.filter(d=>d.faction==='Necrons'))expect(CATALOG.Necrons.units).toContain(d.unit);
 });
 it('exposes updated support and noble attachment choices',()=>{
  let army=addSelectionUnit(newSelection('Necrons'),'Geomancer');
  army=addSelectionUnit(army,'Canoptek Macrocytes');
  expect(eligibleBodyguards(army,'Geomancer')).toContain('Canoptek Macrocytes');
  army=addSelectionUnit(army,'Overlord with translocation shroud');
  army=addSelectionUnit(army,'Lychguard');
  expect(eligibleBodyguards(army,'Overlord with translocation shroud')).toContain('Lychguard');
 });
 it('emits datasheet reminders only when the associated unit is present',()=>{
  const empty=generate11thReminders(newSelection('Necrons'));
  expect(empty.some(x=>x.id==='11e-necron-plasmancer-lightning')).toBe(false);
  const withPlasmancer=generate11thReminders(addSelectionUnit(newSelection('Necrons'),'Plasmancer'));
  expect(withPlasmancer.some(x=>x.id==='11e-necron-plasmancer-lightning'&&x.window==='Shooting')).toBe(true);
 });
});
