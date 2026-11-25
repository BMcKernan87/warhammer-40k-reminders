import {factionModelEquipment} from './faction-model-equipment';
import {THOUSAND_SONS_KITS} from './thousand-sons-loadouts.generated';
import {THOUSAND_SONS_SHEETS} from './thousand-sons-data.generated';

export const {
 loadout:thousandSonsLoadout,valid:validThousandSonsGear,resize:resizeThousandSonsGear,
 bearers:thousandSonsModelLoadouts,count:thousandSonsWeaponCount,ranged:thousandSonsHasRangedWeapon,
}=factionModelEquipment(THOUSAND_SONS_KITS,THOUSAND_SONS_SHEETS);
