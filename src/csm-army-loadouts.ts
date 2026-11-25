import type {RosterInstance} from './roster-instances';
import type {KnightCardStats} from './knight-card-rules';
import {CSM_CARDS,CSM_CULT_WEAPONS,type CsmCardStats} from './csm-card-profiles.generated';
import {CSM_CULT_SHEETS} from './csm-army-data';
import {csmLoadout,validCsmGear,resizeCsmGear,csmModelLoadouts,csmWeaponCount,csmHasRangedWeapon} from './csm-loadouts';
import {worldEaterLoadout,validWorldEaterGear,resizeWorldEaterGear,worldEaterModelLoadouts,worldEaterWeaponCount,worldEaterHasRangedWeapon} from './world-eater-loadouts';
import {thousandSonsLoadout,validThousandSonsGear,resizeThousandSonsGear,thousandSonsModelLoadouts,thousandSonsWeaponCount,thousandSonsHasRangedWeapon} from './thousand-sons-loadouts';
import {deathGuardLoadout,validDeathGuardGear,resizeDeathGuardGear,deathGuardModelLoadouts,deathGuardWeaponCount,deathGuardHasRangedWeapon} from './death-guard-loadouts';
import {emperorsChildrenLoadout,validEmperorsChildrenGear,resizeEmperorsChildrenGear,emperorsChildrenModelLoadouts,emperorsChildrenWeaponCount,emperorsChildrenHasRangedWeapon} from './emperors-children-loadouts';
import {WORLD_EATER_CARDS} from './world-eater-profiles.generated';
import {TS_CARDS} from './ts-profiles.generated';
import {DG_CARDS} from './dg-profiles.generated';
import {EC_CARDS} from './ec-profiles.generated';
import {knightWeaponCount} from './knight-loadouts';
import {chaosKnightHasRangedWeapon} from './chaos-knight-datasheets';
import {daemonHasRangedWeapon} from './daemon-datasheet-context';
import {isWarhound} from './titan-support-data';

const cult={
 'Khorne Berzerkers':{loadout:worldEaterLoadout,valid:validWorldEaterGear,resize:resizeWorldEaterGear,models:worldEaterModelLoadouts,count:worldEaterWeaponCount,ranged:worldEaterHasRangedWeapon,card:WORLD_EATER_CARDS['Khorne Berzerkers']},
 'Rubric Marines':{loadout:thousandSonsLoadout,valid:validThousandSonsGear,resize:resizeThousandSonsGear,models:thousandSonsModelLoadouts,count:thousandSonsWeaponCount,ranged:thousandSonsHasRangedWeapon,card:TS_CARDS['Rubric Marines']},
 'Plague Marines':{loadout:deathGuardLoadout,valid:validDeathGuardGear,resize:resizeDeathGuardGear,models:deathGuardModelLoadouts,count:deathGuardWeaponCount,ranged:deathGuardHasRangedWeapon,card:DG_CARDS['Plague Marines']},
 'Noise Marines':{loadout:emperorsChildrenLoadout,valid:validEmperorsChildrenGear,resize:resizeEmperorsChildrenGear,models:emperorsChildrenModelLoadouts,count:emperorsChildrenWeaponCount,ranged:emperorsChildrenHasRangedWeapon,card:EC_CARDS['Noise Marines']},
};
const cultKit=(unit:string)=>Object.hasOwn(cult,unit)?cult[unit as keyof typeof cult]:undefined;
type ArmyCard=KnightCardStats&{weapons:CsmCardStats['weapons'];modelSaves?:Readonly<Record<string,number|null>>};
export const CSM_ARMY_CARDS:Readonly<Record<string,ArmyCard>>={...CSM_CARDS,...Object.fromEntries(CSM_CULT_SHEETS.map(s=>[s.unit,{...cultKit(s.unit)!.card,weapons:CSM_CULT_WEAPONS[s.unit],source:s.source}]))};
export const csmArmyCard=(squad:RosterInstance)=>CSM_ARMY_CARDS[squad.unit];
export function csmArmyLoadout(unit:string,models?:number){return cultKit(unit)?.loadout(unit,models)??csmLoadout(unit,models);}
export function validCsmArmyGear(unit:string,gear:Record<string,string>,models?:number){return cultKit(unit)?.valid(unit,gear,models)??validCsmGear(unit,gear,models);}
export function resizeCsmArmyGear(squad:RosterInstance,models:number){return cultKit(squad.unit)?.resize(squad,models)??resizeCsmGear(squad,models);}
export function csmArmyModelLoadouts(squad:RosterInstance){return cultKit(squad.unit)?.models(squad)??csmModelLoadouts(squad);}
export function csmArmyWeaponCount(squad:RosterInstance,name:string):number{
 const ally=cultKit(squad.unit);if(ally)return ally.count(squad,name);
 return Object.hasOwn(CSM_CARDS,squad.unit)?csmWeaponCount(squad,name):knightWeaponCount(squad,name);
}
export function csmArmyHasRangedWeapon(squad:RosterInstance):boolean{
 const ally=cultKit(squad.unit);if(ally)return ally.ranged(squad);
 return Object.hasOwn(CSM_CARDS,squad.unit)?csmHasRangedWeapon(squad):isWarhound(squad.unit)||daemonHasRangedWeapon(squad)||chaosKnightHasRangedWeapon(squad);
}
