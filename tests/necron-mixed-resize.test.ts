import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {expandRoster,setInstanceModelCount,setInstanceWeaponCounts,validateRosterInstances} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';

describe('Necron mixed primary loadouts on model-count edits',()=>{
 const id='Lokhust Heavy Destroyers#1';
 const mixed=()=>setInstanceWeaponCounts(
  setInstanceModelCount(addSelectionUnit(newSelection('Necrons'),'Lokhust Heavy Destroyers'),id,2),
  id,{'Gauss destructor':1,'Enmitic exterminator':1});
 it('preserves selected weapons when the same model count is selected',()=>{
  const a=setInstanceModelCount(mixed(),id,2);
  expect(expandRoster(a)[0].weaponCounts).toEqual({'Gauss destructor':1,'Enmitic exterminator':1});
  expect(validateRosterInstances(a)).toBe(true);
 });
 it('preserves both weapon types when growing and keeps the exact model total',()=>{
  const a=setInstanceModelCount(mixed(),id,3);
  expect(expandRoster(a)[0].weaponCounts).toEqual({'Gauss destructor':2,'Enmitic exterminator':1});
  expect(validateRosterInstances(a)).toBe(true);
  const cue=generate11thReminders(a).find(r=>r.title.includes('Optimised for Slaughter'));
  expect(cue?.summary).toContain('Gauss destructor');
  expect(cue?.summary).toContain('Enmitic exterminator');
 });
 it('trims to a legal total when shrinking and removes irrelevant weapon reminders',()=>{
  const a=setInstanceModelCount(mixed(),id,1);
  expect(expandRoster(a)[0].weaponCounts).toEqual({'Gauss destructor':1});
  expect(validateRosterInstances(a)).toBe(true);
  const cue=generate11thReminders(a).find(r=>r.title.includes('Optimised for Slaughter'));
  expect(cue?.summary).toContain('Gauss destructor');
  expect(cue?.summary).not.toContain('Enmitic exterminator');
 });
});
