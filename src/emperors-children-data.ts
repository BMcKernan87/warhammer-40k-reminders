import type {ArmySelection} from './catalog';
import {dreadbladesFor} from './dreadblade-allies';
import type {RosterInstance} from './roster-instances';
import {alliedTitanAndKnightNames,WARHOUND_SHEETS} from './titan-support-data';
import {EMPERORS_CHILDREN_SHEETS} from './emperors-children-data.generated';

export {EMPERORS_CHILDREN_SHEETS};
export const EMPERORS_CHILDREN_ARMY_SHEETS=[...EMPERORS_CHILDREN_SHEETS,...dreadbladesFor('Emperor’s Children')];
export const EMPERORS_CHILDREN_UNITS=EMPERORS_CHILDREN_ARMY_SHEETS.map(s=>s.unit);
const sheets=new Map([...EMPERORS_CHILDREN_ARMY_SHEETS,...WARHOUND_SHEETS.filter(s=>s.faction==='Emperor’s Children')].map(s=>[s.unit,s]));
export const isLegionsOfExcess=(unit:string)=>sheets.get(unit)?.keywords?.includes('LEGIONS OF EXCESS')??false;
export function emperorsChildrenMusterUnits(army:ArmySelection):string[]{
 if(army.faction!=='Emperor’s Children')return [];
 const carnival=army.detachments2026?.includes('Carnival of Excess');
 return [...EMPERORS_CHILDREN_ARMY_SHEETS.filter(s=>carnival||!isLegionsOfExcess(s.unit)).map(s=>s.unit),...alliedTitanAndKnightNames(army)];
}
export function emperorsChildrenKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const s=sheets.get(squad.unit);
 if(army.faction!=='Emperor’s Children'||!s)return new Set();
 return new Set([...s.keywords??[],...(model?s.modelKeywords?.[model]??[]:[s.unit.toUpperCase(),...Object.values(s.modelKeywords??{}).flat()])]);
}
export function emperorsChildrenAdditionalBodyguards(army:ArmySelection,leader:RosterInstance):readonly string[]{
 const upgrade=army.upgrades2026?.[leader.id]??army.upgrades2026?.[leader.unit]??leader.enhancement;
 return leader.unit==='Lord Exultant'&&upgrade==='Exalted Patron'&&army.detachments2026?.includes('Court of the Phoenician')?['Flawless Blades']:[];
}
