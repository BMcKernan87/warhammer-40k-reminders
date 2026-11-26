import type {Datasheet2026} from './datasheets-2026';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';

export const ASSIGNED_AGENT_SHEETS:readonly Datasheet2026[]=ASSIGNED_AGENT_DATA.map(row=>row.sheet);
export const ASSIGNED_AGENT_UNITS=ASSIGNED_AGENT_SHEETS.map(sheet=>sheet.unit);

export const NATIVE_AGENT_SHEETS:readonly Datasheet2026[]=ASSIGNED_AGENT_DATA.map((row)=>{
 const shared:Datasheet2026=row.sheet;
 return {...shared,faction:'Imperial Agents',...row.nativeCosts,...(shared.bodyguards?{bodyguards:shared.bodyguards.filter(unit=>ASSIGNED_AGENT_UNITS.includes(unit))}:{})};
});

// Current matched-play Inquisitors with Authority and the MFM's Imperium Battleline Infantry eligibility.
export const assignedAgentHost=(faction:string)=>['Blood Angels','Dark Angels','Black Templars','Space Wolves','Space Marines','Imperial Knights','Adeptus Custodes','Astra Militarum','Grey Knights','Adepta Sororitas','Adeptus Mechanicus'].includes(faction);
export const BATTLELINE_INQUISITORS=new Set(['Inquisitor','Inquisitor Coteaz','Inquisitor Draxus','Inquisitor Greyfax']);
