import type {ArmySelection} from './catalog';
import {AELDARI_NATIVE_SHEETS} from './aeldari-native.generated';

const native=new Map(AELDARI_NATIVE_SHEETS.map(s=>[s.unit,s]));
const normal=(name:string)=>name.trim().replaceAll('’',"'").toLowerCase();
export const isNativeAeldari=(unit:string)=>native.has(unit);
export const isAeldariYnnari=(unit:string)=>native.get(unit)?.keywords?.includes('YNNARI')??false;
export const isAeldariHarlequin=(unit:string)=>native.get(unit)?.keywords?.includes('HARLEQUINS')??false;
export const aeldariHasDetachment=(army:ArmySelection,name:string)=>army.faction==='Aeldari'&&!!army.detachments2026?.some(d=>normal(d)===normal(name));

/** Disparate Paths admits Harlequins; Devoted of Ynnead admits Ynnari. */
export function aeldariMusterUnits(army:ArmySelection):string[]{
 if(army.faction!=='Aeldari')return [];
 const devoted=aeldariHasDetachment(army,'Devoted of Ynnead');
 return AELDARI_NATIVE_SHEETS.filter(s=>!isAeldariYnnari(s.unit)||devoted).map(s=>s.unit);
}
