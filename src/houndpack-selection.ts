import type {ArmySelection} from './catalog';
import {CHAOS_KNIGHT_SHEETS} from './chaos-knights-data';
import {eligibleChaosKnightUpgrades,resolvedWarDogCharacterIds} from './chaos-knight-detachments';
import {expandRoster} from './roster-instances';

export function houndpackDogs(army:ArmySelection){
  if(army.faction!=='Chaos Knights'||!army.detachments2026?.includes('Houndpack Lance'))return [];
  const dogUnits=new Set(CHAOS_KNIGHT_SHEETS.filter(s=>s.keywords?.includes('WAR DOG')).map(s=>s.unit));
  return expandRoster(army).filter(s=>dogUnits.has(s.unit));
}

export function changeHoundpackCharacter(army:ArmySelection,id:string,selected:boolean):ArmySelection {
  const dogs=houndpackDogs(army);
  if(dogs.length<=3||!dogs.some(d=>d.id===id))throw Error('Choose a War Dog from this Houndpack Lance');
  const ids=new Set(resolvedWarDogCharacterIds(army));
  if(selected)ids.add(id);else ids.delete(id);
  if(ids.size>3)throw Error('A Houndpack Lance can nominate three War Dogs');
  return reconcileHoundpack(army,{...army,chaosWarDogCharacterIds:[...ids]});
}

// A fourth War Dog does not displace the existing three Characters. After a roster
// edit only enhancements that depended on a lost Character nomination are removed.
export function reconcileHoundpack(previous:ArmySelection,next:ArmySelection):ArmySelection {
  if(next.faction!=='Chaos Knights')return next;
  const dogs=houndpackDogs(next).map(s=>s.id);
  const oldIds=resolvedWarDogCharacterIds(previous);
  const ids=dogs.length===3?dogs:dogs.length>3?(next.chaosWarDogCharacterIds??oldIds).filter(id=>dogs.includes(id)):[];
  const updated={...next,chaosWarDogCharacterIds:dogs.length>=3?ids:undefined};
  const lost=new Set(oldIds.filter(id=>!ids.includes(id)));
  if(!lost.size)return updated;
  const roster=expandRoster(updated);
  const upgrades={...updated.upgrades2026};
  for(const id of lost){
    const squad=roster.find(s=>s.id===id);
    if(squad&&upgrades[id]&&!eligibleChaosKnightUpgrades(updated,squad.unit,id).some(u=>u.name===upgrades[id]))delete upgrades[id];
  }
  return {...updated,upgrades2026:upgrades,warlordId:lost.has(updated.warlordId??'')?undefined:updated.warlordId};
}
