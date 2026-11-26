import {factionModelEquipment} from './faction-model-equipment';
import {SORORITAS_KITS} from './sororitas-loadouts.generated';
import {SORORITAS_SHEETS} from './sororitas-data.generated';

export const {
 loadout:sororitasLoadout,valid:validSororitasGear,resize:resizeSororitasGear,
 bearers:sororitasModelLoadouts,count:sororitasWeaponCount,ranged:sororitasHasRangedWeapon,
}=factionModelEquipment(SORORITAS_KITS,SORORITAS_SHEETS);
