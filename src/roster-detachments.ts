import type {ArmySelection} from './catalog';
import {detachmentBudget} from './edition-2026';
import {currentNecronDetachment} from './necron-detachment-names';
import {expandRoster,reconcileInstanceAttachments} from './roster-instances';
import {eligibleUpgrades2026,upgradeError2026} from './upgrades-2026';

// One atomic editor transition: allow a saved draft with no detachment, but
// never accept an unknown, duplicate, conflicting or over-budget selection.
// Preserve roster/equipment/IDs and remove only upgrades no longer eligible.
export function changeDetachments2026(army:ArmySelection,selected:readonly string[]):ArmySelection{
 const names=army.faction==='Necrons'?selected.map(currentNecronDetachment):[...selected];
 if(names.length&&!detachmentBudget(army.faction,names,army.battleSize2026??'Strike Force').valid)
  throw Error('Detachment Point budget exceeded or selection invalid');
 const next={...army,detachments2026:names};
 const roster=expandRoster(army);
 const upgrades2026=Object.fromEntries(Object.entries(army.upgrades2026??{}).filter(([key,name])=>{
  const instance=roster.find(s=>s.id===key);
  return eligibleUpgrades2026(next,instance?.unit??key,instance?.id??key)
   .some(upgrade=>upgrade.name===name&&names.includes(upgrade.detachment));
 }));
 const updated=reconcileInstanceAttachments({...next,upgrades2026});
 const error=upgradeError2026(updated);
 if(error)throw Error(error);
 return updated;
}
