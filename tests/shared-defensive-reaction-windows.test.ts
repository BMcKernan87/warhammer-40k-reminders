// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection,type Faction} from '../src/catalog';
import type {GeneratedReminder} from '../src/generated-reminders';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {generate11thReminders} from '../src/reminders-11th';

// Core 05.04, 24.24 and 24.33 apply to qualifying attacks, including return fire:
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// Multi-threat Eliminator is a genuine enemy shooting reaction in the active
// player's Shooting phase; only an eligible target can receive those attacks:
// https://wahapedia.ru/wh40k11ed/factions/necrons/Hexmark-Destroyer
// Native profile values and passive abilities: November 23, 2026 app export.
// Grey Knights pack v1.2 and Codex enhancement records 000010928003 / 000009777004:
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_grey_knights-jnrahwb1qf-ubjtmdlivm.pdf
// https://wahapedia.ru/wh40k11ed/factions/grey-knights/

function army(faction:Faction,units:string[],detachments:string[]=[]):ArmySelection{
 let a=individualArmy({...newSelection(faction),detachments2026:detachments});
 for(const unit of units)a=addSelectionUnit(a,unit);
 return a;
}
const id=(unit:string,n=1)=>unit+'#'+n;
const named=(a:ArmySelection,title:string)=>generate11thReminders(a).filter(r=>r.title===title);
const stages=(rows:GeneratedReminder[])=>rows.map(r=>[r.window,r.turn,r.timing].join(':')).sort();
const rangedDefence=['Shooting:opponent:during','Movement:own:end','Shooting:own:during'].sort();
const ownShot=(rows:GeneratedReminder[])=>rows.find(r=>r.window==='Shooting'&&r.turn==='own');
const unique=(rows:GeneratedReminder[])=>expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);

describe('native defensive profiles during enemy return fire',()=>{
 it.each([
  ['World Eaters','Angron',4,'world-eaters/Angron'],
  ['Emperor’s Children','Fulgrim',4,'emperor-s-children/Fulgrim'],
  ['Thousand Sons','Sekhetar Robots',5,'thousand-sons/Sekhetar-Robots'],
  ['Death Guard','Mortarion',4,'death-guard/Mortarion'],
  ['Grey Knights','Grand Master',4,'grey-knights/Grand-Master'],
  ['Chaos Space Marines','Abaddon The Despoiler',4,'chaos-space-marines/Abaddon-The-Despoiler'],
  ['Adepta Sororitas','Morvenn Vahl',4,'adepta-sororitas/Morvenn-Vahl'],
  ['Adeptus Mechanicus','Belisarius Cawl',4,'adeptus-mechanicus/Belisarius-Cawl'],
  ['T’au Empire','Commander Shadowsun',5,'t-au-empire/Commander-Shadowsun'],
  ['Tyranids','Hive Tyrant',4,'tyranids/Hive-Tyrant'],
 ] as const)('%s retains %s’s own %i+ save in every supported incoming attack window',(faction,unit,save,source)=>{
  const a=army(faction,[unit]),all=generate11thReminders(a),rows=all.filter(r=>r.title===id(unit)+' · Invulnerable save');
  expect(stages(rows)).toEqual([...rangedDefence,'Fight:either:during'].sort());
  for(const row of rows){
   expect(row).toMatchObject({units:[id(unit)],origin:'unit',source:'https://wahapedia.ru/wh40k11ed/factions/'+source});
   expect(row.summary).toContain(save+'+ invulnerable save');
  }
  expect(ownShot(rows)?.summary).toContain('When permitted enemy return fire');
  unique(all);
 });

 it.each([
  ['Chaos Space Marines','Abaddon The Despoiler','11e-csm-profile'],
  ['Adepta Sororitas','Morvenn Vahl','11e-sororitas-profile'],
  ['Adeptus Mechanicus','Belisarius Cawl','11e-mechanicus-profile'],
  ['T’au Empire','Commander Shadowsun','11e-tau-profile'],
  ['Tyranids','Hive Tyrant','11e-tyranid-profile'],
 ] as const)('preserves the existing %s own-Shooting checkmark identity',(faction,unit,prefix)=>{
  const rows=named(army(faction,[unit]),id(unit)+' · Invulnerable save');
  expect(rows.filter(r=>r.window==='Shooting'&&r.turn==='own')).toMatchObject([
   {id:prefix+':'+id(unit)+':Invulnerable save:Shooting:own:during',timing:'during'},
  ]);
 });

 it('keeps an attached leader’s personal save separate from its bodyguard and unprotected neighbours',()=>{
  const a=setInstanceAttachment(army('Emperor’s Children',['Lucius the Eternal','Flawless Blades','Tormentors']),id('Lucius the Eternal'),id('Flawless Blades'));
  for(const [unit,save] of [['Lucius the Eternal',4],['Flawless Blades',5]] as const){
   const rows=named(a,id(unit)+' · Invulnerable save');
   expect(rows).toHaveLength(4);
   expect(rows.every(r=>r.units?.join()===id(unit)&&r.summary.includes(save+'+ invulnerable save'))).toBe(true);
   expect(ownShot(rows)?.summary).toContain('Models from a different attached datasheet use their own saves.');
  }
  expect(named(a,id('Tormentors')+' · Invulnerable save')).toEqual([]);
  unique(generate11thReminders(a));
 });
});

