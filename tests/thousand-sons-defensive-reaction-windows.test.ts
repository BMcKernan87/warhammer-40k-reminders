// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import type {GeneratedReminder} from '../src/generated-reminders';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {generate11thReminders} from '../src/reminders-11th';

// Core 05.04, 15.09 and 24.24: saves and visibility restrictions apply to
// reactive attacks; snap shooting ignores Hit modifiers.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// November 23 app export, Detachment_abilities 000010196 / 000010204 and
// Enhancements 000010968002 / 000010209003 / 000010201003: no phase restriction.
// https://wahapedia.ru/wh40k11ed/factions/thousand-sons/
// A genuine opponent's return-fire attack during your Shooting phase:
// https://wahapedia.ru/wh40k11ed/factions/necrons/Hexmark-Destroyer
// Hyperspace Hunters permits normal enemy shooting during your Reinforcements:
// https://wahapedia.ru/wh40k11ed/factions/necrons/Deathmarks
// Servo-sentry permits normal arrival attacks in the opponent's Movement too:
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_astra_militarum-1hevkhdpmv-stfkch2tsz.pdf#page=24

const id=(unit:string,n=1)=>unit+'#'+n;
function army(detachment:string,...units:string[]):ArmySelection{
 let a=individualArmy({...newSelection('Thousand Sons'),detachments2026:[detachment]});
 for(const unit of units)a=addSelectionUnit(a,unit);
 return a;
}
const named=(a:ArmySelection,title:string)=>generate11thReminders(a).filter(r=>r.title===title);
const stages=(rows:GeneratedReminder[])=>rows.map(r=>[r.window,r.turn,r.timing].join(':')).sort();
const rangedDefence=['Shooting:opponent:during','Movement:own:during','Shooting:own:during','Movement:opponent:during'].sort();
const unique=(a:ArmySelection)=>{
 const rows=generate11thReminders(a);
 expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
};

