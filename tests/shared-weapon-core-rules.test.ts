import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {setKnightGear} from '../src/knight-loadouts';
import {weaponSummary} from '../src/necron-weapon-cues';

// Source-derived reminder requirements, checked against publisher Core Rules:
// 06.02–06.03 p.24; 10.06–10.07 p.35; 15.09 p.57;
// 24.11/24.15 p.81; 24.26–24.27 p.83; 24.29 p.84.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// These use actual equipped datasheets through the public reminder generator.
const army=(faction:string,unit:string):ArmySelection=>({...newSelection(faction),
 units:{[unit]:1},instances:[{id:'source',unit}],
});
const rows=(faction:string,unit:string)=>generate11thReminders(army(faction,unit));
const weaponRows=(faction:string,unit:string)=>rows(faction,unit).filter(r=>r.units?.includes('source')&&/Psychic \(/.test(r.summary));

describe('shared Psychic weapon rules reach actual faction sheets',()=>{
 const examples=[
  ['Chaos Daemons','Lord of Change'],
  ['Imperial Agents','Inquisitor Coteaz'],
  ['Astra Militarum','Primaris Psyker'],
  ['Thousand Sons','Exalted Sorcerer'],
  ['Grey Knights','Brotherhood Librarian'],
  ['Tyranids','Neurotyrant'],
  ['Genestealer Cults','Magus'],
  ['Leagues of Votann','Grimnyr'],
  ['Chaos Space Marines','Master Of Possession'],
  ['Death Guard','Malignant Plaguecaster'],
  ['Space Marines','Librarian'],
  ['Aeldari','Farseer'],
  ['Drukhari','Shadowseer'],
  ['Emperor’s Children','Sorcerer'],
 ] as const;
 it.each(examples)('%s: %s explains the modifier choice only for normal attacks',(faction,unit)=>{
  const actual=weaponRows(faction,unit);
  const normal=actual.filter(r=>r.window==='Fight'||(r.window==='Shooting'&&r.turn==='own'));
  expect(normal.length).toBeGreaterThan(0);
  for(const r of normal){
   expect(r.summary).toContain('you may ignore any or all modifiers');
   expect(r.summary).toContain('Ballistic Skill or Weapon Skill and Hit roll');
  }
  // Snap shots use their unmodified threshold, so Psychic cannot create a
  // modifier exception there. Magus and Shadowseer have Psychic melee weapons only.
  const snap=actual.filter(r=>r.window==='Movement'&&r.turn==='opponent');
  if(['Magus','Shadowseer'].includes(unit))expect(snap).toHaveLength(0);
  else expect(snap.length).toBeGreaterThan(0);
  for(const r of snap){
   expect(r.summary).toContain('psychic attacks');
   expect(r.summary).not.toContain('Ballistic Skill or Weapon Skill and Hit roll');
  }
 });
 it('does not grant Psychic attacks merely because a Knight is a Psyker',()=>{
  expect(weaponRows('Chaos Knights','Knight Abominant')).toHaveLength(0);
 });
 it('follows an Inquisitor’s selected gifts without granting Psychic to normal weapons',()=>{
  const mundane=army('Imperial Agents','Inquisitor');
  const equipped=setKnightGear(mundane,'source','Inquisitorial gifts','Psychic gifts + Psychic Shock Wave + Force weapon');
  const psychic=generate11thReminders(equipped).filter(r=>r.units?.includes('source')&&/weapons/i.test(r.title));
  expect(psychic.filter(r=>r.window==='Shooting'||r.window==='Fight').map(r=>r.summary).join(' ')).toContain('Ballistic Skill or Weapon Skill and Hit roll');
  expect(generate11thReminders(mundane).filter(r=>r.units?.includes('source')&&/weapons/i.test(r.title)).map(r=>r.summary).join(' ')).not.toContain('Ballistic Skill or Weapon Skill and Hit roll');
 });
});

describe('weapon summaries retain current shooting and attack restrictions',()=>{
 it.each([
  ['Necrons','Canoptek Wraiths','Pistol'],
  ['Space Marines','Assault Intercessor Squad','Close-Quarters'],
  ['Imperial Agents','Inquisitor','Pistol'],
 ] as const)('%s %s uses the shared Pistol/Close-Quarters category',(faction,unit,keyword)=>{
  let selected=army(faction,unit);
  if(unit==='Canoptek Wraiths')selected={...selected,instances:[{id:'source',unit,models:3,wargear:{'Particle caster':3}}]};
  const actual=generate11thReminders(selected).filter(r=>r.units?.includes('source')&&r.summary.includes(keyword+' ('));
  const normal=actual.find(r=>r.window==='Shooting'&&r.turn!=='opponent');
  expect(normal).toBeDefined();
  expect(normal!.summary).toContain('if engaged and the unit did not Advance');
  expect(normal!.summary).toMatch(/Non-Monster, non-Vehicle models then fire only Pistol\/Close-Quarters weapons and only at enemies engaged with their unit/);
  expect(normal!.summary).toContain('chooses its Pistol/Close-Quarters weapons together or its other ranged weapons');
  expect(normal!.summary).toContain('cannot start an action this phase');
  const snap=faction==='Necrons'?{summary:weaponSummary(selected.instances![0],'shoot',true)}:actual.find(r=>r.window==='Movement'&&r.turn==='opponent');
  expect(snap).toBeDefined();
  expect(snap!.summary).toContain('chooses its Pistol/Close-Quarters weapons together or its other ranged weapons');
  expect(snap!.summary).not.toContain('it can use close-quarters shooting');
 });
 it('keeps stationary spotting, visibility of other guns and the action lock on Indirect shooting',()=>{
  const actual=rows('Necrons','The Silent King');
  const indirect=actual.find(r=>r.window==='Shooting'&&r.turn!=='opponent'&&r.summary.includes('Indirect Fire ('));
  expect(indirect).toBeDefined();
  expect(indirect!.summary).toContain('unengaged and you did not Advance');
  expect(indirect!.summary).toContain('firing unit Remained Stationary and the target is visible to a friendly unit');
  expect(indirect!.summary).toContain('Other guns still require visible targets');
  expect(indirect!.summary).toContain('cannot start an action this phase');
  expect(weaponSummary({id:'source',unit:'The Silent King'},'shoot',true)).not.toContain('Indirect Fire (');
 });
 it('allocates Hazardous damage to the unit after simultaneous weapon-based rolls',()=>{
  const actual=rows('Astra Militarum','Primaris Psyker').filter(r=>r.summary.includes('Hazardous ('));
  expect(actual.length).toBeGreaterThan(0);
  for(const r of actual){
   expect(r.summary).toContain('after resolving all of the unit’s attacks');
   expect(r.summary).toContain('roll together one hazard die per selected Hazardous weapon');
   expect(r.summary).toContain('Each 1–2 inflicts 1 mortal wound on the unit, or 3 if every model is a Monster or Vehicle');
   expect(r.summary).toContain('Allocate these as normal mortal wounds');
   expect(r.summary).toContain('not restricted to the weapon bearers');
  }
 });
 it('selects every Extra Attacks weapon without restoring an obsolete modifier prohibition',()=>{
  const actual=rows('Necrons','Illuminor Szeras').find(r=>r.window==='Fight'&&r.summary.includes('Extra Attacks ('));
  expect(actual).toBeDefined();
  expect(actual!.summary).toContain('select all of the model’s Extra Attacks weapons and one of its other melee weapons if available');
  expect(actual!.summary).not.toMatch(/cannot be modified|unmodifiable/i);
 });
 it('keeps expended One Shot weapons expended when an Agent model returns',()=>{
  let selected=army('Imperial Agents','Imperial Rhino');
  selected=setKnightGear(selected,'source','Hunter-killer missile','Hunter-killer missile');
  const actual=generate11thReminders(selected).filter(r=>r.units?.includes('source')&&r.summary.includes('One Shot ('));
  expect(actual.length).toBeGreaterThan(0);
  expect(actual.every(r=>r.summary.includes('each weapon may attack once per battle, including after its bearer is returned'))).toBe(true);
 });
});
