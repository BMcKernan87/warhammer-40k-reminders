import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {detachmentBudget} from '../src/edition-2026';
import type {RosterInstance} from '../src/roster-instances';
import {WORLD_EATERS_SHEETS} from '../src/world-eaters-data';
import {eligibleWorldEatersUpgrades,worldEatersDetachmentReminders as generate} from '../src/world-eaters-detachments';

const war='Berzerker Warband',engines='Brazen Engines',idols='Cult of Blood',vessels='Vessels of Wrath',legion='Khorne Daemonkin',gore='Goretrack Onslaught',possessed='Possessed Slaughterband',butchers='Butchers of Khorne';
const prince='Daemon Prince of Khorne',lord='Lord on Juggernaut',berzerkers='Khorne Berzerkers',rhino='Chaos Rhino',terms='Chaos Terminators';
function force(detachments:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={};
 return {...newSelection('World Eaters'),units:counts,detachments2026:detachments,instances:units.map(unit=>({unit,id:unit+'#'+(counts[unit]=(counts[unit]??0)+1)}))};
}
const equip=(a:ArmySelection,u:string,enhancement:string)=>({...a,upgrades2026:{[u+'#1']:enhancement}});
const config=(a:ArmySelection,u:string,p:Partial<RosterInstance>):ArmySelection=>({...a,instances:a.instances?.map(x=>x.unit===u?{...x,...p}:x)});
const rule=(a:ArmySelection,k:string)=>generate(a).filter(r=>r.sourceRuleId===k);
const named=(a:ArmySelection,name:string)=>generate(a).filter(r=>r.title===name);
describe('World Eaters detachment effects',()=>{
 it('uses all current compositions, costs and dispositions and distinguishes real keywords from the Goretrack name',()=>{
  expect(detachmentBudget('World Eaters',[engines,gore],'Strike Force')).toMatchObject({spent:3,valid:true,dispositions:['Disruption','Take and Hold']});
  expect(eligibleWorldEatersUpgrades(force([legion],lord),lord)).toContainEqual(expect.objectContaining({name:'Disciple of Khorne',points:15,repeatable:false}));
  expect(eligibleWorldEatersUpgrades(force([engines],rhino),rhino)).toContainEqual(expect.objectContaining({name:'Murder-Forged Entity',points:15,repeatable:true}));
  expect(eligibleWorldEatersUpgrades(force([engines],'Knight Rampager'),'Knight Rampager')).toHaveLength(0);
 });
 it('applies the September Relentless Rage to all friendly World Eaters melee and excludes imported Knights and Blood Legions',()=>{
  const a=force([war,legion],berzerkers,'Khârn The Betrayer','Bloodletters','Knight Rampager');
  const rage=named(a,'Relentless Rage')[0];
  expect(rage).toMatchObject({window:'Fight',turn:'either',units:[berzerkers+'#1','Khârn The Betrayer#1']});
  expect(rage.summary).toContain('1 Attack');
  expect(rule(a,'000008431007')[0]).toMatchObject({window:'Shooting',turn:'opponent',units:[berzerkers+'#1']});
  expect(rule(a,'000008431007')[0].summary).toContain('8″');
 });
 it('turns a specifically upgraded vehicle into a Daemon without promoting another copy, including offensive and defensive Stratagems',()=>{
  const raw=force([engines],rhino,rhino,'Maulerfiend','Khorne Lord of Skulls');
  const a=equip(raw,rhino,'Murder-Forged Entity');
  expect(named(a,'Terror of Khorne')[0].units).toEqual([rhino+'#1','Maulerfiend#1','Khorne Lord of Skulls#1']);
  expect(rule(a,'000010977004')[0].units).not.toContain('Khorne Lord of Skulls#1');
  expect(rule(a,'000010977004')[0].units).not.toContain(rhino+'#2');
  expect(rule(a,'000010977003')[0].units).toContain(rhino+'#1');
 });
 it('requires actual Rhino cargo and disembarking formations for Goretrack effects',()=>{
  const empty=force([gore],rhino,terms,'Eightbound');
  expect(rule(empty,'000010087005')).toHaveLength(0);
  expect(named(empty,'Rush to the Fray')).toHaveLength(0);
  const a=force([gore],rhino,'Chaos Land Raider',terms,berzerkers,'Master of Executions');
  expect(rule(a,'000010087007')[0]).toMatchObject({window:'Shooting',turn:'opponent',units:[rhino+'#1']});
  expect(rule(a,'000010087007')[0].summary).toContain('D6+2″');
  expect(rule(a,'000010087002')[0].units).toContain(terms+'#1');
  expect(rule(a,'000010087002')[0].units).not.toContain(rhino+'#1');
  expect(rule(equip(a,'Master of Executions','Aggressive Deployment'),'000010086003')[0].units).toEqual([rhino+'#1']);
 });
 it('limits Vessels melee options to actual non-Epic Character models and preserves Epic eligibility on the Fall Back reaction',()=>{
  const a=config(force([vessels],'Master of Executions',berzerkers,'Angron'),'Master of Executions',{attachedTo:berzerkers+'#1'});
  expect(named(a,'Wrath of Khorne')[0].units).toEqual(['Master of Executions#1']);
  expect(rule(a,'000009848003')[0].units).toEqual([berzerkers+'#1']);
  expect(rule(a,'000009848004')[0].units).toContain('Angron#1');
 });
 it('requires a Cult recipient and a friendly World Eaters Monster or Titanic bearer and computes the upgraded aura range',()=>{
  expect(named(force([idols],'Jakhals','Knight Rampager'),'Idols of Khorne')).toHaveLength(0);
  const a=equip(force([idols],prince,'Khorne Lord of Skulls','Jakhals'),prince,'Chosen of the Blood God');
  const choice=named(a,'Idols of Khorne')[0];
  expect(choice).toMatchObject({window:'Command',turn:'own',timing:'start'});
  expect(choice.summary).toContain(prince+'#1 9″');
  expect(choice.summary).toContain('Khorne Lord of Skulls#1 9″');
  expect(rule(a,'000010075004')[0].summary).toContain('5+ within 6″');
  expect(rule(force([idols],'Jakhals'),'000010075004')[0].summary).not.toContain('5+');
 });
 it('resolves mixed-faction Disciple membership, Blood Tithe recipients and the FAQ blessing transfer',()=>{
  const selected=equip(force([legion],lord,'Bloodcrushers','Flesh Hounds','Bloodletters',berzerkers),lord,'Disciple of Khorne');
  const a=config(selected,lord,{attachedTo:'Bloodcrushers#1'});
  expect(named(a,'Daemonic Rage · if activated')[0].units).toEqual(['Bloodcrushers#1','Flesh Hounds#1','Bloodletters#1']);
  expect(rule(a,'000010078004')[0].summary).toContain('attached formation benefits');
  const daemon=rule(a,'000010079006')[0];
  expect(daemon.units).toEqual([berzerkers+'#1']);
  expect(daemon.summary).toContain('one Mounted model');
  expect(daemon.summary).toContain('up to D3 Beast models');
  expect(daemon.summary).toContain('up to D6 Infantry models');
  expect(rule(a,'000010079005')[0].summary).toContain(berzerkers+'#1');
  expect(rule(force([legion],berzerkers),'000010079006')).toHaveLength(0);
  const onlyMortals=named(force([legion],berzerkers),'Blood Tithe · choose an ability')[0];
  expect(onlyMortals.summary).toContain('2 BTP');
  expect(onlyMortals.summary).not.toContain('5 BTP');
 });
 it('applies automatic melee Blood Tithe and fixed surges to the upgraded formation without a second random roll',()=>{
  const a=config(equip(force([legion],lord,berzerkers,'Jakhals'),lord,'Blade of Endless Bloodshed'),lord,{attachedTo:berzerkers+'#1'});
  const income=named(a,'Blood Tithe · earn points');
  expect(income.find(r=>r.window==='Fight')?.units??[]).not.toContain(lord+'#1');
  expect(income.find(r=>r.window==='Fight')?.units).toEqual(['Jakhals#1']);
  const b=config(equip(force([possessed],'Slaughterbound','Exalted Eightbound','Eightbound'),'Slaughterbound','Malicious Vigour'),'Slaughterbound',{attachedTo:'Exalted Eightbound#1'});
  expect(named(b,'Brazen Fury')[0].units).toEqual(['Eightbound#1']);
  expect(rule(b,'000010082002')[0].units).toEqual(['Exalted Eightbound#1']);
  const saves=named(a,'Enraged Abjuration · if activated');
  expect(saves.map(r=>r.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
  expect(saves.every(r=>r.turn==='either')).toBe(true);
 });
 it('uses the correct distinct Eightbound attack and Deep Strike restrictions',()=>{
  const bare=force([possessed],'Slaughterbound');
  expect(rule(bare,'000010083003')).toHaveLength(0);
  const regular=force([possessed],'Eightbound');
  expect(rule(regular,'000010083003')[0].summary).toContain('non-Monster, non-Vehicle');
  expect(rule(regular,'000010083005')).toHaveLength(0);
  const exalted=force([possessed],'Exalted Eightbound');
  expect(rule(exalted,'000010083003')[0].summary).not.toContain('non-Monster');
  expect(rule(exalted,'000010083005')[0]).toMatchObject({window:'Movement',turn:'own',units:['Exalted Eightbound#1']});
 });
 it('keeps the reserve Bloodletters reaction and limited powers in each printed window without duplicate cards',()=>{
  const a=force([legion,butchers],'Bloodletters',terms);
  const summon=rule(a,'000010079002');
  expect(summon.map(r=>r.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
  expect(summon.every(r=>r.turn==='either'&&r.summary.includes('more than 6″')&&r.summary.includes('Once per battle round'))).toBe(true);
  expect(named(a,'Adamantine Avalanche')[0]).toMatchObject({window:'Fight',timing:'start',units:[terms+'#1']});
  expect(new Set(generate(a).map(r=>r.id)).size).toBe(generate(a).length);
 });
 it.each([
  [war,'Master of Executions','Berzerker Glaive','Fight','Extra Attacks'],[war,'Master of Executions','Battle-lust','Charge','Unbridled Bloodlust'],
  [war,prince,'Helm of Brazen Ire','Shooting','Damage'],[war,prince,'Favoured of Khorne','Fight','two dice'],
  [engines,rhino,'Murder-Forged Entity','Pre-battle','Daemon'],[engines,'Maulerfiend','Talons of Butchery','Fight','Cleave 2'],
  [butchers,terms,'Gore-Stained Veterans','Fight','Weapon Skill'],[butchers,terms,'Sanctified in Slaughter','Command','Objective Control'],
  [idols,prince,'Brazen Form','Fight','Feel No Pain 5+'],[idols,prince,'Chosen of the Blood God','Pre-battle','3″'],
  [idols,'Master of Executions','Butcher Lord','Pre-battle','Infiltrators'],[idols,prince,'Strategic Slaughter','Pre-battle','up to three'],
  [gore,'Master of Executions','Aggressive Deployment','Pre-battle','Scouts 9″'],[gore,'Master of Executions','Murderous Onslaught','Movement','Fire Overwatch'],
  [gore,'Master of Executions','Infernal Infusion','Fight','Fights First'],[gore,'Master of Executions','Unleash Hell','Shooting','−1 to Hit'],
  [legion,lord,'Blood-forged Armour','Shooting','2+'],[legion,lord,'Disciple of Khorne','Pre-battle','cannot be Warlord'],
  [legion,lord,'Icon of War','Command','re-roll Battle-shock'],[legion,lord,'Blade of Endless Bloodshed','Fight','automatically'],
  [possessed,'Slaughterbound','Malicious Vigour','Shooting','of 6'],[possessed,prince,'Killing Clarity','Command','1CP'],
  [possessed,prince,'Frenzied Focus','Fight','Critical Hits'],[possessed,prince,'Violent Demise','Command','D3+1'],
  [vessels,prince,'Archslaughterer','Command','Once per battle per army'],[vessels,prince,'Gateways to Glory','Movement','Mobile'],
 ])('resolves a selected %s upgrade for its %s bearer at the applicable time',(det,bearer,name,phase,condition)=>{
  const a=force([det],...new Set([bearer,'Jakhals',rhino,'Bloodletters',berzerkers]));
  const option=eligibleWorldEatersUpgrades(a,bearer).find(x=>x.name===name);
  expect(option).toBeDefined();
  const cards=rule(equip(a,bearer,name),option!.id);
  expect(cards.find(r=>r.window===phase)?.summary).toContain(condition);
  expect(rule(a,option!.id)).toHaveLength(0);
 });
 it('includes all 39 current Stratagems with qualified real recipients and printable effects',()=>{
  for(const [det,count] of [[war,6],[engines,3],[butchers,3],[gore,6],[idols,6],[legion,6],[possessed,6],[vessels,3]] as const){
   const a=force([det],...WORLD_EATERS_SHEETS.map(s=>s.unit));
   const rows=generate(a).filter(r=>r.id.startsWith('11e-world-eaters-strat-'));
   expect(new Set(rows.map(r=>r.sourceRuleId)).size,det).toBe(count);
   expect(rows.every(r=>r.units?.length&&r.summary.length>30)).toBe(true);
   expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
  }
 });
});
