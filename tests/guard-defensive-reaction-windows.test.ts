// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {GeneratedReminder} from '../src/generated-reminders';
import type {RosterInstance} from '../src/roster-instances';
import {astraMilitarumLoadout} from '../src/astra-militarum-loadouts';
import {astraProfileReminders,broodBrotherProfileReminders} from '../src/brood-brother-profiles';
import {generate11thReminders} from '../src/reminders-11th';

// Primary Core §§05.03–05.04, 24.24 and 24.33 apply personal saves,
// Lone Operative and Stealth to qualifying attacks regardless of phase.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// Normal incoming Movement fire: Deathmarks / Hyperspace Hunters (000000537).
// Incoming own-Shooting fire: Hexmark / Multi-threat Eliminator (000002355).
// https://wahapedia.ru/wh40k11ed/factions/necrons/Deathmarks
// https://wahapedia.ru/wh40k11ed/factions/necrons/Hexmark-Destroyer
// Primary Astra Militarum pack v1.3 p24: Servo-sentry shoots on Deep Strike,
// including the Aquilons' own Movement phase (the defender's opponent turn).
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_astra_militarum-1hevkhdpmv-stfkch2tsz.pdf#page=24
// Nov 23, 2026 app export: Datasheets_models 000002607 / 000002485;
// Datasheets_abilities 000000723 / 000001398 (physical shield bearers),
// 000004224 / 000001406 / 000002485 (native Stealth/Lone Operative).
// https://wahapedia.ru/wh40k11ed/factions/astra-militarum/

type Host='Astra Militarum'|'Genestealer Cults';
const hosts=['Astra Militarum','Genestealer Cults'] as const;
const squad=(unit:string,n=1,models?:number):RosterInstance=>({unit,id:unit+'#'+n,models});
function army(host:Host,roster:RosterInstance[]):ArmySelection{
 const units:Record<string,number>={};
 for(const s of roster)units[s.unit]=(units[s.unit]??0)+1;
 return {...newSelection(host),detachments2026:[host==='Astra Militarum'?'Combined Arms':'Brood Brothers Auxilia'],instances:roster,units};
}
function choose(s:RosterInstance,role:string,item:string):RosterInstance{
 const slot=astraMilitarumLoadout(s.unit,s.models)!.slots.find(k=>k.name.includes(role)&&k.choices.some(c=>c.name===item));
 if(!slot)throw Error(s.unit+' has no '+role+' / '+item);
 return {...s,knightGear:{...s.knightGear,[slot.name]:item}};
}
const named=(a:ArmySelection,title:string)=>generate11thReminders(a).filter(r=>r.title===title);
const stages=(rows:GeneratedReminder[])=>rows.map(r=>[r.window,r.turn,r.timing].join(':')).sort();
const ranged=['Shooting:opponent:during','Movement:own:during','Shooting:own:during','Movement:opponent:during'].sort();
const allAttacks=[...ranged,'Fight:either:during'].sort();
const prefix=(host:Host)=>host==='Astra Militarum'?'11e-guard-profile':'11e-brood-profile';
function assertPassiveMovement(rows:GeneratedReminder[],oldId:string){
 const movement=rows.filter(r=>r.window==='Movement'&&r.turn==='own');
 expect(movement).toMatchObject([{id:oldId,turn:'own',timing:'during'}]);
 expect(movement[0].summary).toContain('permitted normal enemy reactions and Fire Overwatch at phase end');
 expect(movement[0].previousSheetEntry).toBeUndefined();
 const own=rows.filter(r=>r.window==='Shooting'&&r.turn==='own');
 expect(own).toHaveLength(1);
 expect(own[0].summary).toContain('permitted enemy return fire');
 expect(own[0].id).not.toBe(oldId);
 expect(own[0].previousSheetEntry).toBeUndefined();
 const opponent=rows.filter(r=>r.window==='Movement'&&r.turn==='opponent');
 expect(opponent).toMatchObject([{id:oldId.replace(/:own$/,':opponent'),timing:'during'}]);
 expect(opponent[0].summary).toContain('permitted enemy shooting in their Movement phase');
 expect(opponent[0].previousSheetEntry).toBeUndefined();
}
function unique(a:ArmySelection){
 const rows=generate11thReminders(a);
 expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
}

