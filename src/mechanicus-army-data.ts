import type {ArmySelection} from './catalog';
import type {Datasheet2026} from './datasheets-2026';
import type {RosterInstance} from './roster-instances';
import {MECHANICUS_SHEETS,mechanicusKeywords as nativeKeywords} from './mechanicus-data';
import {ASSIGNED_AGENT_SHEETS} from './assigned-agent-data';
import {FREEBLADE_SHEETS,WARHOUND_SHEETS,alliedTitanAndKnightNames,isWarhound} from './titan-support-data';

const faction='Adeptus Mechanicus' as const;
const agentNames=new Set(ASSIGNED_AGENT_SHEETS.map(s=>s.unit));
export const mechanicusAgentName=(unit:string)=>agentNames.has(unit)?unit:undefined;
export const MECHANICUS_ARMY_SHEETS:readonly Datasheet2026[]=[...MECHANICUS_SHEETS,...ASSIGNED_AGENT_SHEETS.map(s=>({...s,faction})),...FREEBLADE_SHEETS.map(s=>({...s,faction}))];
export const MECHANICUS_ARMY_UNITS=MECHANICUS_ARMY_SHEETS.map(s=>s.unit);
const native=new Set(MECHANICUS_SHEETS.map(s=>s.unit));
const sheets=new Map([...MECHANICUS_ARMY_SHEETS,...WARHOUND_SHEETS.filter(s=>s.faction===faction)].map(s=>[s.unit,s]));
export function mechanicusMusterUnits(army:ArmySelection):string[]{
 return army.faction===faction?[...MECHANICUS_ARMY_UNITS,...alliedTitanAndKnightNames(army).filter(isWarhound)]:[];
}
export function mechanicusKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 if(army.faction!==faction)return new Set();
 const sheet=sheets.get(squad.unit);
 const tags=native.has(squad.unit)?nativeKeywords(army,squad,model):new Set([...sheet?.keywords??[],...(model?sheet?.modelKeywords?.[model]??[]:Object.values(sheet?.modelKeywords??{}).flat())]);
 return tags;
}
