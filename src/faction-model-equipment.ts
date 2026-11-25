import type {Datasheet2026} from './datasheets-2026';
import {equippedItems} from './knight-gear-options';
import {resizeModelEquipment,resolveModelEquipment,validModelEquipment,type Gear,type ModelEquipmentTable,type ResolvedKit} from './model-equipment-slots';
import type {RosterInstance} from './roster-instances';

const weaponKey=(s:string)=>s.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');

/** Resolve equipment against a faction's own card when names are shared across armies. */
export function factionModelEquipment(
 data:readonly Omit<ModelEquipmentTable,'tiers'>[],
 sheets:readonly Datasheet2026[],
 alias?:(unit:string,key:string)=>string,
){
 const rosters=new Map(sheets.map(s=>[s.unit,s]));
 const kits=new Map(data.map(k=>[k.unit,{...k,tiers:rosters.get(k.unit)!.compositionBySize!}]));
 const cache=new Map<string,ResolvedKit>();
 function resolve(unit:string,models?:number){
  const kit=kits.get(unit);
  if(!kit)return;
  const size=models??rosters.get(unit)!.sizes[0],key=unit+'#'+size;
  if(!cache.has(key)){
   const result=resolveModelEquipment(kit,size);
   if(result)cache.set(key,result);
  }
  return cache.get(key);
 }
 const loadout=(unit:string,models?:number)=>resolve(unit,models)?.equipment;
 const fitted=(s:RosterInstance)=>equippedItems(loadout(s.unit,s.models),s.knightGear);
 return {
  loadout,
  valid:(unit:string,gear:Gear,models?:number)=>validModelEquipment(resolve(unit,models),gear),
  resize:(s:RosterInstance,models:number)=>s.knightGear?resizeModelEquipment(resolve(s.unit,models),s.knightGear):undefined,
  bearers:(s:RosterInstance)=>resolve(s.unit,s.models)?.models.map(b=>({model:b.role,items:equippedItems(b,s.knightGear)}))??[],
  count:(s:RosterInstance,name:string)=>{
   const key=weaponKey(name),match=alias?alias(s.unit,key):key;
   return fitted(s).filter(i=>weaponKey(i)===match).length;
  },
  ranged:(s:RosterInstance)=>{
   const kit=kits.get(s.unit);
   if(!kit)return false;
   const guns=new Set(kit.ranged.map(weaponKey));
   return fitted(s).some(item=>guns.has(weaponKey(item)));
  },
 };
}
