import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';

describe('Necron imported defensive ability windows',()=>{
 it('puts Ctan Necrodermis only in attack resolution phases',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'C’tan Shard of the Void Dragon');
  const reminders=generate11thReminders(army).filter(r=>r.title.includes('Necrodermis'));
  expect(reminders.map(r=>r.window)).toEqual(['Shooting','Fight','Movement']);
  expect(reminders.find(r=>r.window==='Movement')?.summary).toContain('Fire Overwatch');
 });
 it('applies attached Technomancer Feel No Pain whenever wounds would be lost',()=>{
  const army=individualArmy(addSelectionUnit(addSelectionUnit(newSelection('Necrons'),'Technomancer'),'Canoptek Wraiths'));
  const leader=army.instances!.find(x=>x.unit==='Technomancer')!;
  const body=army.instances!.find(x=>x.unit==='Canoptek Wraiths')!;
  const attached=setInstanceAttachment(army,leader.id,body.id);
  const reminders=generate11thReminders(attached).filter(r=>r.title.includes('Rites of Reanimation'));
  expect(reminders.map(r=>r.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
 });
});
