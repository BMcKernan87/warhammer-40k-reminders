import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {expandRoster} from '../src/roster-instances';
import {rosterCost2026} from '../src/datasheets-2026';
import {generate11thReminders} from '../src/reminders-11th';
describe('automatic 11e Necron roster setup',()=>{
 it('sets unit size and default weapon without asking for extra inputs',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Immortals');
  const [squad]=expandRoster(army);
  expect(squad.models).toBe(5);
  expect(squad.equipment).toBe('Gauss blaster');
  expect(rosterCost2026(army).total).toBe(65);
  expect(generate11thReminders(army).some(r=>r.id==='11e-necron-immortals-eradication')).toBe(true);
 });
 it('creates separate legal defaults for each new Wraith squad',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Canoptek Wraiths',2);
  expect(expandRoster(army).map(x=>x.models)).toEqual([3,3]);
  expect(rosterCost2026(army).unknownUnits).toEqual([]);
 });
});
