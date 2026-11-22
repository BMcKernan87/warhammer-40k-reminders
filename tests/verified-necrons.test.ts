import {describe,it,expect} from 'vitest';
import {addSelectionUnit,newSelection} from '../src/catalog';
import {attachLeader} from '../src/attachments';
import {generateReminders} from '../src/generated-reminders';
describe('source-checked Necron reminder coverage',()=>{
 it('explains Reanimation rather than asking player to verify it',()=>{
  const rule=generateReminders(newSelection()).find(r=>r.id==='necron-reanimation-verified');
  expect(rule?.summary).toContain('heal damaged models first');
  expect(rule?.source).toContain('/wh40k10ed/');
 });
 it('includes exact Canoptek Court conditions',()=>{
  const a={...newSelection(),detachment:'Canoptek Court'};
  const rule=generateReminders(a).find(r=>r.id==='necron-power-matrix-verified');
  expect(rule?.summary).toContain('at least half');
  expect(rule?.summary).toContain('re-roll Hit rolls of 1');
 });
 it('only grants Orikan invulnerable save when attached',()=>{
  const a=addSelectionUnit(addSelectionUnit(newSelection(),'Orikan the Diviner'),'Immortals');
  expect(generateReminders(a).some(r=>r.id==='attached-orikan-invulnerable-verified')).toBe(false);
  expect(generateReminders(attachLeader(a,'Orikan the Diviner','Immortals')).some(r=>r.id==='attached-orikan-invulnerable-verified')).toBe(true);
 });
 it('does not show removed vague Orikan and Imotekh prompts',()=>{
  let a=addSelectionUnit(newSelection(),'Orikan the Diviner');a=addSelectionUnit(a,'Imotekh the Stormlord');
  expect(generateReminders(a).some(r=>/check .*datasheet|review .*current/i.test(r.summary))).toBe(false);
 });
});
