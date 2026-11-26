import type {ArmySelection} from './catalog';
import {CSM_ALL_SHEETS} from './csm-army-data';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

const units=new Set(CSM_ALL_SHEETS.map(s=>s.unit));
/** Core 19.01.01: surviving Leaders and Supports remain one attached unit. */
export function csmFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 if(army.faction!=='Chaos Space Marines')return [];
 const present=roster.filter(s=>units.has(s.unit)),live=new Map(present.map(s=>[s.id,s]));
 const snapshot={...army,instances:present},original=new Map(expandRoster(army).map(s=>[s.id,s]));
 const groups=new Map<string,RosterInstance[]>();
 for(const squad of present){
  const body=knightJoinedBodyguard(snapshot,squad),start=original.get(squad.id);
  const former=squad.attachedTo&&!live.has(squad.attachedTo)&&start?.unit===squad.unit&&start.attachedTo===squad.attachedTo&&knightJoinedBodyguard(army,start)?.id===squad.attachedTo;
  const key=body?.id??(former?squad.attachedTo!:squad.id);
  groups.set(key,[...groups.get(key)??[],squad]);
 }
 return [...groups].map(([id,members])=>{
  const root=members.find(s=>s.id===id)??members[0];
  return {root,members:[root,...members.filter(s=>s.id!==root.id)]};
 });
}
