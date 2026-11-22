import type {ArmySelection} from './catalog';
import {expandRoster} from './roster-instances';
import {legalUnitSizes} from './unit-sizes';
export interface Datasheet2026 {faction:ArmySelection['faction'];unit:string;source:string;sizes:readonly number[];pointsBySize?:Readonly<Record<number,number>>;pointsSource?:string;verified:'sizes'|'sizes-and-points'}
/** Incremental 11th-edition registry: no estimated point costs. */
export const DATASHEETS_2026:readonly Datasheet2026[]=[
 {"faction":"Necrons","unit":"C’tan Shard of the Nightbringer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[1],"pointsBySize":{"1":360},"pointsSource":"https://tactical40k.com/codex/necrons","verified":"sizes-and-points"},
 {"faction":"Necrons","unit":"C’tan Shard of the Void Dragon","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[1],"pointsBySize":{"1":345},"pointsSource":"https://tactical40k.com/codex/necrons","verified":"sizes-and-points"},
 {"faction":"Necrons","unit":"Canoptek Macrocytes","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[5],"verified":"sizes"},
 {"faction":"Necrons","unit":"Canoptek Tomb Crawlers","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[2],"verified":"sizes"},
 {"faction":"Necrons","unit":"Geomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[1],"verified":"sizes"},
 {"faction":"Necrons","unit":"C’tan Shard of the Deceiver","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[1],"verified":"sizes"},
 {"faction":"Necrons","unit":"Transcendent C’tan","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[1],"verified":"sizes"},
 {"faction":"Necrons","unit":"Nekrosor Ammentar","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[1],"verified":"sizes"},
 {"faction":"Necrons","unit":"Seraptek Heavy Construct","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[1],"verified":"sizes"}
];
export interface RosterCost2026 {total:number|null;knownPoints:number;unknownUnits:string[];entries:{id:string;unit:string;models:number|null;points:number|null;source?:string}[]}
export function rosterCost2026(army:ArmySelection):RosterCost2026{
 const entries=expandRoster(army).map(instance=>{
  const sheet=DATASHEETS_2026.find(d=>d.faction===army.faction&&d.unit===instance.unit);
  const models=instance.models??(sheet?.sizes.length===1?sheet.sizes[0]:null);
  const points=models===null?null:sheet?.pointsBySize?.[models]??null;
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
