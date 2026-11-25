import type {ArmySelection} from './catalog';
import {expandRoster} from './roster-instances';
import {tauWeaponCount} from './tau-loadouts';
import {TAU_DETACHMENTS,TAU_UPGRADES} from './tau-detachments.generated';
export {TAU_DETACHMENTS,TAU_UPGRADES} from './tau-detachments.generated';

const normalize=(name:string)=>name.toLowerCase().replace(/['’]/g,'’').replace('auxillary cadre','auxiliary cadre');
export function currentTauDetachment(name:string):string{
 return TAU_DETACHMENTS.find(d=>normalize(d.name)===normalize(name))?.name??name;
}
export function tauSelectedDetachments(army:ArmySelection):string[]{
 return army.faction==='T’au Empire'?[...new Set((army.detachments2026??[]).map(currentTauDetachment))]:[];
}
const prototypeWeapons:Readonly<Record<string,string>>={
 'Thermoneutronic Projector':'T’au flamer','Plasma Accelerator Rifle':'Plasma rifle','Supernova Launcher':'Airbursting fragmentation projector',
};
export function eligibleTauUpgrades(army:ArmySelection,unit:string,id?:string){
 if(army.faction!=='T’au Empire')return [];
 const detachments=tauSelectedDetachments(army);
 const bearer=expandRoster(army).find(s=>id?s.id===id:s.unit===unit)??{id:id??unit,unit};
 return TAU_UPGRADES.filter(u=>detachments.includes(u.detachment)&&u.units.some(n=>n===unit)&&(!prototypeWeapons[u.name]||tauWeaponCount(bearer,prototypeWeapons[u.name])>0));
}
