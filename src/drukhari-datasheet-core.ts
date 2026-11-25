import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {DRUKHARI_SHEETS} from './drukhari-data';
import {DRUKHARI_CARDS,drukhariCard,drukhariModelLoadouts,drukhariWeaponCount} from './drukhari-loadouts';
import {drukhariMusterUnits} from './drukhari-muster-data';
import {drukhariKeywords} from './drukhari-keywords';
import {drukhariFormations,drukhariCargoFormations,drukhariSplitCargoFormations,drukhariCarrierCapacity} from './drukhari-transports';
import {drukhariHasDeepStrike,drukhariHasInfiltrators,drukhariHasUpgrade,drukhariScoutRange} from './drukhari-upgrades';
import {aircraftCoreReminders} from './aircraft-core';
import {printCombatProfiles,printFiringDeck,printFormationDeployment,type ProfileStage} from './faction-card-profiles';
import {expandRoster,type RosterInstance} from './roster-instances';

const key=(name:string)=>name.split(/\s+[–—-]\s+/)[0].normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const core=(s:RosterInstance):readonly string[]=>drukhariCard(s)?.core??[];
const defence:readonly ProfileStage[]=[['Shooting','opponent','during'],['Movement','own','end'],['Shooting','own','during'],['Fight','either','during']];
const sheets=new Map(DRUKHARI_SHEETS.map(s=>[s.unit,s]));

export function drukhariFormationHasDeepStrike(army:ArmySelection,members:readonly RosterInstance[],roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 return members.length>0&&members.every(s=>drukhariHasDeepStrike(army,s,roster));
}
export function drukhariFormationHasInfiltrators(army:ArmySelection,members:readonly RosterInstance[],roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 return members.length>0&&members.every(s=>drukhariHasInfiltrators(army,s,roster));
}
export function drukhariFormationScoutRange(army:ArmySelection,members:readonly RosterInstance[],roster:readonly RosterInstance[]=expandRoster(army)):number{
 const original=drukhariFormations(army,expandRoster(army));
 const ranges=members.map(s=>{
  const start=original.find(g=>g.members.some(m=>m.id===s.id));
  const retinue=start?.root.unit==='Hand of the Archon'&&start.root.id!==s.id&&sheets.get(s.unit)?.attachmentRole==='leader';
  return Math.max(drukhariScoutRange(army,s,roster),retinue?7:0);
 });
 return ranges.length&&ranges.every(Boolean)?Math.min(...ranges):0;
}

function passengerInventory(squad:RosterInstance):string[]{
 const ordinal=new Map<string,number>();
 return drukhariModelLoadouts(squad).flatMap(model=>{
  const n=(ordinal.get(model.model)??0)+1;ordinal.set(model.model,n);
  const guns=drukhariCard(squad)?.weapons.filter(w=>w.phase==='Shooting'&&!w.abilities.some(a=>a.toLowerCase()==='one shot')&&model.items.some(i=>key(i)===key(w.name)))??[];
  return guns.length?[squad.id+' / '+model.model+' '+n+' — '+guns.map(w=>w.name).join(' or ')]:[];
 });
}

export function drukhariDatasheetCoreReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Drukhari')return [];
 const legal=new Set(drukhariMusterUnits(army)),selected=roster.filter(s=>drukhariCard(s)&&legal.has(s.unit));
 const groups=drukhariFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 const result:GeneratedReminder[]=aircraftCoreReminders('11e-drukhari-',selected.filter(s=>drukhariKeywords(army,s,undefined,roster).has('AIRCRAFT')).map(s=>s.id));
 for(const squad of selected){
  const card=drukhariCard(squad),group=groups.find(g=>g.members.some(s=>s.id===squad.id));if(!group)continue;
  const tags=drukhariKeywords(army,squad,undefined,roster);
  function emit(title:string,[window,turn,timing]:ProfileStage,summary:string,units=[squad.id]){
   result.push({id:['11e-drukhari-profile',squad.id,title,window,turn,timing].join(':'),title:squad.id+' · '+title,window,turn,timing,summary,units,origin:'unit',source:card.source});
  }
  printCombatProfiles(squad,{...card,save:null},tags.has('TITANIC'),drukhariWeaponCount,(title,stage,summary,units)=>{
   if(title==='Ranged weapon profiles'||title==='Melee weapon profiles')return; // Emitted once by drukhariWeaponReminders.
   emit(title,stage,summary,units);
  });
  if(card.save)for(const stage of defence){
   const save=stage[0]==='Fight'?(card.meleeSave??card.save):card.save;
   emit('Invulnerable save',stage,'When an attack is allocated to an actual '+squad.unit+' model from '+squad.id+', that model may use its '+save+'+ invulnerable save.'+
    (card.conditionalSave==='Shadowfield'?' This Archon has this save only until the first time it loses a non-mortal wound; its Shadowfield restriction on save re-rolls is listed separately.':'')+
    (card.meleeSave?' The Wyches’ improved 4+ save applies only against melee attacks; their ranged save is 6+.':'')+
    ' Attached models from another datasheet use their own saves.');
  }
  const shieldBearers=drukhariModelLoadouts(squad).filter(m=>m.items.some(i=>key(i)==='mistshield'));
  if(shieldBearers.length)for(const stage of defence)emit('Mistshield',stage,'Only the actual mistshield bearer'+(shieldBearers.length===1?' ('+shieldBearers[0].model+')':'s')+' in '+squad.id+' has a 4+ invulnerable save. Other models, including attached Characters, do not inherit this personal equipment save.');

  if(group.root.id===squad.id){
   const ids=group.members.map(s=>s.id),deep=drukhariFormationHasDeepStrike(army,group.members,roster),scout=drukhariFormationScoutRange(army,group.members,roster),infiltrate=drukhariFormationHasInfiltrators(army,group.members,roster);
   printFormationDeployment(ids,deep,scout,infiltrate,emit);
   if(group.root.unit==='Hand of the Archon'&&group.members.some(s=>s.id!==group.root.id&&sheets.get(s.unit)?.attachmentRole==='leader'))emit('ARCHON’S RETINUE',['Pre-battle','either','during'],'During Declare Battle Formations, the Leader attached to this Hand of the Archon unit gains Scouts 7″. If the formation is split for a Venom, check each resulting half using only its actually allocated models; the Leader does not gain two copies of its equipment or abilities.',ids);
   if(group.members.every(s=>core(s).includes('Lone Operative')))for(const stage of defence.filter(s=>s[0]!=='Fight'))emit('Lone Operative',stage,'Every surviving model in this formation has Lone Operative. Enemy models more than 12″ away cannot see it or target it with Indirect Fire.',ids);
   const cowl=group.members.some(s=>drukhariHasUpgrade(army,s,'Reaper’s Cowl','Reaper’s Wager'));
   if(group.members.every(s=>core(s).includes('Stealth'))||cowl)for(const stage of defence.filter(s=>s[0]!=='Fight'))emit('Stealth',stage,(cowl?'While the actual Reaper’s Cowl bearer survives, every model in this formation has Stealth':'Every surviving model in this formation has Stealth')+', granting the Benefit of Cover against ranged attacks.',ids);
   if(group.members.every(s=>core(s).includes('Fights First')))emit('Fights First',['Fight','either','start'],'Every surviving model has Fights First, so this formation fights in the Fights First step. Use the normal alternation and eligibility rules.',ids);
  }
  if(!tags.has('TRANSPORT'))continue;
  const passengers=drukhariCargoFormations(army,squad,roster),deck=Number(core(squad).find(c=>c.startsWith('Firing Deck '))?.match(/\d+/)?.[0]??0);
  const allSplits=[...new Map(roster.flatMap(venom=>drukhariSplitCargoFormations(army,venom,roster).map(g=>[g.root.id,{...g,venom}] as const))).values()];
  const capacity=drukhariCarrierCapacity[squad.unit];
  const split=capacity?.kind==='drukhari'?allSplits.filter(g=>g.halves.some(n=>n<=capacity.spaces)):[];
  if(deck){
   printFiringDeck(squad,deck,passengers,DRUKHARI_CARDS,drukhariModelLoadouts,(title,stage,summary,units)=>emit(title,stage,summary+' Use only the physical models actually embarked. If a squad was split, models in its other half contribute no guns. The transport does not gain passenger abilities, enhancements or personal bearer bonuses.',units));
   const choices=split.filter(g=>!passengers.some(p=>p.root.id===g.root.id)).map(g=>({g,inventory:g.members.flatMap(passengerInventory)})).filter(g=>g.inventory.length);
   if(choices.length)emit('Firing Deck '+deck+' · split passengers',['Shooting','own','during'],'Only if a squad was split for an actual Venom and its declared half is actually embarked in this transport: choose up to '+deck+' surviving models allocated to that half whose units have not been selected to shoot this phase. Choose one ranged weapon other than One Shot per model. The transport has those printed weapons until it finishes attacking; all units aboard become ineligible to shoot for the rest of the turn. Do not transfer passenger abilities or bearer bonuses, and never use equipment assigned to the other half. Eligible split pools (choose only the actual half): '+choices.map(({g,inventory})=>g.root.id+' split '+g.halves.join(' + ')+' for '+g.venom.id+'; '+inventory.join('. ')).join('; ')+'.',[squad.id,...choices.flatMap(({g})=>g.members.map(s=>s.id))]);
  }
  if(tags.has('DEDICATED TRANSPORT')){
   const scouts=passengers.map(g=>({...g,range:drukhariFormationScoutRange(army,g.members,roster)})).filter(g=>g.range);
   const scoutSplits=split.map(g=>({...g,range:drukhariFormationScoutRange(army,g.members,roster)})).filter(g=>g.range);
   if(scouts.length||scoutSplits.length)emit('Scouts · passengers',['Pre-battle','either','during'],'During Resolve Pre-battle Abilities, this Dedicated Transport may scout only if wholly in your deployment zone and every actual embarked model has Scouts. Use the lowest distance among all models aboard and finish more than 8″ horizontally from enemies. Eligible whole formations: '+(scouts.map(g=>g.root.id+' ('+g.range+'″)').join(', ')||'none')+'.'+(scoutSplits.length?' A declared split half of '+scoutSplits.map(g=>g.root.id+' ('+g.range+'″)').join(', ')+' may qualify if only those actual models are aboard.':'')+' An additional passenger without Scouts prevents this move unless another rule explicitly grants Scouts to the transport.',[squad.id,...scouts.flatMap(g=>g.members.map(s=>s.id)),...scoutSplits.flatMap(g=>g.members.map(s=>s.id))]);
  }
 }
 return result;
}

/** Alias for consumers using the shared faction profile-module convention. */
export const drukhariProfileReminders=drukhariDatasheetCoreReminders;
