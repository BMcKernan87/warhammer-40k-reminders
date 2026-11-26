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
 it('Technomancer Rites follows attached Wraiths into every phase where wounds may be lost',()=>{
  const {attached}=withLeader('Technomancer','Canoptek Wraiths');
  expect(generate11thReminders(attached).filter(r=>r.title.includes('Rites of Reanimation')).map(r=>r.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
 });
 it('Chronomancer abilities apply to its own unit or actual attached formation',()=>{
  const {base,attached}=withLeader('Chronomancer','Immortals');
  expect(generate11thReminders(base).find(r=>r.title.includes('Chronometron'))?.units).toEqual(['Chronomancer#1']);
  expect(generate11thReminders(attached).find(r=>r.title.includes('Chronometron'))?.units).toEqual(['Chronomancer#1','Immortals#1']);
  const defence=generate11thReminders(attached).filter(r=>r.title.includes('Timesplinter Mantle'));
  // Stealth also applies to permitted ranged reactions in Movement (core 24.33).
  expect(defence.map(r=>r.window)).toEqual(['Shooting','Fight','Movement']);
  expect(defence.every(r=>r.units?.join(',')==='Chronomancer#1,Immortals#1')).toBe(true);
  expect(generate11thReminders(base).filter(r=>r.title.includes('Timesplinter Mantle')).every(r=>r.units?.join(',')==='Chronomancer#1')).toBe(true);
 });
});
