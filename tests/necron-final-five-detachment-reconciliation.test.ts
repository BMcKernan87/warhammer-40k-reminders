import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit} from '../src/catalog';
import {individualArmy,expandRoster,setInstanceAttachment,setInstanceResurrectionOrb,setInstanceEquipment} from '../src/roster-instances';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {generate11thReminders} from '../src/reminders-11th';
const army=(d:string,...units:string[])=>individualArmy({...units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')),detachments2026:[d]});
const id=(a:ReturnType<typeof army>,u:string)=>expandRoster(a).find(s=>s.unit===u)!.id;
const named=(a:ReturnType<typeof army>,title:string)=>generate11thReminders(a).filter(r=>r.title.includes(title));
describe('five detachment source reconciliation',()=>{
 it('distinguishes bearer-only FNP from formation-wide Command Protocols',()=>{
  let a=army('Awakened Dynasty','Overlord','Immortals','Necron Warriors');
  const lord=id(a,'Overlord'),body=id(a,'Immortals');
  a=setInstanceAttachment(a,lord,body);
  a=selectUpgrade2026(a,lord,'Enaegic Dermal Bond');
  expect(named(a,'Enaegic Dermal Bond')).toHaveLength(5);
  expect(named(a,'Enaegic Dermal Bond').every(r=>r.units?.join(',')===lord)).toBe(true);
  expect(named(a,'Command Protocols').map(r=>r.units)).toEqual([[body],[body]]);
  expect(named(a,'Conquering Tyrant')[0].summary).toContain('FAQ');
  expect(named(a,'Vengeful Stars')[0].summary).toContain('when it was destroyed');
  expect(named(army('Awakened Dynasty','Overlord'),'Vengeful Stars')).toHaveLength(0);
 });
 it('distinguishes bearer engagement from formation engagement in Annihilation Legion',()=>{
  let a=army('Annihilation Legion','Skorpekh Lord','Skorpekh Destroyers');
  const l=id(a,'Skorpekh Lord'),b=id(a,'Skorpekh Destroyers');
  a=setInstanceAttachment(a,l,b);
  const nightmare=selectUpgrade2026(a,l,'Eldritch Nightmare');
  expect(named(nightmare,'Eldritch Nightmare')[0]).toMatchObject({timing:'start',units:[l]});
  expect(named(nightmare,'Eldritch Nightmare')[0].summary).toContain('bearer model');
  const reaper=selectUpgrade2026(a,l,'Soulless Reaper');
  expect(named(reaper,'Soulless Reaper')[0].units).toEqual([l,b]);
 });
 it('Obeisance Unflinching Will is bearer-only while Eternal Conqueror affects formation',()=>{
  let a=army('Obeisance Phalanx','Overlord','Lychguard');
  const l=id(a,'Overlord'),b=id(a,'Lychguard');
  a=setInstanceAttachment(a,l,b);
  expect(named(selectUpgrade2026(a,l,'Unflinching Will'),'Unflinching Will')[0].units).toEqual([l]);
  expect(named(selectUpgrade2026(a,l,'Eternal Conqueror'),'Eternal Conqueror').map(r=>r.units)).toEqual([[l,b],[l,b]]);
  expect(named(a,'Worthy Foes').every(r=>r.units?.join(',')===b)).toBe(true);
 });
 it('Court targets the Cryptek model for Solar Pulse and Curse, not its Bodyguard',()=>{
  let a=army('Canoptek Court','Technomancer','Immortals','Canoptek Wraiths');
  const t=id(a,'Technomancer'),b=id(a,'Immortals'),w=id(a,'Canoptek Wraiths');
  a=setInstanceAttachment(a,t,b);
  expect(named(a,'Solar Pulse')[0].units).toEqual([t]);
  expect(named(a,'Curse of the Cryptek').every(r=>r.units?.join(',')===t)).toBe(true);
  expect(named(a,'Cynosure of Eradication').every(r=>r.units?.includes(b)&&r.units?.includes(w)&&!r.units?.includes(t))).toBe(true);
  expect(named(a,'Canoptek Court · Power Matrix').every(r=>r.summary.includes('every model'))).toBe(true);
 });
 it('Hypercrypt recall names both mandatory targets and precision does not require Deep Strike on Hyperphasing arrivals',()=>{
  let a=army('Hypercrypt Legion','Monolith','Immortals','Overlord');
  const l=id(a,'Overlord'),b=id(a,'Immortals'),m=id(a,'Monolith');
  a=setInstanceAttachment(a,l,b);
  expect(named(a,'Hyperphasic Recall').map(r=>r.units)).toEqual([[b,m],[b,m]]);
  expect(named(a,'Cosmic Precision')[0].summary).toContain('does not require Deep Strike or prior Hyperphasing');
  expect(named(a,'Hyperphasing')[0].summary).toContain('first battle round');
  expect(named(a,'Reanimation Crypts')[0].units).toEqual([l]);
 });
 it('honors the per-unit resurrection orb FAQ, repeat fight eligibility and reroll restrictions',()=>{
  let a=army('Awakened Dynasty','Overlord','Cryptothralls','Lokhust Destroyers');
  const lord=id(a,'Overlord');
  // Select an orb-compatible weapon before equipping the orb.
  a=setInstanceEquipment(a,lord,'Staff of light');
  a=setInstanceResurrectionOrb(a,lord,true);
  expect(named(a,'Resurrection Orb').length).toBeGreaterThan(0);
  expect(named(a,'Resurrection Orb').every(r=>r.summary.includes('A given unit')&&r.summary.includes('at most one unit each turn'))).toBe(true);
  expect(named(a,'Systematic Vigour')[0].summary).toContain('may fight again');
  expect(named(a,'Hard-wired for Destruction')[0].summary).toContain('Both conditions');
 });
});
