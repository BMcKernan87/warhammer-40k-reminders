import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {VOTANN_SHEETS} from './votann-data.generated';

export const VOTANN_UNITS=VOTANN_SHEETS.map(sheet=>sheet.unit);
export const votannSheets=new Map(VOTANN_SHEETS.map(sheet=>[sheet.unit,sheet]));
export function votannKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const sheet=votannSheets.get(squad.unit);
 if(!sheet)return new Set();
 const byModel=sheet.modelKeywords??{};
 const tags=new Set([...sheet.keywords??[],...(model?byModel[model]??[]:[sheet.unit.toUpperCase(),...Object.values(byModel).flat()])]);
 if(army.detachments2026?.includes('Dêlve Assault Shift')&&squad.unit==='Cthonian Beserks')tags.add('BATTLELINE');
 return tags;
}
