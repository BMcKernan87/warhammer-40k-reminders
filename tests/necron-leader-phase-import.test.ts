import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';
const withLeader=(leader:string,body:string)=>{
 const base=individualArmy(addSelectionUnit(addSelectionUnit(newSelection('Necrons'),leader),body));
 const l=base.instances!.find(s=>s.unit===leader)!;
 const b=base.instances!.find(s=>s.unit===body)!;
 return {base,attached:setInstanceAttachment(base,l.id,b.id)};
};
describe('imported Necron Leader rules follow attachments and phases',()=>{
 it('Plasmancer Harbinger only applies while attached and in Shooting',()=>{
  const {base,attached}=withLeader('Plasmancer','Immortals');
  expect(generate11thReminders(base).some(r=>r.title.includes('Harbinger of Destruction'))).toBe(false);
  expect(generate11thReminders(attached).filter(r=>r.title.includes('Harbinger of Destruction')).map(r=>r.window)).toEqual(['Shooting']);
 });
 it('Technomancer Rites follows attached Wraiths into both attack phases',()=>{
  const {attached}=withLeader('Technomancer','Canoptek Wraiths');
  expect(generate11thReminders(attached).filter(r=>r.title.includes('Rites of Reanimation')).map(r=>r.window)).toEqual(['Shooting','Fight']);
 });
 it('Chronomancer Chronometron requires an attached unit',()=>{
  const {base,attached}=withLeader('Chronomancer','Immortals');
  expect(generate11thReminders(base).some(r=>r.title.includes('Chronometron'))).toBe(false);
  expect(generate11thReminders(attached).some(r=>r.title.includes('Chronometron'))).toBe(true);
 });
});
