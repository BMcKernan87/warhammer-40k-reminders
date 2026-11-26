import type {ArmySelection} from './catalog';
import {dreadbladesFor} from './dreadblade-allies';
import type {RosterInstance} from './roster-instances';
import {alliedTitanAndKnightNames,WARHOUND_SHEETS} from './titan-support-data';
import {DEATH_GUARD_ADDITIONAL_LEADERS,DEATH_GUARD_SHEETS} from './death-guard-data.generated';

export {DEATH_GUARD_SHEETS};
export const DEATH_GUARD_ARMY_SHEETS=[...DEATH_GUARD_SHEETS,...dreadbladesFor('Death Guard')];
export const DEATH_GUARD_UNITS=DEATH_GUARD_ARMY_SHEETS.map(s=>s.unit);
const sheets=new Map([...DEATH_GUARD_ARMY_SHEETS,...WARHOUND_SHEETS.filter(s=>s.faction==='Death Guard')].map(s=>[s.unit,s]));
export const isPlagueLegions=(unit:string)=>sheets.get(unit)?.keywords?.includes('PLAGUE LEGIONS')??false;
export function deathGuardMusterUnits(army:ArmySelection):string[]{
 if(army.faction!=='Death Guard')return [];
 const tallyband=army.detachments2026?.includes('Tallyband Summoners');
 return [...DEATH_GUARD_ARMY_SHEETS.filter(s=>tallyband||!isPlagueLegions(s.unit)).map(s=>s.unit),...alliedTitanAndKnightNames(army)];
}
const engines=new Set(['Foetid Bloat-drone','Foetid Bloat-drone with Heavy Blight Launcher','Helbrute','Myphitic Blight-hauler']);
export function deathGuardKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const s=sheets.get(squad.unit);
 if(army.faction!=='Death Guard'||!s)return new Set();
 const tags=new Set([...s.keywords??[],...(model?s.modelKeywords?.[model]??[]:[s.unit.toUpperCase(),...Object.values(s.modelKeywords??{}).flat()])]);
 if(army.detachments2026?.includes('Shamblerot Vectorium')&&squad.unit==='Poxwalkers')tags.add('BATTLELINE');
 if(army.detachments2026?.includes('Contagion Engines')&&engines.has(squad.unit))tags.add('CONTAGION ENGINE');
 return tags;
}
export function deathGuardAdditionalLeaderPair(bodyguard:string,first:string,second:string):boolean{
 const leaders=[first,second];
 return first!==second&&leaders.every(unit=>sheets.get(unit)?.bodyguards?.includes(bodyguard))&&
  leaders.some(unit=>DEATH_GUARD_ADDITIONAL_LEADERS[unit]?.includes(bodyguard));
}
