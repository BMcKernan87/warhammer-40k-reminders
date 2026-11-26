import type {ArmySelection} from './catalog';
import {SM_ALL_SHEETS,isNativeSpaceMarine} from './space-marines-data';
import {spaceMarineModelLoadouts} from './space-marines-loadouts';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(SM_ALL_SHEETS.map(s=>[s.unit,s]));
export function spaceMarinePhysicalModels(squad:RosterInstance):{model:string;items:string[]}[]{
 if(isNativeSpaceMarine(squad.unit))return spaceMarineModelLoadouts(squad);
 const sheet=sheets.get(squad.unit);if(!sheet)return [];
 const size=squad.models??sheet.sizes[0],composition=sheet.compositionBySize?.[size]??(sheet.composition?.length===1?{[sheet.composition[0].model]:size}:Object.fromEntries((sheet.composition??[]).map(m=>[m.model,m.min])));
 return Object.entries(composition).flatMap(([model,count])=>Array.from({length:count},()=>({model,items:[]})));
}
/** Each optional physical model keeps its own keywords; Chapter identity is never invented. */
export function spaceMarineKeywords(army:ArmySelection,squad:RosterInstance,model?:string,_roster:readonly RosterInstance[]=expandRoster(army)):Set<string>{
 if(army.faction!=='Space Marines')return new Set();
 const sheet=sheets.get(squad.unit);if(!sheet)return new Set();
 const roles=model?[model]:spaceMarinePhysicalModels(squad).map(m=>m.model);
 const tags=new Set([...sheet.keywords??[],...roles.flatMap(role=>sheet.modelKeywords?.[role]??[])]);
 // Core 02.01.01: the datasheet name is an additional keyword. A named
 // single-model card also identifies that actual Captain, Ancient or Techmarine.
 const nameKey=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
 if(!model||nameKey(model)===nameKey(sheet.unit))tags.add(sheet.unit.toUpperCase());
 return tags;
}
