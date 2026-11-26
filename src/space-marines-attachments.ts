import type {ArmySelection} from './catalog';
import {SM_ARMY_SHEETS,SM_SHEETS} from './space-marines-data';
import {BATTLELINE_INQUISITORS} from './assigned-agent-data';
import {spaceMarineMusterUnits} from './space-marines-muster-data';

const sheets=new Map(SM_ARMY_SHEETS.map(s=>[s.unit,s]));
/** Cato's printed exception changes his slot when Calgar is included in the army. */
export function spaceMarineAttachmentRole(unit:string,army?:ArmySelection):'leader'|'support'|null{
 if(unit==='Cato Sicarius'&&army?.faction==='Space Marines'&&(army.units['Marneus Calgar']??0)>0)return 'support';
 return sheets.get(unit)?.attachmentRole??null;
}
export function spaceMarineBodyguards(army:ArmySelection,leader:{id:string;unit:string}):readonly string[]{
 const allowed=new Set(spaceMarineMusterUnits(army));if(!allowed.has(leader.unit))return [];
 const base=sheets.get(leader.unit)?.bodyguards??[];
 const authority=BATTLELINE_INQUISITORS.has(leader.unit)?SM_SHEETS.filter(s=>['IMPERIUM','INFANTRY','BATTLELINE'].every(k=>s.keywords?.includes(k))).map(s=>s.unit):[];
 return [...new Set([...base,...authority])].filter(u=>allowed.has(u));
}
