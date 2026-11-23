import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
describe('imported Necron phase timing',()=>{
 it('shows equipped ranged weapon abilities for Shooting and both Overwatch reaction windows',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Immortals');
  const cues=generate11thReminders(army).filter(r=>r.title.includes('Ranged weapon abilities'));
  expect(cues.map(r=>r.window)).toEqual(expect.arrayContaining(['Shooting','Movement','Charge']));
 });
 it('keeps Psychomancer Harbinger of Despair in its Shooting window',()=>{
  const army=addSelectionUnit(newSelection('Necrons'),'Psychomancer');
  const cues=generate11thReminders(army).filter(r=>r.title.includes('Harbinger of Despair'));
  expect(cues.map(r=>r.window)).toEqual(['Shooting']);
 });
});
