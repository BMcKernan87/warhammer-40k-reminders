import type {ArmySelection} from './catalog';
import {MECHANICUS_DETACHMENTS,MECHANICUS_UPGRADES} from './mechanicus-detachments.generated';

export function currentMechanicusDetachment(name:string):string{
 return MECHANICUS_DETACHMENTS.find(d=>d.name.toLowerCase()===name.toLowerCase())?.name??name;
}

export function eligibleMechanicusUpgrades(army:ArmySelection,unit:string,_id?:string){
 if(army.faction!=='Adeptus Mechanicus')return [];
 return MECHANICUS_UPGRADES.filter(u=>army.detachments2026?.some(d=>currentMechanicusDetachment(d)===u.detachment)&&u.units.some(n=>n===unit));
}
