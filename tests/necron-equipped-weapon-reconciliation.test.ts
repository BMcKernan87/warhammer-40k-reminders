// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {necronDatasheetReminders2026} from '../src/necron-datasheet-reminders-2026';
import {weaponSummary} from '../src/necron-weapon-cues';
import {hasNecronRangedWeapon} from '../src/necron-wargear';
import type {RosterInstance} from '../src/roster-instances';

// Reproduced 11e cards, November 26 audit; primary Codex audit remains open.
// https://wahapedia.ru/wh40k11ed/factions/necrons/Canoptek-Spyders
// https://wahapedia.ru/wh40k11ed/factions/necrons/Doomsday-Ark
// https://wahapedia.ru/wh40k11ed/factions/necrons/Ghost-Ark
// https://wahapedia.ru/wh40k11ed/factions/necrons/Monolith
// https://wahapedia.ru/wh40k11ed/factions/necrons/Obelisk
// https://wahapedia.ru/wh40k11ed/factions/necrons/Tesseract-Vault
// https://wahapedia.ru/wh40k11ed/factions/necrons/Seraptek-Heavy-Construct
// https://wahapedia.ru/wh40k11ed/factions/necrons/Hexmark-Destroyer
// Core 15.08/15.09 and Appendix 07.02.01: the normal return-fire ability
// is not snap shooting and does not enable other phase-locked rules.
const squad=(unit:string,patch:Partial<RosterInstance>={}):RosterInstance=>({id:unit+'#1',unit,...patch});
const army=(...instances:RosterInstance[]):ArmySelection=>({...newSelection('Necrons'),instances});
const rows=(a:ArmySelection,name:string,roster?:RosterInstance[])=>necronDatasheetReminders2026(a,roster).filter(r=>r.title.includes(' · '+name));
describe('Necron equipped weapon multiplicity and reactive attacks',()=>{
 it.each([
  ['Ghost Ark',undefined,'Gauss flayer array',2,'Rapid Fire 5'],
  ['Doomsday Ark',undefined,'Gauss flayer array',2,'Rapid Fire 5'],
  ['Monolith','Four gauss flux arcs','Gauss flux arc',4,'Rapid Fire 3'],
  ['Monolith','Four death rays','Death ray',4,'Sustained Hits D3'],
  ['Obelisk',undefined,'Tesla sphere',4,'Anti-Fly 4+'],
  ['Tesseract Vault',undefined,'Tesla spheres',4,'Sustained Hits 2'],
  ['Seraptek Heavy Construct','Two singularity generators','Singularity generator',2,'Blast'],
  ['Seraptek Heavy Construct','Two synaptic obliterators and two transdimensional projectors','Synaptic obliterator',2,'Sustained Hits 2'],
 ] as const)('prints each equipped %s weapon with its exact printed multiplicity (%s)',(unit,equipment,name,qty,keyword)=>{
  const s=squad(unit,{equipment}),a=army(s);
  const cue=rows(a,'Ranged weapon abilities').find(r=>r.window==='Shooting')!;
  expect(cue).toBeDefined();
  expect(cue.summary).toContain(name+' ('+qty+' weapons per equipped model)');
  expect(cue.summary).toContain(keyword);
  if(unit==='Monolith')expect(cue.summary).not.toContain(equipment==='Four death rays'?'Gauss flux arc':'Death ray');
  if(unit==='Seraptek Heavy Construct')expect(cue.summary).not.toContain(equipment==='Two singularity generators'?'Synaptic obliterator':'Singularity generator');
  expect(rows(a,'Ranged weapon abilities',[{...s,models:0}])).toEqual([]);
  expect(hasNecronRangedWeapon({...s,models:0})).toBe(false);
 });
 it('keeps two beamers per equipped Spyder and distinguishes the two physical bearers',()=>{
  const s=squad('Canoptek Spyders',{models:2,wargear:{'Pair of particle beamers':2}}),a=army(s);
  const cue=rows(a,'Ranged weapon abilities');
  expect(cue.map(r=>r.window)).toEqual(['Shooting','Movement']);
  expect(cue.every(r=>r.summary.includes('2 originally equipped models; apply to surviving bearers')&&r.summary.includes('2 weapons per equipped model')&&r.summary.includes('Blast'))).toBe(true);
  expect(rows(army({...s,wargear:{'Pair of particle beamers':1}}),'Ranged weapon abilities')[0].summary).toContain('1 originally equipped model; apply to surviving bearers');
  expect(rows(army({...s,wargear:{'Pair of particle beamers':0}}),'Ranged weapon abilities')).toEqual([]);
 });
 it('keeps non-keyword beamer users eligible to shoot without attributing Particle caster abilities to them',()=>{
  const s=squad('Canoptek Wraiths',{models:3,wargear:{'Transdimensional beamer':3}});
  expect(hasNecronRangedWeapon(s)).toBe(true);
  expect(weaponSummary(s,'shoot')).toBe('');
  const mixed={...s,wargear:{'Transdimensional beamer':2,'Particle caster':1}};
  expect(weaponSummary(mixed,'shoot')).toContain('Particle caster (1 originally equipped model');
  expect(weaponSummary(mixed,'shoot')).not.toContain('Transdimensional beamer');
 });
 it('distinguishes normal Hexmark reaction from its free end-of-Movement Overwatch, including separate source identities',()=>{
  const first=squad('Hexmark Destroyer'),second={...first,id:'Hexmark Destroyer#2'},a=army(first,second);
  const reply=rows(a,'Multi-threat Eliminator');
  expect(reply).toHaveLength(2);
  expect(reply.every(r=>r.window==='Shooting'&&r.turn==='opponent'&&r.timing==='during'&&r.summary.includes('Once per turn across your army')&&r.summary.includes('normal reactive shooting')&&r.summary.includes('not snap shooting')&&r.summary.includes('Ignores Cover'))).toBe(true);
  expect(reply.map(r=>r.units)).toEqual([[first.id],[second.id]]);
  const snap=rows(a,'Inescapable Death');
  expect(snap.every(r=>r.window==='Movement'&&r.turn==='opponent'&&r.timing==='end')).toBe(true);
  const live=[{...first,models:0},second];
  expect(rows(a,'Multi-threat Eliminator',live).map(r=>r.units)).toEqual([[second.id]]);
  expect(rows(a,'Inescapable Death',live).every(r=>r.units?.join()===second.id)).toBe(true);
  expect(rows(a,'Ranged weapon abilities',live).every(r=>r.units?.join()===second.id)).toBe(true);
 });
 it.each([
  ['Canoptek Macrocytes',{'Atomiser beam and nanoscarab projector':1,'Accelerator mandible':1},'Tesla caster'],
  ['Canoptek Wraiths',{'Particle caster':3},'Vicious claws'],
  ['Tomb Blades',{'Nebuloscope':3,'Shieldvanes':3},'Twin gauss blaster'],
  ['Canoptek Spyders',{'Pair of particle beamers':1,'Fabricator claw array':1,'Gloom prism':1},undefined],
 ] as const)('does not show weapon or equipped-bearer activations for destroyed %s', (unit,wargear,equipment)=>{
  const s=squad(unit,{models:0,wargear:{...wargear},equipment}),a=army(s);
  expect(weaponSummary(s,'shoot')).toBe('');
  expect(weaponSummary(s,'fight')).toBe('');
  expect(hasNecronRangedWeapon(s)).toBe(false);
  for(const name of ['Nebuloscope','Shieldvanes','Shadowloom','Gloom Prism','Fabricator Claw Array','Nanoscarab Projector','Accelerator Mandible','Ranged weapon abilities','Melee weapon abilities'])expect(rows(a,name)).toEqual([]);
 });
});
