import type {ArmySelection} from './catalog';
import {expandRoster,type RosterInstance} from './roster-instances';
import {knightJoinedBodyguard} from './leader-eligibility';
import {MECHANICUS_SHEETS,mechanicusKeywords as nativeKeywords} from './mechanicus-data';
import {mechanicusKeywords as baseKeywords} from './mechanicus-army-data';

const native=new Set(MECHANICUS_SHEETS.map(s=>s.unit));
/** Roster-derived keyword grants use the same validated formations as the editor. */
export function mechanicusKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const tags=baseKeywords(army,squad,model);
 if(army.faction!=='Adeptus Mechanicus')return tags;
 if(army.detachments2026?.includes('Eradication Cohort')){
  const roster=expandRoster(army),root=knightJoinedBodyguard(army,squad)?.id??squad.id;
  if(roster.some(bearer=>{
   const chosen=army.upgrades2026?.[bearer.id]??army.upgrades2026?.[bearer.unit]??bearer.enhancement;
   if(chosen!=='Martial Signatum Amplificator'||!native.has(bearer.unit))return false;
   const own=nativeKeywords(army,bearer);
   return own.has('TECH-PRIEST')&&own.has('CHARACTER')&&(knightJoinedBodyguard(army,bearer)?.id??bearer.id)===root;
  }))tags.add('SKITARII');
 }
 if(!model&&army.detachments2026?.includes('Cohort Acquisitus')&&['Pteraxii Skystalkers','Pteraxii Sterylizors','Sicarian Infiltrators','Skitarii Rangers','Serberys Raiders','Serberys Sulphurhounds'].includes(squad.unit))tags.add('RECON AUGURY');
 return tags;
}
