import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {GK_CARDS} from './gk-profiles.generated';
import {GREY_KNIGHTS_REVISION} from './grey-knights-data.generated';
import {greyKnightsKeywords} from './grey-knights-data';
import {greyKnightsModelLoadouts,greyKnightsWeaponCount} from './grey-knights-loadouts';
import {greyKnightsCargoFormations,greyKnightsFormations} from './grey-knights-transports';
import {aircraftCoreReminders} from './aircraft-core';
import {printCombatProfiles,printFiringDeck,printFormationDeployment,type ProfileStage} from './faction-card-profiles';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
import {knightEquippedItems} from './knight-loadouts';
import {equippedWeaponText} from './knight-card-rules';
import type {RosterInstance} from './roster-instances';

const passengerCards={...GK_CARDS,...Object.fromEntries(ASSIGNED_AGENT_DATA.filter(a=>a.sheet.keywords.some(k=>k==='INQUISITOR')).map(a=>[a.sheet.unit,{weapons:a.weapons.map(w=>({
 name:w.name,phase:w.type==='Melee'?'Fight' as const:'Shooting' as const,abilities:w.abilities.split(/,\s*/).filter(Boolean),
}))}]))};
function passengerModels(squad:RosterInstance){
 // The native transport graph permits allied Inquisitors only with a legal
 // bodyguard. Each of those four datasheets consists of one physical model.
 return GK_CARDS[squad.unit]?greyKnightsModelLoadouts(squad):[{model:squad.unit,items:knightEquippedItems(squad)}];
}
export function greyKnightsFormationHasDeepStrike(army:ArmySelection,members:readonly RosterInstance[]):boolean{
 // None of the four Inquisitors who can join native Battleline has Deep Strike.
 // Rites of Teleportation belongs to the different Assigned Agents Terminators.
 return army.faction==='Grey Knights'&&members.length>0&&members.every(s=>GK_CARDS[s.unit]?.core?.includes('Deep Strike'));
}
function canScout(members:readonly RosterInstance[]):boolean{
 return members.length>0&&members.every(s=>GK_CARDS[s.unit]?.core?.includes('Scouts 6"'));
}

export function gkProfileReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Grey Knights')return [];
 const native=roster.filter(s=>Object.hasOwn(GK_CARDS,s.unit)),forms=new Map(greyKnightsFormations(army,roster).map(g=>[g.root.id,g]));
 const result=aircraftCoreReminders('11e-gk-',native.filter(s=>greyKnightsKeywords(army,s).has('AIRCRAFT')).map(s=>s.id));
 for(const squad of native){
  const card=GK_CARDS[squad.unit],group=forms.get(squad.id),tags=greyKnightsKeywords(army,squad);
  function emit(title:string,[window,turn,timing]:ProfileStage,summary:string,units=[squad.id]){
   const amended=title==='Melee weapon profiles'&&['Strike Squad','Purifier Squad'].includes(squad.unit)&&summary.includes('Close combat weapon');
   result.push({id:['11e-gk-profile',squad.id,title,window,turn].join(':'),title:squad.id+' · '+title,window,turn,timing,summary,units,origin:'unit',source:amended?GREY_KNIGHTS_REVISION.pack:card.source});
  }
  printCombatProfiles(squad,card,tags.has('TITANIC'),greyKnightsWeaponCount,emit);
  if(army.detachments2026?.includes('Hallowed Conclave')&&tags.has('INFANTRY')){
   const ordinal=new Map<string,number>(),key=(s:string)=>s.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
   const inventory=greyKnightsModelLoadouts(squad).map(model=>{
    const n=(ordinal.get(model.model)??0)+1;ordinal.set(model.model,n);
    const count=(_s:RosterInstance,name:string)=>model.items.filter(item=>key(item)===key(name)).length;
    const weapons=card.weapons.filter(w=>w.phase==='Shooting'&&count(squad,w.name)>0);
    const text=weapons.map(w=>equippedWeaponText(squad,{...card,weapons:[w]},'Shooting',false,count)||count(squad,w.name)+' × '+w.name+'.').join(' ');
    return model.model+' '+n+' — '+(text||'no ranged weapons.');
   });
   if(card.weapons.some(w=>w.phase==='Shooting'&&greyKnightsWeaponCount(squad,w.name)>0))emit('Unending Fidelity · equipped models',['Shooting','opponent','during'],
    'Only if Unending Fidelity was used on this Infantry formation: each destroyed model that has not shot or fought this phase rolls one D6. On 4+ that model shoots after the attacker finishes, then is removed. Use only the qualifying destroyed model’s own equipment; the surviving squad does not shoot. Per-model ranged inventory: '+inventory.join(' '));
  }
  if(group)printFormationDeployment(group.members.map(s=>s.id),greyKnightsFormationHasDeepStrike(army,group.members),canScout(group.members)?6:0,false,emit);
  if(!tags.has('TRANSPORT'))continue;
  const passengers=greyKnightsCargoFormations(army,squad,roster);
  const deck=Number(card.core?.find(c=>c.startsWith('Firing Deck '))?.match(/\d+/)?.[0]);
  if(deck)printFiringDeck(squad,deck,passengers,passengerCards,passengerModels,emit);
  const scouts=tags.has('DEDICATED TRANSPORT')?passengers.filter(g=>canScout(g.members)):[];
  if(scouts.length)emit('Scouts · Dedicated Transport',['Pre-battle','either','during'],'During Resolve Pre-battle Abilities, this transport can scout 6″ if wholly in your deployment zone and every model actually aboard has Scouts. It must finish more than 8″ horizontally from enemies. Eligible passengers include '+scouts.map(g=>g.root.id).join(', ')+'.',[squad.id,...scouts.flatMap(g=>g.members.map(m=>m.id))]);
 }
 return result;
}
