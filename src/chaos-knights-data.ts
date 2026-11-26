import type {ArmySelection} from './catalog';
import {CHAOS_KNIGHT_SHEETS as knightAndDamnedSheets} from './chaos-knights-data.generated';
import {DAEMONIC_PACT_SHEETS} from './daemonic-pact-data.generated';

export const CHAOS_KNIGHT_SHEETS=[...knightAndDamnedSheets,...DAEMONIC_PACT_SHEETS];
export const CHAOS_KNIGHT_UNITS=CHAOS_KNIGHT_SHEETS.map(sheet=>sheet.unit);
const withoutDamned=CHAOS_KNIGHT_SHEETS.filter(sheet=>!sheet.keywords?.includes('DAMNED')).map(sheet=>sheet.unit);

export function chaosKnightMusterUnits(army:ArmySelection):readonly string[] {
 return army.detachments2026?.includes('Iconoclast Fiefdom')?CHAOS_KNIGHT_UNITS:withoutDamned;
}
