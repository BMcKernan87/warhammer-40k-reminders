import type {ArmySelection} from './catalog';
import {equippedItems} from './knight-gear-options';
import {orkLoadout} from './ork-loadouts';
import {ORK_SHEETS} from './ork-data.generated';
import type {RosterInstance} from './roster-instances';

export {ORK_SHEETS};
export const ORK_UNITS=ORK_SHEETS.map(s=>s.unit);
const sheets=new Map(ORK_SHEETS.map(s=>[s.unit,s]));
const battleline:Readonly<Record<string,string>>={
 'Kult of Speed':'Warbikers','Taktikal Brigade':'Stormboyz','Runt Swarm':'Gretchin',
};
export function orkKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const sheet=sheets.get(squad.unit),byModel=sheet?.modelKeywords??{};
 const tags=new Set([...(sheet?[sheet.unit.toUpperCase()]:[]),...sheet?.keywords??[],...(model?byModel[model]??[]:Object.values(byModel).flat())]);
 if(squad.unit==='Wazbom Blastajet'&&equippedItems(orkLoadout(squad.unit,squad.models),squad.knightGear).includes('Blastajet Force Field'))tags.delete('SMOKE');
 if(army.detachments2026?.some(det=>battleline[det]===squad.unit))tags.add('BATTLELINE');
 const upgrade=army.upgrades2026?.[squad.id]??army.upgrades2026?.[squad.unit];
 if(army.detachments2026?.includes('Flyboyz')&&tags.has('AIRCRAFT')&&upgrade?.replace(/ \(Upgrade\)$/i,'')==='Flyboss')tags.add('CHARACTER');
 return tags;
}
export function orkAdditionalBodyguards(army:ArmySelection,leader:{id:string;unit:string}):readonly string[]{
 const tags=orkKeywords(army,leader),name=(army.upgrades2026?.[leader.id]??army.upgrades2026?.[leader.unit])?.replaceAll('’',"'");
 if(!tags.has('INFANTRY')||!tags.has('WARBOSS')&&!tags.has('BIG MEK'))return [];
 if(army.detachments2026?.includes('Wreckas')&&name==="Kaptin's Hat")return ['Flash Gitz'];
 if(army.detachments2026?.includes('Taktikal Brigade')&&name==='Kill Kommanda')return ['Kommandos'];
 return [];
}