describe('shared Guard and Brood Brothers personal defenses',()=>{
 it.each(hosts)('%s preserves the Castellan’s exact old IDs while adding only its personal return-fire save',host=>{
  const body=squad('Kasrkin'),leader={...squad('Cadian Castellan'),attachedTo:body.id},other=squad('Cadian Castellan',2);
  const a=army(host,[body,leader,other]),title=leader.id+' · Cadian Castellan · Invulnerable save',rows=named(a,title);
  expect(stages(rows)).toEqual(allAttacks);
  for(const row of rows){
   expect(row).toMatchObject({units:[leader.id],source:'https://wahapedia.ru/wh40k11ed/factions/astra-militarum/Cadian-Castellan'});
   expect(row.summary).toContain('allocated to the Cadian Castellan model');
   expect(row.summary).toContain('5+ invulnerable save');
  }
  const stem=prefix(host)+':'+leader.id+':Cadian Castellan · Invulnerable save:';
  expect(rows.map(r=>r.id)).toEqual(expect.arrayContaining([stem+'Shooting:opponent',stem+'Movement:own',stem+'Fight:either']));
  assertPassiveMovement(rows,stem+'Movement:own');
  const all=generate11thReminders(a).filter(r=>r.title.includes('Invulnerable save'));
  expect(all.every(r=>r.units?.length===1&&!r.units.includes(body.id))).toBe(true);
  expect(named(a,other.id+' · Cadian Castellan · Invulnerable save')).toHaveLength(5);
  unique(a);
 });

 it('keeps Gaunt’s 5+ save on Ibram Gaunt rather than the other five Ghosts',()=>{
  const ghosts=squad('Gaunt’s Ghosts'),a=army('Astra Militarum',[ghosts]),rows=named(a,ghosts.id+' · Ibram Gaunt · Invulnerable save');
  expect(stages(rows)).toEqual(allAttacks);
  expect(rows.every(r=>r.units?.join()===ghosts.id&&r.summary.includes('allocated to the Ibram Gaunt model')&&r.summary.includes('5+ invulnerable save'))).toBe(true);
  assertPassiveMovement(rows,'11e-guard-profile:'+ghosts.id+':Ibram Gaunt · Invulnerable save:Movement:own');
  expect(generate11thReminders(a).filter(r=>r.title.includes('Invulnerable save'))).toEqual(rows);
  unique(a);
 });

 it('keeps mixed Bullgryn shield counts on their actual squad and separates neighbouring loadouts',()=>{
  const mixed=choose(squad('Bullgryn Squad',1,3),'Bullgryn 2 ·','Brute shield'),stock=squad('Bullgryn Squad',2,3),a=army('Astra Militarum',[mixed,stock]);
  for(const [item,wording] of [['Brute Shield','only the 1 Brute Shield bearer in '+mixed.id+' has a 4+ invulnerable save'],['Slabshield','only the 2 Slabshield bearers in '+mixed.id+' have a Wounds characteristic of 4']] as const){
   const rows=named(a,mixed.id+' · '+item);
   expect(stages(rows)).toEqual(allAttacks);
   expect(rows.every(r=>r.units?.join()===mixed.id&&r.summary.includes(wording))).toBe(true);
   assertPassiveMovement(rows,'11e-guard-profile:'+mixed.id+':'+item+':Movement:own');
  }
  expect(named(a,stock.id+' · Brute Shield')).toEqual([]);
  expect(named(a,stock.id+' · Slabshield').every(r=>r.summary.includes('3 Slabshield bearers')&&r.units?.join()===stock.id)).toBe(true);
  unique(a);
 });

 it.each([['Brute shield','Brute Shield','4+ invulnerable save'],['Slabshield','Slabshield','Wounds characteristic of 7']] as const)('keeps an Ogryn Bodyguard’s %s on the valid physical protector',(pick,title,effect)=>{
  const body=squad('Cadian Shock Troops',1,10),cmd={...squad('Cadian Command Squad'),attachedTo:body.id};
  const protector={...choose(squad('Ogryn Bodyguard'),'Huge knife',pick),retinueTo:cmd.id};
  const a=army('Astra Militarum',[body,cmd,protector]),rows=named(a,protector.id+' · '+title);
  expect(stages(rows)).toEqual(allAttacks);
  expect(rows.every(r=>r.units?.join()===protector.id&&r.summary.includes('only the 1 '+title+' bearer')&&r.summary.includes(effect))).toBe(true);
  assertPassiveMovement(rows,'11e-guard-profile:'+protector.id+':'+title+':Movement:own');
  expect(astraProfileReminders(a,[body,cmd]).some(r=>r.title===protector.id+' · '+title)).toBe(false);
  const illegal={...protector,retinueTo:body.id};
  expect(named(army('Astra Militarum',[body,cmd,illegal]),protector.id+' · '+title)).toEqual([]);
  unique(a);
 });
});

