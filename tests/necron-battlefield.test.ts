import {describe,it,expect} from 'vitest';
import {CATALOG,addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {createBattle as createFreshBattle,advancePhase,validateBattleState,type Phase,type Player} from '../src/engine';
// These tests exercise in-battle mechanics after pre-battle resolution.
const createBattle=()=>({...createFreshBattle(),prebattle:{resolved:true,decisions:{}}});
import {battlefieldReminders,recordEnemyAttackDamage,latestObservation,measuringSquads,observe,useBattlefieldAbility,rosterHealth} from '../src/necron-battlefield';
import {expandRoster,setInstanceAttachment,setInstanceEquipment,setInstanceResurrectionOrb,setInstanceModelCount,setInstanceWargear} from '../src/roster-instances';
import type {Observation,Signal} from '../src/battlefield-events';
import {generate11thReminders} from '../src/reminders-11th';
import {resurrectionOrbUsageKey} from '../src/once-per-battle';

const roster=(...units:string[])=>units.reduce((a,u)=>addSelectionUnit(a,u),newSelection());
const at=(phase:Phase,player:Player='A',round=1)=>({...createBattle(),phase,player,round});
interface Example {unit:string;rule:string;phase:Phase;signal:Signal;other?:string;player?:Player;round?:number;facts?:Partial<Observation>;primary?:string}
const examples:Example[]=[
 {unit:'Illuminor Szeras',rule:'szeras',phase:'Shooting',signal:'shoot',other:'Immortals'},
 {unit:'Imotekh the Stormlord',rule:'imotekh-cp',phase:'Command',signal:'phaseStart'},
 {unit:'Nekrosor Ammentar',rule:'murder',phase:'Shooting',signal:'killed'},
 {unit:'Orikan the Diviner',rule:'stars',phase:'Fight',signal:'phaseStart'},
 {unit:'Trazyn the Infinite',other:'Technomancer',rule:'trazyn',phase:'Command',signal:'phaseStart'},
 {unit:'C’tan Shard of the Deceiver',rule:'necroadjust',phase:'Fight',signal:'allocated'},
 {unit:'C’tan Shard of the Nightbringer',rule:'drain',phase:'Fight',signal:'phaseEnd'},
 {unit:'C’tan Shard of the Void Dragon',rule:'matter',phase:'Shooting',signal:'phaseStart'},
 {unit:'The Silent King',rule:'command-king',phase:'Command',signal:'phaseStart'},
 {unit:'Chronomancer',rule:'chronometron',phase:'Shooting',signal:'shot',facts:{unengaged:true}},
 {unit:'Geomancer',rule:'geomancer',phase:'Movement',signal:'phaseStart'},
 {unit:'Hexmark Destroyer',rule:'hex-hits',phase:'Charge',player:'B',signal:'overwatch'},
 {unit:'Overlord',rule:'overlord',phase:'Fight',signal:'allocated'},
 {unit:'Overlord with translocation shroud',rule:'shroud',phase:'Movement',signal:'advance'},
 {unit:'Plasmancer',rule:'lightning',phase:'Shooting',signal:'phaseStart'},
 {unit:'Psychomancer',rule:'terror',phase:'Charge',signal:'phaseStart'},
 {unit:'Royal Warden',rule:'warden',phase:'Movement',signal:'fallback'},
 {unit:'Skorpekh Lord',rule:'skorpekh-lord',phase:'Charge',signal:'charged'},
 {unit:'Technomancer',rule:'tech-heal',phase:'Movement',signal:'phaseEnd'},
 {unit:'Transcendent C’tan',rule:'displace',phase:'Movement',signal:'advance'},
 {unit:'Lokhust Lord',rule:'hatred',phase:'Fight',signal:'fight',facts:{belowHalf:true}},
 {unit:'Catacomb Command Barge',rule:'command-shield',phase:'Shooting',player:'B',signal:'targeted',facts:{strength:9}},
 {unit:'Immortals',rule:'implacable-eradication',phase:'Fight',signal:'fight'},
 {unit:'Necron Warriors',rule:'legion',phase:'Command',signal:'reanimate'},
 {unit:'Ghost Ark',rule:'ghost-repair',phase:'Fight',signal:'enemyWounded',other:'Necron Warriors'},
 {unit:'Doom Scythe',rule:'doom-scythe',phase:'Shooting',signal:'deathRay'},
 {unit:'Canoptek Macrocytes',rule:'harassment',phase:'Fight',signal:'enemyAttacks',facts:{target:'other'}},
 {unit:'Canoptek Tomb Crawlers',rule:'crawlers',phase:'Shooting',signal:'shoot',facts:{range:12}},
 {unit:'Canoptek Wraiths',rule:'wraith-form',phase:'Movement',signal:'crossed'},
 {unit:'Cryptothralls',rule:'thrall-fight',phase:'Fight',signal:'meleeCasualty'},
 {unit:'Deathmarks',rule:'hunters',phase:'Movement',player:'B',signal:'arrival'},
 {unit:'Flayed Ones',rule:'flesh-hunger',phase:'Fight',signal:'fight',facts:{belowHalf:true}},
 {unit:'Lychguard',rule:'shield',phase:'Fight',signal:'allocated',primary:'Hyperphase sword and dispersion shield'},
 {unit:'Ophydian Destroyers',rule:'tunnelling',phase:'Fight',player:'B',signal:'phaseEnd'},
 {unit:'Skorpekh Destroyers',rule:'whirling',phase:'Fight',signal:'fight'},
 {unit:'Triarch Praetorians',rule:'charge-reroll',phase:'Charge',signal:'chargeRoll'},
 {unit:'Lokhust Destroyers',rule:'hard-wired',phase:'Shooting',signal:'shoot',facts:{closest:true}},
 {unit:'Lokhust Heavy Destroyers',rule:'optimised',phase:'Shooting',signal:'shoot',facts:{target:'vehicle'}},
 {unit:'Tomb Blades',rule:'tomb-evasion',phase:'Shooting',signal:'shot'},
 {unit:'Canoptek Scarab Swarms',rule:'scarab',phase:'Fight',signal:'phaseStart'},
 {unit:'Monolith',other:'Immortals',rule:'monolith',phase:'Movement',signal:'phaseStart',round:2},
 {unit:'Obelisk',rule:'gravitic',phase:'Movement',player:'B',signal:'phaseStart'},
 {unit:'Tesseract Vault',rule:'vault',phase:'Shooting',signal:'shoot'},
 {unit:'Seraptek Heavy Construct',rule:'seraptek',phase:'Fight',signal:'phaseStart'},
 {unit:'Night Scythe',other:'Immortals',rule:'invasion',phase:'Fight',signal:'phaseEnd'},
 {unit:'Annihilation Barge',rule:'arcing',phase:'Shooting',signal:'tesla'},
 {unit:'Canoptek Spyders',other:'Canoptek Scarab Swarms',rule:'spyder-swarm',phase:'Command',signal:'phaseStart'},
 {unit:'Doomsday Ark',rule:'doomsday-still',phase:'Movement',signal:'stationary'},
 {unit:'Canoptek Doomstalker',rule:'sentinel',phase:'Charge',player:'B',signal:'overwatch'},
 {unit:'Canoptek Reanimator',rule:'reanimation-beam',phase:'Command',signal:'reanimate'},
 {unit:'Triarch Stalker',rule:'relay',phase:'Shooting',signal:'shotHit'},
 {unit:'Convergence Of Dominion',rule:'nodes',phase:'Fight',signal:'allocated',other:'Immortals'},
];
describe('battlefield rules on the selectable Necron datasheets',()=>{
 it('exercises every datasheet on the army selector',()=>expect(examples.map(x=>x.unit).sort()).toEqual([...CATALOG.Necrons.units].sort()));
 it.each(examples)('$unit matches $rule and drops it when the bearer is off-table',e=>{
   let army=roster(e.unit,...(e.other?[e.other]:[]));
   const id=e.unit+'#1';
   if(e.primary)army=setInstanceEquipment(army,id,e.primary);
   const battle=at(e.phase,e.player,e.round);
   let observation:Observation|undefined;
   if(e.signal!=='phaseStart'&&e.signal!=='phaseEnd'){
     const squadId=['arrival','enemyAttacks'].includes(e.signal)?undefined:(e.other??e.unit)+'#1';
     observation={action:e.signal,squadId,...e.facts};
     if(measuringSquads(army,battle,e.signal,squadId).some(s=>s.id===id))observation.measurements={[id]:{distance:3,visible:true}};
     expect(validateBattleState(observe(army,battle,observation))).toBe(true);
   }
   const matches=(b:typeof battle)=>battlefieldReminders(army,b,e.signal,observation).filter(r=>r.ruleId===e.rule);
   expect(matches(battle)).toMatchObject([{squadId:id,source:expect.stringContaining('/wh40k11ed/')}]);
   expect(matches({...battle,positions:{[id]:'reserves'}})).toHaveLength(0);
 });
});
describe('battle actions, usage and persistence',()=>{
 it('only reacts to a visible arrival within 18 inches on the enemy turn, separately for each squad',()=>{
   const a=roster('Deathmarks','Deathmarks'),b=at('Movement','B');
   const first='Deathmarks#1',second='Deathmarks#2';
   const action:Observation={action:'arrival',measurements:{[first]:{distance:18,visible:true},[second]:{distance:18.01,visible:true}}};
   const recorded=observe(a,b,action);
   const matches=battlefieldReminders(a,recorded,'arrival',action);
   expect(matches.map(r=>r.squadId)).toEqual([first]);
   expect(battlefieldReminders(a,b,'arrival',{action:'arrival'})).toEqual([]);
   expect(battlefieldReminders(a,b,'arrival',{...action,measurements:{[first]:{distance:18,visible:false}}})).toEqual([]);
   expect(()=>observe(a,at('Movement'),action)).toThrow();
   expect(battlefieldReminders(a,{...at('Movement'),rosterPlayer:'B'},'arrival',action)).toHaveLength(1);
   const used=useBattlefieldAbility(a,recorded,'arrival',matches[0]);
   expect(()=>useBattlefieldAbility(a,used,'arrival',matches[0])).toThrow();
   expect(validateBattleState(JSON.parse(JSON.stringify(used)))).toBe(true);
   expect(latestObservation(advancePhase(used))).toBeUndefined();
   expect(battlefieldReminders(a,{...used,round:2},'arrival',action)).toHaveLength(1);
 });
 it('derives Ghost Ark eligibility from damage, distance and the exact surviving Warriors; prevents a second Ark selecting them this turn',()=>{
   const a=roster('Ghost Ark','Ghost Ark','Necron Warriors','Immortals');
   const squad=expandRoster(a).find(s=>s.unit==='Necron Warriors')!;
   const input:Observation={action:'enemyAttacked',squadId:squad.id,damage:2,measurements:{'Ghost Ark#1':{distance:3},'Ghost Ark#2':{distance:2}}};
   const b=observe(a,at('Fight','B'),input),event=latestObservation(b)!;
   expect(event.action).toBe('enemyWounded');expect(rosterHealth(a,b,squad).wounds).toBe(8);
   const matches=battlefieldReminders(a,b,event.action,event);expect(matches).toHaveLength(2);
   const used=useBattlefieldAbility(a,b,event.action,matches[0]);expect(battlefieldReminders(a,used,event.action,event)).toEqual([]);
   const dead=observe(a,at('Fight','B'),{...input,damage:10});
   expect(battlefieldReminders(a,dead,'enemyWounded',latestObservation(dead))).toEqual([]);
   const noLoss=observe(a,at('Fight','B'),{...input,damage:0});expect(battlefieldReminders(a,noLoss,'enemyAttacked',latestObservation(noLoss))).toEqual([]);
   expect(battlefieldReminders(a,b,event.action,{...event,squadId:'Immortals#1'})).toEqual([]);
 });
 it('carries stationary and charge choices to the correct later phase, squad and turn',()=>{
   const a=roster('Doomsday Ark','Doomsday Ark','Skorpekh Destroyers');
   const b=advancePhase(observe(a,at('Movement'),{action:'stationary',squadId:'Doomsday Ark#2'}));
   const fire=(id:string)=>battlefieldReminders(a,b,'shoot',{action:'shoot',squadId:id});
   expect(fire('Doomsday Ark#2').map(r=>r.ruleId)).toContain('doomsday-shoot');
   expect(fire('Doomsday Ark#1').some(r=>r.ruleId==='doomsday-shoot')).toBe(false);
   const c=advancePhase(observe(a,at('Charge'),{action:'charged',squadId:'Skorpekh Destroyers#1'}));
   expect(battlefieldReminders(a,c,'fight',{action:'fight',squadId:'Skorpekh Destroyers#1'})[0].text).toContain('charged this turn');
   expect(battlefieldReminders(a,{...c,player:'B'},'fight',{action:'fight',squadId:'Skorpekh Destroyers#1'})[0].text).toContain('rolls of 1');
 });
 it('applies a leader’s effect to its own formation and drops it on the death of either participant',()=>{
   let a=roster('Canoptek Wraiths','Canoptek Wraiths','Technomancer');
   a=setInstanceAttachment(a,'Technomancer#1','Canoptek Wraiths#2');
   const b=at('Fight'),w='Canoptek Wraiths#2';
   const match=(id:string)=>battlefieldReminders(a,b,'allocated',{action:'allocated',squadId:id});
   expect(match(w).map(r=>r.ruleId)).toContain('rites');expect(match('Canoptek Wraiths#1')).toEqual([]);
   expect(battlefieldReminders(a,{...b,positions:{[w]:'destroyed'}},'allocated',{action:'allocated',squadId:'Technomancer#1'})).toEqual([]);
   expect(battlefieldReminders(a,{...b,positions:{'Technomancer#1':'embarked'}},'allocated',{action:'allocated',squadId:w})).toEqual([]);
 });
 it('enforces per-bearer Orb use and the shared once-per-turn restriction, including older saved uses',()=>{
   let a=roster('Overlord','Overlord with translocation shroud','Catacomb Command Barge');
   a=setInstanceEquipment(a,'Overlord#1','Staff of light');a=setInstanceResurrectionOrb(a,'Overlord#1',true);
   const b=at('Charge');
   const orbs=battlefieldReminders(a,b,'phaseEnd').filter(r=>r.ruleId==='orb');expect(orbs).toHaveLength(2);
   const used=useBattlefieldAbility(a,b,'phaseEnd',orbs[0]);expect(battlefieldReminders(a,used,'phaseEnd').filter(r=>r.ruleId==='orb')).toHaveLength(0);
   expect(battlefieldReminders(a,{...used,player:'B'},'phaseEnd').filter(r=>r.ruleId==='orb')).toHaveLength(1);
   expect(battlefieldReminders(a,b,'phaseEnd',undefined,[resurrectionOrbUsageKey('Overlord#1')]).filter(r=>r.ruleId==='orb')).toHaveLength(1);
 });
 it('spends only the equipped number of Plasmacytes across phases, including after restoring a save',()=>{
   const id='Ophydian Destroyers#1',action:Observation={action:'fight',squadId:id};
   let a=roster('Ophydian Destroyers');a=setInstanceModelCount(a,id,6);a=setInstanceWargear(a,id,'Plasmacyte',2);
   let b=observe(a,at('Fight'),action);
   for(const n of [2,1]){
     const reminder=battlefieldReminders(a,b,'fight',action).find(r=>r.ruleId==='plasmacyte')!;
     expect(reminder.remaining).toBe(n);
     b=JSON.parse(JSON.stringify(useBattlefieldAbility(a,b,'fight',reminder)));
     expect(()=>useBattlefieldAbility(a,b,'fight',reminder)).toThrow();
     b=observe(a,{...b,round:b.round+1},action);
   }
   expect(battlefieldReminders(a,b,'fight',action).map(r=>r.ruleId)).not.toContain('plasmacyte');
 });
 it('gates equipment and summaries on individual squads and emits unique print IDs',()=>{
   const a=setInstanceWargear(roster('Canoptek Macrocytes','Canoptek Macrocytes'),'Canoptek Macrocytes#2','Accelerator mandible',1);
   const list=generate11thReminders(a);
   expect(list.filter(r=>r.title.includes('Accelerator Mandible')).map(r=>r.units)).toEqual([['Canoptek Macrocytes#2']]);
   expect(new Set(list.map(r=>r.id)).size).toBe(list.length);
   expect(battlefieldReminders(a,at('Fight'),'phaseStart').map(r=>r.squadId)).toEqual(['Canoptek Macrocytes#2']);
 });
 it('rejects malformed battle observations in backups and preserves pre-feature saves',()=>{
   const old=at('Command');expect(validateBattleState(old)).toBe(true);
   const b=observe(roster('Immortals'),at('Shooting'),{action:'shoot',squadId:'Immortals#1'});
   for(const observation of [{action:'unknown'},{action:'shoot'},{action:'arrival',squadId:'x'},{action:'shoot',squadId:'x',range:-1}]){
     expect(validateBattleState({...b,events:[{...b.events[0],observation}]})).toBe(false);
   }
 });
});

describe('weapon keywords follow the actual weapons being used',()=>{
 it('pairs Plasmancer critical hits with the appropriate Immortal weapons, with no cross-squad leak',()=>{
   const one='Immortals#1',two='Immortals#2';
   let army=setInstanceEquipment(roster('Immortals','Immortals','Plasmancer'),two,'Tesla carbine');
   army=setInstanceAttachment(army,'Plasmancer#1',two);
   const first=battlefieldReminders(army,at('Shooting'),'shoot',{action:'shoot',squadId:one});
   const second=battlefieldReminders(army,at('Shooting'),'shoot',{action:'shoot',squadId:two});
   expect(first.map(r=>r.text).join(' ')).toContain('Gauss blaster — Lethal Hits');
   expect(first.map(r=>r.ruleId)).not.toContain('harbinger');
   expect(second.map(r=>r.text).join(' ')).toMatch(/Tesla carbine — Assault.*Sustained Hits 2/);
   expect(second.map(r=>r.text).join(' ')).not.toContain('Gauss blaster');
   expect(second.map(r=>r.ruleId)).toContain('harbinger');
 });
 it('consults fixed, optional and mixed weapons, without showing selectable Vault powers as permanently equipped',()=>{
   const id='Canoptek Wraiths#1';const base=roster('Canoptek Wraiths');
   const shoot=(a:ArmySelection,unit:string)=>battlefieldReminders(a,at('Shooting'),'shoot',{action:'shoot',squadId:unit}).map(r=>r.text).join(' ');
   expect(shoot(base,id)).not.toContain('Particle caster');
   expect(shoot(setInstanceWargear(base,id,'Particle caster',1),id)).toContain('Particle caster');
   expect(shoot(roster('Tesseract Vault'),'Tesseract Vault#1')).not.toContain('Antimatter Meteor');
 });
});

describe('one-click enemy damage triggers',()=>{
 it('updates wounds and creates a battlefield trigger on the opponent turn',()=>{
  const army=roster('Necron Warriors');
  const squad=expandRoster(army)[0];
  const before=at('Shooting','B');
  const after=recordEnemyAttackDamage(army,before,squad,1);
  expect(rosterHealth(army,after,squad).wounds).toBe(rosterHealth(army,before,squad).wounds-1);
  expect(latestObservation(after)).toMatchObject({action:'enemyWounded',squadId:squad.id,damage:1});
  expect(validateBattleState(after)).toBe(true);
 });
 it('rejects own-turn damage, invalid amounts and repeat damage after destruction',()=>{
  const army=roster('Necron Warriors');const squad=expandRoster(army)[0];
  expect(()=>recordEnemyAttackDamage(army,at('Shooting','A'),squad,1)).toThrow();
  expect(()=>recordEnemyAttackDamage(army,at('Shooting','B'),squad,0)).toThrow();
  const wounded=recordEnemyAttackDamage(army,at('Shooting','B'),squad,1);
  expect(()=>recordEnemyAttackDamage(army,wounded,squad,999)).toThrow();
 });
});

describe('automatic squad action events',()=>{
 it('records normal movement and exposes its matching rules without manual reminder selection',()=>{
  const army=roster('Canoptek Wraiths');const squad=expandRoster(army)[0];
  const moved=observe(army,at('Movement'),{action:'normal',squadId:squad.id});
  expect(latestObservation(moved)).toMatchObject({action:'normal',squadId:squad.id});
  expect(moved.events.at(-1)?.kind).toBe('battlefield');
 });
 it('captures shooting and fight events with stable squad identity',()=>{
  const army=roster('Necron Warriors');const squad=expandRoster(army)[0];
  for(const [phase,action] of [['Shooting','shoot'],['Fight','fight']] as const){
   const next=observe(army,at(phase),{action,squadId:squad.id});
   expect(latestObservation(next)?.squadId).toBe(squad.id);
   expect(latestObservation(next)?.action).toBe(action);
  }
 });
});
