import {EMPERORS_CHILDREN_ARMY_SHEETS} from './emperors-children-data';
import {isDreadblade} from './dreadblade-allies';
import {emperorsChildrenWeaponCount} from './emperors-children-loadouts';
import {eligibleEmperorsChildrenUpgrades} from './emperors-children-detachment-data';
import {ASTRA_ARMY_SHEETS} from './astra-army-data';
import {eligibleAstraMilitarumUpgrades} from './astra-militarum-detachment-data';
import {astraMilitarumWargearPoints,broodBrotherWargearPoints} from './astra-militarum-loadouts';
import {GSC_SHEETS} from './gsc-data';
import {GSC_ALLIED_SHEETS} from './gsc-allies-data.generated';
import {eligibleGscUpgrades} from './gsc-detachment-data';
import {eligibleWorldEatersUpgrades} from './world-eaters-detachment-data';
import {worldEaterWeaponCount} from './world-eater-loadouts';
import {WORLD_EATERS_ARMY_SHEETS,isWorldEatersDreadblade} from './world-eaters-data';
import {WARHOUND_SHEETS,AGENT_FREEBLADE_SHEETS} from './titan-support-data';
import {agentExtremisPoints,eligibleAgentUpgrades} from './imperial-agent-detachments';
import type {ArmySelection} from './catalog';
import {ASSIGNED_AGENT_SHEETS,NATIVE_AGENT_SHEETS} from './assigned-agent-data';
import {DAEMON_SHEETS} from './chaos-daemons-data';
import {ORK_SHEETS} from './ork-data';
import {VOTANN_SHEETS} from './votann-data.generated';
import {eligibleVotannUpgrades} from './votann-detachment-data';
import {CUSTODES_ARMY_SHEETS} from './adeptus-custodes-data';
import {CHAOS_KNIGHT_SHEETS} from './chaos-knights-data';
import {eligibleDaemonUpgrades} from './chaos-daemon-detachments';
import {eligibleOrkUpgrades} from './ork-detachments';
import {eligibleCustodesUpgrades} from './custodes-detachments';
import {eligibleChaosKnightUpgrades} from './chaos-knight-detachments';
import {IMPERIAL_KNIGHT_SHEETS} from './imperial-knights-data';
import {knightWeaponCount} from './imperial-knight-loadouts';
import {eligibleKnightUpgrades} from './imperial-knight-detachments';
import {expandRoster} from './roster-instances';
import {legalUnitSizes} from './unit-sizes';
import {IMPORTED_DATASHEETS_2026} from './datasheets-2026.generated';
import {NECRON_ENHANCEMENT_POINTS,PANTHEON_BINDINGS} from './necron-enhancement-points';
export interface UnitProfile2026 {move:string;toughness:number;save:string;wounds:number;leadership:string;objectiveControl:number|'-'}
export interface Datasheet2026 {
 profile?:UnitProfile2026;
 modelProfiles?:Readonly<Record<string,UnitProfile2026>>;
 faction:ArmySelection['faction'];
 unit:string;
 source:string;
 /** Model counts printed in the cost table. Composition supplies the playable counts between them. */
 sizes:readonly number[];
 priceNotesBySize?:Readonly<Record<number,string>>;
 attachmentRole?:'leader'|'support';
 bodyguards?:readonly string[];
 compositionBySize?:Readonly<Record<number,Readonly<Record<string,number>>>>;
 composition?:readonly {model:string;min:number;max:number}[];
 keywords?:readonly string[];
 modelKeywords?:Readonly<Record<string,readonly string[]>>;
 pointsBySize?:Readonly<Record<number,number>>;
 pointsSource?:string;
 wargearPoints?:Readonly<Record<string,number>>;
 laterCopyPointsBySize?:Readonly<Record<number,Readonly<Record<number,number>>>>;
 verified:'sizes'|'sizes-and-points';
}
/** Incremental 11th-edition registry: no estimated point costs. */
export const DATASHEETS_2026:readonly Datasheet2026[]=[...ASTRA_ARMY_SHEETS,...EMPERORS_CHILDREN_ARMY_SHEETS,...IMPORTED_DATASHEETS_2026.filter(s=>s.faction!=='Astra Militarum'&&s.faction!=='Emperor’s Children'),...IMPERIAL_KNIGHT_SHEETS,...ASSIGNED_AGENT_SHEETS,...NATIVE_AGENT_SHEETS,...CHAOS_KNIGHT_SHEETS,...DAEMON_SHEETS,...CUSTODES_ARMY_SHEETS,...ORK_SHEETS,...VOTANN_SHEETS,...GSC_SHEETS,...GSC_ALLIED_SHEETS,...WORLD_EATERS_ARMY_SHEETS,...WARHOUND_SHEETS.filter(s=>s.faction!=='Adeptus Custodes'&&s.faction!=='Astra Militarum'),...AGENT_FREEBLADE_SHEETS];
export interface RosterCost2026 {total:number|null;knownPoints:number;unknownUnits:string[];entries:{id:string;unit:string;models:number|null;points:number|null;source?:string;priceNote?:string;basePoints?:number|null;enhancementPoints?:number;bindingPoints?:number;extremisPoints?:number;wargearPoints?:number}[]}
export function rosterCost2026(army:ArmySelection,registry:readonly Datasheet2026[]=DATASHEETS_2026):RosterCost2026{
 const copies=new Map<string,number>();
 const entries=expandRoster(army).map(instance=>{
  const copy=(copies.get(instance.unit)||0)+1;
  copies.set(instance.unit,copy);
  const sheet=registry.find(d=>d.faction===army.faction&&d.unit===instance.unit);
  const models=instance.models??sheet?.sizes[0]??null;
  const applicableTier=Object.keys(sheet?.laterCopyPointsBySize||{}).map(Number).filter(tier=>tier<=copy).sort((a,b)=>b-a)[0];
  const priceTable=applicableTier?sheet?.laterCopyPointsBySize?.[applicableTier]:sheet?.pointsBySize;
  // The Field Manual charges the next listed bracket for an intermediate legal strength.
  const bracket=sheet&&models!==null&&unitSizes(sheet).includes(models)
   ? sheet.sizes.find(size=>size>=models) : undefined;
  const basePoints=bracket===undefined?null:priceTable?.[bracket]??null;
  const chosen=army.upgrades2026?.[instance.id]??army.upgrades2026?.[instance.unit];
  let enhancementPoints:number|null=0;
  if(chosen&&army.faction==='Astra Militarum')enhancementPoints=eligibleAstraMilitarumUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Necrons')enhancementPoints=NECRON_ENHANCEMENT_POINTS[chosen]??null;
  if(chosen&&army.faction==='Imperial Agents')enhancementPoints=eligibleAgentUpgrades(army,instance.unit).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Imperial Knights')enhancementPoints=eligibleKnightUpgrades(army,instance.unit).find(upgrade=>upgrade.name===chosen)?.points??null;
  if(chosen&&army.faction==='Orks')enhancementPoints=eligibleOrkUpgrades(army,instance.unit).find(upgrade=>upgrade.name===chosen)?.points??null;
  if(chosen&&army.faction==='Genestealer Cults')enhancementPoints=eligibleGscUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Emperor’s Children')enhancementPoints=eligibleEmperorsChildrenUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='World Eaters')enhancementPoints=eligibleWorldEatersUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Leagues of Votann')enhancementPoints=eligibleVotannUpgrades(army,instance.unit,instance.id).find(upgrade=>upgrade.name===chosen)?.points??null;
  if(chosen&&army.faction==='Adeptus Custodes')enhancementPoints=eligibleCustodesUpgrades(army,instance.unit).find(upgrade=>upgrade.name===chosen)?.points??null;
  if(chosen&&army.faction==='Chaos Daemons')enhancementPoints=eligibleDaemonUpgrades(army,instance.unit,instance.id).find(upgrade=>upgrade.name===chosen)?.points??null;
  if(chosen&&army.faction==='Chaos Knights')enhancementPoints=eligibleChaosKnightUpgrades(army,instance.unit,instance.id).find(upgrade=>upgrade.name===chosen)?.points??null;
  const countWargear=army.faction==='Emperor’s Children'&&!isDreadblade(instance.unit)?emperorsChildrenWeaponCount:army.faction==='World Eaters'&&!isWorldEatersDreadblade(instance.unit)?worldEaterWeaponCount:knightWeaponCount;
  const wargearPoints=army.faction==='Astra Militarum'&&sheet?.keywords?.includes('ASTRA MILITARUM')?astraMilitarumWargearPoints(instance):army.faction==='Genestealer Cults'&&sheet?.keywords?.includes('ASTRA MILITARUM')?broodBrotherWargearPoints(instance):['Emperor’s Children','Astra Militarum','Genestealer Cults','Imperial Agents','Imperial Knights','Chaos Knights','Chaos Daemons','Adeptus Custodes','Orks','World Eaters'].includes(army.faction)?Object.entries(sheet?.wargearPoints??{}).reduce(
   (points,[item,cost])=>points+cost*countWargear(instance,item),0):0;
  const bindingPoints=army.faction==='Necrons'&&army.detachments2026?.includes('Pantheon of Woe')?PANTHEON_BINDINGS[instance.unit]?.points??0:0;
  const extremisPoints=agentExtremisPoints(army,instance.unit);
  const points=basePoints===null||enhancementPoints===null?null:basePoints+enhancementPoints+bindingPoints+wargearPoints+extremisPoints;
  return {id:instance.id,unit:instance.unit,models,points,...(bracket&&sheet?.priceNotesBySize?.[bracket]?{priceNote:sheet.priceNotesBySize[bracket]}:{}),source:sheet?.pointsSource||sheet?.source,...(wargearPoints?{wargearPoints}:{}),...(extremisPoints?{extremisPoints}:{}),...(enhancementPoints||bindingPoints||wargearPoints?{basePoints,enhancementPoints:enhancementPoints??undefined,bindingPoints}:{})};
 });
 const unknownUnits=entries.filter(x=>x.points===null).map(x=>x.id);
 const knownPoints=entries.reduce((sum,x)=>sum+(x.points??0),0);
 return {total:unknownUnits.length?null:knownPoints,knownPoints,unknownUnits,entries};
}
function unitSizes(sheet:Datasheet2026):readonly number[]{
 if(sheet.compositionBySize)return Object.keys(sheet.compositionBySize).map(Number).sort((a,b)=>a-b);
 if(!sheet.composition)return sheet.sizes;
 const min=sheet.composition.reduce((n,row)=>n+row.min,0);
 const max=sheet.composition.reduce((n,row)=>n+row.max,0);
 return Array.from({length:max-min+1},(_,i)=>min+i);
}
export function verifiedUnitSizes2026(army:ArmySelection,unit:string):readonly number[]|undefined{
 const sheet=DATASHEETS_2026.find(d=>d.faction===army.faction&&d.unit===unit);
 return sheet&&unitSizes(sheet);
}
export function legacyUnitSizes(army:ArmySelection,unit:string):readonly number[]|undefined{
 return legalUnitSizes(army.faction,unit);
}
