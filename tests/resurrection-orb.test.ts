import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection} from '../src/catalog';
import {expandRoster,setInstanceResurrectionOrb,setInstanceAttachment} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('optional Overlord Resurrection Orbs',()=>{
 it('generates reminders only for equipped Overlords and retains attachment context',()=>{
  let army=addSelectionUnit(newSelection(),'Overlord',2);
  army=addSelectionUnit(army,'Necron Warriors');
  army={...army,instances:expandRoster(army)};
  army=setInstanceResurrectionOrb(army,'Overlord#2',true);
  army=setInstanceAttachment(army,'Overlord#2','Necron Warriors#1');
  expect(validateSelection(army)).toBe(true);
  const reminders=generateReminders(army).filter(r=>r.id.startsWith('overlord-resurrection-orb-'));
  expect(reminders).toHaveLength(1);
  expect(reminders[0].units).toEqual(['Overlord#2','Necron Warriors#1']);
  expect(reminders[0].summary).toContain('Once per battle');
  army=setInstanceResurrectionOrb(army,'Overlord#2',false);
  expect(generateReminders(army).some(r=>r.id.startsWith('overlord-resurrection-orb-'))).toBe(false);
 });
 it('rejects orb selection for non-Overlord models',()=>{
  let army=addSelectionUnit(newSelection(),'Necron Warriors');
  army={...army,instances:expandRoster(army)};
  expect(()=>setInstanceResurrectionOrb(army,'Necron Warriors#1',true)).toThrow();
  expect(validateSelection({...army,instances:[{...army.instances![0],resurrectionOrb:true}]})).toBe(false);
 });
});
