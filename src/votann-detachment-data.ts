import type {ArmySelection} from './catalog';
import {expandRoster} from './roster-instances';
import {votannCharacterWeapons} from './votann-loadouts';
import {VOTANN_UPGRADES} from './votann-detachments.generated';

export function eligibleVotannUpgrades(army:ArmySelection,unit:string,id?:string) {
  if (army.faction!=='Leagues of Votann') return [];
  const squad=id?expandRoster(army).find(s=>s.id===id):undefined;
  return VOTANN_UPGRADES.filter(upgrade=>army.detachments2026?.includes(upgrade.detachment)&&
    upgrade.units.some(name=>name===unit)&&
    (upgrade.name!=='Iron Ambassador'||votannCharacterWeapons(squad??{unit,id:''},'Ranged').includes('Autoch-pattern combi-bolter')));
}
