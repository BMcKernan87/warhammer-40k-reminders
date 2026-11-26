import type {ArmySelection} from './catalog';
import {ASTRA_SHEETS} from './astra-militarum-data';
import {astraMilitarumKeywords} from './astra-muster-data';
import {astraCargoFormations,astraFormationGroups} from './astra-transports';
import {gscAlliedKeywords,gscAllyFaction,gscAlliedMusterUnits} from './gsc-allies';
import {gscTransportOptions} from './gsc-army-transports';
import {gscFormations,type GscFormation} from './gsc-transports';
import type {RosterInstance} from './roster-instances';

const nativeNames=new Set(ASTRA_SHEETS.map(s=>s.unit));
export interface GuardCardContext {
 guards:RosterInstance[];
 groups:GscFormation[];
 tags(s:RosterInstance):Set<string>;
 cargo:Map<string,string[]>;
}
export function guardCardContext(army:ArmySelection,roster:readonly RosterInstance[]):GuardCardContext{
 if(army.faction==='Astra Militarum'){
  const tags=(s:RosterInstance)=>astraMilitarumKeywords(army,s);
  const groups=astraFormationGroups(army,roster).map(f=>({body:f.root,members:f.members})).filter(g=>
   g.members.some(s=>nativeNames.has(s.unit))&&(!g.members.some(s=>tags(s).has('LOYAL PROTECTOR'))||g.members.some(s=>tags(s).has('COMMAND SQUAD'))));
  const activeIds=new Set(groups.flatMap(g=>g.members.map(s=>s.id)));
  const guards=roster.filter(s=>nativeNames.has(s.unit)&&activeIds.has(s.id));
  const transports=guards.filter(s=>tags(s).has('TRANSPORT'));
  const cargo=new Map(transports.map(s=>[s.id,astraCargoFormations(army,s,roster).map(f=>f.root.id)]));
  return {guards,groups,tags,cargo};
 }
 const allowed=new Set(gscAlliedMusterUnits(army));
 const guards=roster.filter(s=>allowed.has(s.unit)&&gscAllyFaction(s.unit)==='Astra Militarum');
 const cargo=new Map(guards.length?gscTransportOptions(army,[...roster]).map(o=>[o.transport.id,o.passengers]):[]);
 return {guards,groups:gscFormations(army,guards),tags:gscAlliedKeywords,cargo};
}
