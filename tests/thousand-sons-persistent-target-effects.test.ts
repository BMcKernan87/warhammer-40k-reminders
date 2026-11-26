// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import type {GeneratedReminder} from '../src/generated-reminders';
import {generate11thReminders} from '../src/reminders-11th';
import {expandRoster,individualArmy,setInstanceAttachment,type RosterInstance} from '../src/roster-instances';
import {thousandSonsIntrinsicReminders as reminders} from '../src/thousand-sons-intrinsic';

// Source-derived behavior: reproduced App Thousand Sons 11e v1.2, November 23
// export, Datasheets_abilities 000001028 / 000002755 / 000001024.
// https://wahapedia.ru/wh40k11ed/factions/thousand-sons/Forgefiend
// https://wahapedia.ru/wh40k11ed/factions/thousand-sons/Exalted-Sorcerer-on-Disc-of-Tzeentch
// https://wahapedia.ru/wh40k11ed/factions/thousand-sons/Heldrake
// The first two select an enemy only after the source fires in its own Shooting
// phase and expire at the start of its next turn. Flame-wreathed lasts only the
// turn of the Normal move. None requires the source to remain alive afterwards.
// Core 01.02.02 retains stated durations; Core 03.04–03.06 / 12.03 / 12.06
// distinguishes Move-characteristic movement from fixed pile-in/consolidation;
// Core 15.09 excludes Hit modifiers on snap shooting.
// https://wahapedia.ru/wh40k11ed/the-rules/rules-appendix/#Persisting-Rules-Effects
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf

const id=(unit:string,n=1)=>unit+'#'+n;
const disc='Exalted Sorcerer on Disc of Tzeentch';
function army(...units:string[]):ArmySelection{
 let a=individualArmy({...newSelection('Thousand Sons'),detachments2026:['Grand Coven']});
 for(const unit of units)a=addSelectionUnit(a,unit);
 return a;
}
const named=(a:ArmySelection,title:string,live?:readonly RosterInstance[])=>reminders(a,live).filter(r=>r.title===title);
const followups=(a:ArmySelection,title:string,live?:readonly RosterInstance[])=>reminders(a,live).filter(r=>r.title.startsWith(title+' · '));
const stages=(rows:GeneratedReminder[])=>rows.map(r=>[r.window,r.turn,r.timing].join(':')).sort();
const sourceRules=(a:ArmySelection,source:string,live?:readonly RosterInstance[])=>reminders(a,live).filter(r=>r.units?.[0]===source);

describe('Blazing Salvoes enemy suppression',()=>{
 it('keeps the own-Shooting after-hit selection separate from still-active suppression',()=>{
  const a=army('Forgefiend','Rubric Marines');
  const activation=named(a,'Blazing Salvoes');
  expect(stages(activation)).toEqual(['Shooting:own:during']);
  expect(activation[0]).toMatchObject({id:'11e-ts-card:Forgefiend#1:Blazing Salvoes:Shooting:own:during',units:[id('Forgefiend')]});
  expect(activation[0].summary).toMatch(/After this Forgefiend shoots in your Shooting phase.*choose one enemy unit it hit/);
  const effects=followups(a,'Blazing Salvoes');
  expect(stages(effects)).toEqual(['Shooting:own:during','Movement:opponent:during','Shooting:opponent:during','Fight:either:during'].sort());
  for(const row of effects){
   expect(row.summary).toMatch(/Only if this Forgefiend already suppressed an enemy after hitting it in your Shooting phase/);
   expect(row.summary).toContain('any friendly unit');
   expect(row.summary).toContain('expires at the start of your next turn');
   expect(row.summary).toContain('even if the Forgefiend is destroyed');
   expect(row.summary).toContain('Fixed snap-shot Hit rolls cannot be modified');
   expect(row.units).toEqual([id('Forgefiend')]);
  }
  expect(effects.find(r=>r.window==='Movement'&&r.turn==='own')).toBeUndefined();
  expect(effects.find(r=>r.window==='Command'||r.window==='Start of turn')).toBeUndefined();
 });

 it('preserves old follow-up checkmarks without letting the old activation complete new effects',()=>{
  const a=army('Forgefiend','Forgefiend');
  const effects=followups(a,'Blazing Salvoes');
  for(const number of [1,2]){
   const source=id('Forgefiend',number),own=effects.filter(r=>r.units?.[0]===source);
   expect(own.map(r=>r.id)).toEqual(expect.arrayContaining([
    `11e-ts-card:${source}:Blazing Salvoes:Shooting:opponent:during`,
    `11e-ts-card:${source}:Blazing Salvoes:Fight:either:during`,
    `11e-ts-lasting:${source}:Blazing Salvoes:Shooting:own:during`,
    `11e-ts-lasting:${source}:Blazing Salvoes:Movement:opponent:during`,
   ]));
   expect(own.some(r=>r.id===`11e-ts-card:${source}:Blazing Salvoes:Shooting:own:during`)).toBe(false);
  }
  const all=generate11thReminders(a);
  expect(new Set(all.map(r=>r.id)).size).toBe(all.length);
 });

 it.each(['removed','zero models'] as const)('retains suppression after its source is %s, but cannot select a new victim',mode=>{
  const a=army('Forgefiend','Rubric Marines');
  const live=mode==='removed'?expandRoster(a).filter(s=>s.unit!=='Forgefiend'):expandRoster(a).map(s=>s.unit==='Forgefiend'?{...s,models:0}:s);
  expect(named(a,'Blazing Salvoes',live)).toEqual([]);
  expect(followups(a,'Blazing Salvoes',live).map(r=>r.id)).toEqual(followups(a,'Blazing Salvoes').map(r=>r.id));
  expect(followups(a,'Blazing Salvoes',live).every(r=>r.units?.join()===id('Forgefiend'))).toBe(true);
 });

 it('still applies against legal allied survivors after every native source is gone',()=>{
  const a=army('Forgefiend','War Dog Brigand');
  const live=expandRoster(a).filter(s=>s.unit==='War Dog Brigand');
  expect(followups(a,'Blazing Salvoes',live)).toHaveLength(4);
  expect(followups(a,'Blazing Salvoes',live).every(r=>r.units?.join()===id('Forgefiend')&&r.summary.includes('any friendly unit'))).toBe(true);
  expect(named(a,'Blazing Salvoes',live)).toEqual([]);
  expect(reminders(a,[])).toEqual([]);
 });

 it('keeps each original Forgefiend’s target and activation separate after one is destroyed',()=>{
  const a=army('Forgefiend','Forgefiend','Rubric Marines');
  const live=expandRoster(a).filter(s=>s.id!==id('Forgefiend'));
  expect(named(a,'Blazing Salvoes',live).map(r=>r.units?.[0])).toEqual([id('Forgefiend',2)]);
  expect(followups(a,'Blazing Salvoes',live).filter(r=>r.units?.[0]===id('Forgefiend'))).toHaveLength(4);
  expect(followups(a,'Blazing Salvoes',live).filter(r=>r.units?.[0]===id('Forgefiend',2))).toHaveLength(4);
 });
});

