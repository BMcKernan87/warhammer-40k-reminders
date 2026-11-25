import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {TAU_CARDS,type TauCardStats} from './tau-card-profiles.generated';
import {tauMusterUnits} from './tau-data';
import {tauKeywords} from './tau-keywords';
import {tauModelLoadouts,tauWeaponCount} from './tau-loadouts';
import {tauCargoFormations,tauFormations} from './tau-transports';
import {tauReactionShooting} from './tau-reactions';
import {aircraftCoreReminders} from './aircraft-core';
import {printCombatProfiles,printFiringDeck,printFormationDeployment,type ProfileStage} from './faction-card-profiles';
import {equippedWeaponText} from './knight-card-rules';
import {expandRoster,type RosterInstance} from './roster-instances';

const key=(name:string)=>name.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
const core=(s:RosterInstance):readonly string[]=>TAU_CARDS[s.unit]?.core??[];
function fullWeapons(s:RosterInstance,card:TauCardStats,phase:'Shooting'|'Fight',snap:boolean,count=tauWeaponCount):string{
 return card.weapons.filter(w=>w.phase===phase&&count(s,w.name)>0).map(w=>{
  const stats=(phase==='Shooting'?w.range+'″; ':'')+'A '+w.attacks+'; '+(snap?'':(phase==='Shooting'?'BS ':'WS ')+w.skill+(w.skill==='-'?'':'+')+'; ')+'D '+w.damage;
  return equippedWeaponText(s,{...card,weapons:[w]},phase,snap,count).replace(' — ',' — '+stats+'; ');
 }).join(' ');
}
export function tauFormationHasDeepStrike(members:readonly RosterInstance[]):boolean{return members.length>0&&members.every(s=>core(s).includes('Deep Strike'));}
export function tauFormationScoutRange(_army:ArmySelection,members:readonly RosterInstance[]):number{
 const ranges=members.map(s=>Number(core(s).find(c=>c.startsWith('Scouts '))?.match(/\d+/)?.[0]??0));
 return ranges.length&&ranges.every(Boolean)?Math.min(...ranges):0;
}
export function tauFormationHasInfiltrators(members:readonly RosterInstance[]):boolean{
 return members.length>0&&(members.every(s=>core(s).includes('Infiltrators'))||members.some(s=>s.unit==='Pathfinder Team'&&tauWeaponCount(s,'Recon drone')>0));
}
export function tauProfileReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='T’au Empire')return [];
 const current={...army,instances:[...roster]},legal=new Set(tauMusterUnits(army)),native=roster.filter(s=>TAU_CARDS[s.unit]&&legal.has(s.unit));
 const groups=tauFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 const result:GeneratedReminder[]=aircraftCoreReminders('11e-tau-',native.filter(s=>tauKeywords(current,s).has('AIRCRAFT')).map(s=>s.id));
 for(const squad of native){
  const card=TAU_CARDS[squad.unit],group=groups.find(g=>g.root.id===squad.id),formation=groups.find(g=>g.members.some(s=>s.id===squad.id));if(!formation)continue;
  const tags=tauKeywords(current,squad),reactions=tauReactionShooting(army,squad,roster);
  function emit(title:string,[window,turn,timing]:ProfileStage,summary:string,units=[squad.id]){
   result.push({id:['11e-tau-profile',squad.id,title,window,turn,timing].join(':'),title:squad.id+' · '+title,window,turn,timing,summary,units,origin:'unit',source:card.source});
  }
  printCombatProfiles(squad,card,tags.has('TITANIC'),tauWeaponCount,(title,stage,summary,units)=>{
   if(title==='Ranged weapon profiles'||title==='Melee weapon profiles')summary=(stage[0]==='Movement'?'When firing Overwatch, use snap shooting. ':'')+fullWeapons(squad,card,title==='Melee weapon profiles'?'Fight':'Shooting',stage[0]==='Movement');
   emit(title,stage,summary,units);
  });
  if(card.save)emit('Invulnerable save',['Shooting','own','during'],'When permitted enemy return fire allocates an attack to a model from '+squad.id+', that model can use its '+card.save+'+ invulnerable save.');
  if(['Strike Team','Breacher Team'].includes(squad.unit)){
   const turret=(s:RosterInstance,name:string)=>key(name)==='supportturret'?1:0;
   for(const stage of [['Shooting','own','during'],['Movement','opponent','end']] as const){
    emit('DS8 Support Turret · conditional profile',stage,'Only if this unit Remained Stationary in your preceding Movement phase and its original Shas’ui survives: that Shas’ui is equipped with one support turret until the start of your next turn. '+fullWeapons(squad,card,'Shooting',stage[0]==='Movement',turret)+' This token is not a model and does not provide an extra Firing Deck passenger.');
   }
  }
  if(reactions.length&&card.weapons.some(w=>w.phase==='Shooting'&&tauWeaponCount(squad,w.name)>0)){
   const ordinal=new Map<string,number>();
   const inventory=tauModelLoadouts(squad).map(model=>{
    const n=(ordinal.get(model.model)??0)+1;ordinal.set(model.model,n);
    const count=(_s:RosterInstance,name:string)=>model.items.filter(item=>key(item)===key(name)).length;
    return model.model+' '+n+' — '+(fullWeapons(squad,card,'Shooting',false,count)||'no ranged weapons.');
   });
   emit('Reaction shooting · equipped models',['Shooting','opponent','during'],'Only through '+reactions.join('; or ')+'. Use only the actual surviving models’ equipment; casualties do not shoot. Per-model ranged inventory: '+inventory.join(' '));
   if(card.damage)emit('Damaged · reaction shooting',['Shooting','opponent','during'],'While making those permitted normal reaction shots, if this model has 1–'+card.damage.threshold+' wounds remaining, subtract 1 from its Hit rolls.');
  }
  if(group){
   const ids=group.members.map(s=>s.id);
   printFormationDeployment(ids,tauFormationHasDeepStrike(group.members),tauFormationScoutRange(army,group.members),tauFormationHasInfiltrators(group.members),emit);
   if(group.members.every(s=>core(s).includes('Lone Operative')))for(const stage of [['Shooting','opponent','during'],['Movement','own','end'],['Shooting','own','during']] as const)emit('Lone Operative',stage,'Every surviving model in this formation has Lone Operative. Enemy models more than 12″ away cannot see it or target it with Indirect Fire.',ids);
   if(group.members.every(s=>core(s).includes('Stealth')))for(const stage of [['Shooting','opponent','during'],['Movement','own','end'],['Shooting','own','during']] as const)emit('Stealth',stage,'Every surviving model in this formation has Stealth, so it has the Benefit of Cover against ranged attacks.',ids);
   if(group.members.some(s=>core(s).includes('Fights First')))emit('Fights First',['Fight','either','start'],'This formation fights in the Fights First step; use the normal alternation and eligibility rules.',ids);
  }
  if(!tags.has('TRANSPORT'))continue;
  const passengers=tauCargoFormations(army,squad,roster),deck=Number(core(squad).find(c=>c.startsWith('Firing Deck '))?.match(/\d+/)?.[0]??0);
  if(deck)printFiringDeck(squad,deck,passengers,TAU_CARDS,tauModelLoadouts,emit);
  const scout=tags.has('DEDICATED TRANSPORT')?passengers.map(g=>({...g,range:tauFormationScoutRange(army,g.members)})).filter(g=>g.range):[];
  if(scout.length)emit('Scouts · passengers',['Pre-battle','either','during'],'During Resolve Pre-battle Abilities, this Dedicated Transport can scout only if wholly within your deployment zone and every actual embarked model has Scouts. Use the lowest Scouts distance among all models aboard and finish more than 8″ horizontally from enemies. Eligible whole formations: '+scout.map(g=>g.root.id+' ('+g.range+'″)').join(', ')+'. An attached model without Scouts blocks the move unless a rule grants Scouts to the entire formation; equipped drone tokens do not add models.',[squad.id,...scout.flatMap(g=>g.members.map(s=>s.id))]);
 }
 return result;
}
