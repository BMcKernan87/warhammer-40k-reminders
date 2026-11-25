import {factionModelEquipment} from './faction-model-equipment';
import {DEATH_GUARD_KITS} from './death-guard-loadouts.generated';
import {DEATH_GUARD_SHEETS} from './death-guard-data.generated';

export const {
 loadout:deathGuardLoadout,valid:validDeathGuardGear,resize:resizeDeathGuardGear,
 bearers:deathGuardModelLoadouts,count:deathGuardWeaponCount,ranged:deathGuardHasRangedWeapon,
}=factionModelEquipment(DEATH_GUARD_KITS,DEATH_GUARD_SHEETS,(_unit,key)=>key==='iconofdespairaura'?'iconofdespair':key);