describe('other selected enemy effects with stated durations',()=>{
 it('keeps Arcane Fire’s own-Shooting trigger and Infantry restriction after the Sorcerer is destroyed',()=>{
  const a=setInstanceAttachment(army(disc,'Rubric Marines'),id(disc),id('Rubric Marines'));
  expect(named(a,'Binding Tendrils')).toMatchObject([{window:'Shooting',turn:'own',summary:expect.stringMatching(/your Shooting phase.*enemy Infantry.*own Arcane Fire/)}]);
  const effects=followups(a,'Binding Tendrils');
  expect(stages(effects)).toEqual(['Shooting:own:during','Charge:own:during','Fight:either:during','Movement:opponent:during','Shooting:opponent:during','Charge:opponent:during'].sort());
  for(const row of effects){
   expect(row.summary).toMatch(/Only the enemy Infantry unit already hit.*own Arcane Fire.*selected in your Shooting phase/);
   expect(row.summary).toMatch(/2″ from its Move characteristic and 2 from its Charge rolls until the start of your next turn/);
   expect(row.summary).toContain('even if the Sorcerer is destroyed');
   expect(row.summary).toContain('does not shorten fixed-distance moves, Pile In or Consolidation moves');
  }
  const live=expandRoster(a).filter(s=>s.unit!==disc);
  expect(followups(a,'Binding Tendrils',live).map(r=>r.id)).toEqual(effects.map(r=>r.id));
  expect(named(a,'Binding Tendrils',live)).toEqual([]);
  expect(followups(a,'Binding Tendrils',live).some(r=>r.window==='Movement'&&r.turn==='own')).toBe(false);
  expect(effects.map(r=>r.id)).toContain(`11e-ts-card:${id(disc)}:Binding Tendrils:Movement:opponent:during`);
  expect(effects.map(r=>r.id)).toContain(`11e-ts-card:${id(disc)}:Binding Tendrils:Charge:opponent:during`);
 });

 it('retains the original Sorcerer’s enemy mark after its Bodyguard is lost without requiring that Bodyguard to survive',()=>{
  const a=setInstanceAttachment(army(disc,'Rubric Marines','Rubric Marines'),id(disc),id('Rubric Marines'));
  const live=expandRoster(a).filter(s=>s.id!==id('Rubric Marines'));
  expect(named(a,'Binding Tendrils',live)).toHaveLength(1);
  expect(followups(a,'Binding Tendrils',live)).toHaveLength(6);
 });

 it('retains a Heldrake’s already-exposed enemy for later same-turn attacks after the Heldrake is lost',()=>{
  const a=army('Heldrake','Rubric Marines');
  const effects=followups(a,'Flame-wreathed');
  expect(stages(effects)).toEqual(['Movement:own:during','Shooting:own:during']);
  expect(effects.map(r=>r.id)).toContain('11e-ts-card:Heldrake#1:Flame-wreathed:Shooting:own:during');
  expect(effects.map(r=>r.id)).toContain('11e-ts-lasting:Heldrake#1:Flame-wreathed:Movement:own:during');
  expect(named(a,'Flame-wreathed')[0].id).toBe('11e-ts-card:Heldrake#1:Flame-wreathed:Movement:own:during');
  for(const row of effects){
   expect(row.summary).toMatch(/Only the enemy already chosen.*Normal move.*Benefit of Cover.*rest of that turn/);
   expect(row.summary).toContain('even if the Heldrake is destroyed');
   expect(row.summary).toContain('effect ends before the next turn');
  }
  const live=expandRoster(a).filter(s=>s.unit!=='Heldrake');
  expect(followups(a,'Flame-wreathed',live).map(r=>r.id)).toEqual(effects.map(r=>r.id));
  expect(named(a,'Flame-wreathed',live)).toEqual([]);
  expect(effects.some(r=>r.turn!=='own')).toBe(false);
 });
});

