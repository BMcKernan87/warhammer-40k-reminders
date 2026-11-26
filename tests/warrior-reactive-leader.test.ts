import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {expandRoster,setInstanceAttachment} from '../src/roster-instances';
import {generateReminders} from '../src/generated-reminders';
describe('reactive Warrior reanimation Leader context',()=>{
 it('only grants D3+1 to the squad actually led by a Character',()=>{
  let army=addSelectionUnit(newSelection(),'Necron Warriors',2);
  army=addSelectionUnit(army,'Overlord');
  army={...army,instances:expandRoster(army)};
  army=setInstanceAttachment(army,'Overlord#1','Necron Warriors#2');
  const reminders=generateReminders(army).filter(r=>r.id.startsWith('warriors-undying-legions-')&&r.window==='Shooting');
  expect(reminders).toHaveLength(2);
  expect(reminders.find(r=>r.units?.[0]==='Necron Warriors#1')?.summary).toContain('D3 wounds');
  expect(reminders.find(r=>r.units?.[0]==='Necron Warriors#2')?.summary).toContain('D3+1 wounds because');
 });
});
