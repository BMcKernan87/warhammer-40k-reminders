import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit,validateSelection} from '../src/catalog';
import {expandRoster,setInstanceModelCount,setInstanceWeaponCounts} from '../src/roster-instances';
import {supportsMixedPrimaryWeapons} from '../src/mixed-weapons';
describe('multi-choice mixed weapon squad support',()=>{
 it('supports three distinct Termagant primary weapons in one 20-model squad',()=>{
  let army=addSelectionUnit(newSelection('Tyranids'),'Termagants');
  army={...army,instances:expandRoster(army)};
  army=setInstanceModelCount(army,'Termagants#1',20);
  army=setInstanceWeaponCounts(army,'Termagants#1',{Fleshborer:8,Devourer:7,Spinefists:5});
  expect(validateSelection(army)).toBe(true);
  expect(army.instances?.[0].weaponCounts).toEqual({Fleshborer:8,Devourer:7,Spinefists:5});
  expect(()=>setInstanceWeaponCounts(army,'Termagants#1',{Fleshborer:8,Devourer:7,Spinefists:6})).toThrow();
  expect(()=>setInstanceWeaponCounts(army,'Termagants#1',{Fleshborer:20,'Invalid weapon':0})).toThrow();
 });
 it('keeps unsupported mixed configurations disabled',()=>{
  expect(supportsMixedPrimaryWeapons('Tyranids','Termagants')).toBe(true);
  expect(supportsMixedPrimaryWeapons('Space Marines','Eradicator Squad')).toBe(false);
 });
});
