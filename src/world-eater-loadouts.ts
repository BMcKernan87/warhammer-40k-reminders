import {factionModelEquipment} from './faction-model-equipment';
import {WORLD_EATER_KITS} from './world-eater-loadouts.generated';
import {WORLD_EATERS_SHEETS} from './world-eaters-data.generated';

export const {
 loadout:worldEaterLoadout,valid:validWorldEaterGear,resize:resizeWorldEaterGear,bearers:worldEaterModelLoadouts,
 count:worldEaterWeaponCount,ranged:worldEaterHasRangedWeapon,
}=factionModelEquipment(WORLD_EATER_KITS,WORLD_EATERS_SHEETS,(unit,key)=>unit==='Bloodcrushers'&&key==='bladedhorn'?'juggernautsbladedhorn':key);
