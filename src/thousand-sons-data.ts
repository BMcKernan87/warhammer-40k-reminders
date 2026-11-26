import type {ArmySelection} from './catalog';
import {dreadbladesFor} from './dreadblade-allies';
import type {RosterInstance} from './roster-instances';
import {alliedTitanAndKnightNames,WARHOUND_SHEETS} from './titan-support-data';
import {THOUSAND_SONS_SHEETS} from './thousand-sons-data.generated';

export {THOUSAND_SONS_SHEETS};
export const THOUSAND_SONS_ARMY_SHEETS=[...THOUSAND_SONS_SHEETS,...dreadbladesFor('Thousand Sons')];
export const THOUSAND_SONS_UNITS=THOUSAND_SONS_ARMY_SHEETS.map(s=>s.unit);
const sheets=new Map([...THOUSAND_SONS_ARMY_SHEETS,...WARHOUND_SHEETS.filter(s=>s.faction==='Thousand Sons')].map(s=>[s.unit,s]));
export const isScintillatingLegions=(unit:string)=>sheets.get(unit)?.keywords?.includes('SCINTILLATING LEGIONS')??false;
export function thousandSonsMusterUnits(army:ArmySelection):string[]{
 if(army.faction!=='Thousand Sons')return [];
 const changehost=army.detachments2026?.includes('Changehost of Deceit');
 return [...THOUSAND_SONS_ARMY_SHEETS.filter(s=>changehost||!isScintillatingLegions(s.unit)).map(s=>s.unit),...alliedTitanAndKnightNames(army)];
}
export function thousandSonsKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const s=sheets.get(squad.unit);
 if(army.faction!=='Thousand Sons'||!s)return new Set();
 const roles=Object.keys(s.compositionBySize?.[squad.models??s.sizes[0]]??{});
 const tags=new Set(s.keywords);
 const roleKey=(r:string)=>r.toLowerCase().replace(/s$/,'');
 for(const [role,keys] of Object.entries(s.modelKeywords??{})){
  if((model?[model]:roles).some(r=>roleKey(r)===roleKey(role)))for(const k of keys)tags.add(k);
 }
 if(!model)tags.add(s.unit.toUpperCase());
 if(squad.unit==='Tzaangors'&&army.detachments2026?.some(d=>d==='Servants of Change'||d==='Warpmeld Pact'))tags.add('BATTLELINE');
 return tags;
}
export function thousandSonsAdditionalBodyguards(army:ArmySelection,leader:RosterInstance):readonly string[]{
 const upgrade=army.upgrades2026?.[leader.id]??army.upgrades2026?.[leader.unit]??leader.enhancement;
 const tags=thousandSonsKeywords(army,leader);
 return (tags.has('SORCERER')||tags.has('INFERNAL MASTER'))&&upgrade==='Bray Lord'&&army.detachments2026?.includes('Warpmeld Pact')?['Tzaangors']:[];
}
