import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,removeSelectionUnit} from '../src/catalog';
import {expandRoster,removeRosterInstance} from '../src/roster-instances';
import {generate11thReminders as generateReminders} from '../src/reminders-11th';
describe('individual squad mode across factions',()=>{
 it.each(['Orks','Tyranids','Space Marines'] as const)('supports squad mode for %s',(faction)=>{
  const unit=faction==='Orks'?'Gretchin':faction==='Tyranids'?'Termagants':'Eradicator Squad with Melta Rifles';
  let army=addSelectionUnit(newSelection(faction),unit,3);
  army={...army,instances:expandRoster(army)};
  expect(validateSelection(army)).toBe(true);
  expect(army.instances?.map(x=>x.id)).toEqual([unit+'#1',unit+'#2',unit+'#3']);
  expect(generateReminders(army).filter(x=>x.units?.some(id=>id===unit+'#3')).length).toBeGreaterThan(0);
  army=removeRosterInstance(army,unit+'#2');
  expect(validateSelection(army)).toBe(true);
  expect(army.units[unit]).toBe(2);
  expect(generateReminders(army).some(x=>x.units?.includes(unit+'#2'))).toBe(false);
  army=removeSelectionUnit(army,unit);
  expect(validateSelection(army)).toBe(true);
  expect(army.instances).toEqual([]);
 });
});
