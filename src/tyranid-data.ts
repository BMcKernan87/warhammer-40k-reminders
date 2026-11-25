import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {TYRANID_SHEETS} from './tyranid-data.generated';
export {TYRANID_SHEETS};
export const TYRANID_UNITS=TYRANID_SHEETS.map(s=>s.unit);
const sheets=new Map(TYRANID_SHEETS.map(s=>[s.unit,s]));
export function tyranidMusterUnits(army:ArmySelection):string[]{
 return army.faction==='Tyranids'?[...TYRANID_UNITS]:[];
}
export function tyranidKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const s=sheets.get(squad.unit);
 if(army.faction!=='Tyranids'||!s)return new Set();
 return new Set([...s.keywords??[],...(model?s.modelKeywords?.[model]??[]:[s.unit.toUpperCase(),...Object.values(s.modelKeywords??{}).flat()])]);
}
