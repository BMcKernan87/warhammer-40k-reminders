import {DRUKHARI_SHEETS} from './drukhari-data';
import {DRUKHARI_KITS} from './drukhari-loadouts.generated';
import {DRUKHARI_CARDS} from './drukhari-card-profiles.generated';
import {equippedItems,slot,type KnightEquipment} from './knight-gear-options';
import {resolveModelEquipment,validModelEquipment,type Gear,type ResolvedKit} from './model-equipment-slots';
import type {RosterInstance} from './roster-instances';
export {DRUKHARI_CARDS,type DrukhariCardStats} from './drukhari-card-profiles.generated';

const sheets=new Map(DRUKHARI_SHEETS.map(s=>[s.unit,s]));
const kits=new Map(DRUKHARI_KITS.map(k=>[k.unit,{...k,tiers:sheets.get(k.unit)!.compositionBySize!}]));
const cache=new Map<string,ResolvedKit>();
const corsairs='Corsair Voidscarred',specialists=['Shade Runner','Soul Weaver','Way Seeker'];
const token='Incubi Shrine token',tokenField='Incubi Shrine tokens';
const key=(name:string)=>name.split(/\s+[-–—]\s+/)[0].normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');

function resolve(unit:string,models?:number):ResolvedKit|undefined{
 const kit=kits.get(unit),size=models??sheets.get(unit)?.sizes[0];
 if(!kit||size===undefined)return;
 const id=unit+'#'+size;
 if(!cache.has(id)){
  const result=resolveModelEquipment(kit,size);if(!result)return;
  if(unit===corsairs){
   // One Felarch and at least four ordinary Corsairs are compulsory. Every
   // additional physical model can instead be one of the three specialists.
   // The direct equipment choice records both that model's role and gear.
   const options=specialists.map(name=>({name,items:kit.roles.find(r=>r.role===name)!.fixed}));
   result.models.filter(m=>m.role===corsairs).forEach((model,i)=>{
    if(i>=4)model.slots[0].choices.push(...options);
   });
  }
  if(unit==='Incubi')result.equipment={...result.equipment,slots:[...result.equipment.slots,slot(tokenField,...Array.from({length:Math.floor(size/5)+1},(_,n)=>Array<string>(n).fill(token)))]};
  cache.set(id,result);
 }
 return cache.get(id);
}

export const drukhariLoadout=(unit:string,models?:number):KnightEquipment|undefined=>resolve(unit,models)?.equipment;
export function drukhariModelLoadouts(squad:RosterInstance):{model:string;items:string[]}[]{
 return resolve(squad.unit,squad.models)?.models.map(b=>{
  const chosen=squad.knightGear?.[b.slots[0]?.name];
  const model=squad.unit===corsairs&&b.role===corsairs&&specialists.includes(chosen??'')?chosen!:b.role;
  return {model,items:equippedItems(b,squad.knightGear)};
 })??[];
}
export function validDrukhariGear(unit:string,gear:Gear,models?:number):boolean{
 const loadout=drukhariLoadout(unit,models),resolved=resolve(unit,models);
 if(!loadout||Object.entries(gear).some(([field,value])=>!loadout.slots.some(s=>s.name===field&&s.choices.some(c=>c.name===value)))||!validModelEquipment(resolved,gear))return false;
 if(unit===corsairs){
  const bearers=drukhariModelLoadouts({id:unit,unit,models,knightGear:gear});
  return specialists.every(role=>bearers.filter(b=>b.model===role).length<=1)&&bearers.filter(b=>b.model===corsairs).length>=4;
 }
 return true;
}
export function resizeDrukhariGear(squad:RosterInstance,models:number):Record<string,string>|undefined{
 if(!squad.knightGear)return;
 const before=resolve(squad.unit,squad.models),after=resolve(squad.unit,models);if(!before||!after)return;
 const kept:Record<string,string>={},seen=new Map<string,number>();
 for(const bearer of after.models){
  const n=seen.get(bearer.role)??0;seen.set(bearer.role,n+1);
  const previous=before.models.filter(m=>m.role===bearer.role)[n];if(!previous)continue;
  for(const [index,field] of bearer.slots.entries()){
   const value=squad.knightGear[previous.slots[index]?.name];
   if(value!==undefined&&validDrukhariGear(squad.unit,{...kept,[field.name]:value},models))kept[field.name]=value;
  }
 }
 if(squad.unit==='Incubi'){
  const count=Math.min(Math.floor(models/5),drukhariWeaponCount(squad,token));
  kept[tokenField]=after.equipment.slots.find(s=>s.name===tokenField)!.choices[count].name;
 }
 return kept;
}
export function drukhariWeaponCount(squad:RosterInstance,name:string):number{
 return equippedItems(drukhariLoadout(squad.unit,squad.models),squad.knightGear).filter(item=>key(item)===key(name)).length;
}
export const drukhariCard=(squad:RosterInstance|string)=>DRUKHARI_CARDS[typeof squad==='string'?squad:squad.unit];
export const fullDrukhariCardStats=drukhariCard;
export function drukhariHasRangedWeapon(squad:RosterInstance):boolean{
 return drukhariCard(squad)?.weapons.some(w=>w.phase==='Shooting'&&drukhariWeaponCount(squad,w.name)>0)??false;
}
