import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {tauKeywords as nativeKeywords} from './tau-data';
import {tauWeaponCount} from './tau-loadouts';
import {eligibleTauUpgrades,tauSelectedDetachments} from './tau-detachment-data';

/** Only actual equipment and eligible upgrades add keywords to the native card. */
export function tauKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const tags=nativeKeywords(army,squad,model);
 if(army.faction!=='T’au Empire'||!tags.size)return tags;
 if(tauSelectedDetachments(army).includes('Kroot Hunting Pack')&&squad.unit==='Kroot Carnivores')tags.add('BATTLELINE');
 if(!model&&tauWeaponCount(squad,'Marker drone')>0)tags.add('MARKERLIGHT');
 if(squad.unit==='Ethereal'&&tauWeaponCount(squad,'Hover drone')>0)tags.add('FLY');
 if(squad.unit==='Ghostkeel Battlesuit'&&tauWeaponCount(squad,'Battlesuit support system')>0)tags.delete('SMOKE');
 if(squad.unit==='Tiger Shark'&&tauWeaponCount(squad,'Transport bay')>0)tags.add('TRANSPORT');
 const selected=army.upgrades2026?.[squad.id]??army.upgrades2026?.[squad.unit]??squad.enhancement;
 if(selected==='Internal Grenade Racks'&&eligibleTauUpgrades(army,squad.unit,squad.id).some(u=>u.name===selected))tags.add('GRENADES');
 return tags;
}
