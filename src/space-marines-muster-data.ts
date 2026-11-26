import type {ArmySelection} from './catalog';
import {SM_SHEETS,SM_ARMY_SHEETS,spaceMarineAgentName} from './space-marines-data';
import {alliedTitanAndKnightNames,isWarhound} from './titan-support-data';

const native=new Map(SM_SHEETS.map(s=>[s.unit,s]));
export const SM_CHAPTERS=['DEATHWATCH','IMPERIAL FISTS','IRON HANDS','RAVEN GUARD','SALAMANDERS','ULTRAMARINES','WHITE SCARS'] as const;
export type SpaceMarineChapter=typeof SM_CHAPTERS[number];
const chapters=new Set<string>(SM_CHAPTERS);
const normal=(s:string)=>s.trim().replaceAll('’',"'").toLowerCase();
export const spaceMarineHasDetachment=(army:ArmySelection,name:string)=>army.faction==='Space Marines'&&!!army.detachments2026?.some(d=>normal(d)===normal(name));
export const spaceMarinePrintedChapter=(unit:string)=>native.get(unit)?.keywords?.find(k=>chapters.has(k)) as SpaceMarineChapter|undefined;
const detachmentChapters:Readonly<Record<string,SpaceMarineChapter>>={
 'blade of ultramar':'ULTRAMARINES','ceramite sentinels':'IMPERIAL FISTS',"forgefather's seekers":'SALAMANDERS',
 "medusa's wrath":'IRON HANDS','shadowmark talon':'RAVEN GUARD','spearpoint task force':'WHITE SCARS','black spear task force':'DEATHWATCH',
};
/** Infer the chosen Chapter from actual chapter units and selected chapter detachments. */
export function spaceMarineChapters(army:ArmySelection):Set<SpaceMarineChapter>{
 if(army.faction!=='Space Marines')return new Set();
 const support=spaceMarineHasDetachment(army,'Deathwatch Support');
 return new Set([
  ...Object.entries(army.units).filter(([,n])=>n>0).flatMap(([unit])=>{const chapter=spaceMarinePrintedChapter(unit);return chapter&&!(support&&chapter==='DEATHWATCH')?[chapter]:[];}),
  ...(army.detachments2026??[]).flatMap(d=>detachmentChapters[normal(d)]?[detachmentChapters[normal(d)]]:[]),
 ]);
}
export function spaceMarineChapter(army:ArmySelection):SpaceMarineChapter|undefined{
 const selected=spaceMarineChapters(army);return selected.size===1?[...selected][0]:undefined;
}
export function spaceMarineMusterUnits(army:ArmySelection):string[]{
 if(army.faction!=='Space Marines')return [];
 const selected=spaceMarineChapters(army),support=spaceMarineHasDetachment(army,'Deathwatch Support'),blackSpear=spaceMarineHasDetachment(army,'Black Spear Task Force');
 const veteranRecruits=selected.has('DEATHWATCH');
 return [...SM_ARMY_SHEETS.filter(sheet=>{
  const chapter=spaceMarinePrintedChapter(sheet.unit);
  if(chapter&&!(support&&chapter==='DEATHWATCH')&&selected.size&&![...selected].every(c=>c===chapter))return false;
  if(veteranRecruits&&['Scout Squad','Terminator Squad','Terminator Assault Squad'].includes(sheet.unit))return false;
  if(blackSpear&&spaceMarineAgentName(sheet.unit)&&sheet.keywords?.includes('DEATHWATCH'))return false;
  return true;
 }).map(s=>s.unit),...alliedTitanAndKnightNames(army).filter(isWarhound)];
}
