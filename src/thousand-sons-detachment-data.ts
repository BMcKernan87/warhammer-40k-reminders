import type {ArmySelection} from './catalog';
import {TS_UPGRADES} from './thousand-sons-detachments.generated';

export function eligibleThousandSonsUpgrades(army:ArmySelection,unit:string,_id?:string){
 if(army.faction!=='Thousand Sons')return [];
 return TS_UPGRADES.filter(u=>army.detachments2026?.includes(u.detachment)&&u.units.some(n=>n===unit));
}
