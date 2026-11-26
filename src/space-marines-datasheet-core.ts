import {isSpaceMarineFaction} from './space-marines-factions';
import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {spaceMarineCards} from './space-marines-card-data';
import {chapterScoutRange,chapterFormationHasFightsFirst} from './space-marine-chapters-upgrades';
import {spaceMarineWeaponText} from './space-marines-weapons';
import {spaceMarineModelLoadouts,spaceMarineWeaponCount} from './space-marines-loadouts';
import {spaceMarineMusterUnits} from './space-marines-muster-data';
import {spaceMarineKeywords,spaceMarinePhysicalModels} from './space-marines-keywords';
import {chapterBattleFormations,chapterPartRoster} from './space-marine-chapters-splits';
import {spaceMarineCargoFormations} from './space-marines-transports';
import {spaceMarineHasDeepStrike,spaceMarineHasInfiltrators,spaceMarineScoutRange,selectedSpaceMarineUpgrade} from './space-marines-upgrades';
import {aircraftCoreReminders} from './aircraft-core';
import {printCombatProfiles,printFiringDeck,printFormationDeployment,type ProfileStage} from './faction-card-profiles';
import {expandRoster,type RosterInstance} from './roster-instances';

const key=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const core=(army:ArmySelection,s:RosterInstance)=>spaceMarineCards(army.faction)[s.unit]?.core??[];
const fitted=(army:ArmySelection,s:RosterInstance,item:string)=>spaceMarineModelLoadouts(s,army.faction).some(m=>m.items.some(i=>key(i)===key(item)))||spaceMarineWeaponCount(s,item,army.faction)>0;
const defence:readonly ProfileStage[]=[['Shooting','opponent','during'],['Movement','own','end'],['Shooting','own','during'],['Fight','either','during']];
type FormationInput=readonly RosterInstance[]|{members:readonly RosterInstance[];split?:{rootId:string}};
const membersOf=(group:FormationInput):readonly RosterInstance[]=>'members' in group?group.members:group;
const formationRoster=(group:FormationInput,roster:readonly RosterInstance[])=>{
 if(!('split' in group)||!group.split)return roster;
 const ids=new Set(membersOf(group).map(s=>s.id)),root=group.split.rootId;
 return roster.filter(s=>ids.has(s.id)||s.id!==root&&s.attachedTo!==root);
};

/** Only deterministic native/equipped/selected-enhancement grants. Calgar and
 * Caanok's chosen prebattle recipient is described conditionally by intrinsic
 * reminders rather than being silently applied to every eligible formation. */
export function spaceMarineFormationHasDeepStrike(army:ArmySelection,group:FormationInput,roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 roster=formationRoster(group,roster);
 const members=membersOf(group);
 return members.length>0&&(members.some(s=>s.unit==='Reiver Squad'&&fitted(army,s,'Grav-chutes'))||members.every(s=>spaceMarineHasDeepStrike(army,s,roster)));
}
export function spaceMarineFormationHasInfiltrators(army:ArmySelection,group:FormationInput,roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 roster=formationRoster(group,roster);
 const members=membersOf(group);return members.length>0&&members.every(s=>spaceMarineHasInfiltrators(army,s,roster));
}
export function spaceMarineFormationScoutRange(army:ArmySelection,group:FormationInput,roster:readonly RosterInstance[]=expandRoster(army)):number{
 roster=formationRoster(group,roster);
 const ranges=membersOf(group).map(s=>Math.max(spaceMarineScoutRange(army,s,roster),chapterScoutRange(army,s,roster),membersOf(group).some(m=>m.unit==='Death Company Captain')?6:0,s.unit==='Impulsor'&&fitted(army,s,'Orbital Comms Array')?6:0));
 return ranges.length&&ranges.every(Boolean)?Math.min(...ranges):0;
}

export function spaceMarineDatasheetCoreReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(!isSpaceMarineFaction(army.faction))return [];
 const legal=new Set(spaceMarineMusterUnits(army)),selected=roster.filter(s=>spaceMarineCards(army.faction)[s.unit]&&legal.has(s.unit));
 const groups=chapterBattleFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 const result:GeneratedReminder[]=aircraftCoreReminders('11e-space-marines-',selected.filter(s=>spaceMarineKeywords(army,s,undefined,roster).has('AIRCRAFT')).map(s=>s.id));
 for(const {squad,group} of selected.flatMap(squad=>groups.filter(g=>g.members.some(s=>s.id===squad.id)).map(group=>({squad,group})))){
  const card=spaceMarineCards(army.faction)[squad.unit],context=group.part?chapterPartRoster(group.part,roster):roster;
  const ids=group.members.map(s=>s.id),tags=spaceMarineKeywords(army,squad,undefined,context),physical=group.part?group.part.physical.filter(m=>m.squad.id===squad.id):spaceMarineModelLoadouts(squad,army.faction),label=squad.id+(group.part?' · Group '+group.part.key:'');
  function emit(title:string,[window,turn,timing]:ProfileStage,summary:string,units=[squad.id]){
   result.push({id:['11e-space-marines-profile',label,title,window,turn,timing].join(':'),title:label+' · '+title,window,turn,timing,summary,units,origin:'unit',source:card.source});
  }
  printCombatProfiles(squad,{...card,save:null},tags.has('TITANIC'),(s,name)=>spaceMarineWeaponCount(s,name,army.faction),(title,stage,summary,units)=>{
   if(title==='Ranged weapon profiles'||title==='Melee weapon profiles')return;
   if(title==='Damaged'&&stage[0]==='Shooting'){
    emit(title,['Shooting','either','during'],summary+' Apply this penalty to normal shooting, including permitted reactions in the opponent’s turn. Snap shooting ignores Hit-roll modifiers.',units);return;
   }
   emit(title,stage,summary,units);
  });
  for(const stage of defence){
   if(card.rangedSave&&stage[0]==='Fight'||card.meleeOnlySave&&stage[0]!=='Fight')continue;
   if(card.save)emit('Invulnerable save',stage,'An attack allocated to an actual '+squad.unit+' model from '+squad.id+' is saved if the save roll meets its '+card.save+'+ invulnerable save, before applying AP.'+(card.rangedSave?' This save protects against ranged attacks only.':card.meleeOnlySave?' This save protects against melee attacks only.':'')+' Models from another attached datasheet use their own saves. An unmodified save roll of 1 still fails.');
   if(card.saveByModel){
    const saves=[...new Set(physical.map(m=>m.model))].flatMap(model=>card.saveByModel?.[model]?[model+' '+card.saveByModel[model]+'+']:[]);
    if(saves.length)emit('Personal invulnerable saves',stage,'Only these actual surviving models have their printed personal invulnerable saves: '+saves.join('; ')+'. Other models in this mixed unit, including attached characters, use their own saves.');
   }
  }
  for(const item of ['Storm Shield','Combat Shield','Relic Shield','Shield Dome','Blizzard Shield']){
   const bearers=physical.filter(m=>m.items.some(i=>key(i)===key(item)));if(!bearers.length)continue;
   const extraWound=item==='Relic Shield'||item==='Storm Shield'&&['Terminator Assault Squad','Deathwatch Terminator Squad','Wolf Guard Terminators','Wolf Guard Battle Leader'].includes(squad.unit);
   const stages=extraWound?[['Pre-battle','either','during'] as ProfileStage,...defence]:defence;
   for(const stage of stages)emit(item,stage,'Only the actual '+item+' bearer'+(bearers.length===1?' ('+bearers[0].model+')':'s')+' '+(extraWound?'has +1 Wounds.':'has a '+(item==='Combat Shield'||item==='Shield Dome'?5:4)+'+ invulnerable save.')+' Other models do not inherit this personal equipment benefit.');
  }
  if(squad.unit==='Reiver Squad'&&fitted(army,squad,'Grav-chutes'))emit('Grav-chutes',['Pre-battle','either','during'],'While at least one actual Reiver from this equipped unit survives, this unit has Deep Strike. The formation’s arrival reminders include that equipped grant.',ids);
  if(squad.unit==='Impulsor'&&fitted(army,squad,'Orbital Comms Array'))emit('Orbital Comms Array',['Pre-battle','either','during'],'This actual equipped Impulsor has Scouts 6″. This is its own equipment grant and does not require all passengers to have Scouts.',ids);
  const deploymentSource=group.members.find(s=>s.id===(group.part?.originalRootId??group.root.id))??group.members.find(s=>spaceMarineCards(army.faction)[s.unit]);
  if(deploymentSource?.id===squad.id){
   printFormationDeployment(ids,spaceMarineFormationHasDeepStrike(army,group,context),spaceMarineFormationScoutRange(army,group,context),spaceMarineFormationHasInfiltrators(army,group,context),emit);
   const current={...army,instances:[...context]};
   const allModelsHave=(ability:string)=>group.members.every(s=>core(army,s).includes(ability)||(group.part?group.part.physical.filter(m=>m.squad.id===s.id):spaceMarinePhysicalModels(s,army.faction)).every(m=>{
    const u=selectedSpaceMarineUpgrade(current,s);return u?.name==='Umbral Raptor'&&u.bearerModels.includes(m.model)&&['Fights First','Lone Operative'].includes(ability);
   }));
   const loneRanges=group.members.map(s=>{const ability=core(army,s).find(a=>a.startsWith('Lone Operative'));return ability?Number(ability.match(/\d+/)?.[0]??12):allModelsHave('Lone Operative')?12:0;});
   if(loneRanges.every(Boolean))for(const stage of defence.filter(s=>s[0]!=='Fight'))emit('Lone Operative',stage,'Every surviving model in this formation has Lone Operative. Enemy models more than '+Math.max(...loneRanges)+'″ away cannot see it or target it with Indirect Fire.',ids);
   if(allModelsHave('Stealth'))for(const stage of defence.filter(s=>s[0]!=='Fight'))emit('Stealth',stage,'Every surviving model in this formation has Stealth, granting the Benefit of Cover against ranged attacks.',ids);
   if(allModelsHave('Fights First')||chapterFormationHasFightsFirst(army,group.members,context))emit('Fights First',['Fight','either','start'],'Every surviving model in this formation has Fights First. It fights in the Fights First step with the normal alternation and eligibility rules.',ids);
  }
  if(!tags.has('TRANSPORT'))continue;
  const passengers=spaceMarineCargoFormations(army,squad,roster),deck=Number(core(army,squad).find(c=>c.startsWith('Firing Deck '))?.match(/\d+/)?.[0]??0);
  if(deck){
   printFiringDeck(squad,deck,passengers.filter(g=>!g.split),spaceMarineCards(army.faction),s=>spaceMarineModelLoadouts(s,army.faction),(title,stage,summary,units)=>emit(title,stage,summary+' Use only physical models actually embarked and their printed weapons. The transport does not gain passenger abilities, enhancements or personal bearer bonuses.',units));
   for(const part of passengers.filter(g=>g.split)){
    const guns=part.physical.flatMap(m=>{const text=spaceMarineWeaponText(army,m.squad,'Shooting',false,{model:m.model,items:m.items});return text?[m.model+': '+text]:[];});
    if(guns.length)emit('Firing Deck '+deck+' · '+part.root.id,['Shooting','own','during'],'Only if this exact split group is actually embarked: when selected to shoot, choose up to '+deck+' embarked models whose units have not been selected to shoot this phase. Select one ranged weapon other than One Shot per model. The transport has those weapons until it finishes attacking, and all units aboard are ineligible to shoot for the rest of the turn. The other split group contributes no weapons. Actual assigned guns: '+guns.join(' ')+' The transport gains no passenger abilities or bearer enhancements.',[squad.id,...part.members.map(s=>s.id)]);
   }
  }
  if(tags.has('DEDICATED TRANSPORT')){
   const scouts=passengers.map(g=>({...g,range:spaceMarineFormationScoutRange(army,g,roster)})).filter(g=>g.range);
   if(scouts.length)emit('Scouts · passengers',['Pre-battle','either','during'],'Only if wholly within your deployment zone and every actual model embarked has Scouts, this Dedicated Transport may make the scout move using the lowest distance among all passengers. Finish more than 8″ horizontally from enemies. Eligible whole formations: '+scouts.map(g=>g.root.id+' ('+g.range+'″)').join(', ')+'. An additional passenger without Scouts prevents the inherited move unless a separate rule grants Scouts to the transport itself.',[squad.id,...scouts.flatMap(g=>g.members.map(s=>s.id))]);
  }
 }
 return result;
}
export const spaceMarineProfileReminders=spaceMarineDatasheetCoreReminders;
