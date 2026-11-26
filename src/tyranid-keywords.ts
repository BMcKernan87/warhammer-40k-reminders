import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {TYRANID_SHEETS} from './tyranid-data';
import {tyranidCanPromote,tyranidHasDetachment} from './tyranid-muster-data';

const sheets=new Map(TYRANID_SHEETS.map(s=>[s.unit,s]));
const warriors=new Set(['Tyranid Warriors With Melee Bio-weapons','Tyranid Warriors With Ranged Bio-weapons']);
/** Preserve physical model keywords: only the Ravener Prime is a Character/Synapse source. */
export function tyranidKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const sheet=sheets.get(squad.unit);
 if(army.faction!=='Tyranids'||!sheet)return new Set();
 const tags=new Set([...sheet.keywords??[],...(model?sheet.modelKeywords?.[model]??[]:[sheet.unit.toUpperCase(),...Object.values(sheet.modelKeywords??{}).flat()])]);
 // Core 02.05 treats singular and plural forms of the same keyword equally.
 // Keep the printed Ravener BURROWERS keyword and expose its rule-match form.
 if(tags.has('BURROWERS'))tags.add('BURROWER');
 if(tyranidHasDetachment(army,'Warrior Bioform Onslaught')&&warriors.has(squad.unit)){
  tags.add('BATTLELINE');tags.add('TYRANID WARRIORS');
 }
 if(tyranidHasDetachment(army,'Subterranean Assault')&&['Mawloc','Trygon'].includes(squad.unit))tags.add('BURROWER');
 if(squad.characterPromotion&&tyranidCanPromote(army,squad)){
  tags.add('CHARACTER');
  const upgrade=army.upgrades2026?.[squad.id]??army.upgrades2026?.[squad.unit];
  if(upgrade==='Trygon Prime')tags.add('SYNAPSE');
 }
 return tags;
}
