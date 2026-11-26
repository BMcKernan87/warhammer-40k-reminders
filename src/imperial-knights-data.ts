import {ASSIGNED_AGENT_UNITS} from './assigned-agent-data';
import type {ArmySelection} from './catalog';
import {IMPERIAL_KNIGHT_SHEETS} from './imperial-knights-data.generated';

export {IMPERIAL_KNIGHT_SHEETS};
export const IMPERIAL_KNIGHT_UNITS=[...IMPERIAL_KNIGHT_SHEETS.map(sheet=>sheet.unit),...ASSIGNED_AGENT_UNITS];
const baseMuster=[...IMPERIAL_KNIGHT_SHEETS.filter(sheet=>sheet.keywords?.includes('IMPERIAL KNIGHTS')).map(sheet=>sheet.unit),...ASSIGNED_AGENT_UNITS];

export function knightMusterUnits(army:ArmySelection):readonly string[] {
 return army.detachments2026?.includes('Questor Forgepact')?IMPERIAL_KNIGHT_UNITS:baseMuster;
}
