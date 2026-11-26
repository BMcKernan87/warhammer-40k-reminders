import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {TAU_SHEETS} from './tau-data.generated';
export {TAU_SHEETS};
export const TAU_UNITS=TAU_SHEETS.map(s=>s.unit);
const sheets=new Map(TAU_SHEETS.map(s=>[s.unit,s]));
export function tauMusterUnits(army:ArmySelection):string[]{
 return army.faction==='T’au Empire'?[...TAU_UNITS]:[];
}
export function tauKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const s=sheets.get(squad.unit);
 if(army.faction!=='T’au Empire'||!s)return new Set();
 return new Set([...s.keywords??[],...(model?s.modelKeywords?.[model]??[]:[s.unit.toUpperCase(),...Object.values(s.modelKeywords??{}).flat()])]);
}
