import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
describe('imported Necron phase timing',()=>{
 it('shows equipped ranged weapon abilities for Shooting and the end-of-Movement Overwatch window',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Necron Warriors');
  const cues=generate11thReminders(army).filter(r=>r.title.includes('Ranged weapon abilities'));
  expect(cues.map(r=>r.window)).toEqual(['Shooting','Movement']);
 });
 it('offers Psychomancer Harbinger of Despair at the start of each own phase under one turn limit',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Psychomancer');
  const cues=generate11thReminders(army).filter(r=>r.title.includes('Harbinger of Despair'));
  expect(cues.map(r=>r.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
  expect(cues.every(r=>r.timing==='start'&&r.summary.includes('Your turn. Once per turn.'))).toBe(true);
 });
});
