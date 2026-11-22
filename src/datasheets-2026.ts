import type {ArmySelection} from './catalog';
import {expandRoster} from './roster-instances';
import {legalUnitSizes} from './unit-sizes';
export interface UnitProfile2026 {move:string;toughness:number;save:string;wounds:number;leadership:string;objectiveControl:number}
export interface Datasheet2026 {profile?:UnitProfile2026;faction:ArmySelection['faction'];unit:string;source:string;sizes:readonly number[];pointsBySize?:Readonly<Record<number,number>>;pointsSource?:string;/** Optional costs for later copies of the same datasheet, indexed by copy number (2+). */laterCopyPointsBySize?:Readonly<Record<number,Readonly<Record<number,number>>>>;verified:'sizes'|'sizes-and-points'}
/** Incremental 11th-edition registry: no estimated point costs. */
export const DATASHEETS_2026:readonly Datasheet2026[]=[
 {"faction":"Necrons","unit":"Immortals","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/Immortals","sizes":[5,10],"pointsBySize":{"5":65,"10":130},"pointsSource":"https://wahapedia.ru/wh40k11ed/factions/necrons/Immortals","verified":"sizes-and-points","profile":{"move":"5\"","toughness":5,"save":"3+","wounds":1,"leadership":"7+","objectiveControl":2}},
 {"faction":"Necrons","unit":"C’tan Shard of the Nightbringer","profile":{"move":"10\"","toughness":11,"save":"3+","wounds":16,"leadership":"6+","objectiveControl":4},"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[1],"pointsBySize":{"1":360},"pointsSource":"https://tactical40k.com/codex/necrons","verified":"sizes-and-points"},
 {"faction":"Necrons","unit":"C’tan Shard of the Void Dragon","profile":{"move":"10\"","toughness":11,"save":"3+","wounds":16,"leadership":"6+","objectiveControl":4},"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[1],"pointsBySize":{"1":345},"pointsSource":"https://tactical40k.com/codex/necrons","verified":"sizes-and-points"},
 {"faction":"Necrons","unit":"Canoptek Macrocytes","profile":{"move":"8\"","toughness":3,"save":"4+","wounds":1,"leadership":"8+","objectiveControl":1},"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[5],"verified":"sizes-and-points","pointsBySize":{"5":70},"pointsSource":"https://tactical40k.com/codex/necrons"},
 {"faction":"Necrons","unit":"Canoptek Tomb Crawlers","profile":{"move":"5\"","toughness":4,"save":"3+","wounds":3,"leadership":"8+","objectiveControl":1},"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[2],"verified":"sizes-and-points","pointsBySize":{"2":60},"pointsSource":"https://tactical40k.com/codex/necrons"},
 {"faction":"Necrons","unit":"Geomancer","profile":{"move":"8\"","toughness":4,"save":"4+","wounds":4,"leadership":"6+","objectiveControl":1},"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[1],"verified":"sizes"},
 {"faction":"Necrons","unit":"C’tan Shard of the Deceiver","profile":{"move":"8\"","toughness":11,"save":"3+","wounds":16,"leadership":"6+","objectiveControl":4},"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[1],"verified":"sizes"},
 {"faction":"Necrons","unit":"Transcendent C’tan","profile":{"move":"8\"","toughness":11,"save":"3+","wounds":16,"leadership":"6+","objectiveControl":4},"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[1],"verified":"sizes-and-points","pointsBySize":{"1":340},"pointsSource":"https://tactical40k.com/codex/necrons"},
 {"faction":"Necrons","unit":"Nekrosor Ammentar","profile":{"move":"10\"","toughness":8,"save":"3+","wounds":9,"leadership":"6+","objectiveControl":3},"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[1],"verified":"sizes"},
 {"faction":"Necrons","unit":"Seraptek Heavy Construct","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","sizes":[1],"pointsBySize":{"1":540},"pointsSource":"https://tactical40k.com/codex/necrons","verified":"sizes-and-points"},
 {"faction":"Necrons","unit":"Canoptek Wraiths","sizes":[3,6],"pointsBySize":{"3":95,"6":220},"laterCopyPointsBySize":{"2":{"3":115,"6":240}},"profile":{"move":"10\"","toughness":6,"save":"3+","wounds":4,"leadership":"8+","objectiveControl":2},"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/Canoptek-Wraiths","pointsSource":"https://wahapedia.ru/wh40k11ed/factions/necrons/Canoptek-Wraiths","verified":"sizes-and-points"},
 {"faction":"Necrons","unit":"Necron Warriors","sizes":[10,20],"pointsBySize":{"10":85,"20":190},"profile":{"move":"5\"","toughness":4,"save":"4+","wounds":1,"leadership":"7+","objectiveControl":2},"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/Necron-Warriors","pointsSource":"https://wahapedia.ru/wh40k11ed/factions/necrons/Necron-Warriors","verified":"sizes-and-points"},
 {"faction":"Necrons","unit":"Lokhust Heavy Destroyers","sizes":[1,2,3],"pointsBySize":{"1":50,"2":100,"3":165},"laterCopyPointsBySize":{"3":{"1":60,"2":110,"3":175}},"profile":{"move":"8\"","toughness":6,"save":"3+","wounds":4,"leadership":"7+","objectiveControl":2},"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/Lokhust-Heavy-Destroyers","pointsSource":"https://wahapedia.ru/wh40k11ed/factions/necrons/Lokhust-Heavy-Destroyers","verified":"sizes-and-points"},
 {"faction":"Necrons","unit":"Technomancer","sizes":[1],"pointsBySize":{"1":80},"laterCopyPointsBySize":{"2":{"1":90}},"profile":{"move":"10\"","toughness":4,"save":"4+","wounds":4,"leadership":"6+","objectiveControl":1},"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/Technomancer","pointsSource":"https://wahapedia.ru/wh40k11ed/factions/necrons/Technomancer","verified":"sizes-and-points"},
 {"faction":"Necrons","unit":"Plasmancer","sizes":[1],"pointsBySize":{"1":60},"profile":{"move":"5\"","toughness":4,"save":"4+","wounds":4,"leadership":"6+","objectiveControl":1},"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/Plasmancer","pointsSource":"https://wahapedia.ru/wh40k11ed/factions/necrons/Plasmancer","verified":"sizes-and-points"}
];
export interface RosterCost2026 {total:number|null;knownPoints:number;unknownUnits:string[];entries:{id:string;unit:string;models:number|null;points:number|null;source?:string}[]}
export function rosterCost2026(army:ArmySelection,registry:readonly Datasheet2026[]=DATASHEETS_2026):RosterCost2026{
 const copies=new Map<string,number>();
 const entries=expandRoster(army).map(instance=>{
  const copy=(copies.get(instance.unit)||0)+1;
  copies.set(instance.unit,copy);
  const sheet=registry.find(d=>d.faction===army.faction&&d.unit===instance.unit);
  const models=instance.models??(sheet?.sizes.length===1?sheet.sizes[0]:null);
  const priceTable=copy>=2?(sheet?.laterCopyPointsBySize?.[copy]||sheet?.laterCopyPointsBySize?.[2]||sheet?.pointsBySize):sheet?.pointsBySize;
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
