import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {MECHANICUS_CARDS,type MechanicusCardStats} from './mechanicus-card-profiles.generated';
import {mechanicusAgentName,mechanicusMusterUnits} from './mechanicus-army-data';
import {mechanicusKeywords} from './mechanicus-keywords';
import {mechanicusModelLoadouts,mechanicusWeaponCount} from './mechanicus-loadouts';
import {mechanicusCargoFormations,mechanicusFormations} from './mechanicus-transports';
import {mechanicusReactionShooting} from './mechanicus-reactions';
import {eligibleMechanicusUpgrades} from './mechanicus-detachment-data';
import {aircraftCoreReminders} from './aircraft-core';
import {printCombatProfiles,printFiringDeck,printFormationDeployment,type ProfileStage} from './faction-card-profiles';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
import {knightEquippedItems} from './knight-loadouts';
import {equippedWeaponText} from './knight-card-rules';
import {expandRoster,type RosterInstance} from './roster-instances';

const key=(name:string)=>name.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
const core=(s:RosterInstance):readonly string[]=>MECHANICUS_CARDS[s.unit]?.core??ASSIGNED_AGENT_DATA.find(a=>a.sheet.unit===mechanicusAgentName(s.unit))?.core??[];
const passengerCards={...MECHANICUS_CARDS,...Object.fromEntries(ASSIGNED_AGENT_DATA.filter(a=>a.sheet.keywords.some(k=>k==='INQUISITOR')).map(a=>[a.sheet.unit,{weapons:a.weapons.map(w=>({name:w.name,phase:w.type==='Melee'?'Fight' as const:'Shooting' as const,abilities:w.abilities.split(/,\s*/).filter(Boolean)}))}]))};
const models=(s:RosterInstance)=>MECHANICUS_CARDS[s.unit]?mechanicusModelLoadouts(s):[{model:s.unit,items:knightEquippedItems({...s,unit:mechanicusAgentName(s.unit)??s.unit})}];
function fullWeapons(s:RosterInstance,card:MechanicusCardStats,phase:'Shooting'|'Fight',snap:boolean,count=mechanicusWeaponCount):string{
 return card.weapons.filter(w=>w.phase===phase&&count(s,w.name)>0).map(w=>{
  const stats=(phase==='Shooting'?w.range+'″; ':'')+'A '+w.attacks+'; '+(snap?'':(phase==='Shooting'?'BS ':'WS ')+w.skill+(w.skill==='-'?'':'+')+'; ')+'D '+w.damage;
  return equippedWeaponText(s,{...card,weapons:[w]},phase,snap,count).replace(' — ',' — '+stats+'; ');
 }).join(' ');
}
export function mechanicusFormationHasDeepStrike(members:readonly RosterInstance[]):boolean{return members.length>0&&members.every(s=>core(s).includes('Deep Strike'));}
function nativeScoutRange(members:readonly RosterInstance[]):number{
 const ranges=members.map(s=>Number(core(s).find(c=>c.startsWith('Scouts '))?.match(/\d+/)?.[0]??0));
 return ranges.length&&ranges.every(Boolean)?Math.min(...ranges):0;
}
export function mechanicusFormationScoutRange(army:ArmySelection,members:readonly RosterInstance[]):number{
 const gifted=members.some(s=>{
  const chosen=army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
  return chosen==='Clandestine Infiltrator'&&eligibleMechanicusUpgrades(army,s.unit,s.id).some(u=>u.name===chosen);
 });
 return Math.max(nativeScoutRange(members),gifted?6:0);
}
export function mechanicusProfileReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Adeptus Mechanicus')return [];
 const legal=new Set(mechanicusMusterUnits(army)),native=roster.filter(s=>MECHANICUS_CARDS[s.unit]&&legal.has(s.unit));
 const groups=mechanicusFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 const result:GeneratedReminder[]=aircraftCoreReminders('11e-mechanicus-',native.filter(s=>mechanicusKeywords(army,s).has('AIRCRAFT')).map(s=>s.id));
 for(const squad of native){
  const card=MECHANICUS_CARDS[squad.unit],group=groups.find(g=>g.root.id===squad.id),formation=groups.find(g=>g.members.some(s=>s.id===squad.id));if(!formation)continue;
  const tags=mechanicusKeywords(army,squad),reactions=mechanicusReactionShooting(army,squad,roster);
  function emit(title:string,[window,turn,timing]:ProfileStage,summary:string,units=[squad.id]){
   result.push({id:['11e-mechanicus-profile',squad.id,title,window,turn,timing].join(':'),title:squad.id+' · '+title,window,turn,timing,summary,units,origin:'unit',source:card.source});
  }
  printCombatProfiles(squad,card,tags.has('TITANIC'),mechanicusWeaponCount,(title,stage,summary,units)=>{
   if(title==='Ranged weapon profiles'||title==='Melee weapon profiles')summary=(stage[0]==='Movement'?'When firing Overwatch, use snap shooting. ':'')+fullWeapons(squad,card,title==='Melee weapon profiles'?'Fight':'Shooting',stage[0]==='Movement');
   emit(title,stage,summary,units);
  });
  if(reactions.length&&card.weapons.some(w=>w.phase==='Shooting'&&mechanicusWeaponCount(squad,w.name)>0)){
   const ordinal=new Map<string,number>();
   const inventory=mechanicusModelLoadouts(squad).map(model=>{
    const n=(ordinal.get(model.model)??0)+1;ordinal.set(model.model,n);
    const count=(_s:RosterInstance,name:string)=>model.items.filter(item=>key(item)===key(name)).length;
    return model.model+' '+n+' — '+(fullWeapons(squad,card,'Shooting',false,count)||'no ranged weapons.');
   });
   emit('Reaction shooting · equipped models',['Shooting','opponent','during'],'Only through '+reactions.join('; or ')+'. Use only the actual surviving models’ equipment; casualties do not shoot. Per-model ranged inventory: '+inventory.join(' '));
   if(card.damage)emit('Damaged · reaction shooting',['Shooting','opponent','during'],'While making those permitted normal reaction shots, if this model has 1–'+card.damage.threshold+' wounds remaining, subtract 1 from its Hit rolls.');
  }
  if(group){
   const ids=group.members.map(s=>s.id);
   printFormationDeployment(ids,mechanicusFormationHasDeepStrike(group.members),nativeScoutRange(group.members),group.members.every(s=>core(s).includes('Infiltrators')),(title,stage,summary,units)=>{
    if(squad.unit==='Archaeopter Transvector'&&title==='Deep Strike'&&stage[0]==='Movement')summary='Aerial Deployment allows ingress in your first Movement phase. When this formation makes ingress, Deep Strike permits it to set up anywhere more than 8″ horizontally from all enemy units, including inside the enemy deployment zone.';
    emit(title,stage,summary,units);
   });
   if(group.members.every(s=>core(s).includes('Lone Operative')))for(const stage of [['Shooting','opponent','during'],['Movement','own','end'],['Shooting','own','during']] as const)emit('Lone Operative',stage,'Every model in this formation has Lone Operative. Enemy models more than 12″ away cannot see it or target it with Indirect Fire.',ids);
   if(group.members.every(s=>core(s).includes('Stealth')))for(const stage of [['Shooting','opponent','during'],['Movement','own','end'],['Shooting','own','during']] as const)emit('Stealth',stage,'Every model in this formation has Stealth, so it has the Benefit of Cover against ranged attacks.',ids);
   if(group.members.some(s=>core(s).includes('Fights First')))emit('Fights First',['Fight','either','start'],'This formation fights in the Fights First step; use the normal alternation and eligibility rules.',ids);
  }
  if(!tags.has('TRANSPORT'))continue;
  const passengers=mechanicusCargoFormations(army,squad,roster),deck=Number(core(squad).find(c=>c.startsWith('Firing Deck '))?.match(/\d+/)?.[0]??0);
  if(deck)printFiringDeck(squad,deck,passengers,passengerCards,models,emit);
  const scout=tags.has('DEDICATED TRANSPORT')?passengers.map(g=>({...g,range:mechanicusFormationScoutRange(army,g.members)})).filter(g=>g.range):[];
  if(scout.length)emit('Scouts · passengers',['Pre-battle','either','during'],'During Resolve Pre-battle Abilities, this Dedicated Transport can scout only if wholly within your deployment zone and every actual embarked model has Scouts. Use the lowest Scouts distance among all models aboard and finish more than 8″ horizontally from enemies. Eligible whole formations: '+scout.map(g=>g.root.id+' ('+g.range+'″)').join(', ')+'. An attached model without Scouts blocks the move unless a rule grants Scouts to the entire formation.',[squad.id,...scout.flatMap(g=>g.members.map(s=>s.id))]);
 }
 return result;
}
