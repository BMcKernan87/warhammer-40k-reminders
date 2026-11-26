import {isSpaceMarineFaction} from './space-marines-factions';
import type {ArmySelection} from './catalog';
import {spaceMarineNativeSheet,spaceMarineSheets,spaceMarineAgentName} from './space-marines-data';
import {SPACE_MARINE_CHAPTER_FACTIONS} from './space-marines-factions';
import type {Faction} from './catalog';
import {alliedTitanAndKnightNames,isWarhound} from './titan-support-data';

export const SM_CHAPTERS=['DEATHWATCH','IMPERIAL FISTS','IRON HANDS','RAVEN GUARD','SALAMANDERS','ULTRAMARINES','WHITE SCARS','BLOOD ANGELS','DARK ANGELS','BLACK TEMPLARS','SPACE WOLVES'] as const;
export type SpaceMarineChapter=typeof SM_CHAPTERS[number];
const chapters=new Set<string>(SM_CHAPTERS);
const normal=(s:string)=>s.trim().replaceAll('’',"'").toLowerCase();
export const spaceMarineHasDetachment=(army:ArmySelection,name:string)=>isSpaceMarineFaction(army.faction)&&!!army.detachments2026?.some(d=>normal(d)===normal(name));
export const spaceMarinePrintedChapter=(unit:string,faction:Faction='Space Marines')=>spaceMarineNativeSheet(unit,faction)?.keywords?.find(k=>chapters.has(k)) as SpaceMarineChapter|undefined;
const detachmentChapters:Readonly<Record<string,SpaceMarineChapter>>={
 'blade of ultramar':'ULTRAMARINES','ceramite sentinels':'IMPERIAL FISTS',"forgefather's seekers":'SALAMANDERS',
 "medusa's wrath":'IRON HANDS','shadowmark talon':'RAVEN GUARD','spearpoint task force':'WHITE SCARS','black spear task force':'DEATHWATCH',
};
/** Infer the chosen Chapter from actual chapter units and selected chapter detachments. */
export function spaceMarineChapters(army:ArmySelection):Set<SpaceMarineChapter>{
 if(!isSpaceMarineFaction(army.faction))return new Set();
 const support=spaceMarineHasDetachment(army,'Deathwatch Support');
 return new Set([
  ...(SPACE_MARINE_CHAPTER_FACTIONS[army.faction]?[SPACE_MARINE_CHAPTER_FACTIONS[army.faction] as SpaceMarineChapter]:[]),
  ...Object.entries(army.units).filter(([,n])=>n>0).flatMap(([unit])=>{const chapter=spaceMarinePrintedChapter(unit,army.faction);return chapter&&!(support&&chapter==='DEATHWATCH')?[chapter]:[];}),
  ...(army.detachments2026??[]).flatMap(d=>detachmentChapters[normal(d)]?[detachmentChapters[normal(d)]]:[]),
 ]);
}
export function spaceMarineChapter(army:ArmySelection):SpaceMarineChapter|undefined{
 const selected=spaceMarineChapters(army);return selected.size===1?[...selected][0]:undefined;
}
export function spaceMarineMusterUnits(army:ArmySelection):string[]{
 if(!isSpaceMarineFaction(army.faction))return [];
 const selected=spaceMarineChapters(army),support=spaceMarineHasDetachment(army,'Deathwatch Support'),blackSpear=spaceMarineHasDetachment(army,'Black Spear Task Force');
 const veteranRecruits=selected.has('DEATHWATCH');
 return [...spaceMarineSheets(army.faction).filter(sheet=>{
  const chapter=spaceMarinePrintedChapter(sheet.unit,army.faction);
  if(chapter&&!(support&&chapter==='DEATHWATCH')&&selected.size&&![...selected].every(c=>c===chapter))return false;
  if(veteranRecruits&&['Scout Squad','Terminator Squad','Terminator Assault Squad'].includes(sheet.unit))return false;
  if(blackSpear&&spaceMarineAgentName(sheet.unit)&&sheet.keywords?.includes('DEATHWATCH'))return false;
  if(army.faction==='Black Templars'&&sheet.keywords?.includes('ADEPTUS ASTARTES')&&sheet.keywords?.includes('PSYKER'))return false;
  if(isWarhound(sheet.unit))return false;
  return true;
 }).map(s=>s.unit),...alliedTitanAndKnightNames(army).filter(isWarhound)];
}