describe.each([
 ['Forgefiend','Blazing Salvoes','Heldrake'],
 [disc,'Binding Tendrils','Exalted Sorcerer'],
 ['Heldrake','Flame-wreathed','Forgefiend'],
] as const)('%s original source validation',(source,title,replacement)=>{
 it('does not invent previous use for a newly added or replaced source',()=>{
  const a=army(source,'Rubric Marines');
  const changed=expandRoster(a).map(s=>s.unit===source?{...s,unit:replacement}:s);
  expect(named(a,title,changed)).toEqual([]);
  expect(followups(a,title,changed)).toEqual([]);
  const noSource=army('Rubric Marines');
  const injected=[...expandRoster(noSource),expandRoster(a).find(s=>s.unit===source)!];
  expect(named(noSource,title,injected)).toEqual([]);
  expect(followups(noSource,title,injected)).toEqual([]);
 });

 it('rejects ambiguous duplicate source identities and illegal original attachments',()=>{
  const a=army(source,'Rubric Marines');
  const s=expandRoster(a).find(s=>s.unit===source)!;
  const duplicate=[...expandRoster(a),s];
  expect(sourceRules(a,id(source),duplicate)).not.toEqual(expect.arrayContaining([expect.objectContaining({title})]));
  expect(followups(a,title,duplicate)).toEqual([]);
  const originalDuplicate={...a,instances:duplicate};
  expect(named(originalDuplicate,title)).toEqual([]);
  expect(followups(originalDuplicate,title)).toEqual([]);
  const invalid={...a,instances:expandRoster(a).map(m=>m.id===s.id?{...m,attachedTo:'missing-bodyguard'}:m)};
  expect(named(invalid,title)).toEqual([]);
  expect(followups(invalid,title)).toEqual([]);
 });

 it('does not preserve effects for an absent original model or changed live links',()=>{
  const a=army(source,'Rubric Marines');
  const zero={...a,instances:expandRoster(a).map(s=>s.unit===source?{...s,models:0}:s)};
  expect(named(zero,title)).toEqual([]);
  expect(followups(zero,title)).toEqual([]);
  const changed=expandRoster(a).map(s=>s.unit===source?{...s,attachedTo:id('Rubric Marines')}:s);
  expect(named(a,title,changed)).toEqual([]);
  expect(followups(a,title,changed)).toEqual([]);
 });
});

it('rejects changed or newly joined original Sorcerer formations without carrying the enemy mark to the new identity',()=>{
 const a=setInstanceAttachment(army(disc,'Rubric Marines','Rubric Marines','Sekhetar Robots'),id(disc),id('Rubric Marines'));
 const changedBody=expandRoster(a).map(s=>s.id===id('Rubric Marines')?{...s,unit:'Tzaangors',models:10}:s);
 const changedJoin=expandRoster(a).map(s=>s.unit===disc?{...s,attachedTo:id('Rubric Marines',2)}:s);
 const extra=[...expandRoster(a),{id:'Infernal Master#99',unit:'Infernal Master',models:1,attachedTo:id('Rubric Marines')}];
 for(const live of [changedBody,changedJoin,extra]){
  expect(named(a,'Binding Tendrils',live)).toEqual([]);
  expect(followups(a,'Binding Tendrils',live)).toEqual([]);
 }
 const illegal={...a,instances:expandRoster(a).map(s=>s.unit===disc?{...s,attachedTo:id('Sekhetar Robots')}:s)};
 expect(followups(illegal,'Binding Tendrils')).toEqual([]);
 expect(followups(illegal,'Binding Tendrils',expandRoster(illegal).filter(s=>s.unit!==disc))).toEqual([]);
});
