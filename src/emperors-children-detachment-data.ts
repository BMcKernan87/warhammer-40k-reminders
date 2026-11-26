import type {ArmySelection} from './catalog';
import {EMP_CHILDREN_UPGRADES} from './emperors-children-detachments.generated';

export const currentEcDetachment=(name:string)=>name.replace("Slaanesh's Chosen","Slaanesh’s Chosen");

export function eligibleEmperorsChildrenUpgrades(army:ArmySelection,unit:string,_id?:string){
 if(army.faction!=='Emperor’s Children')return [];
 return EMP_CHILDREN_UPGRADES.filter(u=>army.detachments2026?.some(n=>currentEcDetachment(n)===u.detachment)&&u.units.some(name=>name===unit));
}
