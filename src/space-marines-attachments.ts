import type {ArmySelection,Faction} from './catalog';
import {spaceMarineSheet,spaceMarineNativeSheets} from './space-marines-data';
import {spaceMarineKeywords,spaceMarineWolfTouched} from './space-marines-keywords';
import {BATTLELINE_INQUISITORS} from './assigned-agent-data';
import {spaceMarineMusterUnits} from './space-marines-muster-data';

/** Cato's printed exception changes his slot when Calgar is included in the army. */
export function spaceMarineAttachmentRole(unit:string,army?:ArmySelection,faction:Faction=army?.faction??'Space Marines'):'leader'|'support'|null{
 if(unit==='Cato Sicarius'&&army?.faction==='Space Marines'&&(army.units['Marneus Calgar']??0)>0)return 'support';
 return spaceMarineSheet(unit,faction)?.attachmentRole??null;
}
export function spaceMarineBodyguards(army:ArmySelection,leader:{id:string;unit:string}):readonly string[]{
 const allowed=new Set(spaceMarineMusterUnits(army));if(!allowed.has(leader.unit))return [];
 const base=spaceMarineSheet(leader.unit,army.faction)?.bodyguards??[];
 const authority=BATTLELINE_INQUISITORS.has(leader.unit)?spaceMarineNativeSheets(army.faction).filter(s=>['IMPERIUM','INFANTRY','BATTLELINE'].every(k=>spaceMarineKeywords(army,{id:s.unit,unit:s.unit}).has(k))).map(s=>s.unit):[];
 const wolves=spaceMarineSheet(leader.unit,army.faction)?.attachmentRole==='leader'&&spaceMarineWolfTouched(army,leader)?['Wulfen','Wulfen with Storm Shields']:[];
 return [...new Set([...base,...authority,...wolves])].filter(u=>allowed.has(u));
}
