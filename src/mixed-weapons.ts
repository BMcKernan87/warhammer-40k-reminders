import type {ArmySelection} from './catalog';
/** Only datasheets whose modeled primary weapons can be distributed across individual models. */
export const MIXED_PRIMARY_WEAPON_UNITS:Partial<Record<ArmySelection['faction'],readonly string[]>>={
 Necrons:['Necron Warriors','Lokhust Heavy Destroyers'],
 Tyranids:['Termagants'],
 Orks:['Boyz']
};
export function supportsMixedPrimaryWeapons(faction:ArmySelection['faction'],unit:string):boolean{
 return MIXED_PRIMARY_WEAPON_UNITS[faction]?.includes(unit)??false;
}
