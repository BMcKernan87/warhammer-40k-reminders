import type {ArmySelection} from './catalog';
import {ASSIGNED_AGENT_SHEETS} from './assigned-agent-data';
import {FREEBLADE_SHEETS,WARHOUND_SHEETS,alliedTitanAndKnightNames,isWarhound} from './titan-support-data';
import {CUSTODES_SHEETS} from './adeptus-custodes-data.generated';
import type {RosterInstance} from './roster-instances';

export {CUSTODES_SHEETS};
export const CUSTODES_ARMY_SHEETS=[...CUSTODES_SHEETS,...[...ASSIGNED_AGENT_SHEETS,...FREEBLADE_SHEETS].map(s=>({...s,faction:'Adeptus Custodes' as const})),...WARHOUND_SHEETS.filter(s=>s.faction==='Adeptus Custodes')];
export const CUSTODES_UNITS=CUSTODES_ARMY_SHEETS.map(sheet=>sheet.unit);
const registry=new Map(CUSTODES_ARMY_SHEETS.map(sheet=>[sheet.unit,sheet]));
export function custodesMusterUnits(army:ArmySelection):readonly string[]{return CUSTODES_UNITS.filter(unit=>!isWarhound(unit)||alliedTitanAndKnightNames(army).includes(unit));}
export function custodesKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const data=registry.get(squad.unit),byModel=data?.modelKeywords??{};
 const tags=new Set([...data?.keywords??[],...(model?byModel[model]??[]:Object.values(byModel).flat())]);
 if(squad.unit==='Prosecutor Squad'&&army.detachments2026?.includes('Null Maiden Vigil'))tags.add('BATTLELINE');
 return tags;
}
