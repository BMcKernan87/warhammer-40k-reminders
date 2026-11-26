import type {Faction} from './catalog';
import {SM_DETACHMENTS} from './space-marines-detachments.generated';
import {CHAPTER_DETACHMENTS} from './space-marine-chapters-detachments.generated';
import {isSpaceMarineFaction} from './space-marines-factions';

const coreChapterDetachments=new Set(['Black Spear Task Force','Forgefather’s Seekers','Shadowmark Talon','Spearpoint Task Force','Blade of Ultramar','Ceramite Sentinels',"Medusa's Wrath"]);
export function spaceMarineAvailableDetachments(faction:Faction){
 if(faction==='Space Marines')return [...SM_DETACHMENTS];
 if(!isSpaceMarineFaction(faction))return [];
 return [...SM_DETACHMENTS.filter(d=>!coreChapterDetachments.has(d.name)&&(faction!=='Black Templars'||d.name!=='Gladius Task Force')),...CHAPTER_DETACHMENTS.filter(d=>d.faction===faction)];
}
export function spaceMarineDetachmentGroups(faction:Faction):string[][]{
 const tags=new Map<string,string[]>();
 for(const d of spaceMarineAvailableDetachments(faction))if('tag' in d)tags.set(d.tag,[...tags.get(d.tag)??[],d.name]);
 return [...tags.values()];
}
