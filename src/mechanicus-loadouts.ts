import {factionModelEquipment} from './faction-model-equipment';
import {MECHANICUS_KITS} from './mechanicus-loadouts.generated';
import {MECHANICUS_SHEETS} from './mechanicus-data.generated';
export const {
 loadout:mechanicusLoadout,valid:validMechanicusGear,resize:resizeMechanicusGear,
 bearers:mechanicusModelLoadouts,count:mechanicusWeaponCount,ranged:mechanicusHasRangedWeapon,
}=factionModelEquipment(MECHANICUS_KITS,MECHANICUS_SHEETS);
