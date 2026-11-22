import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection} from '../src/catalog';
import {expandRoster,setInstanceModelCount,setInstanceWeaponCounts} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('mixed primary weapons',()=>{
 it('supports two gauss and one enmitic in a three-model Lokhust squad',()=>{
  let a=addSelectionUnit(newSelection(),'Lokhust Heavy Destroyers');
  a={...a,instances:expandRoster(a)};
  a=setInstanceModelCount(a,'Lokhust Heavy Destroyers#1',3);
  a=setInstanceWeaponCounts(a,'Lokhust Heavy Destroyers#1',{'Gauss destructor':2,'Enmitic exterminator':1});
  expect(validateSelection(a)).toBe(true);
  const reminders=generateReminders(a).filter(r=>r.id.startsWith('equipment-Lokhust Heavy Destroyers#1-'));
  expect(reminders).toHaveLength(2);
  expect(reminders[0].title).toContain('2 × Gauss destructor');
  expect(reminders[1].title).toContain('1 × Enmitic exterminator');
 });
 it('rejects mismatched totals and invalid weapon counts',()=>{
  let a=addSelectionUnit(newSelection(),'Lokhust Heavy Destroyers');
  a={...a,instances:expandRoster(a)};
  a=setInstanceModelCount(a,'Lokhust Heavy Destroyers#1',3);
  expect(()=>setInstanceWeaponCounts(a,'Lokhust Heavy Destroyers#1',{'Gauss destructor':2})).toThrow();
  expect(()=>setInstanceWeaponCounts(a,'Lokhust Heavy Destroyers#1',{'Gauss destructor':4,'Enmitic exterminator':-1})).toThrow();
  expect(()=>setInstanceModelCount(a,'Lokhust Heavy Destroyers#1',4)).toThrow();
 });
});
