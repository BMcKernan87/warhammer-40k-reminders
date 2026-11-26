import type {ArmySelection} from './catalog';
import {ASSIGNED_AGENT_SHEETS} from './assigned-agent-data';
import {FREEBLADE_SHEETS,WARHOUND_SHEETS,alliedTitanAndKnightNames,isWarhound} from './titan-support-data';
import type {RosterInstance} from './roster-instances';
import {GREY_KNIGHTS_SHEETS} from './grey-knights-data.generated';

export {GREY_KNIGHTS_SHEETS};
export const GREY_KNIGHTS_ARMY_SHEETS=[...GREY_KNIGHTS_SHEETS,
 ...[...ASSIGNED_AGENT_SHEETS,...FREEBLADE_SHEETS].map(s=>({...s,faction:'Grey Knights' as const}))];
export const GREY_KNIGHTS_UNITS=GREY_KNIGHTS_ARMY_SHEETS.map(s=>s.unit);
const sheets=new Map([...GREY_KNIGHTS_ARMY_SHEETS,...WARHOUND_SHEETS.filter(s=>s.faction==='Grey Knights')].map(s=>[s.unit,s]));
export function greyKnightsMusterUnits(army:ArmySelection):string[]{
 if(army.faction!=='Grey Knights')return [];
 return [...GREY_KNIGHTS_UNITS,...alliedTitanAndKnightNames(army).filter(isWarhound)];
}
export function greyKnightsKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const s=sheets.get(squad.unit);
 if(army.faction!=='Grey Knights'||!s)return new Set();
 return new Set([...s.keywords??[],...(model?s.modelKeywords?.[model]??[]:[s.unit.toUpperCase(),...Object.values(s.modelKeywords??{}).flat()])]);
}
