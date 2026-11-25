import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {TYRANID_CARDS,type TyranidCardStats} from './tyranid-card-profiles.generated';
import {tyranidMusterUnits} from './tyranid-data';
import {tyranidKeywords} from './tyranid-keywords';
import {tyranidWeaponCount} from './tyranid-loadouts';
import {tyranidFormations} from './tyranid-transports';
import {tyranidHasDeepStrike} from './tyranid-detachment-data';
import {aircraftCoreReminders} from './aircraft-core';
import {printCombatProfiles,printFormationDeployment,type ProfileStage} from './faction-card-profiles';
import {equippedWeaponText} from './knight-card-rules';
import {expandRoster,type RosterInstance} from './roster-instances';

const core=(s:RosterInstance):readonly string[]=>TYRANID_CARDS[s.unit]?.core??[];
function fullWeapons(s:RosterInstance,card:TyranidCardStats,phase:'Shooting'|'Fight',snap:boolean):string{
 return card.weapons.filter(w=>w.phase===phase&&tyranidWeaponCount(s,w.name)>0).map(w=>{
  const stats=(phase==='Shooting'?w.range+'″; ':'')+'A '+w.attacks+'; '+(snap?'':(phase==='Shooting'?'BS ':'WS ')+w.skill+(w.skill==='-'?'':'+')+'; ')+'D '+w.damage;
  return equippedWeaponText(s,{...card,weapons:[w]},phase,snap,tyranidWeaponCount).replace(' — ',' — '+stats+'; ');
 }).join(' ');
}
export function tyranidFormationHasDeepStrike(army:ArmySelection,members:readonly RosterInstance[]):boolean{return members.length>0&&members.every(s=>tyranidHasDeepStrike(army,s));}
export function tyranidFormationScoutRange(_army:ArmySelection,members:readonly RosterInstance[]):number{
 const ranges=members.map(s=>Number(core(s).find(c=>c.startsWith('Scouts '))?.match(/\d+/)?.[0]??0));
 return ranges.length&&ranges.every(Boolean)?Math.min(...ranges):0;
}
export function tyranidFormationHasInfiltrators(members:readonly RosterInstance[]):boolean{return members.length>0&&members.every(s=>core(s).includes('Infiltrators'));}

export function tyranidProfileReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Tyranids')return [];
 const current={...army,instances:[...roster]},legal=new Set(tyranidMusterUnits(army)),native=roster.filter(s=>TYRANID_CARDS[s.unit]&&legal.has(s.unit));
 const groups=tyranidFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 const result:GeneratedReminder[]=aircraftCoreReminders('11e-tyranid-',native.filter(s=>tyranidKeywords(current,s).has('AIRCRAFT')).map(s=>s.id));
 for(const squad of native){
  const card=TYRANID_CARDS[squad.unit],group=groups.find(g=>g.root.id===squad.id),formation=groups.find(g=>g.members.some(s=>s.id===squad.id));if(!formation)continue;
  const tags=tyranidKeywords(current,squad);
  function emit(title:string,[window,turn,timing]:ProfileStage,summary:string,units=[squad.id]){
   result.push({id:['11e-tyranid-profile',squad.id,title,window,turn,timing].join(':'),title:squad.id+' · '+title,window,turn,timing,summary,units,origin:'unit',source:card.source});
  }
  printCombatProfiles(squad,card,tags.has('TITANIC'),tyranidWeaponCount,(title,stage,summary,units)=>{
   if(title==='Ranged weapon profiles'||title==='Melee weapon profiles')summary=(stage[0]==='Movement'?'When firing Overwatch, use snap shooting. ':'')+fullWeapons(squad,card,title==='Melee weapon profiles'?'Fight':'Shooting',stage[0]==='Movement');
   emit(title,stage,summary,units);
  });
  if(card.save)emit('Invulnerable save',['Shooting','own','during'],'When permitted enemy return fire allocates an attack to a model from '+squad.id+', that model can use its '+card.save+'+ invulnerable save.');
  if(group){
   const ids=group.members.map(s=>s.id);
   printFormationDeployment(ids,tyranidFormationHasDeepStrike(current,group.members),tyranidFormationScoutRange(army,group.members),tyranidFormationHasInfiltrators(group.members),(title,stage,summary,units)=>{
    if(squad.unit==='Tyrannocyte'&&title==='Deep Strike')summary=stage[0]==='Pre-battle'?'This Tyrannocyte must start in Reserves. Its Aerial Seeding rule and actual passengers are listed separately.':'Aerial Seeding permits this Tyrannocyte to arrive in your first, second or third Movement phase. With Deep Strike, set it up more than 8″ horizontally from enemy units; its actual passengers must immediately disembark more than 8″ from enemies.';
    emit(title,stage,summary,units);
   });
   if(group.members.every(s=>core(s).includes('Lone Operative')))for(const stage of [['Shooting','opponent','during'],['Movement','own','end'],['Shooting','own','during']] as const)emit('Lone Operative',stage,'Every surviving model in this formation has Lone Operative. Enemy models more than 12″ away cannot see it or target it with Indirect Fire.',ids);
   if(group.members.every(s=>core(s).includes('Stealth')))for(const stage of [['Shooting','opponent','during'],['Movement','own','end'],['Shooting','own','during']] as const)emit('Stealth',stage,'Every surviving model in this formation has Stealth, so it has the Benefit of Cover against ranged attacks.',ids);
   if(group.members.some(s=>core(s).includes('Fights First')))emit('Fights First',['Fight','either','start'],'This formation fights in the Fights First step; use normal alternation and eligibility rules.',ids);
  }
 }
 return result;
}