describe('Guard concealment and incoming reaction timing',()=>{
 it.each(hosts)('%s shows Recon Stealth during normal Movement reactions, Overwatch and return fire',host=>{
  const recon=squad('Cadian Recon Squad'),plain=squad('Cadian Shock Troops',1,10),a=army(host,[recon,plain]),rows=named(a,recon.id+' · Stealth');
  expect(stages(rows)).toEqual(ranged);
  expect(rows.every(r=>r.units?.join()===recon.id&&r.summary.includes('Benefit of Cover against ranged attacks while every model has Stealth'))).toBe(true);
  assertPassiveMovement(rows,prefix(host)+':'+recon.id+':Stealth:Movement:own');
  expect(rows.map(r=>r.id)).toContain(prefix(host)+':'+recon.id+':Stealth:Shooting:opponent');
  expect(named(a,plain.id+' · Stealth')).toEqual([]);
  unique(a);
 });

 it.each(['Gaunt’s Ghosts','Sly Marbo'])('%s keeps its Lone Operative and Stealth conditions in all incoming ranged windows',unit=>{
  const s=squad(unit),a=army('Astra Militarum',[s,squad('Cadian Shock Troops',1,10)]);
  const stealth=unit==='Gaunt’s Ghosts'?'Stealth · Tanith Camo-cloaks':'Stealth';
  for(const title of [stealth,'Lone Operative']){
   const rows=named(a,s.id+' · '+title);
   expect(stages(rows)).toEqual(ranged);
   expect(rows.every(r=>r.units?.join()===s.id)).toBe(true);
   assertPassiveMovement(rows,'11e-guard-profile:'+s.id+':'+title+':Movement:own');
   if(title==='Lone Operative')expect(rows.every(r=>r.summary.includes('Unless part of an attached unit')&&r.summary.includes('outside 12″')&&r.summary.includes('Indirect Fire'))).toBe(true);
   else expect(rows.every(r=>r.summary.includes('every model has Stealth'))).toBe(true);
  }
  unique(a);
 });

 it.each(hosts)('%s does not transfer concealment or personal saves across an illegal join',host=>{
  const recon=squad('Cadian Recon Squad'),officer={...squad('Cadian Castellan'),attachedTo:recon.id},a=army(host,[recon,officer]);
  expect(named(a,recon.id+' · Stealth').every(r=>r.units?.join()===recon.id)).toBe(true);
  expect(named(a,officer.id+' · Stealth')).toEqual([]);
  const saves=named(a,officer.id+' · Cadian Castellan · Invulnerable save');
  expect(saves).toHaveLength(5);
  expect(saves.every(r=>r.units?.join()===officer.id)).toBe(true);
  unique(a);
 });

 it('preserves outgoing snap fire and Rapid Ingress at phase end and keeps objective-control checks at end',()=>{
  const scions=squad('Tempestus Scions',1,5),bane=squad('Baneblade'),recon=squad('Cadian Recon Squad');
  const a=army('Astra Militarum',[scions,bane,recon]),rows=astraProfileReminders(a,a.instances!);
  expect(rows.find(r=>r.title===scions.id+' · Ranged weapon profiles'&&r.window==='Movement')).toMatchObject({turn:'opponent',timing:'end',summary:expect.stringContaining('snap shooting')});
  expect(rows.find(r=>r.title===scions.id+' · Deep Strike · Rapid Ingress')).toMatchObject({turn:'opponent',timing:'end'});
  const oc=rows.filter(r=>r.title===bane.id+' · Damaged · Objective Control');
  expect(oc).toHaveLength(5);
  expect(oc.every(r=>r.timing==='end')).toBe(true);
  expect(rows.filter(r=>r.title===recon.id+' · Stealth'&&r.window==='Movement')).toMatchObject([{turn:'own',timing:'during'},{turn:'opponent',timing:'during'}]);
 });

 it('covers incoming attacks on the enemy’s Movement turn without turning defensive rows into shooting permission',()=>{
  const aquilons=squad('Tempestus Aquilons'),attackers=army('Astra Militarum',[aquilons]);
  const arrival=generate11thReminders(attackers).find(r=>r.title==='Servo-sentry'&&r.window==='Movement'&&r.turn==='own');
  expect(arrival).toMatchObject({timing:'during',source:'https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_astra_militarum-1hevkhdpmv-stfkch2tsz.pdf#page=24'});
  expect(arrival?.summary).toContain('After this unit sets up using Deep Strike');
  for(const host of hosts){
   const recon=squad('Cadian Recon Squad'),a=army(host,[recon]);
   const incoming=named(a,recon.id+' · Stealth').find(r=>r.window==='Movement'&&r.turn==='opponent');
   expect(incoming).toMatchObject({timing:'during',units:[recon.id],summary:expect.stringContaining('permitted enemy shooting')});
   expect(incoming?.summary).toContain('attacks after a Deep Strike arrival');
  }
 });

 it('does not introduce native-only Ghosts, Marbo or shield bearers into Brood Brothers, or bypass its enabling detachment',()=>{
  const units=[squad('Gaunt’s Ghosts'),squad('Sly Marbo'),squad('Bullgryn Squad',1,3),squad('Ogryn Bodyguard')],a=army('Genestealer Cults',units);
  expect(broodBrotherProfileReminders(a,units)).toEqual([]);
  const permitted=[squad('Cadian Castellan'),squad('Cadian Recon Squad')],other={...army('Genestealer Cults',permitted),detachments2026:['Final Day']};
  expect(broodBrotherProfileReminders(other,permitted)).toEqual([]);
 });

 it.each(hosts)('%s does not print passive personal saves or cover from zero-model profile entries',host=>{
  const empty=[{...squad('Cadian Castellan'),models:0},{...squad('Cadian Recon Squad'),models:0}],a=army(host,empty);
  const generated=host==='Astra Militarum'?astraProfileReminders(a,empty):broodBrotherProfileReminders(a,empty);
  expect(generated.filter(r=>r.title.includes('Invulnerable save')||r.title.includes('Stealth')||r.title.includes('Lone Operative'))).toEqual([]);
 });

 it('does not print Ghost, shield or Feel No Pain protection from zero-model native units',()=>{
  const empty=['Gaunt’s Ghosts','Sly Marbo','Bullgryn Squad'].map(unit=>({...squad(unit),models:0})),a=army('Astra Militarum',empty);
  const generated=astraProfileReminders(a,empty);
  expect(generated.filter(r=>/Invulnerable save|Stealth|Lone Operative|Brute Shield|Slabshield|Feel No Pain/.test(r.title))).toEqual([]);
 });
});
