import type {ArmySelection} from './catalog';
import {detachmentBudget, type BattleSize2026} from './edition-2026';
import {upgradeError2026} from './upgrades-2026';

export function changeBattleSize(army: ArmySelection, size: BattleSize2026): ArmySelection {
  const selected = army.detachments2026 ?? [];
  if (selected.length && !detachmentBudget(army.faction, selected, size).valid) {
    throw Error('Remove a detachment before switching to ' + size + '. The selected combination exceeds its Detachment Point budget.');
  }
  const next = {...army, battleSize2026: size};
  const error = upgradeError2026(next);
  if (error) throw Error(error + '. Adjust the enhancements before switching battle size.');
  return next;
}
