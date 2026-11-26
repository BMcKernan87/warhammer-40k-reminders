import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {MECHANICUS_SHEETS} from './mechanicus-data.generated';
export {MECHANICUS_SHEETS};
export const MECHANICUS_UNITS=MECHANICUS_SHEETS.map(s=>s.unit);
const sheets=new Map(MECHANICUS_SHEETS.map(s=>[s.unit,s]));
export function mechanicusMusterUnits(army:ArmySelection):string[]{
 return army.faction==='Adeptus Mechanicus'?[...MECHANICUS_UNITS]:[];
}
export function mechanicusKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const s=sheets.get(squad.unit);
 if(army.faction!=='Adeptus Mechanicus'||!s)return new Set();
 return new Set([...s.keywords??[],...(model?s.modelKeywords?.[model]??[]:[s.unit.toUpperCase(),...Object.values(s.modelKeywords??{}).flat()])]);
}
