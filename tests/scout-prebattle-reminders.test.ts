import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import {generate11thReminders,grouped11thReminders} from '../src/reminders-11th';
import {REMINDER_WINDOWS} from '../src/generated-reminders';
describe('11e Scout reminder timing',()=>{
 it('places Scouts before the Command phase rather than in Movement',()=>{
  const army=newSelection();
  const reminder=generate11thReminders(army).find(r=>r.id==='11e-core-scouts');
  expect(reminder?.window).toBe('Pre-battle');
  expect(REMINDER_WINDOWS[0]).toBe('Pre-battle');
  expect(grouped11thReminders(army)[0].reminders.some(r=>r.id==='11e-core-scouts')).toBe(true);
 });
});