describe('passive ranged protection during enemy return fire',()=>{
 it('keeps Sekhetar Robots’ Stealth on their own formation in all incoming ranged windows',()=>{
  const a=army('Thousand Sons',['Sekhetar Robots','Rubric Marines']),rows=named(a,id('Sekhetar Robots')+' · Stealth');
  expect(stages(rows)).toEqual(rangedDefence);
  expect(rows.every(r=>r.units?.join()===id('Sekhetar Robots')&&r.summary.includes('every model')&&r.summary.includes('Benefit of Cover'))).toBe(true);
  expect(rows.map(r=>r.id)).toEqual(expect.arrayContaining([
   '11e-ts-profile:Sekhetar Robots#1:Stealth:Shooting:opponent',
   '11e-ts-profile:Sekhetar Robots#1:Stealth:Movement:own',
  ]));
  expect(named(a,id('Rubric Marines')+' · Stealth')).toEqual([]);
 });

 it('checks Lucius’s Lone Operative against return-fire eligibility only while unattached',()=>{
  const a=army('Emperor’s Children',['Lucius the Eternal','Flawless Blades']),rows=named(a,id('Lucius the Eternal')+' · Lone Operative');
  expect(stages(rows)).toEqual(rangedDefence);
  expect(rows.every(r=>r.units?.join()===id('Lucius the Eternal')&&r.summary.includes('outside 12″')&&r.summary.includes('Indirect Fire'))).toBe(true);
  const attached=setInstanceAttachment(a,id('Lucius the Eternal'),id('Flawless Blades'));
  expect(named(attached,id('Lucius the Eternal')+' · Lone Operative')).toEqual([]);
 });

 it.each([
  ['Immaterial Interdiction','Interceptor Squad','Astral Overlap','000010928003',undefined],
  ['Warpbane Task Force','Grand Master','Phial of the Abyss','000009777004','Brotherhood Terminator Squad'],
 ] as const)('applies %s / %s’s %s only to the selected formation',(detachment,bearer,upgrade,sourceRuleId,bodyguard)=>{
  const root=bodyguard??bearer;
  let a=army('Grey Knights',bodyguard?[bearer,bodyguard,bodyguard]:[bearer,bearer],[detachment]);
  if(bodyguard)a=setInstanceAttachment(a,id(bearer),id(bodyguard));
  const title=id(bearer)+' · '+upgrade;
  expect(named(a,title)).toEqual([]);
  a=selectUpgrade2026(a,id(bearer),upgrade);
  const rows=named(a,title);
  expect(stages(rows)).toEqual(rangedDefence);
  expect(rows.every(r=>r.units?.join()===id(root)&&r.sourceRuleId===sourceRuleId&&r.summary.includes('Benefit of Cover'))).toBe(true);
  expect(rows.map(r=>r.id)).toEqual(expect.arrayContaining([
   '11e-gk-det-'+sourceRuleId+'-'+id(bearer)+'-Shooting-opponent',
   '11e-gk-det-'+sourceRuleId+'-'+id(bearer)+'-Movement-own',
  ]));
  unique(generate11thReminders(a));
 });
});