describe('Thousand Sons passive defenses during reactive attacks',()=>{
 it('keeps All is Dust on the Rubricae models and their unmodified Damage 1 armour saves',()=>{
  const a=setInstanceAttachment(army('Rubricae Phalanx','Rubric Marines','Scarab Occult Terminators','Exalted Sorcerer','Sekhetar Robots'),id('Exalted Sorcerer'),id('Rubric Marines'));
  const rows=named(a,'All is Dust');
  expect(stages(rows)).toEqual([...rangedDefence,'Fight:either:during'].sort());
  for(const row of rows){
   expect(row.units).toEqual([id('Rubric Marines'),id('Scarab Occult Terminators')]);
   expect(row.summary).toMatch(/unmodified Damage 1.*Rubricae model.*armour saving throw/);
  }
  expect(rows.map(r=>r.id)).toEqual(expect.arrayContaining(['11e-ts-dust-Shooting-opponent','11e-ts-dust-Fight-either']));
  expect(rows.find(r=>r.window==='Shooting'&&r.turn==='own')?.summary).toContain('permitted enemy return fire');
  expect(named({...a,detachments2026:['Grand Coven']},'All is Dust')).toEqual([]);
  expect(named(army('Rubricae Phalanx','Exalted Sorcerer','Sekhetar Robots'),'All is Dust')).toEqual([]);
  unique(a);
 });

 it('keeps Daemonic Illusions on native Psyker formations within the visible Legions aura, for ranged attacks only',()=>{
  const a=setInstanceAttachment(army('Changehost of Deceit','Rubric Marines','Exalted Sorcerer','Pink Horrors','Sekhetar Robots'),id('Exalted Sorcerer'),id('Rubric Marines'));
  const rows=named(a,'Infernal Pacts · Daemonic Illusions');
  expect(stages(rows)).toEqual(rangedDefence);
  for(const row of rows){
   expect(row.units).toEqual([id('Rubric Marines')]);
   expect(row.summary).toMatch(/within 6″ of and visible.*4\+ invulnerable save against ranged attacks/);
   expect(row.summary).toContain('Aura sources: Pink Horrors#1.');
  }
  expect(rows.map(r=>r.id)).toContain('11e-ts-illusions-Shooting-opponent');
  expect(named(army('Changehost of Deceit','Rubric Marines'),'Infernal Pacts · Daemonic Illusions')).toEqual([]);
  expect(named(army('Changehost of Deceit','Pink Horrors','Sekhetar Robots'),'Infernal Pacts · Daemonic Illusions')).toEqual([]);
  unique(a);
 });

 it.each([
  ['Sekhetar Cohort','Walking Rampart','000010968002','Sekhetar Robots'],
  ['Warpforged Cabal','The Perplexing Cloak','000010209003','Chaos Rhino'],
 ] as const)('retains %s / %s’s personal, unattached and three-inch protection conditions',(detachment,upgrade,sourceRuleId,nearby)=>{
  const title=id('Sorcerer')+' · '+upgrade;
  const effects=(a:ArmySelection)=>named(a,title).filter(r=>r.summary.includes('Lone Operative'));
  let a=army(detachment,'Sorcerer','Sorcerer','Rubric Marines',nearby);
  expect(effects(a)).toEqual([]);
  a=selectUpgrade2026(a,id('Sorcerer'),upgrade);
  const rows=effects(a);
  expect(stages(rows)).toEqual(rangedDefence);
  for(const row of rows){
   expect(row).toMatchObject({units:[id('Sorcerer')],sourceRuleId});
   expect(row.summary).toMatch(/While unattached and within 3″.*bearer has Lone Operative.*outside 12″.*Indirect Fire/);
   expect(row.summary).toContain(id(nearby));
  }
  expect(rows.map(r=>r.id)).toContain('11e-ts-'+sourceRuleId+'-'+id('Sorcerer')+'-Shooting-opponent');
  // Attaching a bearer does not transfer its personal protection to the unit.
  const attached=setInstanceAttachment(a,id('Sorcerer'),id('Rubric Marines'));
  expect(effects(attached).every(r=>r.summary.startsWith('While unattached')&&r.units?.join()===id('Sorcerer'))).toBe(true);
  expect(effects(selectUpgrade2026(army(detachment,'Sorcerer'),id('Sorcerer'),upgrade))).toEqual([]);
  unique(a);
  unique(attached);
 });

 it('gives Walking Rampart healing and passive protection independent checkmarks while retaining the existing healing ID',()=>{
  const a=selectUpgrade2026(army('Sekhetar Cohort','Sorcerer','Sekhetar Robots'),id('Sorcerer'),'Walking Rampart');
  const movement=named(a,id('Sorcerer')+' · Walking Rampart').filter(r=>r.window==='Movement');
  expect(movement).toHaveLength(3);
  expect(movement.find(r=>r.summary.includes('heals D3+1 wounds'))).toMatchObject({
   id:'11e-ts-000010968002-Sorcerer#1-Movement-own',timing:'during',units:[id('Sekhetar Robots')],
  });
  expect(movement.find(r=>r.summary.includes('Lone Operative'))).toMatchObject({
   id:'11e-ts-000010968002-Sorcerer#1-lone-operative-Movement-own',timing:'during',units:[id('Sorcerer')],
  });
  expect(movement.find(r=>r.turn==='opponent')).toMatchObject({
   id:'11e-ts-000010968002-Sorcerer#1-lone-operative-Movement-opponent',timing:'during',units:[id('Sorcerer')],
   summary:expect.stringContaining('Lone Operative'),
  });
  unique(a);
 });

 it('keeps the leading Shaman’s Diamond on its own unit during normal return fire, including Movement, without modifying snap-shooting hits',()=>{
  let a=army('Warpmeld Pact','Tzaangor Shaman','Tzaangors','Tzaangors');
  a=setInstanceAttachment(a,id('Tzaangor Shaman'),id('Tzaangors'));
  a=selectUpgrade2026(a,id('Tzaangor Shaman'),'Diamond of Distortion');
  const title=id('Tzaangor Shaman')+' · Diamond of Distortion',rows=named(a,title);
  expect(stages(rows)).toEqual([...rangedDefence,'Fight:either:during'].sort());
  expect(rows.every(r=>r.units?.join()===id('Tzaangors')&&r.summary.includes('Shaman leads')&&r.summary.includes('subtract 1 from incoming Hit rolls'))).toBe(true);
  expect(rows.find(r=>r.window==='Movement')).toMatchObject({
   id:'11e-ts-000010201003-Tzaangor Shaman#1-Movement-own',
   summary:expect.stringMatching(/normal shooting.*Snap shooting ignores this Hit modifier/),
  });
  expect(rows.find(r=>r.window==='Movement'&&r.turn==='opponent')).toMatchObject({
   id:'11e-ts-000010201003-Tzaangor Shaman#1-Movement-opponent',
   summary:expect.stringMatching(/arrival or reaction attacks use normal shooting.*Snap shooting ignores this Hit modifier/),
  });
  expect(rows.map(r=>r.id)).toEqual(expect.arrayContaining([
   '11e-ts-000010201003-Tzaangor Shaman#1-Shooting-opponent','11e-ts-000010201003-Tzaangor Shaman#1-Fight-either',
  ]));
  expect(named(setInstanceAttachment(a,id('Tzaangor Shaman'),null),title)).toEqual([]);
  unique(a);
 });
});
