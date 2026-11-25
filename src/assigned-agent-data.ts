import type {Datasheet2026} from './datasheets-2026';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';

export const ASSIGNED_AGENT_SHEETS:readonly Datasheet2026[]=ASSIGNED_AGENT_DATA.map(row=>row.sheet);
export const ASSIGNED_AGENT_UNITS=ASSIGNED_AGENT_SHEETS.map(sheet=>sheet.unit);
