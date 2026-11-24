import type {ArmySelection} from './catalog';
import {expandRoster} from './roster-instances';
import {legalUnitSizes} from './unit-sizes';
import {IMPORTED_DATASHEETS_2026} from './datasheets-2026.generated';
export interface UnitProfile2026 {move:string;toughness:number;save:string;wounds:number;leadership:string;objectiveControl:number}
export interface Datasheet2026 {profile?:UnitProfile2026;faction:ArmySelection['faction'];unit:string;source:string;sizes:readonly number[];pointsBySize?:Readonly<Record<number,number>>;pointsSource?:string;/** Optional costs for later copies of the same datasheet, indexed by copy number (2+). */laterCopyPointsBySize?:Readonly<Record<number,Readonly<Record<number,number>>>>;verified:'sizes'|'sizes-and-points'}
/** Incremental 11th-edition registry: no estimated point costs. */
export const DATASHEETS_2026:readonly Datasheet2026[]=IMPORTED_DATASHEETS_2026;
export interface RosterCost2026 {total:number|null;knownPoints:number;unknownUnits:string[];entries:{id:string;unit:string;models:number|null;points:number|null;source?:string}[]}
export function rosterCost2026(army:ArmySelection,registry:readonly Datasheet2026[]=DATASHEETS_2026):RosterCost2026{
 const copies=new Map<string,number>();
 const entries=expandRoster(army).map(instance=>{
  const copy=(copies.get(instance.unit)||0)+1;
  copies.set(instance.unit,copy);
  const sheet=registry.find(d=>d.faction===army.faction&&d.unit===instance.unit);
  const models=instance.models??sheet?.sizes[0]??null;
  const applicableTier=Object.keys(sheet?.laterCopyPointsBySize||{}).map(Number).filter(tier=>tier<=copy).sort((a,b)=>b-a)[0];
  const priceTable=applicableTier?sheet?.laterCopyPointsBySize?.[applicableTier]:sheet?.pointsBySize;
  const points=models===null?null:priceTable?.[models]??null;
  return {id:instance.id,unit:instance.unit,models,points,source:sheet?.pointsSource||sheet?.source};
 });
 const unknownUnits=entries.filter(x=>x.points===null).map(x=>x.id);
 const knownPoints=entries.reduce((sum,x)=>sum+(x.points??0),0);
 return {total:unknownUnits.length?null:knownPoints,knownPoints,unknownUnits,entries};
}
export function verifiedUnitSizes2026(army:ArmySelection,unit:string):readonly number[]|undefined{
 return DATASHEETS_2026.find(d=>d.faction===army.faction&&d.unit===unit)?.sizes;
}
export function legacyUnitSizes(army:ArmySelection,unit:string):readonly number[]|undefined{
 return legalUnitSizes(army.faction,unit);
}
