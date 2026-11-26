import type {ArmySelection} from './catalog';
import {GK_UPGRADES} from './grey-knights-detachments.generated';

export function eligibleGreyKnightsUpgrades(army:ArmySelection,unit:string,_id?:string){
 if(army.faction!=='Grey Knights')return [];
 return GK_UPGRADES.filter(u=>army.detachments2026?.includes(u.detachment)&&u.units.some(n=>n===unit));
}
