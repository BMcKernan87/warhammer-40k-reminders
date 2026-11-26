import type {ArmySelection} from './catalog';
import {WORLD_EATERS_UPGRADES} from './world-eaters-detachments.generated';

export function eligibleWorldEatersUpgrades(army:ArmySelection,unit:string,_id?:string){
 if(army.faction!=='World Eaters')return [];
 return WORLD_EATERS_UPGRADES.filter(u=>army.detachments2026?.some(d=>d.toLowerCase()===u.detachment.toLowerCase())
  &&u.units.some(n=>n.toLowerCase()===unit.toLowerCase()));
}
