import type {ArmySelection} from './catalog';
import {DRUKHARI_NATIVE_SHEETS,DRUKHARI_ALLIED_SHEETS} from './drukhari-data';
import {BATTLE_SIZES_2026} from './edition-2026';

const native=new Set(DRUKHARI_NATIVE_SHEETS.map(s=>s.unit));
const allies=new Map(DRUKHARI_ALLIED_SHEETS.map(s=>[s.unit,s]));
const normal=(name:string)=>name.trim().replaceAll('’',"'").toLowerCase();
export const isNativeDrukhari=(unit:string)=>native.has(unit);
export const isDrukhariAlly=(unit:string)=>allies.has(unit);
export const isDrukhariHarlequin=(unit:string)=>allies.get(unit)?.keywords?.includes('HARLEQUINS')??false;
export const drukhariHasDetachment=(army:ArmySelection,name:string)=>army.faction==='Drukhari'&&!!army.detachments2026?.some(d=>normal(d)===normal(name));
export const drukhariUsesReapersWager=(army:ArmySelection)=>drukhariHasDetachment(army,'Reaper’s Wager');

/** Reaper's Wager replaces Corsairs and Travelling Players; its allowance cannot stack. */
export function drukhariMusterUnits(army:ArmySelection):string[]{
 if(army.faction!=='Drukhari')return [];
 return [...DRUKHARI_NATIVE_SHEETS,...DRUKHARI_ALLIED_SHEETS.filter(s=>!drukhariUsesReapersWager(army)||isDrukhariHarlequin(s.unit))].map(s=>s.unit);
}
export function drukhariAllyAllowance(army:ArmySelection):number{
 return BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points/(drukhariUsesReapersWager(army)?2:4);
}
