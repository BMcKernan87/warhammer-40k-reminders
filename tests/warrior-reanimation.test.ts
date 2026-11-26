import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {expandRoster} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('Necron Warriors Their Number is Legion',()=>{
 it('shows one per-squad reminder with reanimation re-roll timing',()=>{
  let army=addSelectionUnit(newSelection(),'Necron Warriors',2);
  army={...army,instances:expandRoster(army)};
  const rules=generateReminders(army).filter(r=>r.id.startsWith('necron-warriors-their-number-is-legion'));
  expect(rules).toHaveLength(2);
  expect(rules.map(r=>r.units?.[0])).toEqual(['Necron Warriors#1','Necron Warriors#2']);
  for(const rule of rules){
   expect(rule.window).toBe('Command');
   expect(rule.summary).toContain('re-roll');
   expect(rule.summary).toContain('outside your Command phase');
  }
 });
 it('does not add Warrior rules to armies without Warriors',()=>{
  const army=addSelectionUnit(newSelection(),'Immortals');
  expect(generateReminders(army).some(r=>r.id.startsWith('necron-warriors-their-number-is-legion'))).toBe(false);
 });
 it('supports aggregate roster mode',()=>{
  const army=addSelectionUnit(newSelection(),'Necron Warriors');
  expect(generateReminders(army).filter(r=>r.id==='necron-warriors-their-number-is-legion')).toHaveLength(1);
 });
});
