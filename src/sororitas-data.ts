import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {SORORITAS_SHEETS} from './sororitas-data.generated';

export {SORORITAS_SHEETS};
export const SORORITAS_UNITS=SORORITAS_SHEETS.map(s=>s.unit);
const sheets=new Map(SORORITAS_SHEETS.map(s=>[s.unit,s]));
export function sororitasMusterUnits(army:ArmySelection):string[]{
 if(army.faction!=='Adepta Sororitas')return [];
 return [...SORORITAS_UNITS];
}
export function sororitasKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const s=sheets.get(squad.unit);
 if(army.faction!=='Adepta Sororitas'||!s)return new Set();
 const tags=new Set([...s.keywords??[],...(model?s.modelKeywords?.[model]??[]:[s.unit.toUpperCase(),...Object.values(s.modelKeywords??{}).flat()])]);
 const selected=army.upgrades2026?.[squad.id]??army.upgrades2026?.[squad.unit]??squad.enhancement;
 if(army.detachments2026?.includes('Penitent Host')&&selected==='Catechism of Divine Penitence'&&['CANONESS','PALATINE','MINISTORUM PRIEST'].some(k=>tags.has(k)))tags.add('PENITENT');
 return tags;
}
