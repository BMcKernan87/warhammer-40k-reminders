import {factionModelEquipment} from './faction-model-equipment';
import {GREY_KNIGHTS_KITS} from './grey-knights-loadouts.generated';
import {GREY_KNIGHTS_SHEETS} from './grey-knights-data.generated';

export const {
 loadout:greyKnightsLoadout,valid:validGreyKnightsGear,resize:resizeGreyKnightsGear,
 bearers:greyKnightsModelLoadouts,count:greyKnightsWeaponCount,ranged:greyKnightsHasRangedWeapon,
}=factionModelEquipment(GREY_KNIGHTS_KITS,GREY_KNIGHTS_SHEETS,(unit,key)=>unit==='Brotherhood Techmarine'&&key==='servoarm'?'servoarms':key);
