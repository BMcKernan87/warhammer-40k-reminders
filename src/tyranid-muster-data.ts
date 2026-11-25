import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';

export function tyranidHasDetachment(army:ArmySelection,name:string):boolean{
 return army.faction==='Tyranids'&&!!army.detachments2026?.some(d=>d.toLowerCase()===name.toLowerCase());
}
/** Subterranean Assault, current faction pack p.5: up to two chosen Trygons. */
export function tyranidCanPromote(army:ArmySelection,squad:RosterInstance):boolean{
 return tyranidHasDetachment(army,'Subterranean Assault')&&squad.unit==='Trygon';
}
