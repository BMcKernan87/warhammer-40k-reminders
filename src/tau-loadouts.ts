import {factionModelEquipment} from './faction-model-equipment';
import {TAU_KITS} from './tau-loadouts.generated';
import {TAU_SHEETS} from './tau-data.generated';
import {TAU_CARDS} from './tau-card-profiles.generated';
import type {RosterInstance} from './roster-instances';
import {resolveModelEquipment,type Gear} from './model-equipment-slots';
const equipment=factionModelEquipment(TAU_KITS,TAU_SHEETS);
const sheets=new Map(TAU_SHEETS.map(s=>[s.unit,s]));
const modelKits=new Map(TAU_KITS.map(k=>[k.unit,{...k,tiers:sheets.get(k.unit)!.compositionBySize!}]));
export const {
 loadout:tauLoadout,bearers:tauModelLoadouts,count:tauWeaponCount,
}=equipment;
const uniqueCommanderItems=['Airbursting fragmentation projector','Battlesuit support system','Cyclic ion blaster','Shield generator','Weapon support system'];
export function validTauGear(unit:string,gear:Gear,models?:number):boolean{
 const loadout=tauLoadout(unit,models);
 if(!loadout||Object.entries(gear).some(([field,value])=>!loadout.slots.some(s=>s.name===field&&s.choices.some(c=>c.name===value)))||!equipment.valid(unit,gear,models))return false;
 // A Commander can fill up to four hardpoints, but the starred systems and
 // weapons are each unique across both its primary and additional slots.
 return !unit.startsWith('Commander In ')||uniqueCommanderItems.every(item=>tauWeaponCount({unit,id:unit,models,knightGear:gear},item)<=1);
}
export function resizeTauGear(squad:RosterInstance,models:number):Record<string,string>|undefined{
 if(!squad.knightGear)return;
 const kit=modelKits.get(squad.unit);
 if(!kit)return;
 const previous=resolveModelEquipment(kit,squad.models??sheets.get(squad.unit)!.sizes[0]);
 const next=resolveModelEquipment(kit,models);
 if(!previous||!next)return;
 const result:Record<string,string>={};
 const seen=new Map<string,number>();
 for(const bearer of next.models){
  const ordinal=seen.get(bearer.role)??0;seen.set(bearer.role,ordinal+1);
  const original=previous.models.filter(m=>m.role===bearer.role)[ordinal];
  if(!original)continue;
  // The single Broadside has unprefixed fields. Match its actual Shas’vre
  // role when growing or shrinking the unit, not the changing display label.
  for(const [index,slot] of bearer.slots.entries()){
   const oldSlot=original.slots[index];if(!oldSlot)continue;
   const value=squad.knightGear[oldSlot.name];
   if(value!==undefined&&validTauGear(squad.unit,{...result,[slot.name]:value},models))result[slot.name]=value;
  }
 }
 return result;
}
export function tauHasRangedWeapon(squad:RosterInstance):boolean{
 return TAU_CARDS[squad.unit]?.weapons.some(w=>w.phase==='Shooting'&&tauWeaponCount(squad,w.name)>0)??false;
}
