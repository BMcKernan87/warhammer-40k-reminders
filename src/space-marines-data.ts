import type {Datasheet2026} from './datasheets-2026';
import {SM_NATIVE_SHEETS} from './space-marines-native.generated';
import {ASSIGNED_AGENT_SHEETS} from './assigned-agent-data';
import {FREEBLADE_SHEETS,WARHOUND_SHEETS} from './titan-support-data';

export {SM_NATIVE_SHEETS,SM_REVISION} from './space-marines-native.generated';
export const SM_SHEETS=SM_NATIVE_SHEETS;
const nativeNames=new Set(SM_SHEETS.map(s=>s.unit));
export const isNativeSpaceMarine=(unit:string)=>nativeNames.has(unit);
const allyLabel=(unit:string)=>nativeNames.has(unit)?unit+' (Assigned Agent)':unit;
const agentNames=new Map(ASSIGNED_AGENT_SHEETS.map(s=>[allyLabel(s.unit),s.unit]));
/** Same-named Deathwatch cards have distinct factions, costs, equipment and abilities. */
export const spaceMarineAgentName=(unit:string)=>agentNames.get(unit);
export const SM_AGENT_SHEETS:readonly Datasheet2026[]=ASSIGNED_AGENT_SHEETS.map(s=>({...s,faction:'Space Marines',unit:allyLabel(s.unit),bodyguards:s.bodyguards?.map(allyLabel)}));
export const SM_ARMY_SHEETS:readonly Datasheet2026[]=[...SM_SHEETS,...SM_AGENT_SHEETS,...FREEBLADE_SHEETS.map(s=>({...s,faction:'Space Marines' as const}))];
export const SM_ALL_SHEETS:readonly Datasheet2026[]=[...SM_ARMY_SHEETS,...WARHOUND_SHEETS.filter(s=>s.faction==='Space Marines')];
export const SM_UNITS=SM_ARMY_SHEETS.map(s=>s.unit);
