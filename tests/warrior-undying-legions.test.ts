import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {expandRoster} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('Warrior reanimation and Undying Legions interaction',()=>{
 it('creates one reactive reminder for each Warrior squad in Awakened Dynasty',()=>{
  let army=addSelectionUnit(newSelection(),'Necron Warriors',2);
  army={...army,instances:expandRoster(army)};
  const reminders=generateReminders(army).filter(r=>r.id.startsWith('warriors-undying-legions-'));
  expect(reminders).toHaveLength(2);
  expect(reminders.map(r=>r.units?.[0])).toEqual(['Necron Warriors#1','Necron Warriors#2']);
  expect(reminders.every(r=>r.summary.includes('targeting requirements')&&r.summary.includes('re-rolling'))).toBe(true);
 });
 it('does not offer a detachment-specific interaction in other detachments',()=>{
  const army={...addSelectionUnit(newSelection(),'Necron Warriors'),detachment:'Canoptek Court'};
  expect(generateReminders(army).some(r=>r.id.startsWith('warriors-undying-legions-'))).toBe(false);
 });
 it('does not show Warrior interaction without Warriors',()=>{
  const army=addSelectionUnit(newSelection(),'Immortals');
  expect(generateReminders(army).some(r=>r.id.startsWith('warriors-undying-legions-'))).toBe(false);
 });
});
