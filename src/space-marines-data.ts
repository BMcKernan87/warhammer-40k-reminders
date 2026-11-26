import type {Datasheet2026} from './datasheets-2026';
import {SM_NATIVE_SHEETS} from './space-marines-native.generated';
import {ASSIGNED_AGENT_SHEETS} from './assigned-agent-data';
import {FREEBLADE_SHEETS,WARHOUND_SHEETS} from './titan-support-data';
import type {Faction} from './catalog';
import {SPACE_MARINE_FACTIONS} from './space-marines-factions';
import {CHAPTER_NATIVE_SHEETS,CHAPTER_MEMBERSHIP,CHAPTER_ATTACHMENTS} from './space-marine-chapters-native.generated';

export {SM_NATIVE_SHEETS,SM_REVISION} from './space-marines-native.generated';
export const SM_SHEETS=SM_NATIVE_SHEETS;
const nativeNames=new Set(SM_SHEETS.map(s=>s.unit));
export const isNativeSpaceMarine=(unit:string,faction:Faction='Space Marines')=>spaceMarineNativeSheet(unit,faction)!==undefined;
const allyLabel=(unit:string)=>nativeNames.has(unit)?unit+' (Assigned Agent)':unit;
const agentNames=new Map(ASSIGNED_AGENT_SHEETS.map(s=>[allyLabel(s.unit),s.unit]));
/** Same-named Deathwatch cards have distinct factions, costs, equipment and abilities. */
export const spaceMarineAgentName=(unit:string)=>agentNames.get(unit);
export const SM_AGENT_SHEETS:readonly Datasheet2026[]=ASSIGNED_AGENT_SHEETS.map(s=>({...s,faction:'Space Marines',unit:allyLabel(s.unit),bodyguards:s.bodyguards?.map(allyLabel)}));
export const SM_ARMY_SHEETS:readonly Datasheet2026[]=[...SM_SHEETS,...SM_AGENT_SHEETS,...FREEBLADE_SHEETS.map(s=>({...s,faction:'Space Marines' as const}))];
export const SM_ALL_SHEETS:readonly Datasheet2026[]=[...SM_ARMY_SHEETS,...WARHOUND_SHEETS.filter(s=>s.faction==='Space Marines')];
export const SM_UNITS=SM_ARMY_SHEETS.map(s=>s.unit);
const deathwatch=SM_SHEETS.filter(s=>s.keywords?.includes('DEATHWATCH'));
export const CHAPTER_ARMY_SHEETS:readonly Datasheet2026[]=SPACE_MARINE_FACTIONS.filter(f=>f!=='Space Marines').flatMap(faction=>{
 const available=new Map([...SM_SHEETS,...CHAPTER_NATIVE_SHEETS.filter(s=>s.faction===faction)].map(s=>[s.unit,s]));
 const names=[...new Set([...CHAPTER_MEMBERSHIP[faction],...deathwatch.map(s=>s.unit)])];
 const native=names.map(unit=>{
  const sheet=available.get(unit);if(!sheet)throw Error('Missing current '+faction+' datasheet: '+unit);
  return {...sheet,faction,...CHAPTER_ATTACHMENTS[faction]?.[unit]};
 });
 return [...native,...SM_AGENT_SHEETS.map(s=>({...s,faction})),...FREEBLADE_SHEETS.map(s=>({...s,faction}))];
});
const banks=new Map<Faction,readonly Datasheet2026[]>(SPACE_MARINE_FACTIONS.map(faction=>[faction,faction==='Space Marines'?SM_ALL_SHEETS:[...CHAPTER_ARMY_SHEETS.filter(s=>s.faction===faction),...WARHOUND_SHEETS.filter(s=>s.faction===faction)]]));
// These source banks are fixed at module initialization. Index only printed
// data; roster membership, attachments and casualties remain live calculations.
const sheetIndexes=new Map<Faction,ReadonlyMap<string,Datasheet2026>>([...banks].map(([faction,sheets])=>[faction,new Map(sheets.map(s=>[s.unit,s]))]));
const nativeBanks=new Map<Faction,readonly Datasheet2026[]>([...banks].map(([faction,sheets])=>[faction,sheets.filter(s=>s.keywords?.includes('ADEPTUS ASTARTES')&&!spaceMarineAgentName(s.unit))]));
const nativeIndexes=new Map<Faction,ReadonlyMap<string,Datasheet2026>>([...nativeBanks].map(([faction,sheets])=>[faction,new Map(sheets.map(s=>[s.unit,s]))]));
export const spaceMarineSheets=(faction:Faction='Space Marines'):readonly Datasheet2026[]=>banks.get(faction)??[];
export const spaceMarineSheet=(unit:string,faction:Faction='Space Marines')=>sheetIndexes.get(faction)?.get(unit);
export const spaceMarineNativeSheets=(faction:Faction='Space Marines'):readonly Datasheet2026[]=>nativeBanks.get(faction)??[];
export const spaceMarineNativeSheet=(unit:string,faction:Faction='Space Marines')=>nativeIndexes.get(faction)?.get(unit);
export const spaceMarineArmyUnits=(faction:Faction)=>spaceMarineSheets(faction).filter(s=>!s.unit.startsWith('Warhound')).map(s=>s.unit);
