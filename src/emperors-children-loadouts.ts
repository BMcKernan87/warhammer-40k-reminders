import {factionModelEquipment} from './faction-model-equipment';
import {EMPERORS_CHILDREN_KITS} from './emperors-children-loadouts.generated';
import {EMPERORS_CHILDREN_SHEETS} from './emperors-children-data.generated';

export const {
 loadout:emperorsChildrenLoadout,valid:validEmperorsChildrenGear,resize:resizeEmperorsChildrenGear,
 bearers:emperorsChildrenModelLoadouts,count:emperorsChildrenWeaponCount,ranged:emperorsChildrenHasRangedWeapon,
}=factionModelEquipment(EMPERORS_CHILDREN_KITS,EMPERORS_CHILDREN_SHEETS);
