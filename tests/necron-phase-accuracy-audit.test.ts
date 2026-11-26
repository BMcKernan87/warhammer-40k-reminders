import {describe,it,expect} from 'vitest';
import {newSelection,addSelectionUnit,validateSelection} from '../src/catalog';
import {individualArmy,expandRoster,setInstanceAttachment} from '../src/roster-instances';
import {setRetinue,eligibleRetinueBodies,formationBodyguardStrength,necronFormationRoots} from '../src/necron-retinues';
import {generate11thReminders} from '../src/reminders-11th';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {rosterCost2026} from '../src/datasheets-2026';
const army=(...units:string[])=>individualArmy(units.reduce((a,u)=>addSelectionUnit(a,u),newSelection('Necrons')));
const id=(a:ReturnType<typeof army>,unit:string)=>expandRoster(a).find(s=>s.unit===unit)!.id;
const phases=['Command','Movement','Shooting','Charge','Fight'];
const named=(a:ReturnType<typeof army>,title:string)=>generate11thReminders(a).filter(r=>r.title.includes(title));
describe('11e source-checked missing phase cues',()=>{
 it('includes printed C’tan defenses and core Deep Strike only for selected datasheets',()=>{
  for(const unit of ['C’tan Shard of the Deceiver','C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon','Transcendent C’tan']){
   const a=army(unit);
   expect(named(a,'Feel No Pain 5+').map(r=>r.window)).toEqual(phases);
   expect(named(a,'4+ invulnerable save').map(r=>r.window)).toEqual(['Shooting','Fight','Movement']);
   expect(named(a,'Deadly Demise D6').map(r=>r.window)).toEqual(phases);
   expect(named(a,'Deep Strike').map(r=>r.window)).toEqual(['Pre-battle','Movement']);
  }
  expect(named(army('Immortals'),'Deadly Demise')).toHaveLength(0);
  expect(named(army('Immortals'),'Feel No Pain')).toHaveLength(0);
 });
 it('includes Deceiver redeployment and 11e Stealth, not 10e hit modifiers',()=>{
  const a=army('C’tan Shard of the Deceiver','Flayed Ones');
  expect(named(a,'Grand Illusion')[0].summary).toContain('up to three');
  expect(named(a,'Stealth').every(r=>r.summary.includes('Benefit of Cover'))).toBe(true);
  expect(named(a,'Infiltrators')[0].summary).toContain('8″');
  expect(named(army('C’tan Shard of the Nightbringer'),'Grand Illusion')).toHaveLength(0);
 });
 it('includes source-specific invulnerable saves and conditional defensive auras',()=>{
  expect(named(army('Canoptek Wraiths'),'4+ invulnerable save')).toHaveLength(3);
  expect(named(army('Canoptek Reanimator'),'Feel No Pain 4+')).toHaveLength(5);
  expect(named(army('Hexmark Destroyer'),'Lone Operative')[0].summary).toContain('12″');
  expect(named(army('Illuminor Szeras'),'· Illuminor')).toHaveLength(0);
  expect(named(army('Illuminor Szeras','Immortals'),'· Illuminor')).toHaveLength(2);
  expect(named(army('Nekrosor Ammentar','Immortals'),'Protective Disciples')).toHaveLength(0);
  expect(named(army('Nekrosor Ammentar','Skorpekh Destroyers'),'Protective Disciples')).toHaveLength(2);
 });
 it('places the Silent King auras in correct phases and distinguishes Szarekh from Menhirs',()=>{
  const a=army('The Silent King');
  expect(named(a,'Phaeron of the Stars').map(r=>r.window)).toEqual(['Shooting','Fight','Movement']);
  expect(named(a,'Phaeron of the Blades').map(r=>r.window)).toEqual(['Charge','Fight']);
  expect(named(a,'Relentless March')[0].window).toBe('Movement');
  expect(named(a,'Triarch Abilities')[0].summary).toContain('battle round');
  expect(named(a,'Deadly Demise D6+3').every(r=>r.summary.includes('not a Menhir'))).toBe(true);
  expect(named(a,'Damaged profile')[0].summary).toContain('halve Szarekh');
 });
 it('uses actual damaged thresholds and selected powers, including no fictitious Vault hit penalty',()=>{
  const a=army('Doomsday Ark','Canoptek Doomstalker','Monolith','Tesseract Vault','Obelisk');
  const r=named(a,'Damaged profile');
  expect(r.find(x=>x.title.startsWith('Doomsday Ark'))?.summary).toContain('1–5');
  expect(r.find(x=>x.title.startsWith('Canoptek Doomstalker'))?.summary).toContain('1–4');
  expect(r.find(x=>x.title.startsWith('Monolith'))?.summary).toContain('1–7');
  expect(r.find(x=>x.title.startsWith('Tesseract Vault')&&x.window==='Shooting')?.summary).toContain('one C’tan Powers weapon');
  expect(named(a,'Powers of the C’tan')[0].summary).toContain('Antimatter Meteor');
 });
 it('does not miss phase-independent reanimation modifiers or first-turn ingress exceptions',()=>{
  let a={...army('Necron Warriors','Tomb Blades','Ophydian Destroyers','Night Scythe'),detachments2026:['Skysword Spearhead']};
  a=selectUpgrade2026(a,id(a,'Tomb Blades'),'Recursive Reanimation') as typeof a;
  expect(named(a,'Their Number is Legion').map(r=>r.window)).toEqual(phases);
  expect(named(a,'Recursive Reanimation').map(r=>r.window)).toEqual(phases);
  expect(named(a,'Tunnelling Horrors · ingress')[0].summary).toContain('first turn');
  expect(named(a,'Quantum Invader')[0].summary).toContain('first, second or third');
 });
});
describe('11e formation-scoped targeting',()=>{
 it('enforces mutual exclusion of Tomb Crawlers and Cryptothralls and preserves points',()=>{
  let a=army('Immortals','Technomancer','Canoptek Tomb Crawlers','Cryptothralls');
  const b=id(a,'Immortals'),t=id(a,'Canoptek Tomb Crawlers'),c=id(a,'Cryptothralls');
  a=setInstanceAttachment(a,id(a,'Technomancer'),b);
  const joined=setRetinue(a,t,b);
  expect(eligibleRetinueBodies(joined,c)).toEqual([]);
  expect(()=>setRetinue(joined,c,b)).toThrow();
  expect(formationBodyguardStrength(joined,b)).toBe(7);
  expect(rosterCost2026(joined).total).toBe(rosterCost2026(a).total);
  expect(validateSelection(joined)).toBe(true);
  expect(named(joined,'Canoptek Retinue')).toHaveLength(1);
  expect(named(joined,'Bound Creation')).toHaveLength(0);
  expect(named(joined,'Rites of Reanimation').every(r=>r.units?.includes(t))).toBe(true);
 });
 it('targets joined retinues through the parent formation instead of counting them twice',()=>{
  let a=army('Immortals','Technomancer','Canoptek Tomb Crawlers','Overlord');
  const b=id(a,'Immortals'),t=id(a,'Canoptek Tomb Crawlers'),tech=id(a,'Technomancer');
  a=setRetinue(setInstanceAttachment(a,tech,b),t,b);
  expect(necronFormationRoots(a).map(f=>f.id)).toEqual([b,id(a,'Overlord')]);
  const court={...a,detachments2026:['Canoptek Court']};
  expect(named(court,'Canoptek Court · Power Matrix').every(r=>r.units?.join(',')===b)).toBe(true);
  const hyper={...a,detachments2026:['Hypercrypt Legion']};
  expect(named(hyper,'Hypercrypt Legion · Hyperphasing')[0].units).not.toContain(t);
  const aw={...a,detachments2026:['Awakened Dynasty']};
  expect(named(aw,'Protocol of the Undying Legions').every(r=>!r.units?.includes(t))).toBe(true);
 });
 it('never promotes invalid imported duplicate Support attachments into a legal led formation',()=>{
  const a=army('Immortals','Technomancer','Plasmancer');
  const b=id(a,'Immortals');
  const bad={...a,instances:expandRoster(a).map(s=>s.unit==='Immortals'?s:{...s,attachedTo:b}),detachments2026:['Awakened Dynasty','Canoptek Court']};
  expect(named(bad,'Command Protocols')).toHaveLength(0);
  expect(named(bad,'Rites of Reanimation')).toHaveLength(0);
  expect(named(bad,'Canoptek Court · Power Matrix').every(r=>!r.units?.includes(b))).toBe(true);
 });
});
