import type {Datasheet2026} from './datasheets-2026';
import {ASTRA_SHEETS} from './astra-militarum-data';
import {ASSIGNED_AGENT_SHEETS} from './assigned-agent-data';
import {FREEBLADE_SHEETS,WARHOUND_SHEETS} from './titan-support-data';

const faction='Astra Militarum' as const;
const alliedPriest='Ministorum Priest (Imperial Agents)';
const allyLabel=(unit:string)=>unit==='Ministorum Priest'?alliedPriest:unit;
const agentNames=new Map(ASSIGNED_AGENT_SHEETS.map(s=>[allyLabel(s.unit),s.unit]));
export const astraAgentName=(unit:string)=>agentNames.get(unit);
const agents=ASSIGNED_AGENT_SHEETS.map(s=>({...s,faction,unit:allyLabel(s.unit),bodyguards:s.bodyguards?.map(allyLabel)}));
export const ASTRA_ARMY_SHEETS:readonly Datasheet2026[]=[...ASTRA_SHEETS,...agents,...FREEBLADE_SHEETS.map(s=>({...s,faction})),...WARHOUND_SHEETS.filter(s=>s.faction===faction)];
export const ASTRA_ARMY_UNITS=ASTRA_ARMY_SHEETS.map(s=>s.unit);
export const astraSheets=new Map(ASTRA_ARMY_SHEETS.map(s=>[s.unit,s]));
export const loyalProtectors=new Set(['Ogryn Bodyguard','Nork Deddog']);
