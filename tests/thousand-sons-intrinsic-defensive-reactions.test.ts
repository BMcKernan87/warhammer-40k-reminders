// @vitest-environment node
import {describe,expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import type {GeneratedReminder} from '../src/generated-reminders';
import {generate11thReminders} from '../src/reminders-11th';
import {expandRoster,individualArmy,setInstanceAttachment,type RosterInstance} from '../src/roster-instances';
import {thousandSonsIntrinsicReminders} from '../src/thousand-sons-intrinsic';

// November 23 reproduced cards: these passive defenses have no phase restriction.
// Magnus's choice lasts to the next battle round; the Psyker/leader/aura/model
// conditions below remain necessary in every incoming attack window.
// https://wahapedia.ru/wh40k11ed/factions/thousand-sons/Magnus-The-Red
// https://wahapedia.ru/wh40k11ed/factions/thousand-sons/Scarab-Occult-Terminators
// https://wahapedia.ru/wh40k11ed/factions/thousand-sons/Daemon-Prince-of-Tzeentch
// https://wahapedia.ru/wh40k11ed/factions/thousand-sons/Infernal-Master
// https://wahapedia.ru/wh40k11ed/factions/thousand-sons/Exalted-Sorcerer
// https://wahapedia.ru/wh40k11ed/factions/thousand-sons/Exalted-Sorcerer-on-Disc-of-Tzeentch
// Primary Core 15.09, 19.03–19.04, 24.24 and 24.33: snap shooting only
// restricts Hit modifiers/re-rolls; personal abilities remain personal; an
// original surviving Leader retains its own while-leading abilities.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
// Primary Astra Militarum v1.3 p24: Servo-sentry fires when arriving with
// Deep Strike, including the enemy's own Movement and a Rapid Ingress arrival.
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_astra_militarum-1hevkhdpmv-stfkch2tsz.pdf#page=24
// Other normal reactive fire examples: Hyperspace Hunters and Multi-threat Eliminator.
// https://wahapedia.ru/wh40k11ed/factions/necrons/Deathmarks
// https://wahapedia.ru/wh40k11ed/factions/necrons/Hexmark-Destroyer

const id=(name:string,n=1)=>name+'#'+n;
function army(...units:string[]):ArmySelection{
 let a=individualArmy({...newSelection('Thousand Sons'),detachments2026:['Grand Coven']});
 for(const unit of units)a=addSelectionUnit(a,unit);
 return a;
}
const named=(a:ArmySelection,title:string,roster?:readonly RosterInstance[])=>(roster===undefined?generate11thReminders(a):thousandSonsIntrinsicReminders(a,roster)).filter(r=>r.title===title);
const stages=(rows:GeneratedReminder[])=>rows.map(r=>[r.window,r.turn,r.timing].join(':')).sort();
const rangedDefence=['Shooting:opponent:during','Movement:own:during','Shooting:own:during','Movement:opponent:during'];
const cardId=(unit:string,title:string,stage:string)=>'11e-ts-card:'+id(unit)+':'+title+':'+stage;

describe('Thousand Sons intrinsic defenses during incoming reactions',()=>{
 it.each([
  ['Magnus The Red','Impossible Form',undefined,false,true],
  ['Scarab Occult Terminators','Rites of Coalescence',undefined,false,true],
  ['Daemon Prince of Tzeentch','Servile Pawns','Rubric Marines',false,false],
  ['Daemon Prince of Tzeentch','Glamour of Tzeentch','Rubric Marines',false,false],
  ['Exalted Sorcerer on Disc of Tzeentch','Illusions of Tzeentch','Tzaangor Enlightened',true,false],
 ] as const)('%s / %s covers both Movement turns and own-Shooting return fire without changing old IDs',(unit,title,bodyguard,leading,melee)=>{
  let a=army(unit,...(bodyguard?[bodyguard]:[]));
  if(leading)a=setInstanceAttachment(a,id(unit),id(bodyguard!));
  const rows=named(a,title),oldStages=['Shooting:opponent:during','Movement:own:end',...(melee?['Fight:either:during']:[])];
  expect(stages(rows)).toEqual([...rangedDefence,...(melee?['Fight:either:during']:[])].sort());
  expect(rows.map(r=>r.id)).toEqual(expect.arrayContaining(oldStages.map(stage=>cardId(unit,title,stage))));
  expect(rows.find(r=>r.window==='Movement'&&r.turn==='own')).toMatchObject({id:cardId(unit,title,'Movement:own:end'),timing:'during'});
  expect(rows.find(r=>r.window==='Movement'&&r.turn==='opponent')?.id).toBe(cardId(unit,title,'Movement:opponent:during'));
  expect(rows.find(r=>r.window==='Shooting'&&r.turn==='own')?.id).toBe(cardId(unit,title,'Shooting:own:during'));
  const all=generate11thReminders(a);
  expect(new Set(all.map(r=>r.id)).size).toBe(all.length);
 });

 it('keeps Impossible Form personal, conditional on the round choice, and limited to non-Psychic damage',()=>{
  const a=army('Magnus The Red','Rubric Marines');
  for(const row of named(a,'Impossible Form')){
   expect(row.units).toEqual([id('Magnus The Red')]);
   expect(row.summary).toMatch(/If chosen this round.*subtract 1.*Damage.*non-Psychic attack against Magnus/);
  }
  expect(named(a,'Unearthly Power')).toMatchObject([{window:'Start of battle round',turn:'either',timing:'start',summary:expect.stringContaining('until the next battle round begins')}]);
  expect(named(a,'Treason of Tzeentch')).toMatchObject([{window:'Shooting',turn:'opponent',timing:'start'}]);
  expect(named(a,'Impossible Form',expandRoster(a).filter(s=>s.unit!=='Magnus The Red'))).toEqual([]);
 });

 it('keeps Rites on its own Scarab formation while any listed Psyker survives, and removes it when its Bodyguard source is destroyed',()=>{
  const a=setInstanceAttachment(army('Scarab Occult Terminators','Sorcerer In Terminator Armour','Rubric Marines'),id('Sorcerer In Terminator Armour'),id('Scarab Occult Terminators'));
  for(const row of named(a,'Rites of Coalescence')){
   expect(row.units).toEqual([id('Scarab Occult Terminators'),id('Sorcerer In Terminator Armour')]);
   expect(row.summary).toMatch(/While any Psyker model.*survives.*Scarab Occult Sorcerer.*Sorcerer in Terminator Armour.*subtract 1 from Wound rolls/);
  }
  const withoutLeader=expandRoster(a).filter(s=>s.unit!=='Sorcerer In Terminator Armour');
  expect(named(a,'Rites of Coalescence',withoutLeader)).toHaveLength(5);
  expect(named(a,'Rites of Coalescence',withoutLeader).every(r=>r.summary.includes('Scarab Occult Sorcerer')&&!r.summary.includes('Sorcerer in Terminator Armour'))).toBe(true);
  const withoutBodyguard=expandRoster(a).filter(s=>s.unit!=='Scarab Occult Terminators');
  expect(named(a,'Rites of Coalescence',withoutBodyguard)).toEqual([]);
 });

 it('keeps the Prince’s own Lone Operative separate from the Infantry Stealth aura and requires a live source and native Infantry',()=>{
  const a={...army('Daemon Prince of Tzeentch','Rubric Marines','Chaos Rhino','Pink Horrors'),detachments2026:['Changehost of Deceit']};
  for(const title of ['Servile Pawns','Glamour of Tzeentch']){
   const rows=named(a,title);
   expect(rows.every(r=>r.units?.join()===id('Daemon Prince of Tzeentch')+','+id('Rubric Marines'))).toBe(true);
   expect(named(a,title,expandRoster(a).filter(s=>s.unit!=='Daemon Prince of Tzeentch'))).toEqual([]);
   expect(named(a,title,expandRoster(a).filter(s=>s.unit!=='Rubric Marines'))).toEqual([]);
  }
  expect(named(a,'Servile Pawns').every(r=>/within 3″.*Thousand Sons Infantry.*this Prince has Lone Operative/.test(r.summary))).toBe(true);
  expect(named(a,'Glamour of Tzeentch').every(r=>/friendly Thousand Sons Infantry.*within 6″.*Stealth.*Benefit of Cover against ranged attacks/.test(r.summary)&&!r.summary.includes('Hit roll'))).toBe(true);
 });

 it('gives the Infernal Master one personal use per turn across defensive saves and offensive rolls, including incoming Movement before its Overwatch',()=>{
  const a=setInstanceAttachment(army('Infernal Master','Rubric Marines'),id('Infernal Master'),id('Rubric Marines'));
  const rows=named(a,'Glimpse of Eternity');
  expect(stages(rows)).toEqual([...rangedDefence,'Fight:either:during','Movement:opponent:end'].sort());
  expect(rows.every(r=>r.units?.join()===id('Infernal Master'))).toBe(true);
  expect(rows.map(r=>r.id)).toEqual(expect.arrayContaining([
   'Shooting:own:during','Movement:opponent:end','Shooting:opponent:during','Movement:own:end','Fight:either:during',
  ].map(stage=>cardId('Infernal Master','Glimpse of Eternity',stage))));
  expect(rows.filter(r=>r.window==='Shooting'&&r.turn==='own')).toHaveLength(1);
  expect(rows.find(r=>r.window==='Movement'&&r.turn==='opponent'&&r.timing==='during')).toMatchObject({
   summary:expect.stringMatching(/once per turn change one saving throw made for this Infernal Master to an unmodified 6.*shares its use.*Hit or Wound roll.*Overwatch later this phase/),
  });
  expect(rows.filter(r=>!(r.window==='Movement'&&r.turn==='opponent'&&r.timing==='during')).every(r=>r.summary.includes('All three roll types share that use'))).toBe(true);
  expect(named(a,'Glimpse of Eternity',expandRoster(a).filter(s=>s.unit!=='Infernal Master'))).toEqual([]);
 });

 it('leaves the Forgefiend’s phase-locked activation and next-turn expiry intact',()=>{
  const rows=named(army('Forgefiend'),'Blazing Salvoes');
  expect(stages(rows)).toEqual(['Shooting:own:during']);
  expect(rows.find(r=>r.turn==='own')?.summary).toMatch(/After this Forgefiend shoots in your Shooting phase.*until your next turn starts/);
  const followups=named(army('Forgefiend'),'Blazing Salvoes · suppressed enemy');
  expect(stages(followups)).toEqual(['Shooting:own:during','Shooting:opponent:during','Movement:opponent:during','Fight:either:during'].sort());
  expect(followups.every(r=>r.summary.includes('expires at the start of your next turn'))).toBe(true);
 });
});

describe.each([
 ['Exalted Sorcerer','Arcane Shield',5],
 ['Exalted Sorcerer on Disc of Tzeentch','Illusions of Tzeentch',4],
] as const)('%s original leading defense',(unit,title,count)=>{
 const declared=()=>setInstanceAttachment(army(unit,'Rubric Marines','Rubric Marines','Sekhetar Robots'),id(unit),id('Rubric Marines'));

 it('retains the defense only on the surviving original Leader after its Bodyguard dies',()=>{
  const a=declared(),live=expandRoster(a).filter(s=>s.id!==id('Rubric Marines'));
  const rows=named(a,title,live);
  expect(rows).toHaveLength(count);
  expect(rows.every(r=>r.units?.join()===id(unit)&&r.summary.includes('started the battle in this legal attached formation'))).toBe(true);
  expect(rows.map(r=>r.id)).toEqual(named(a,title).map(r=>r.id));
  expect(named(a,title,expandRoster(a).filter(s=>s.id!==id(unit)))).toEqual([]);
  expect(named(a,title,expandRoster(a).map(s=>s.id===id(unit)?{...s,models:0}:s))).toEqual([]);
  const emptyBodyguard=expandRoster(a).map(s=>s.id===id('Rubric Marines')?{...s,models:0}:s);
  expect(named(a,title,emptyBodyguard).every(r=>r.units?.join()===id(unit))).toBe(true);
  expect(named(a,title,emptyBodyguard)).toHaveLength(count);
 });

 it('does not invent an original leading benefit from an illegal pair or a later attachment',()=>{
  const unattached=army(unit,'Rubric Marines','Sekhetar Robots');
  const laterJoin=expandRoster(unattached).map(s=>s.unit===unit?{...s,attachedTo:id('Rubric Marines')}:s);
  expect(named(unattached,title,laterJoin)).toEqual([]);
  const illegal={...unattached,instances:expandRoster(unattached).map(s=>s.unit===unit?{...s,attachedTo:id('Sekhetar Robots')}:s)};
  expect(named(illegal,title)).toEqual([]);
  expect(named(illegal,title,expandRoster(illegal).filter(s=>s.unit!=='Sekhetar Robots'))).toEqual([]);
 });

 it('rejects a reused source ID or a changed Bodyguard identity',()=>{
  const a=declared();
  const changedSource=expandRoster(a).map(s=>s.unit===unit?{...s,unit:unit==='Exalted Sorcerer'?'Exalted Sorcerer on Disc of Tzeentch':'Exalted Sorcerer'}:s);
  for(const defense of ['Arcane Shield','Illusions of Tzeentch'])expect(named(a,defense,changedSource)).toEqual([]);
  const changedBodyguard=expandRoster(a).map(s=>s.id===id('Rubric Marines')?{...s,unit:'Tzaangor Enlightened',models:3}:s);
  expect(named(a,title,changedBodyguard)).toEqual([]);
 });

 it('does not transfer the defense to another legal Bodyguard or an undeclared joined model',()=>{
  const a=declared();
  const moved=expandRoster(a).map(s=>s.unit===unit?{...s,attachedTo:id('Rubric Marines',2)}:s);
  expect(named(a,title,moved)).toEqual([]);
  const extra=[...expandRoster(a),{id:'Infernal Master#99',unit:'Infernal Master',models:1,attachedTo:id('Rubric Marines')}];
  expect(named(a,title,extra)).toEqual([]);
 });
});
