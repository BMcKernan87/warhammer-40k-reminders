import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {generateReminders} from '../src/generated-reminders';
import {generate11thReminders} from '../src/reminders-11th';
describe('priority faction data-driven unit reminders',()=>{
 it.each([
  ['Orks','Gretchin','gretchin-thievin'],
  ['Tyranids','Termagants','termagants-skulking'],
  ['Space Marines','Eradicator Squad with Melta Rifles','Total Obliteration']
 ] as const)('%s: creates distinct unit reminders for multiple copies of %s',(faction,unit,id)=>{
  const army=addSelectionUnit(newSelection(faction),unit,2);
  const reminders=faction==='Space Marines'?generate11thReminders(army).filter(r=>r.title===id&&r.window==='Shooting'&&r.turn==='own'):generateReminders(army).filter(r=>r.id.startsWith(id+'-'));
  expect(reminders).toHaveLength(2);
  expect(new Set(reminders.map(r=>r.id)).size).toBe(2);
  expect(reminders.map(r=>r.units?.[0])).toEqual([unit+'#1',unit+'#2']);
  expect(reminders.every(r=>r.source.startsWith('https://'))).toBe(true);
 });
 it('does not leak reminders from unselected units or other factions',()=>{
  const army=addSelectionUnit(newSelection('Orks'),'Boyz');
  const reminders=generateReminders(army);
  expect(reminders.some(r=>r.id.startsWith('gretchin-thievin'))).toBe(false);
  expect(reminders.some(r=>r.id.startsWith('tervigon-spawn'))).toBe(false);
 });
});
