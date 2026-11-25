import {equippedItems,type KnightEquipment} from './knight-gear-options';
import {resizeModelEquipment,resolveModelEquipment,validModelEquipment,type Gear,type ResolvedKit} from './model-equipment-slots';
import type {RosterInstance} from './roster-instances';
import {WORLD_EATER_KITS} from './world-eater-loadouts.generated';
import {WORLD_EATERS_SHEETS} from './world-eaters-data.generated';

const sheets=new Map(WORLD_EATERS_SHEETS.map(s=>[s.unit,s]));
const kits=new Map(WORLD_EATER_KITS.map(k=>[k.unit,{...k,tiers:sheets.get(k.unit)!.compositionBySize!}]));
const cache=new Map<string,ResolvedKit>();
const weaponKey=(s:string)=>s.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
function options(unit:string,models?:number):ResolvedKit|undefined{
 const kit=kits.get(unit);
 if(!kit)return;
 const size=models??sheets.get(unit)!.sizes[0],key=unit+'#'+size;
 let result=cache.get(key);
 if(!result){
  result=resolveModelEquipment(kit,size);
  if(result)cache.set(key,result);
 }
 return result;
}
export function worldEaterLoadout(unit:string,models?:number):KnightEquipment|undefined{
 return options(unit,models)?.equipment;
}
export function validWorldEaterGear(unit:string,gear:Gear,models?:number):boolean{
 return validModelEquipment(options(unit,models),gear);
}
export function resizeWorldEaterGear(squad:RosterInstance,models:number){
 return squad.knightGear?resizeModelEquipment(options(squad.unit,models),squad.knightGear):undefined;
}
export function worldEaterModelLoadouts(squad:RosterInstance):{model:string;items:readonly string[]}[]{
 return options(squad.unit,squad.models)?.models.map(b=>({model:b.role,items:equippedItems(b,squad.knightGear)}))??[];
}
export function worldEaterWeaponCount(squad:RosterInstance,weapon:string):number{
 const key=squad.unit==='Bloodcrushers'&&weaponKey(weapon)==='bladedhorn'?'juggernautsbladedhorn':weaponKey(weapon);
 return equippedItems(worldEaterLoadout(squad.unit,squad.models),squad.knightGear).filter(item=>weaponKey(item)===key).length;
}
export function worldEaterHasRangedWeapon(squad:RosterInstance):boolean{
 const kit=kits.get(squad.unit);
 if(!kit)return false;
 const ranged=new Set(kit.ranged.map(weaponKey));
 return equippedItems(worldEaterLoadout(squad.unit,squad.models),squad.knightGear).some(item=>ranged.has(weaponKey(item)));
}
