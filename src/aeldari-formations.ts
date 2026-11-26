import type {ArmySelection} from './catalog';
import {AELDARI_SHEETS} from './aeldari-data';
import {aeldariMusterUnits} from './aeldari-muster-data';
import {aeldariJoinedArtillery} from './aeldari-artillery';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(AELDARI_SHEETS.map(s=>[s.unit,s]));
export interface AeldariFormation {root:RosterInstance;members:RosterInstance[];models:number}
/** Surviving Leaders, Supports and joined artillery retain their original formation. */
export function aeldariFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):AeldariFormation[]{
 if(army.faction!=='Aeldari')return [];
 const allowed=new Set(aeldariMusterUnits(army)),present=roster.filter(s=>allowed.has(s.unit)),live=new Map(present.map(s=>[s.id,s]));
 const snapshot={...army,instances:present},original=new Map(expandRoster(army).map(s=>[s.id,s]));
 const groups=new Map<string,RosterInstance[]>();
 for(const squad of present){
  const body=knightJoinedBodyguard(snapshot,squad)??aeldariJoinedArtillery(snapshot,squad),start=original.get(squad.id),host=squad.attachedTo??squad.retinueTo;
  const originalBody=start&&(knightJoinedBodyguard(army,start)??aeldariJoinedArtillery(army,start));
  const intermediary=host?original.get(host):undefined;
  const lostLink=host&&(!live.has(host)||intermediary?.attachedTo&&!live.has(intermediary.attachedTo));
  const former=lostLink&&start?.unit===squad.unit&&(start.attachedTo??start.retinueTo)===host&&originalBody;
  const key=body?.id??(former?originalBody.id:squad.id);
  groups.set(key,[...groups.get(key)??[],squad]);
 }
 return [...groups].map(([id,members])=>{
  const root=members.find(s=>s.id===id)??members[0];
  return {root,members:[root,...members.filter(s=>s.id!==root.id)],models:members.reduce((n,s)=>n+(s.models??sheets.get(s.unit)?.sizes[0]??0),0)};
 });
}
