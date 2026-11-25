import {WARHOUND_CARD} from './warhound-card.generated';
import {chassis,slot} from './knight-gear-options';
import type {ArmySelection} from './catalog';
import type {Datasheet2026} from './datasheets-2026';
import {IMPERIAL_KNIGHT_SHEETS} from './imperial-knights-data.generated';

type Faction=ArmySelection['faction'];
export const TITAN_RULE_SOURCE='https://wahapedia.ru/wh40k11ed/factions/adeptus-titanicus/';
export const WARHOUND_SOURCE=WARHOUND_CARD.source;
export const FREEBLADE_SHEETS=IMPERIAL_KNIGHT_SHEETS.filter(s=>s.keywords?.includes('IMPERIAL KNIGHTS')&&(s.keywords.includes('TITANIC')||s.keywords.includes('ARMIGER')));
const freeblades=new Map(FREEBLADE_SHEETS.map(s=>[s.unit,s]));
export const isFreeblade=(unit:string)=>freeblades.has(unit);
export const isWarhound=(unit:string)=>unit==='Warhound Titan'||unit==='Chaos Warhound Titan';
export const freebladeHost=(faction:Faction)=>faction==='Imperial Agents'||faction==='Adeptus Custodes'||faction==='Astra Militarum';
const loyal:Faction[]=['Astra Militarum','Imperial Agents','Adeptus Custodes','Imperial Knights'];
const traitor:Faction[]=['Chaos Daemons','Chaos Knights','World Eaters','Emperor’s Children','Thousand Sons','Death Guard'];
export function alliedWarhound(faction:Faction){
 return loyal.includes(faction)?'Warhound Titan':traitor.includes(faction)?'Chaos Warhound Titan':undefined;
}
function warhoundSheet(faction:Faction):Datasheet2026{
 const unit=alliedWarhound(faction)!,chaos=unit==='Chaos Warhound Titan';
 return {unit,faction,source:WARHOUND_SOURCE,pointsSource:'https://mfm.warhammer-community.com/en/'+(chaos?'chaos-titan-legions':'titan-legions'),
  verified:'sizes-and-points',sizes:[1],pointsBySize:{1:WARHOUND_CARD.points},composition:[{model:unit,min:1,max:1}],
  keywords:WARHOUND_CARD.keywords.map(k=>chaos&&k==='IMPERIUM'?'CHAOS':chaos&&k==='ADEPTUS TITANICUS'?'TITANICUS TRAITORIS':k),
  profile:WARHOUND_CARD.profile};
}
export const WARHOUND_SHEETS=[...loyal,...traitor].map(warhoundSheet);
export const AGENT_FREEBLADE_SHEETS=FREEBLADE_SHEETS.map(s=>({...s,faction:'Imperial Agents' as const}));
export function alliedRosterNames(faction:Faction):string[]{
 const titan=alliedWarhound(faction);
 return [...(freebladeHost(faction)?freeblades.keys():[]),...(titan?[titan]:[])];
}
export function alliedTitanAndKnightNames(army:ArmySelection):string[]{
 const names=alliedRosterNames(army.faction);
 return army.battleSize2026==='Incursion'?names.filter(n=>!isWarhound(n)):names;
}
export function alliedUnitLimit(army:ArmySelection,unit:string):number|undefined {
 if(unit===alliedWarhound(army.faction))return army.battleSize2026==='Incursion'?0:1;
 if(!freebladeHost(army.faction)||!isFreeblade(unit))return undefined;
 const sheet=freeblades.get(unit)!;
 if(sheet.keywords?.includes('TITANIC'))return 1;
 return army.battleSize2026==='Incursion'&&!sheet.keywords?.includes('BATTLELINE')?2:3;
}

const plasma='Warhound plasma blastgun',bolter='Warhound vulcan mega-bolter',inferno='Warhound inferno gun',laser='Warhound turbo-laser destructor';
export const warhoundEquipment=chassis(['Warhound feet'],slot('Plasma arm',plasma,inferno,laser,bolter),slot('Vulcan arm',bolter,inferno,plasma,laser));

export function freebladeSlotsRemaining(army:ArmySelection,unit:string):number|undefined {
 if(!freebladeHost(army.faction)||!isFreeblade(unit))return undefined;
 let titanic=0,armigers=0;
 for(const [name,count] of Object.entries(army.units)){
  const sheet=freeblades.get(name);
  if(sheet?.keywords?.includes('TITANIC'))titanic+=count;
  if(sheet?.keywords?.includes('ARMIGER'))armigers+=count;
 }
 if(freeblades.get(unit)?.keywords?.includes('TITANIC'))return armigers?0:Math.max(0,1-titanic);
 return titanic?0:Math.max(0,3-armigers);
}
