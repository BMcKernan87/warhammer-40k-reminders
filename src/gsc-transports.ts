import type {ArmySelection} from './catalog';
import {GSC_SHEETS,gscKeywords} from './gsc-data';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

export interface GscFormation {body:RosterInstance;members:RosterInstance[]}
const sheets=new Map(GSC_SHEETS.map(s=>[s.unit,s]));
export function gscFormations(army:ArmySelection,roster:readonly RosterInstance[]):GscFormation[] {
 const joined=new Map(roster.map(s=>[s.id,knightJoinedBodyguard(army,s)?.id]));
 return roster.filter(s=>!joined.get(s.id)).map(body=>({body,members:[body,...roster.filter(m=>joined.get(m.id)===body.id)]}));
}
export function gscCargoFormations(army:ArmySelection,transport:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):GscFormation[]{
 const capacity=transport.unit==='Goliath Truck'?12:transport.unit==='Goliath Rockgrinder'?6:0;
 if(!capacity||army.faction!=='Genestealer Cults'||!roster.some(s=>s.id===transport.id&&s.unit===transport.unit))return [];
 return gscFormations(army,roster).filter(({body,members})=>{
  if(body.attachedTo||body.retinueTo||sheets.get(body.unit)?.attachmentRole==='support')return false;
  if(roster.some(m=>m.attachedTo===body.id&&!members.some(member=>member.id===m.id)))return false;
  if(!members.every(m=>{
   const tags=gscKeywords(army,m);
   return tags.has('GENESTEALER CULTS')&&tags.has('INFANTRY');
  }))return false;
  return members.reduce((sum,m)=>sum+(m.models??sheets.get(m.unit)?.sizes[0]??1),0)<=capacity;
 });
}
