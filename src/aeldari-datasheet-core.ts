import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {AELDARI_CARDS,aeldariCard,aeldariModelLoadouts,aeldariWeaponCount} from './aeldari-loadouts';
import {aeldariMusterUnits} from './aeldari-muster-data';
import {aeldariKeywords} from './aeldari-keywords';
import {aeldariFormations,aeldariCargoFormations,aeldariSplitCargoFormations,aeldariCarrierCapacity} from './aeldari-transports';
import {aeldariHasDeepStrike,aeldariHasInfiltrators,aeldariScoutRange} from './aeldari-upgrades';
import {aircraftCoreReminders} from './aircraft-core';
import {printCombatProfiles,printFiringDeck,printFormationDeployment,type ProfileStage} from './faction-card-profiles';
import {expandRoster,type RosterInstance} from './roster-instances';

const key=(name:string)=>name.split(/\s+[–—-]\s+/)[0].normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const core=(s:RosterInstance):readonly string[]=>aeldariCard(s)?.core??[];
const defence:readonly ProfileStage[]=[['Shooting','opponent','during'],['Movement','own','end'],['Shooting','own','during'],['Fight','either','during']];
function training(army:ArmySelection,squad:RosterInstance):string|undefined{
 if(squad.unit!=='Autarch')return undefined;
 const original=aeldariFormations(army,expandRoster(army)).find(g=>g.members.some(s=>s.id===squad.id));
 return original&&original.root.id!==squad.id?original.root.unit:undefined;
}
/** Printed faction ability only; conditional detachment grants are resolved by the army module. */
export function aeldariHasBattleFocus(squad:RosterInstance):boolean{return aeldariCard(squad)?.factionAbilities.includes('Battle Focus')??false;}
export function aeldariFormationHasDeepStrike(army:ArmySelection,members:readonly RosterInstance[],roster:readonly RosterInstance[]=expandRoster(army)):boolean{return members.length>0&&members.every(s=>aeldariHasDeepStrike(army,s,roster));}
export function aeldariFormationHasInfiltrators(army:ArmySelection,members:readonly RosterInstance[],roster:readonly RosterInstance[]=expandRoster(army)):boolean{return members.length>0&&members.every(s=>aeldariHasInfiltrators(army,s,roster)||training(army,s)==='Striking Scorpions');}
export function aeldariFormationScoutRange(army:ArmySelection,members:readonly RosterInstance[],roster:readonly RosterInstance[]=expandRoster(army)):number{
 const ranges=members.map(s=>Math.max(aeldariScoutRange(army,s,roster),training(army,s)==='Striking Scorpions'?7:0));
 return ranges.length&&ranges.every(Boolean)?Math.min(...ranges):0;
}
function passengerInventory(squad:RosterInstance):string[]{
 const ordinal=new Map<string,number>();
 return aeldariModelLoadouts(squad).flatMap(model=>{
  const n=(ordinal.get(model.model)??0)+1;ordinal.set(model.model,n);
  const guns=aeldariCard(squad)?.weapons.filter(w=>w.phase==='Shooting'&&!w.abilities.some(a=>a.toLowerCase()==='one shot')&&model.items.some(i=>key(i)===key(w.name)))??[];
  return guns.length?[squad.id+' / '+model.model+' '+n+' — '+guns.map(w=>w.name).join(' or ')]:[];
 });
}

export function aeldariDatasheetCoreReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Aeldari')return [];
 const legal=new Set(aeldariMusterUnits(army)),selected=roster.filter(s=>aeldariCard(s)&&legal.has(s.unit));
 const groups=aeldariFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 const result:GeneratedReminder[]=aircraftCoreReminders('11e-aeldari-',selected.filter(s=>aeldariKeywords(army,s,undefined,roster).has('AIRCRAFT')).map(s=>s.id));
 for(const squad of selected){
  const card=aeldariCard(squad),group=groups.find(g=>g.members.some(s=>s.id===squad.id));if(!group)continue;
  const tags=aeldariKeywords(army,squad,undefined,roster),ids=group.members.map(s=>s.id);
  function emit(title:string,[window,turn,timing]:ProfileStage,summary:string,units=[squad.id]){
   result.push({id:['11e-aeldari-profile',squad.id,title,window,turn,timing].join(':'),title:squad.id+' · '+title,window,turn,timing,summary,units,origin:'unit',source:card.source});
  }
  printCombatProfiles(squad,{...card,save:null},tags.has('TITANIC'),aeldariWeaponCount,(title,stage,summary,units)=>{
   if(title==='Ranged weapon profiles'||title==='Melee weapon profiles')return;
   emit(title,stage,summary,units);
  });
  if(card.save)for(const stage of defence){
   if(card.rangedSave&&stage[0]==='Fight')continue;
   const save=stage[0]==='Fight'?(card.meleeSave??card.save):card.save;
   emit('Invulnerable save',stage,'When an attack is allocated to an actual '+squad.unit+' model from '+squad.id+', that model may use its '+save+'+ invulnerable save.'+
    (card.conditionalSave==='Shadow Field'?' This Ynnari Archon cannot re-roll invulnerable saves and loses this save for the rest of the battle after its first failed invulnerable save.':'')+
    (card.rangedSave?' This save protects against ranged attacks only.':'')+
    (card.meleeSave?' The improved 4+ save protects against melee attacks only; its ranged save is '+card.save+'+.':'')+
    ' Attached models from another datasheet use their own saves.');
  }
  const physical=aeldariModelLoadouts(squad);
  for(const item of ['Mistshield','Shimmershield','Forceshield','Scattershield']){
   const bearers=physical.filter(m=>m.items.some(i=>key(i)===key(item)));if(!bearers.length)continue;
   for(const stage of defence)emit(item,stage,'Only the actual '+item.toLowerCase()+' bearer'+(bearers.length===1?' ('+bearers[0].model+')':'s')+' in '+squad.id+' has a 4+ invulnerable save.'+(item==='Scattershield'?' When an attack is allocated to that bearer, subtract 1 from its Damage characteristic, to a minimum of 1.':'')+' Other models, including attached Characters, do not inherit this personal equipment save.');
  }
  if(physical.some(m=>m.items.some(i=>key(i)==='serpentshield')))for(const stage of defence)emit('Serpent Shield',stage,'While the actual Serpent’s Scale Platform with its serpent shield survives, every model in this formation has a 5+ invulnerable save. The platform is destroyed when the last actual Storm Guardian dies; an attached Character does not keep the platform alive. If its source is destroyed by an attack, the benefit lasts until that attacking unit finishes.',ids);
  const trained=training(army,squad);
  if(trained&&['Howling Banshees','Striking Scorpions'].includes(trained))emit('ASPECT TRAINING',['Pre-battle','either','during'],trained==='Howling Banshees'?'This Autarch originally leads Howling Banshees, so it has Fights First. This leading benefit remains on a surviving Autarch after its original Bodyguard is destroyed.':trained==='Striking Scorpions'?'This Autarch originally leads Striking Scorpions, so it has Infiltrators, Scouts 7″ and Stealth. These leading benefits remain on a surviving Autarch after its original Bodyguard is destroyed.':'Aspect Training grants this Autarch no extra core abilities for its selected Bodyguard.',ids);
  if(group.root.id===squad.id){
   const deep=aeldariFormationHasDeepStrike(army,group.members,roster),scout=aeldariFormationScoutRange(army,group.members,roster),infiltrate=aeldariFormationHasInfiltrators(army,group.members,roster);
   printFormationDeployment(ids,deep,scout,infiltrate,emit);
   if(group.members.every(s=>core(s).includes('Lone Operative')))for(const stage of defence.filter(s=>s[0]!=='Fight'))emit('Lone Operative',stage,'Every surviving model in this formation has Lone Operative. Enemy models more than 12″ away cannot see it or target it with Indirect Fire.',ids);
   if(group.members.every(s=>core(s).includes('Stealth')||training(army,s)==='Striking Scorpions'))for(const stage of defence.filter(s=>s[0]!=='Fight'))emit('Stealth',stage,'Every surviving model in this formation has Stealth, granting the Benefit of Cover against ranged attacks.',ids);
   if(group.members.every(s=>core(s).includes('Fights First')||training(army,s)==='Howling Banshees'))emit('Fights First',['Fight','either','start'],'Every surviving model has Fights First, so this formation fights in the Fights First step. Use normal alternation and eligibility rules.',ids);
  }
  if(!tags.has('TRANSPORT'))continue;
  const passengers=aeldariCargoFormations(army,squad,roster),deck=Number(core(squad).find(c=>c.startsWith('Firing Deck '))?.match(/\d+/)?.[0]??0);
  const allSplits=[...new Map(roster.flatMap(venom=>aeldariSplitCargoFormations(army,venom,roster).map(g=>[g.root.id,{...g,venom}] as const))).values()];
  const capacity=aeldariCarrierCapacity[squad.unit],split=capacity?.kind==='ynnari'?allSplits.filter(g=>g.halves.some(n=>n<=capacity.spaces)):[];
  if(deck){
   printFiringDeck(squad,deck,passengers,AELDARI_CARDS,aeldariModelLoadouts,(title,stage,summary,units)=>emit(title,stage,summary+' Use only the physical models actually embarked. If a squad was split, models in its other half contribute no guns. The transport does not gain passenger abilities, enhancements or personal bearer bonuses.',units));
   const choices=split.filter(g=>!passengers.some(p=>p.root.id===g.root.id)).map(g=>({g,inventory:g.members.flatMap(passengerInventory)})).filter(g=>g.inventory.length);
   if(choices.length)emit('Firing Deck '+deck+' · split passengers',['Shooting','own','during'],'Only if a squad was split for an actual Ynnari Venom and its declared half is actually embarked: choose up to '+deck+' surviving models allocated to that half whose units have not been selected to shoot this phase. Choose one ranged weapon other than One Shot per model. The transport gains those printed weapons until it finishes attacking; all units aboard become ineligible to shoot for the rest of the turn. Do not transfer passenger abilities or bearer bonuses or use equipment in the other half. Eligible split pools (use only the actual half): '+choices.map(({g,inventory})=>g.root.id+' split '+g.halves.join(' + ')+' for '+g.venom.id+'; '+inventory.join('. ')).join('; ')+'.',[squad.id,...choices.flatMap(({g})=>g.members.map(s=>s.id))]);
  }
  if(tags.has('DEDICATED TRANSPORT')){
   const scouts=passengers.map(g=>({...g,range:aeldariFormationScoutRange(army,g.members,roster)})).filter(g=>g.range);
   if(scouts.length)emit('Scouts · passengers',['Pre-battle','either','during'],'During Resolve Pre-battle Abilities, this Dedicated Transport may scout only if wholly in your deployment zone and every actual embarked model has Scouts. Use the lowest distance among all models aboard and finish more than 8″ horizontally from enemies. Eligible whole formations: '+scouts.map(g=>g.root.id+' ('+g.range+'″)').join(', ')+'. An additional passenger without Scouts prevents this move unless another rule explicitly grants Scouts to the transport.',[squad.id,...scouts.flatMap(g=>g.members.map(s=>s.id))]);
  }
 }
 return result;
}
export const aeldariProfileReminders=aeldariDatasheetCoreReminders;
