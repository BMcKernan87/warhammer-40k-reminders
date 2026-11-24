import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {necronKeywords as k} from './necron-wargear';

// Current 11e faction reference, including the published FAQ/errata.
export const COURT_HYPERCRYPT_SOURCE='https://wahapedia.ru/wh40k11ed/factions/necrons/';
export const COURT_BEARERS=['Chronomancer','Geomancer','Plasmancer','Psychomancer','Technomancer'] as const;
export const HYPERCRYPT_BEARERS=[...COURT_BEARERS,'Overlord','Overlord with translocation shroud','Royal Warden','Skorpekh Lord','Lokhust Lord','Hexmark Destroyer','Catacomb Command Barge','Transcendent C’tan'] as const;
const canoptek=new Set(['Canoptek Macrocytes','Canoptek Tomb Crawlers','Canoptek Wraiths','Canoptek Scarab Swarms','Canoptek Spyders','Canoptek Doomstalker','Canoptek Reanimator']);
export function canoptekHypercryptReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Necrons'||!roster.length)return [];
 const result:GeneratedReminder[]=[];
 const selected=army.detachments2026??[];
 const upgrade=(s:RosterInstance)=>army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit];
 const formations=roster.filter(s=>!s.attachedTo).map(s=>({id:s.id,members:[s,...roster.filter(l=>l.attachedTo===s.id)]}));
 const matching=(predicate:(unit:string)=>boolean)=>formations.filter(f=>f.members.some(s=>predicate(s.unit))).map(f=>f.id);
 const crypteks=matching(u=>k.CRYPTEK.has(u)),constructs=matching(u=>canoptek.has(u));
 const courtUnits=[...new Set([...crypteks,...constructs])];
 const emit=(id:string,title:string,window:ReminderWindow,summary:string,timing:'start'|'during'|'end'='during',units?:string[])=>result.push({id:'11e-necron-'+id,title,window,timing,summary,source:COURT_HYPERCRYPT_SOURCE,origin:'detachment',units});
 const bearer=(s:RosterInstance,id:string,title:string,window:ReminderWindow,summary:string,timing:'start'|'during'|'end'='during')=>emit(id+'-'+s.id,s.id+' · '+title,window,summary,timing,[s.id,...(s.attachedTo?[s.attachedTo]:[])]);
 if(selected.includes('Canoptek Court')){
  if(courtUnits.length){
   for(const phase of ['Command','Movement','Shooting','Charge','Fight'] as const)
    emit('court-matrix-'+phase,'Power Matrix · area control',phase,'Either turn, at phase start: your deployment zone always qualifies. No Man’s Land and the enemy deployment zone each qualify for this phase if they contain objectives and you control at least half of them.','start');
   for(const phase of ['Shooting','Fight'] as const){
    emit('canoptek-power-matrix-'+phase.toLowerCase(),'Canoptek Court · Power Matrix',phase,'Cryptek or Canoptek formations re-roll Hit rolls of 1; if wholly inside the matrix, re-roll all Hit rolls.','during',courtUnits);
    emit('court-cynosure-'+phase,'Cynosure of Eradication · 2CP',phase,(phase==='Shooting'?'Your Shooting phase: ':'Either Fight phase: ')+'Choose a qualifying unit wholly inside the matrix. Only its Cryptek or Canoptek models gain Devastating Wounds for this phase.','start',courtUnits);
    if(crypteks.length&&constructs.length)emit('court-curse-'+phase,'Curse of the Cryptek · 1CP',phase,(phase==='Shooting'?'Opponent’s Shooting phase: ':'Either Fight phase: ')+'After the attacker resolves attacks that destroyed a friendly Cryptek model, mark that attacker. Friendly Canoptek models gain +1 to Hit and Wound against it for the rest of the battle.','during',crypteks);
   }
  }
  if(crypteks.length)emit('court-solar','Solar Pulse · 1CP','Shooting','Start of your Shooting phase: choose an objective within 18″ of a Cryptek model. Necron ranged attacks against units in range of that objective gain Ignores Cover for the phase.','start',crypteks);
  if(constructs.length){
   emit('court-reactive','Reactive Subroutines · 1CP','Movement','Opponent’s turn: after an enemy finishes a Normal, Advance or Fall Back move within 8″, the Canoptek unit may make a Normal move up to 6″. Wraith Form can trigger.','during',constructs);
   emit('court-shift','Countertemporal Shift · 1CP','Shooting','Opponent’s turn: after enemy target selection, protect the targeted Canoptek unit; only attackers within 18″ may select it for ranged attacks for the phase.','during',constructs);
   emit('court-facade','Suboptimal Facade · 1CP','Charge','Opponent’s turn: when an enemy declares a charge against a Canoptek unit wholly inside the matrix, activate that unit’s Reanimation Protocols.','during',constructs);
  }
  for(const s of roster.filter(s=>COURT_BEARERS.some(u=>u===s.unit))){
   switch(upgrade(s)){
    case 'Dimensional Sanctum':bearer(s,'court-sanctum','Dimensional Sanctum','Pre-battle','The bearer’s formation gains Infiltrators.','start');break;
    case 'Hyperphasic Fulcrum':if(s.attachedTo)for(const phase of ['Shooting','Fight'] as const)bearer(s,'court-fulcrum-'+phase,'Hyperphasic Fulcrum',phase,'While leading a unit wholly inside the matrix, its models re-roll Wound rolls of 1.');break;
    case 'Autodivinator':for(const phase of ['Command','Movement','Shooting','Charge','Fight'] as const)bearer(s,'court-autodivinator-'+phase,'Autodivinator',phase,'Whenever the opponent gains CP from an ability (not an army rule or discarded mission card), roll a D6; on 2+ gain 1 CP, subject to the core CP limit.');break;
    case 'Metalodermal Tesla Weave':bearer(s,'court-weave','Metalodermal Tesla Weave','Charge','Once per phase when an enemy declares a charge targeting this formation, roll D6: 2–5 deals D3 mortal wounds; 6 deals 3.');break;
   }
  }
 }
 if(selected.includes('Hypercrypt Legion')){
  const infantry=matching(u=>k.INFANTRY.has(u)),vehicles=matching(u=>k.VEHICLE.has(u)),titanic=matching(u=>k.TITANIC.has(u)),nonmonsters=matching(u=>!k.MONSTER.has(u)),monolith=roster.some(s=>s.unit==='Monolith');
  const size=army.battleSize2026??'Strike Force';
  const limit=size==='Incursion'?1:size==='Onslaught'?3:2;
  emit('hypercrypt-hyperphasing','Hypercrypt Legion · Hyperphasing','End of opponent turn','Remove up to '+limit+' unengaged Necron units from the battlefield into Strategic Reserves. Deep Strike does not permit arrival in battle round one.','end',formations.map(f=>f.id));
  for(const phase of ['Shooting','Fight'] as const){
   const enemy=phase==='Shooting'?'Opponent’s Shooting phase: ':'Either Fight phase: ';
   if(monolith&&infantry.length)emit('hypercrypt-recall-'+phase,'Hyperphasic Recall · 2CP',phase,enemy+'After enemy attacks destroy at least one model in a friendly Infantry unit, relocate the surviving unit wholly within 6″ of a friendly Monolith and outside enemy Engagement Range.','during',infantry);
   if(vehicles.length)emit('hypercrypt-deflection-'+phase,'Quantum Deflection · 1CP',phase,enemy+'After enemy target selection, a targeted Vehicle unit gains a 4+ invulnerable save until phase end.','during',vehicles);
  }
  emit('hypercrypt-crypts','Reanimation Crypts · 1CP','Command','Your Command phase: target your Necron Warlord; each friendly Necron unit in Reserves activates Reanimation Protocols.');
  if(nonmonsters.length)emit('hypercrypt-precision','Cosmic Precision · 1CP','Movement','Your turn: a non-Monster unit arriving via an ingress move may set up anywhere more than 6″ horizontally from enemies. No charge this turn; large-model setup rules still apply.','during',nonmonsters);
  if(monolith&&infantry.length)emit('hypercrypt-corridor','Dimensional Corridor · 2CP','Charge','Your turn: a unit arriving through Eternity Gate this turn may charge if its Monolith began the turn on the battlefield.','during',infantry);
  if(titanic.length)emit('hypercrypt-damping','Entropic Damping · 1CP','Shooting','Opponent’s turn: after target selection, if a targeted Titanic model is within 18″ of the attacker, that attacking unit’s weapons gain Hazardous for this phase.','during',titanic);
  for(const s of roster.filter(s=>HYPERCRYPT_BEARERS.some(u=>u===s.unit))){
   switch(upgrade(s)){
    case 'Dimensional Overseer':bearer(s,'hypercrypt-overseer','Dimensional Overseer','End of opponent turn','While this bearer is on the battlefield or in Strategic Reserves, increase your Hyperphasing selection limit by one (to '+(limit+1)+').','end');break;
    case 'Arisen Tyrant':for(const phase of ['Shooting','Fight'] as const)bearer(s,'hypercrypt-tyrant-'+phase,'Arisen Tyrant',phase,'This formation re-rolls Hit rolls of 1; re-roll all Hit rolls if it was set up on the battlefield this turn.');break;
    case 'Hyperspatial Transfer Node':bearer(s,'hypercrypt-node','Hyperspatial Transfer Node','Movement','When this formation Advances, add 6″ to Move for the phase instead of rolling.');break;
    case 'Osteoclave Fulcrum':bearer(s,'hypercrypt-osteoclave','Osteoclave Fulcrum','Pre-battle','The bearer’s formation gains Deep Strike.','start');bearer(s,'hypercrypt-osteoclave-ingress','Osteoclave Fulcrum · arrival','Movement','The formation can use Deep Strike subject to normal arrival restrictions.');break;
   }
  }
 }
 return result;
}
