import type {ArmySelection} from './catalog';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {gscHasRangedWeapon} from './gsc-loadouts';
import {currentGscDetachment} from './gsc-detachment-data';
import {GSC_ALLIED_CORE,GSC_ALLIED_SHEETS} from './gsc-allies-data.generated';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';
export {GSC_ALLIED_SHEETS} from './gsc-allies-data.generated';

const sheets=new Map(GSC_ALLIED_SHEETS.map(s=>[s.unit,s]));
type Ally='Astra Militarum'|'Tyranids';
export function gscAllyFaction(unit:string):Ally|undefined{
 const sheet=sheets.get(unit);
 if(sheet?.keywords?.includes('ASTRA MILITARUM'))return 'Astra Militarum';
 if(sheet?.keywords?.includes('TYRANIDS'))return 'Tyranids';
 return undefined;
}
export function gscAlliedKeywords(squad:RosterInstance,model?:string):Set<string>{
 const sheet=sheets.get(squad.unit),byModel=sheet?.modelKeywords??{};
 return new Set([...sheet?.keywords??[],...(model?byModel[model]??[]:Object.values(byModel).flat())]);
}
export const gscAllyHasRangedWeapon=(squad:RosterInstance)=>!!gscAllyFaction(squad.unit)&&gscHasRangedWeapon(squad);
export const gscAllyHasDeepStrike=(squad:RosterInstance)=>GSC_ALLIED_CORE[squad.unit]?.includes('Deep Strike')??false;
export function gscAlliedMusterUnits(army:ArmySelection):string[]{
 if(army.faction!=='Genestealer Cults')return [];
 const detachments=army.detachments2026?.map(currentGscDetachment)??[],guard=detachments.includes('Brood Brothers Auxilia'),tyranids=detachments.includes('Final Day');
 return GSC_ALLIED_SHEETS.filter(s=>gscAllyFaction(s.unit)==='Tyranids'?tyranids:guard).map(s=>s.unit);
}
export function gscAllyFindings(army:ArmySelection):RosterFinding[]{
 if(army.faction!=='Genestealer Cults')return [];
 const permitted=new Set(gscAlliedMusterUnits(army)),out:RosterFinding[]=[];
 const roster=expandRoster(army),allies=roster.filter(s=>gscAllyFaction(s.unit));
 if(!allies.length)return [];
 for(const name of new Set(allies.map(s=>s.unit)))if(!permitted.has(name)){
  const required=gscAllyFaction(name)==='Tyranids'?'Final Day':'Brood Brothers Auxilia';
  out.push({code:'gsc-allied-detachment',unit:name,severity:'error',message:name+' requires the '+required+' detachment.'});
 }
 const cap=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points/2;
 const prices=rosterCost2026(army,GSC_ALLIED_SHEETS).entries;
 for(const faction of ['Astra Militarum','Tyranids'] as const){
  const used=prices.filter(e=>gscAllyFaction(e.unit)===faction).reduce((n,e)=>n+(e.points??0),0);
  if(used>cap)out.push({code:'gsc-allied-points',severity:'error',message:faction+' allies cost '+used+' points. This battle size permits '+cap+'.'});
 }
 return out;
}
