import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generateReminders} from '../src/generated-reminders';
describe('Awakened Dynasty full stratagem coverage',()=>{
 it('includes all six named Stratagems',()=>{
  const rules=generateReminders(newSelection()).filter(r=>['undying-legions','eternal-revenant','sudden-storm','conquering-tyrant','hungry-void','vengeful-stars'].some(id=>r.id.startsWith(id)));
  expect(new Set(rules.map(r=>r.id.split('-').slice(0,2).join('-'))).size).toBe(6);
 });
 it('includes opponent shooting and fight reaction windows',()=>{
  const rules=generateReminders(newSelection()).filter(r=>r.id.startsWith('undying-legions'));
  expect(rules.map(r=>r.window)).toEqual(['Shooting','Fight']);
 });
 it('excludes detachment stratagems outside Awakened Dynasty',()=>{
  expect(generateReminders({...newSelection(),detachment:'Canoptek Court'}).some(r=>r.id.startsWith('undying-legions'))).toBe(false);
 });
 it('includes Ctan abilities only when their models are selected',()=>{
  const a=addSelectionUnit(newSelection(),'C’tan Shard of the Nightbringer');
  expect(generateReminders(a).some(r=>r.id==='nightbringer-drain-life')).toBe(true);
  expect(generateReminders(a).some(r=>r.id==='void-dragon-matter-absorption')).toBe(false);
 });
});
