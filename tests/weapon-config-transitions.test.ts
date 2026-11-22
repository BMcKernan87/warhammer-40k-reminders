import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection} from '../src/catalog';
import {expandRoster,setInstanceModelCount,setInstanceWeaponCounts,setInstanceEquipment} from '../src/roster-instances';
describe('weapon configuration transitions',()=>{
 it('resizes a mixed unit without retaining invalid weapon totals',()=>{
  let a=addSelectionUnit(newSelection(),'Lokhust Heavy Destroyers');
  a={...a,instances:expandRoster(a)};
  a=setInstanceModelCount(a,'Lokhust Heavy Destroyers#1',3);
  a=setInstanceWeaponCounts(a,'Lokhust Heavy Destroyers#1',{'Gauss destructor':2,'Enmitic exterminator':1});
  a=setInstanceModelCount(a,'Lokhust Heavy Destroyers#1',2);
  expect(a.instances?.[0].weaponCounts).toEqual({'Gauss destructor':2});
  expect(validateSelection(a)).toBe(true);
 });
 it('switches mixed weapons back to uniform without contradictory fields',()=>{
  let a=addSelectionUnit(newSelection(),'Immortals');
  a={...a,instances:expandRoster(a)};
  a=setInstanceWeaponCounts(a,'Immortals#1',{'Gauss blaster':3,'Tesla carbine':2});
  a=setInstanceEquipment(a,'Immortals#1','Tesla carbine');
  expect(a.instances?.[0].weaponCounts).toBeUndefined();
  expect(a.instances?.[0].equipment).toBe('Tesla carbine');
  expect(validateSelection(a)).toBe(true);
 });
 it('rejects stored configurations specifying both modes',()=>{
  let a=addSelectionUnit(newSelection(),'Immortals');
  a={...a,instances:expandRoster(a)};
  a.instances![0].equipment='Gauss blaster';
  a.instances![0].weaponCounts={'Tesla carbine':5};
  expect(validateSelection(a)).toBe(false);
 });
});
