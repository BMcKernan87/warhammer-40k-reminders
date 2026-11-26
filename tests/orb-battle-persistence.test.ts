import {describe,it,expect} from 'vitest';
import {createBattle} from '../src/engine';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {initialStore,createProfile,updateProfile,validateStore} from '../src/profiles';
import {resurrectionOrbUsageKey,resurrectionOrbUsed,setResurrectionOrbUsed,isExpendedOrbReminder} from '../src/once-per-battle';
describe('once-per-battle Resurrection Orb usage persistence',()=>{
 it('persists across phases and rounds without allowing another Overlord to inherit usage',()=>{
  const used=setResurrectionOrbUsed([], 'Overlord#1',true);
  expect(resurrectionOrbUsed(used,'Overlord#1')).toBe(true);
  expect(resurrectionOrbUsed(used,'Overlord#2')).toBe(false);
  expect(isExpendedOrbReminder('overlord-resurrection-orb-Overlord#1-Fight',used,['Overlord#1','Overlord#2'])).toBe(true);
  expect(isExpendedOrbReminder('overlord-resurrection-orb-Overlord#2-Fight',used,['Overlord#1','Overlord#2'])).toBe(false);
  expect(setResurrectionOrbUsed(used,'Overlord#1',true)).toEqual(used);
  expect(setResurrectionOrbUsed(used,'Overlord#1',false)).toEqual([]);
 });
 it('survives JSON save and restore, but a new army profile starts unused',()=>{
  const army=addSelectionUnit(newSelection(),'Overlord');
  let store=initialStore(army,createBattle(),[resurrectionOrbUsageKey('Overlord#1')]);
  store=createProfile(store,'second','Second army');
  const restored=JSON.parse(JSON.stringify(store));
  expect(validateStore(restored)).toBe(true);
  expect(resurrectionOrbUsed(restored.profiles[0].completed,'Overlord#1')).toBe(true);
  expect(resurrectionOrbUsed(restored.profiles[1].completed,'Overlord#1')).toBe(false);
  store=updateProfile(store,'default',{completed:[]});
  expect(resurrectionOrbUsed(store.profiles[0].completed,'Overlord#1')).toBe(false);
 });
});
