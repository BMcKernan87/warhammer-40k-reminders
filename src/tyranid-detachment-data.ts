import type {ArmySelection} from './catalog';
import {expandRoster,type RosterInstance} from './roster-instances';
import {tyranidKeywords} from './tyranid-keywords';
import {TYRANID_CARDS} from './tyranid-card-profiles.generated';
import {TYRANID_DETACHMENTS,TYRANID_UPGRADES} from './tyranid-detachments.generated';
export {TYRANID_DETACHMENTS,TYRANID_UPGRADES} from './tyranid-detachments.generated';

const normalize=(name:string)=>name.trim().toLowerCase().replace(/[’']/g,'’');
export function currentTyranidDetachment(name:string):string{
 return TYRANID_DETACHMENTS.find(d=>normalize(d.name)===normalize(name))?.name??name;
}
export function tyranidSelectedDetachments(army:ArmySelection):string[]{
 return army.faction==='Tyranids'?[...new Set((army.detachments2026??[]).map(currentTyranidDetachment))]:[];
}
export function tyranidHasDeepStrike(army:ArmySelection,squad:RosterInstance):boolean{
 return !!TYRANID_CARDS[squad.unit]?.core?.some(c=>c==='Deep Strike')||tyranidSelectedDetachments(army).includes('Ambush Predators')&&['Deathleaper','Lictor','Neurolictor'].includes(squad.unit);
}
export function eligibleTyranidUpgrades(army:ArmySelection,unit:string,id?:string){
 if(army.faction!=='Tyranids')return [];
 const detachments=tyranidSelectedDetachments(army);
 const bearer=expandRoster(army).find(s=>id?s.id===id:s.unit===unit)??{id:id??unit,unit};
 const tags=tyranidKeywords(army,bearer);
 return TYRANID_UPGRADES.filter(u=>{
  if(!detachments.includes(u.detachment))return false;
  if(u.repeatable)return u.units.some(n=>n===unit);
  if(!tags.has('CHARACTER')||tags.has('EPIC HERO'))return false;
  // The export links omit promoted Trygons from the three generic options.
  // Publisher pack p.5 expressly allows the selected Trygons enhancements.
  if(!u.units.some(n=>n===unit)&&!(unit==='Trygon'&&u.detachment==='Subterranean Assault'))return false;
  if(u.name==='Regenerating Monstrosity'&&tags.has('MONSTER'))return false;
  if(u.name==='Vanguard Intellect'&&!tyranidHasDeepStrike(army,bearer))return false;
  return true;
 });
}
