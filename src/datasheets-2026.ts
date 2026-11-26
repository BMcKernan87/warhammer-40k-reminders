import {SM_ARMY_SHEETS,isNativeSpaceMarine} from './space-marines-data';
import {spaceMarineWeaponCount} from './space-marines-loadouts';
import {eligibleSpaceMarineUpgrades} from './space-marines-upgrades';
import {AELDARI_SHEETS} from './aeldari-data';
import {aeldariWeaponCount} from './aeldari-loadouts';
import {eligibleAeldariUpgrades} from './aeldari-upgrades';
import {DRUKHARI_SHEETS} from './drukhari-data';
import {drukhariWeaponCount} from './drukhari-loadouts';
import {eligibleDrukhariUpgrades} from './drukhari-upgrades';
import {CSM_ARMY_SHEETS} from './csm-army-data';
import {csmArmyWeaponCount} from './csm-army-loadouts';
import {eligibleCsmUpgrades} from './csm-detachment-data';
import {TYRANID_SHEETS} from './tyranid-data';
import {tyranidWeaponCount} from './tyranid-loadouts';
import {eligibleTyranidUpgrades} from './tyranid-detachment-data';
import {TAU_SHEETS} from './tau-data';
import {tauWeaponCount} from './tau-loadouts';
import {eligibleTauUpgrades} from './tau-detachment-data';
import {MECHANICUS_ARMY_SHEETS} from './mechanicus-army-data';
import {mechanicusWeaponCount} from './mechanicus-loadouts';
import {eligibleMechanicusUpgrades} from './mechanicus-detachment-data';
import {SORORITAS_ARMY_SHEETS,sororitasAgentName} from './sororitas-army-data';
import {sororitasWeaponCount} from './sororitas-loadouts';
import {eligibleSororitasUpgrades} from './sororitas-detachment-data';
import {GREY_KNIGHTS_ARMY_SHEETS} from './grey-knights-data';
import {greyKnightsWeaponCount} from './grey-knights-loadouts';
import {eligibleGreyKnightsUpgrades} from './grey-knights-detachment-data';
import {DEATH_GUARD_ARMY_SHEETS} from './death-guard-data';
import {deathGuardWeaponCount} from './death-guard-loadouts';
import {eligibleDeathGuardUpgrades} from './death-guard-detachment-data';
import {THOUSAND_SONS_ARMY_SHEETS} from './thousand-sons-data';
import {thousandSonsWeaponCount} from './thousand-sons-loadouts';
import {eligibleThousandSonsUpgrades} from './thousand-sons-detachment-data';
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
export const DATASHEETS_2026:readonly Datasheet2026[]=[...SM_ARMY_SHEETS,...AELDARI_SHEETS,...DRUKHARI_SHEETS,...CSM_ARMY_SHEETS,...TYRANID_SHEETS,...TAU_SHEETS,...MECHANICUS_ARMY_SHEETS,...SORORITAS_ARMY_SHEETS,...ASTRA_ARMY_SHEETS,...EMPERORS_CHILDREN_ARMY_SHEETS,...THOUSAND_SONS_ARMY_SHEETS,...DEATH_GUARD_ARMY_SHEETS,...GREY_KNIGHTS_ARMY_SHEETS,...IMPORTED_DATASHEETS_2026.filter(s=>s.faction!=='Space Marines'&&s.faction!=='Aeldari'&&s.faction!=='Drukhari'&&s.faction!=='Chaos Space Marines'&&s.faction!=='Astra Militarum'&&s.faction!=='Emperor’s Children'&&s.faction!=='Thousand Sons'&&s.faction!=='Death Guard'&&s.faction!=='Grey Knights'&&s.faction!=='Adepta Sororitas'&&s.faction!=='Adeptus Mechanicus'&&s.faction!=='T’au Empire'&&s.faction!=='Tyranids'),...IMPERIAL_KNIGHT_SHEETS,...ASSIGNED_AGENT_SHEETS,...NATIVE_AGENT_SHEETS,...CHAOS_KNIGHT_SHEETS,...DAEMON_SHEETS,...CUSTODES_ARMY_SHEETS,...ORK_SHEETS,...VOTANN_SHEETS,...GSC_SHEETS,...GSC_ALLIED_SHEETS,...WORLD_EATERS_ARMY_SHEETS,...WARHOUND_SHEETS.filter(s=>s.faction!=='Adeptus Custodes'&&s.faction!=='Astra Militarum'),...AGENT_FREEBLADE_SHEETS];
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
  if(chosen&&army.faction==='Space Marines')enhancementPoints=eligibleSpaceMarineUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Aeldari')enhancementPoints=eligibleAeldariUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Drukhari')enhancementPoints=eligibleDrukhariUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Chaos Space Marines')enhancementPoints=eligibleCsmUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Tyranids')enhancementPoints=eligibleTyranidUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='T’au Empire')enhancementPoints=eligibleTauUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Adeptus Mechanicus')enhancementPoints=eligibleMechanicusUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Adepta Sororitas')enhancementPoints=eligibleSororitasUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Grey Knights')enhancementPoints=eligibleGreyKnightsUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Death Guard')enhancementPoints=eligibleDeathGuardUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Thousand Sons')enhancementPoints=eligibleThousandSonsUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Emperor’s Children')enhancementPoints=eligibleEmperorsChildrenUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='World Eaters')enhancementPoints=eligibleWorldEatersUpgrades(army,instance.unit,instance.id).find(u=>u.name===chosen)?.points??null;
  if(chosen&&army.faction==='Leagues of Votann')enhancementPoints=eligibleVotannUpgrades(army,instance.unit,instance.id).find(upgrade=>upgrade.name===chosen)?.points??null;
  if(chosen&&army.faction==='Adeptus Custodes')enhancementPoints=eligibleCustodesUpgrades(army,instance.unit).find(upgrade=>upgrade.name===chosen)?.points??null;
  if(chosen&&army.faction==='Chaos Daemons')enhancementPoints=eligibleDaemonUpgrades(army,instance.unit,instance.id).find(upgrade=>upgrade.name===chosen)?.points??null;
  if(chosen&&army.faction==='Chaos Knights')enhancementPoints=eligibleChaosKnightUpgrades(army,instance.unit,instance.id).find(upgrade=>upgrade.name===chosen)?.points??null;
  const countWargear=army.faction==='Space Marines'&&isNativeSpaceMarine(instance.unit)?spaceMarineWeaponCount:army.faction==='Aeldari'?aeldariWeaponCount:army.faction==='Drukhari'?drukhariWeaponCount:army.faction==='Chaos Space Marines'?csmArmyWeaponCount:army.faction==='Tyranids'?tyranidWeaponCount:army.faction==='T’au Empire'?tauWeaponCount:army.faction==='Adeptus Mechanicus'&&sheet?.keywords?.includes('ADEPTUS MECHANICUS')?mechanicusWeaponCount:army.faction==='Adepta Sororitas'&&sheet?.keywords?.includes('ADEPTA SORORITAS')&&!sororitasAgentName(instance.unit)?sororitasWeaponCount:army.faction==='Grey Knights'&&sheet?.keywords?.includes('GREY KNIGHTS')?greyKnightsWeaponCount:army.faction==='Death Guard'&&!isDreadblade(instance.unit)?deathGuardWeaponCount:army.faction==='Thousand Sons'&&!isDreadblade(instance.unit)?thousandSonsWeaponCount:army.faction==='Emperor’s Children'&&!isDreadblade(instance.unit)?emperorsChildrenWeaponCount:army.faction==='World Eaters'&&!isWorldEatersDreadblade(instance.unit)?worldEaterWeaponCount:knightWeaponCount;
  const wargearPoints=army.faction==='Astra Militarum'&&sheet?.keywords?.includes('ASTRA MILITARUM')?astraMilitarumWargearPoints(instance):army.faction==='Genestealer Cults'&&sheet?.keywords?.includes('ASTRA MILITARUM')?broodBrotherWargearPoints(instance):['Space Marines','Aeldari','Drukhari','Chaos Space Marines','Tyranids','T’au Empire','Adeptus Mechanicus','Adepta Sororitas','Grey Knights','Death Guard','Thousand Sons','Emperor’s Children','Astra Militarum','Genestealer Cults','Imperial Agents','Imperial Knights','Chaos Knights','Chaos Daemons','Adeptus Custodes','Orks','World Eaters'].includes(army.faction)?Object.entries(sheet?.wargearPoints??{}).reduce(
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
