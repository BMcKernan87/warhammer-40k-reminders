import {describe,it,expect} from 'vitest';
import {newSelection} from '../src/catalog';
import {generate11thReminders,grouped11thReminders,eligibleScoutReminders} from '../src/reminders-11th';
import {REMINDER_WINDOWS} from '../src/generated-reminders';
import {individualArmy} from '../src/roster-instances';
describe('11e Scout eligibility and timing',()=>{
 it('does not show a Scout reminder for an army without a verified grant',()=>{
  expect(eligibleScoutReminders(newSelection()).length).toBe(0);
  expect(generate11thReminders(newSelection()).some(r=>r.window==='Pre-battle')).toBe(false);
 });
 it('shows a pre-battle reminder only for the upgraded Necron Warrior squad',()=>{
  const army=individualArmy({...newSelection('Necrons'),units:{'Necron Warriors':1},detachments2026:['Hand of the Dynasty']});
  const id=army.instances![0].id;
  const upgraded={...army,upgrades2026:{[id]:'Enlivened Sentinels'}};
  expect(eligibleScoutReminders(upgraded)).toMatchObject([{id:'11e-scout-'+id,window:'Pre-battle',units:[id]}]);
  expect(grouped11thReminders(upgraded)[0].reminders.some(r=>r.id==='11e-scout-'+id)).toBe(true);
  expect(REMINDER_WINDOWS[0]).toBe('Pre-battle');
 });
 it('fails closed for attached Leaders whose Scout ability is not verified',()=>{
  const army=individualArmy({...newSelection('Necrons'),units:{'Necron Warriors':1,'Overlord':1},detachments2026:['Hand of the Dynasty']});
  const warrior=army.instances!.find(s=>s.unit==='Necron Warriors')!;
  const upgraded={...army,instances:army.instances!.map(s=>s.unit==='Overlord'?{...s,attachedTo:warrior.id}:s),upgrades2026:{[warrior.id]:'Enlivened Sentinels'}};
  expect(eligibleScoutReminders(upgraded)).toEqual([]);
 });
});
