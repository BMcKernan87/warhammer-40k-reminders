import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit,removeSelectionUnit,validateSelection} from '../src/catalog';
import {expandRoster,individualArmy,setInstanceAttachment,removeRosterInstance,setInstanceWargear,setInstanceModelCount,setInstanceWeaponCounts,setInstanceEquipment} from '../src/roster-instances';
import {eligibleRetinueBodies,setRetinue,formationBodyguardStrength,ghostArkPassengers} from '../src/necron-retinues';
import {rosterCost2026} from '../src/datasheets-2026';
import {rosterFindings} from '../src/roster-findings';
import {generate11thReminders} from '../src/reminders-11th';
import {selectUpgrade2026} from '../src/upgrades-2026';
const army=(...units:string[])=>individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')));
const id=(a:ReturnType<typeof army>,u:string)=>expandRoster(a).find(s=>s.unit===u)!.id;
describe('11e Cryptek Retinue',()=>{
 it('joins an actual led Bodyguard without occupying the Leader or Support slots or repricing it',()=>{
  let a=army('Necron Warriors','Technomancer','Overlord','Cryptothralls');
  const body=id(a,'Necron Warriors'),tech=id(a,'Technomancer'),lord=id(a,'Overlord'),thralls=id(a,'Cryptothralls');
  expect(eligibleRetinueBodies(a,thralls)).toEqual([]);
  a=setInstanceAttachment(setInstanceAttachment(a,tech,body),lord,body);
  expect(eligibleRetinueBodies(a,thralls).map(s=>s.id)).toEqual([body]);
  const b=setRetinue(a,thralls,body);
  expect(validateSelection(b)).toBe(true);
  expect(formationBodyguardStrength(b,body)).toBe((expandRoster(a).find(s=>s.id===body)!.models??10)+2);
  expect(rosterCost2026(b).total).toBe(rosterCost2026(a).total);
  expect(generate11thReminders(b).find(r=>r.title.includes('Cryptek Retinue'))?.window).toBe('Pre-battle');
  expect(generate11thReminders(b).filter(r=>r.title.includes('Bound Creation')).map(r=>r.units)).toEqual(Array.from({length:5},()=>[tech]));
  expect(generate11thReminders(a).some(r=>r.title.includes('Bound Creation'))).toBe(false);
 });
 it('rejects duplicate retinues, invalid Bodyguards, and non-Cryptek attachments',()=>{
  let a=army('Immortals','Cryptothralls','Cryptothralls','Overlord','Plasmancer','Doomsday Ark');
  const body=id(a,'Immortals'),[t1,t2]=expandRoster(a).filter(s=>s.unit==='Cryptothralls').map(s=>s.id);
  a=setInstanceAttachment(a,id(a,'Overlord'),body);
  expect(()=>setRetinue(a,t1,body)).toThrow();
  a=setInstanceAttachment(a,id(a,'Plasmancer'),body);
  a=setRetinue(a,t1,body);
  expect(()=>setRetinue(a,t2,body)).toThrow();
  expect(()=>setRetinue(a,t2,id(a,'Doomsday Ark'))).toThrow();
  expect(validateSelection({...a,instances:expandRoster(a).map(s=>s.id===t2?{...s,retinueTo:body}:s)})).toBe(false);
 });
 it('clears retinue on support removal, detachment or bodyguard removal',()=>{
  let a=army('Immortals','Technomancer','Cryptothralls');
  const body=id(a,'Immortals'),tech=id(a,'Technomancer'),t=id(a,'Cryptothralls');
  a=setRetinue(setInstanceAttachment(a,tech,body),t,body);
  for(const b of [setInstanceAttachment(a,tech,null),removeRosterInstance(a,tech),removeSelectionUnit(a,'Immortals')]){
   expect(expandRoster(b).find(s=>s.id===t)?.retinueTo).toBeUndefined();
   expect(generate11thReminders(b).some(r=>r.title.includes('Bound Creation'))).toBe(false);
   expect(validateSelection(b)).toBe(true);
  }
 });
 it.each(['Cryptothralls','Canoptek Tomb Crawlers'])('permits a %s retinue on a Murdermind Cryptek-led Destroyer unit',retinue=>{
  let a={...army('Technomancer','Skorpekh Destroyers','Skorpekh Lord',retinue),detachments2026:['Cursed Legion']};
  a=selectUpgrade2026(a,id(a,'Technomancer'),'Murdermind');
  a=setInstanceAttachment(a,id(a,'Technomancer'),id(a,'Skorpekh Destroyers'));
  const body=id(a,'Skorpekh Destroyers');
  a=setInstanceAttachment(a,id(a,'Skorpekh Lord'),body);
  a=setRetinue(a,id(a,retinue),body);
  expect(validateSelection(a)).toBe(true);
  expect(formationBodyguardStrength(a,body)).toBe(5);
  expect(generate11thReminders(a).some(r=>r.id==='11e-necron-retinue-'+id(a,retinue))).toBe(true);
  a=selectUpgrade2026(a,id(a,'Technomancer'),null);
  expect(expandRoster(a).find(s=>s.unit===retinue)?.retinueTo).toBeUndefined();
 });
});
describe('Ghost Ark prebattle passenger requirement',()=>{
 it('requires distinct whole eligible formations rather than just an infantry keyword',()=>{
  const a=army('Ghost Ark','Ghost Ark','Necron Warriors','Immortals','Technomancer');
  expect(ghostArkPassengers(a).map(s=>s.unit)).toEqual(['Necron Warriors']);
  expect(rosterFindings(a).some(f=>f.code==='dedicated-transport-passengers')).toBe(true);
  const b=addSelectionUnit(a,'Overlord');
  expect(rosterFindings(b).some(f=>f.code==='dedicated-transport-passengers')).toBe(false);
  expect(generate11thReminders(b).find(r=>r.id==='11e-necron-ghost-ark-embark')?.summary).toContain('without destruction triggers');
 });
 it('excludes a Warriors formation with two Characters or Cryptothralls',()=>{
  let a=army('Ghost Ark','Necron Warriors','Overlord','Technomancer','Cryptothralls');
  const body=id(a,'Necron Warriors'),tech=id(a,'Technomancer'),lord=id(a,'Overlord');
  a=setInstanceAttachment(a,tech,body);
  expect(ghostArkPassengers(a).some(s=>s.id===body)).toBe(true);
  expect(ghostArkPassengers(setInstanceAttachment(a,lord,body)).some(s=>s.id===body)).toBe(false);
  expect(ghostArkPassengers(setRetinue(a,id(a,'Cryptothralls'),body)).some(s=>s.id===body)).toBe(false);
 });
});
describe('source-reconciled wargear reminders',()=>{
 it('enforces mutually exclusive per-model Wraith guns and Tomb Blade sensor slots while allowing Shieldvanes separately',()=>{
  let a=army('Canoptek Wraiths','Tomb Blades');
  const w=id(a,'Canoptek Wraiths'),t=id(a,'Tomb Blades');
  a=setInstanceWeaponCounts(a,w,{'Vicious claws':2,'Whip coils':1});
  a=setInstanceWargear(a,w,'Particle caster',2);
  expect(()=>setInstanceWargear(a,w,'Transdimensional beamer',2)).toThrow();
  a=setInstanceWargear(a,w,'Transdimensional beamer',1);
  a=setInstanceWargear(setInstanceWargear(a,t,'Shieldvanes',3),t,'Nebuloscope',2);
  expect(()=>setInstanceWargear(a,t,'Shadowloom',2)).toThrow();
  a=setInstanceWargear(a,t,'Shadowloom',1);
  const r=generate11thReminders(a);
  expect(r.filter(x=>x.title.includes('Shieldvanes')&&x.summary.includes('3+ Save')).map(x=>x.window)).toEqual(['Shooting','Fight','Movement']);
  expect(r.filter(x=>x.title.includes('Shieldvanes')&&x.summary.includes('Move 8″')).map(x=>x.window)).toEqual(['Movement']);
  expect(r.find(x=>x.title.includes('Shadowloom'))?.summary).toContain('every model');
  expect(r.find(x=>x.title.includes('Nebuloscope'))?.summary).toContain('surviving');
  expect(validateSelection(a)).toBe(true);
 });
 it('keeps Macrocyte equipment reminders conditional on the living bearer, in all reanimation phases',()=>{
  let a=army('Canoptek Macrocytes');
  const m=id(a,'Canoptek Macrocytes');
  a=setInstanceWargear(setInstanceWargear(a,m,'Accelerator mandible',1),m,'Atomiser beam and nanoscarab projector',1);
  const r=generate11thReminders(a);
  expect(r.find(x=>x.title.includes('Accelerator Mandible'))?.summary).toContain('bearer survives');
  expect(r.filter(x=>x.title.includes('Nanoscarab Projector')).map(x=>x.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
  expect(r.filter(x=>x.title.includes('Nanoscarab Projector')).every(x=>x.summary.includes('bearer survives'))).toBe(true);
 });
 it('does not confuse the Chronomancer weapon name with the Blast keyword',()=>{
  expect(generate11thReminders(army('Chronomancer')).some(r=>r.title.includes('Ranged weapon abilities')&&r.summary.includes('Blast'))).toBe(false);
 });
});
