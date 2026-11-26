import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {selectUpgrade2026} from '../src/upgrades-2026';
const army=(unit:string)=>({...addSelectionUnit(newSelection('Necrons'),unit),detachments2026:['Cryptek Conclave']});
describe('Cryptek Conclave reminders',()=>{
 it('limits Cryptek stratagems to eligible armies',()=>{
  expect(generate11thReminders(army('Immortals')).some(r=>r.id.endsWith('untapped'))).toBe(false);
  expect(generate11thReminders(army('Plasmancer')).some(r=>r.id.endsWith('untapped'))).toBe(true);
 });
 it.each([['Immortals','4+'],['Necron Warriors','5+']])('shows formation-specific saves for %s',(unit,save)=>{
  const a={...army(unit),instances:[{id:'body',unit},{id:'leader',unit:'Plasmancer',attachedTo:'body'}]};
  const cues=generate11thReminders(a).filter(r=>r.title.includes('Microscarab Swarm'));
  expect(cues.map(r=>r.window)).toEqual(['Shooting','Fight']);
  expect(cues.every(r=>r.summary.includes(save))).toBe(true);
  expect(generate11thReminders({...a,instances:[a.instances[0]]}).some(r=>r.title.includes('Microscarab Swarm'))).toBe(false);
 });
 it('only shows Atomic Disintegrators when selected',()=>{
  expect(generate11thReminders(selectUpgrade2026(army('Plasmancer'),'Plasmancer','Atomic Disintegrators')).some(r=>r.id.endsWith('conclave-atomic'))).toBe(true);
  expect(()=>selectUpgrade2026(army('Overlord'),'Overlord','Atomic Disintegrators')).toThrow();
 });
});
