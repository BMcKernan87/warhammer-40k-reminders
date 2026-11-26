import {DRUKHARI_NATIVE_SHEETS,DRUKHARI_ALLIED_SHEETS} from './drukhari-native.generated';
export {DRUKHARI_NATIVE_SHEETS,DRUKHARI_ALLIED_SHEETS,DRUKHARI_REVISION,DRUKHARI_VOIDSCARRED_COMPOSITIONS} from './drukhari-native.generated';
export const DRUKHARI_SHEETS=[...DRUKHARI_NATIVE_SHEETS,...DRUKHARI_ALLIED_SHEETS];
export const DRUKHARI_UNITS=DRUKHARI_SHEETS.map(s=>s.unit);
export const isDrukhariNative=(unit:string)=>DRUKHARI_NATIVE_SHEETS.some(s=>s.unit===unit);
export const isDrukhariAlly=(unit:string)=>DRUKHARI_ALLIED_SHEETS.some(s=>s.unit===unit);
