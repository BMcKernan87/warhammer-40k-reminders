import type {ArmySelection} from './catalog';
import {CHAOS_KNIGHT_SHEETS} from './chaos-knights-data.generated';

export {CHAOS_KNIGHT_SHEETS};
export const CHAOS_KNIGHT_UNITS=CHAOS_KNIGHT_SHEETS.map(sheet=>sheet.unit);
const nativeKnights=CHAOS_KNIGHT_SHEETS.filter(sheet=>sheet.keywords?.includes('CHAOS KNIGHTS')).map(sheet=>sheet.unit);

export function chaosKnightMusterUnits(army:ArmySelection):readonly string[] {
 return army.detachments2026?.includes('Iconoclast Fiefdom')?CHAOS_KNIGHT_UNITS:nativeKnights;
}
