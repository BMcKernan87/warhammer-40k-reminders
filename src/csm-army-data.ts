import type {ArmySelection} from './catalog';
import type {Datasheet2026} from './datasheets-2026';
import {CSM_SHEETS} from './csm-data';
import {WORLD_EATERS_SHEETS} from './world-eaters-data';
import {THOUSAND_SONS_SHEETS} from './thousand-sons-data';
import {DEATH_GUARD_SHEETS} from './death-guard-data';
import {EMPERORS_CHILDREN_SHEETS} from './emperors-children-data';
import {DAEMONIC_PACT_SHEETS} from './daemonic-pact-data.generated';
import {dreadbladesFor} from './dreadblade-allies';
import {alliedTitanAndKnightNames,isWarhound,WARHOUND_SHEETS} from './titan-support-data';

export const CSM_CULT_UNITS=['Khorne Berzerkers','Rubric Marines','Plague Marines','Noise Marines'] as const;
const cultNames=new Set<string>(CSM_CULT_UNITS);
export const isCsmCult=(unit:string)=>cultNames.has(unit);
const originalFactions=new Set(['WORLD EATERS','THOUSAND SONS','DEATH GUARD','EMPEROR’S CHILDREN']);
const cultSources=[WORLD_EATERS_SHEETS,THOUSAND_SONS_SHEETS,DEATH_GUARD_SHEETS,EMPERORS_CHILDREN_SHEETS];
/** Cults of the Dark Gods replaces all original Faction keywords; it grants no army ability. */
export const CSM_CULT_SHEETS:readonly Datasheet2026[]=CSM_CULT_UNITS.map((unit,i)=>{
 const source=cultSources[i].find(s=>s.unit===unit)!;
 return {...source,faction:'Chaos Space Marines',source:'https://wahapedia.ru/wh40k11ed/factions/chaos-space-marines/'+unit.replaceAll(' ','-'),
  keywords:[...new Set([...(source.keywords??[]).filter(k=>!originalFactions.has(k)),'HERETIC ASTARTES'])],
  ...(source.modelKeywords?{modelKeywords:Object.fromEntries(Object.entries(source.modelKeywords).map(([model,tags])=>[model,tags.filter(k=>!originalFactions.has(k))]))}:{}),
  attachmentRole:undefined,bodyguards:undefined};
});
export const CSM_PACT_SHEETS=DAEMONIC_PACT_SHEETS.map(s=>({...s,faction:'Chaos Space Marines' as const}));
const pactNames=new Set(CSM_PACT_SHEETS.map(s=>s.unit));
export const CSM_ARMY_SHEETS:readonly Datasheet2026[]=[...CSM_SHEETS,...CSM_CULT_SHEETS,...CSM_PACT_SHEETS,...dreadbladesFor('Chaos Space Marines')];
export const CSM_ARMY_UNITS=CSM_ARMY_SHEETS.map(s=>s.unit);
export const CSM_ALL_SHEETS:readonly Datasheet2026[]=[...CSM_ARMY_SHEETS,...WARHOUND_SHEETS.filter(s=>s.faction==='Chaos Space Marines')];
export function csmMusterUnits(army:ArmySelection):string[]{
 if(army.faction!=='Chaos Space Marines')return [];
 const renegade=army.detachments2026?.some(d=>d.toLowerCase()==='renegade warband');
 const titan=Object.keys(army.units).some(isWarhound),pact=Object.keys(army.units).some(n=>pactNames.has(n));
 return [...CSM_ARMY_UNITS.filter(unit=>(!renegade||!isCsmCult(unit))&&(!titan||!pactNames.has(unit))),...alliedTitanAndKnightNames(army).filter(unit=>!pact||!isWarhound(unit))];
}
