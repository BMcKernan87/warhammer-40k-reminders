import type {ArmySelection} from './catalog';
import {expandRoster,type RosterInstance} from './roster-instances';
import {spaceMarineKeywords} from './space-marines-keywords';
import {spaceMarineFormations} from './space-marines-formations';
import {spaceMarineModelLoadouts} from './space-marines-loadouts';
import {spaceMarineCard} from './space-marines-card-data';
import {selectedSpaceMarineUpgrade} from './space-marines-upgrades';
import {CHAPTER_DETACHMENTS,CHAPTER_UPGRADES} from './space-marine-chapters-detachments.generated';
export {CHAPTER_DETACHMENTS,CHAPTER_UPGRADES} from './space-marine-chapters-detachments.generated';

type Upgrade=typeof CHAPTER_UPGRADES[number];
export type ChapterUpgradeOption=Upgrade&{bearerModels:string[]};
const normalize=(name:string)=>name.trim().toLowerCase().replace(/[’']/g,'’');
export function isSpaceMarineChapterArmy(army:ArmySelection):boolean{
 return CHAPTER_DETACHMENTS.some(d=>d.faction===army.faction);
}
export function currentChapterDetachment(name:string):string{
 return CHAPTER_DETACHMENTS.find(d=>normalize(d.name)===normalize(name))?.name??name;
}
export function chapterSelectedDetachments(army:ArmySelection):string[]{
 const selected=(army.detachments2026??[]).map(currentChapterDetachment);
 return [...new Set(CHAPTER_DETACHMENTS.filter(d=>d.faction===army.faction&&selected.includes(d.name)).map(d=>d.name))];
}
function permission(u:Upgrade,tags:Set<string>,unit:string,deepStrike:boolean):boolean{
 if(!tags.has('ADEPTUS ASTARTES'))return false;
 switch(u.id){
  case '000011075002':case '000011075003':return tags.has('SWORD BRETHREN SQUAD');
  case '000011172004':return tags.has('CHAPLAIN')||tags.has('JUDICIAR');
  case '000011176002':return tags.has('CRUSADER SQUAD');
  case '000011176003':case '000009851002':case '000009851003':return tags.has('INFANTRY');
  case '000011083002':case '000011083003':return tags.has('JUMP PACK');
  case '000011087002':case '000011087003':return tags.has('DEATH COMPANY');
  case '000008774002':case '000008774003':return tags.has('DEATHWING');
  case '000010155003':return tags.has('RAVENWING');
  case '000010155004':return tags.has('DEATHWING')&&deepStrike;
  case '000011095002':return tags.has('RAVENWING')&&(tags.has('FLY')||tags.has('MOUNTED'));
  case '000011095003':return tags.has('LAND SPEEDER VENGEANCE');
  case '000010660002':return tags.has('WOLF PRIEST')||unit==='Wolf Priest';
  case '000010660003':return tags.has('TERMINATOR')&&tags.has('CAPTAIN');
  case '000010660005':return tags.has('WOLF GUARD BATTLE LEADER')||unit==='Wolf Guard Battle Leader';
  default:return true;
 }
}
export function eligibleChapterUpgrades(army:ArmySelection,unit:string,id?:string):ChapterUpgradeOption[]{
 if(!isSpaceMarineChapterArmy(army)||!spaceMarineCard(unit,army.faction))return [];
 const selected=chapterSelectedDetachments(army),roster=expandRoster(army),found=roster.find(s=>s.unit===unit&&(!id||s.id===id));
 if(id&&!found)return [];
 const squad=found??{id:unit,unit},tags=spaceMarineKeywords(army,squad),models=spaceMarineModelLoadouts(squad,army.faction);
 const form=spaceMarineFormations(army,roster).find(f=>f.members.some(s=>s.id===squad.id));
 // Deathwatch Support's formation restriction also covers recruited generic
 // Characters. Their host Chapter does not override that explicit restriction.
 if((army.detachments2026??[]).includes('Deathwatch Support')&&(form?.members??[squad]).some(s=>spaceMarineKeywords(army,s).has('KILL TEAM')))return [];
 const deepStrike=!!spaceMarineCard(unit,army.faction)?.core?.includes('Deep Strike');
 return CHAPTER_UPGRADES.filter(u=>u.faction===army.faction&&selected.includes(u.detachment)).flatMap<ChapterUpgradeOption>(u=>{
  if(u.repeatable)return models.some(m=>!spaceMarineKeywords(army,squad,m.model).has('EPIC HERO'))&&permission(u,tags,unit,deepStrike)?[{...u,bearerModels:[] as string[]}]:[];
  const bearers=[...new Set(models.filter(m=>{
   const k=spaceMarineKeywords(army,squad,m.model);
   return k.has('CHARACTER')&&!k.has('EPIC HERO')&&permission(u,u.id==='000011176003'?tags:k,unit,deepStrike);
  }).map(m=>m.model))];
  return bearers.length?[{...u,bearerModels:bearers}]:[];
 });
}
export function selectedChapterUpgrade(army:ArmySelection,squad:RosterInstance){
 const name=army.upgrades2026?.[squad.id]??army.upgrades2026?.[squad.unit]??squad.enhancement;
 // The two Tempered in Battle copies have the same price and effect. A
 // legitimately eligible shared copy owns the single selected enhancement.
 if(name&&selectedSpaceMarineUpgrade(army,squad)?.name===name)return undefined;
 return eligibleChapterUpgrades(army,squad.unit,squad.id).find(u=>u.name===name);
}
export function chapterUpgradeBearerModels(army:ArmySelection,squad:RosterInstance):string[]{
 return selectedChapterUpgrade(army,squad)?.bearerModels??[];
}
function members(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]){
 return spaceMarineFormations(army,roster).find(f=>f.members.some(s=>s.id===squad.id))?.members??[];
}
export function chapterScoutRange(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):number{
 if(!isSpaceMarineChapterArmy(army))return 0;
 const current={...army,instances:[...roster]};
 return members(army,squad,roster).some(s=>['000011172005','000009835002'].includes(selectedChapterUpgrade(current,s)?.id??''))?6:0;
}
/** No chapter detachment or enhancement in the current twelve grants Deep Strike. */
export function chapterHasDeepStrike(army:ArmySelection,squad:RosterInstance,_roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 return isSpaceMarineChapterArmy(army)&&!!spaceMarineCard(squad.unit,army.faction)?.core?.includes('Deep Strike');
}
export function chapterFirstTurnIngress(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 if(!isSpaceMarineChapterArmy(army))return false;
 const current={...army,instances:[...roster]};
 return members(army,squad,roster).some(s=>['000010155004','000011095002'].includes(selectedChapterUpgrade(current,s)?.id??''));
}
/** Inheritors grants the actual upgraded unit, including attached models, Fights First. */
export function chapterFormationHasFightsFirst(army:ArmySelection,formation:readonly RosterInstance[],roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 const current={...army,instances:[...roster]};
 return isSpaceMarineChapterArmy(army)&&formation.some(s=>roster.some(r=>r.id===s.id)&&selectedChapterUpgrade(current,s)?.id==='000011075003');
}
