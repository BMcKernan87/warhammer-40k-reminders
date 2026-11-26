import type {ArmySelection} from './catalog';
import type {Datasheet2026} from './datasheets-2026';
import type {RosterInstance} from './roster-instances';
import {SORORITAS_SHEETS,sororitasKeywords as nativeKeywords} from './sororitas-data';
import {ASSIGNED_AGENT_SHEETS} from './assigned-agent-data';
import {FREEBLADE_SHEETS,WARHOUND_SHEETS,alliedTitanAndKnightNames,isWarhound} from './titan-support-data';

const faction='Adepta Sororitas' as const;
const duplicates=new Set(['Ministorum Priest','Sanctifiers']);
const allyLabel=(unit:string)=>duplicates.has(unit)?unit+' (Assigned Agent)':unit;
const agentNames=new Map(ASSIGNED_AGENT_SHEETS.map(s=>[allyLabel(s.unit),s.unit]));
export const sororitasAgentName=(unit:string)=>agentNames.get(unit);
const agents=ASSIGNED_AGENT_SHEETS.map(s=>({...s,faction,unit:allyLabel(s.unit),bodyguards:s.bodyguards?.map(allyLabel)}));
export const SORORITAS_ARMY_SHEETS:readonly Datasheet2026[]=[...SORORITAS_SHEETS,...agents,...FREEBLADE_SHEETS.map(s=>({...s,faction}))];
export const SORORITAS_ARMY_UNITS=SORORITAS_ARMY_SHEETS.map(s=>s.unit);
const native=new Set(SORORITAS_SHEETS.map(s=>s.unit));
const sheets=new Map([...SORORITAS_ARMY_SHEETS,...WARHOUND_SHEETS.filter(s=>s.faction===faction)].map(s=>[s.unit,s]));
export function sororitasMusterUnits(army:ArmySelection):string[]{
 return army.faction===faction?[...SORORITAS_ARMY_UNITS,...alliedTitanAndKnightNames(army).filter(isWarhound)]:[];
}
export function sororitasKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 if(army.faction!==faction)return new Set();
 if(native.has(squad.unit))return nativeKeywords(army,squad,model);
 const sheet=sheets.get(squad.unit);
 return new Set([...sheet?.keywords??[],...(model?sheet?.modelKeywords?.[model]??[]:Object.values(sheet?.modelKeywords??{}).flat())]);
}

