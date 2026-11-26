import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
const cues=(unit:string,detachment:string,prefix:string)=>generate11thReminders({...addSelectionUnit(newSelection('Necrons'),unit),detachments2026:[detachment]}).filter(r=>r.id.startsWith(prefix));
describe('Necron combat detachment phase coverage',()=>{
 it.each([
  ['Canoptek Doomstalker','Canoptek Court','11e-necron-canoptek-power-matrix',['Fight','Shooting']],
  ['Immortals','Starshatter Arsenal','11e-necron-starshatter-onslaught',['Fight','Shooting']],
  ['Lokhust Destroyers','Cursed Legion','11e-necron-cursed-cold-fervour',['Fight','Movement','Shooting']],
 ] as const)('shows %s combat modifiers in the applicable attack phases',(unit,detachment,prefix,windows)=>{
  expect(cues(unit,detachment,prefix).map(r=>r.window).sort()).toEqual(windows);
 });
 it('does not add ranged Assault text to the Fight reminder',()=>{
  expect(cues('Immortals','Starshatter Arsenal','11e-necron-starshatter-onslaught').find(r=>r.window==='Fight')?.summary).not.toContain('Assault');
 });
 it('does not show Canoptek Court modifiers for an ineligible roster',()=>{
  expect(cues('Immortals','Canoptek Court','11e-necron-canoptek-power-matrix')).toHaveLength(0);
 });
});
