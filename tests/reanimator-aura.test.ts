import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {expandRoster} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('Canoptek Reanimator Nanoscarab Reanimation Beam',()=>{
 it('appears once per Reanimator and describes its 3-inch activation aura',()=>{
  let army=addSelectionUnit(newSelection(),'Canoptek Reanimator',2);
  army={...army,instances:expandRoster(army)};
  const reminders=generateReminders(army).filter(r=>r.id.startsWith('canoptek-reanimator-nanoscarab-beam'));
  expect(reminders).toHaveLength(2);
  expect(reminders.map(r=>r.units?.[0])).toEqual(['Canoptek Reanimator#1','Canoptek Reanimator#2']);
  expect(reminders.every(r=>r.summary.includes('3 inches')&&r.summary.includes('additional D3'))).toBe(true);
 });
 it('does not offer Reanimator aura when the army has none',()=>{
  const army=addSelectionUnit(newSelection(),'Necron Warriors');
  expect(generateReminders(army).some(r=>r.id.startsWith('canoptek-reanimator-nanoscarab-beam'))).toBe(false);
 });
});
