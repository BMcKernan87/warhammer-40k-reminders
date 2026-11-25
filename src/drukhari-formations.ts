import type {ArmySelection} from './catalog';
import {DRUKHARI_SHEETS} from './drukhari-data';
import {drukhariMusterUnits} from './drukhari-muster-data';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(DRUKHARI_SHEETS.map(s=>[s.unit,s]));
export interface DrukhariFormation {root:RosterInstance;members:RosterInstance[];models:number}
/** Keep original attachment evidence when a surviving roster is supplied separately. */
export function drukhariFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):DrukhariFormation[]{
 if(army.faction!=='Drukhari')return [];
 const allowed=new Set(drukhariMusterUnits(army)),present=roster.filter(s=>allowed.has(s.unit)),live=new Map(present.map(s=>[s.id,s]));
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
  return {root,members:[root,...members.filter(s=>s.id!==root.id)],models:members.reduce((n,s)=>n+(s.models??sheets.get(s.unit)?.sizes[0]??0),0)};
 });
}
