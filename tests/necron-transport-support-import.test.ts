import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';

describe('imported Necron transport and repair rule eligibility',()=>{
 it('Ghost Ark Repair Barge requires Warriors in the army',()=>{
  const ark=addSelectionUnit(newSelection('Necrons'),'Ghost Ark');
  expect(generate11thReminders(ark).some(r=>r.title.includes('Repair Barge'))).toBe(false);
  expect(generate11thReminders(addSelectionUnit(ark,'Necron Warriors')).some(r=>r.title.includes('Repair Barge'))).toBe(true);
 });
 it('Night Scythe Invasion Beams requires friendly Infantry',()=>{
  const scythe=addSelectionUnit(newSelection('Necrons'),'Night Scythe');
  expect(generate11thReminders(scythe).some(r=>r.title.includes('Invasion Beams'))).toBe(false);
  expect(generate11thReminders(addSelectionUnit(scythe,'Immortals')).some(r=>r.title.includes('Invasion Beams'))).toBe(true);
 });
 it('Monolith Eternity Gate requires friendly Infantry',()=>{
  const monolith=addSelectionUnit(newSelection('Necrons'),'Monolith');
  expect(generate11thReminders(monolith).some(r=>r.title.includes('Eternity Gate'))).toBe(false);
  expect(generate11thReminders(addSelectionUnit(monolith,'Deathmarks')).some(r=>r.title.includes('Eternity Gate'))).toBe(true);
 });
});
