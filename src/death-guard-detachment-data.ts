import type {ArmySelection} from './catalog';
import {DG_UPGRADES} from './death-guard-detachments.generated';

export const currentDeathGuardDetachment=(name:string)=>name.replace("Mortarion's Hammer",'Mortarion’s Hammer').replace("Death Lord's Chosen",'Death Lord’s Chosen');
export function eligibleDeathGuardUpgrades(army:ArmySelection,unit:string,_id?:string){
 if(army.faction!=='Death Guard')return [];
 return DG_UPGRADES.filter(u=>army.detachments2026?.some(name=>currentDeathGuardDetachment(name)===u.detachment)&&u.units.some(n=>n===unit));
}
