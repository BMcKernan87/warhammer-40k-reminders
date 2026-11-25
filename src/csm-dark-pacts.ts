import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {CSM_DARK_PACT_UNITS} from './csm-data';
import {csmMusterUnits} from './csm-army-data';
import {csmArmyHasRangedWeapon,csmArmyWeaponCount} from './csm-army-loadouts';
import {csmKeywords} from './csm-keywords';
import {csmFormations} from './csm-transports';
import {csmReactionShooting} from './csm-reactions';
import {expandRoster,type RosterInstance} from './roster-instances';

export const CSM_FACTION_SOURCE='https://wahapedia.ru/wh40k11ed/factions/chaos-space-marines/';
const pactSources=new Set<string>(CSM_DARK_PACT_UNITS);

/** A Faction-keyword replacement alone does not grant the Dark Pacts ability. */
export function csmCanDarkPact(army:ArmySelection,members:readonly RosterInstance[]):boolean{
 return army.faction==='Chaos Space Marines'&&!army.detachments2026?.some(d=>d.toLowerCase()==='renegade warband')&&members.some(s=>pactSources.has(s.unit)&&csmMusterUnits(army).includes(s.unit));
}

export function csmDarkPactsReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Chaos Space Marines')return [];
 const legal=new Set(csmMusterUnits(army));
 const groups=csmFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit))&&csmCanDarkPact(army,g.members));
 const result:GeneratedReminder[]=[];
 for(const group of groups){
  const ids=group.members.map(s=>s.id),ranged=group.members.some(csmArmyHasRangedWeapon);
  const icon=group.members.filter(s=>csmArmyWeaponCount(s,'Chaos icon')>0);
  const stages:readonly (readonly [GeneratedReminder['window'],GeneratedReminder['turn']])[]=[['Fight','either'],...(ranged?[['Shooting','own'] as const]:[]),...(ranged&&!group.members.some(s=>csmKeywords(army,s,undefined,roster).has('TITANIC'))?[['Movement','opponent'] as const]:[]),...(group.members.some(s=>csmReactionShooting(army,s,roster).length)?[['Shooting','opponent'] as const]:[])];
  for(const [window,turn] of stages){
   const snap=window==='Movement',reaction=window==='Shooting'&&turn==='opponent';
   const permission=reaction?'Only when Cypher is permitted to use Guns Blazing, ':'When this formation is selected to '+(window==='Fight'?'fight':'shoot')+', ';
   const summary=permission+'it may make a Dark Pact. First take its Leadership test and, on failure, resolve D3 mortal wounds before any pact effects. Then choose Lethal Hits or Sustained Hits 1 for this formation’s weapons until the end of the phase. '+(window!=='Fight'?'A unit with no eligible shooting target cannot be selected to shoot just to make this pact. ':'')+(snap?'Overwatch uses snap shooting, so neither chosen ability can trigger Critical Hits; separately triggered pact effects still require their own conditions. ':'Lethal Hits automatically wounds on Critical Hits; Sustained Hits 1 scores one additional hit per Critical Hit. Torrent attacks do not roll to Hit. ')+(icon.length?'While an actual Chaos icon bearer survives, you may re-roll this pact’s Leadership test. Icon sources: '+icon.map(s=>s.id).join(', ')+'. ':'');
   result.push({id:['11e-csm-dark-pacts',group.root.id,window,turn].join(':'),title:group.root.id+' · Dark Pacts',window,turn,timing:snap?'end':'during',summary,units:ids,source:CSM_FACTION_SOURCE,origin:'army'});
  }
 }
 return result;
}
