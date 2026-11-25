import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {GSC_SHEETS} from './gsc-data.generated';

export {GSC_SHEETS};
const native=new Map(GSC_SHEETS.map(sheet=>[sheet.unit,sheet]));
export const GSC_UNITS=GSC_SHEETS.map(sheet=>sheet.unit);

export function gscKeywords(_army:ArmySelection,squad:RosterInstance,model?:string):Set<string> {
  const sheet=native.get(squad.unit);
  if(!sheet)return new Set();
  const modelTags=sheet.modelKeywords??{};
  return new Set([sheet.unit.toUpperCase(),...(sheet.keywords??[]),
    ...(model ? modelTags[model]??[] : Object.values(modelTags).flat())]);
}
