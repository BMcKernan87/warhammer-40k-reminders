import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {selectUpgrade2026} from '../src/upgrades-2026';
const army=(unit:string)=>({...addSelectionUnit(newSelection('Necrons'),unit),detachments2026:["The Phaeron's Armoury"]});
const cues=(unit:string)=>generate11thReminders(army(unit)).filter(r=>r.id.startsWith('11e-necron-phaeron-'));
describe('Phaeron Armoury reminders',()=>{
 it('includes engine and defensive cues for eligible engines',()=>{
  expect(cues('Monolith').map(r=>r.window).sort()).toEqual(['Fight','Movement','Shooting','Shooting']);
  expect(cues('Immortals')).toHaveLength(0);
 });
 it('restricts Cosmic Storm to Obelisk and Tesseract Vault',()=>{
  expect(cues('Monolith').some(r=>r.id.endsWith('cosmic'))).toBe(false);
  expect(cues('Obelisk').some(r=>r.id.endsWith('cosmic'))).toBe(true);
 });
 it('requires the selected Mortality Shroud upgrade',()=>{
  expect(cues('Obelisk').some(r=>r.id.endsWith('mortality'))).toBe(false);
  expect(generate11thReminders(selectUpgrade2026(army('Obelisk'),'Obelisk','Mortality Shroud')).some(r=>r.id.endsWith('mortality')&&r.window==='Command')).toBe(true);
 });
});
