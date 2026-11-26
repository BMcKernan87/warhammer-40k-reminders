import {AELDARI_NATIVE_SHEETS as AELDARI_SHEETS} from './aeldari-native.generated';
import {AELDARI_KITS} from './aeldari-loadouts.generated';
import {AELDARI_CARDS} from './aeldari-card-profiles.generated';
import {equippedItems,slot,type KnightEquipment} from './knight-gear-options';
import {resolveModelEquipment,validModelEquipment,type Gear,type ResolvedKit} from './model-equipment-slots';
import type {RosterInstance} from './roster-instances';
export {AELDARI_CARDS,type AeldariCardStats} from './aeldari-card-profiles.generated';

const sheets=new Map(AELDARI_SHEETS.map(s=>[s.unit,s]));
const kits=new Map(AELDARI_KITS.map(k=>[k.unit,{...k,tiers:sheets.get(k.unit)!.compositionBySize!}]));
const cache=new Map<string,ResolvedKit>();
const corsairs='Corsair Voidscarred',specialists=['Shade Runner','Soul Weaver','Way Seeker'];
const aspectUnits=new Set(['Dark Reapers','Dire Avengers','Fire Dragons','Howling Banshees','Striking Scorpions','Swooping Hawks','Warp Spiders']);
const uniformUnits=new Set(['Wraithguard','Wraithblades']);
const tokenName=(unit:string)=>unit==='Dragon Knights'?'Drakolithe':aspectUnits.has(unit)?'Aspect Shrine token':undefined;
const tokenField=(unit:string)=>unit==='Dragon Knights'?'Drakolithe':'Aspect Shrine tokens';
export const aeldariTokenLimit=(unit:string,size:number)=>unit==='Dragon Knights'?Math.floor(size/3)*2:aspectUnits.has(unit)?Math.floor(size/5):0;
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
  if(uniformUnits.has(unit)){
   const choices=kit.roles[0].slots[0].choices;
   const field=slot('Unit weapons',...choices.map(c=>Array.from({length:size},()=>[...c]).flat()));
   field.choices.forEach((c,i)=>c.name=choices[i].join(' + '));
   result.equipment={fixed:result.equipment.fixed,slots:[field]};
  }
  const token=tokenName(unit);
  if(token)result.equipment={...result.equipment,slots:[...result.equipment.slots,slot(tokenField(unit),...Array.from({length:aeldariTokenLimit(unit,size)+1},(_,n)=>Array<string>(n).fill(token)))]};
  cache.set(id,result);
 }
 return cache.get(id);
}

export const aeldariLoadout=(unit:string,models?:number):KnightEquipment|undefined=>resolve(unit,models)?.equipment;
export function aeldariModelLoadouts(squad:RosterInstance):{model:string;items:string[]}[]{
 if(uniformUnits.has(squad.unit)){
  const resolved=resolve(squad.unit,squad.models),kit=kits.get(squad.unit);if(!resolved||!kit)return [];
  const choice=resolved.equipment.slots[0].choices.find(c=>c.name===squad.knightGear?.['Unit weapons'])??resolved.equipment.slots[0].choices[0];
  const selected=kit.roles[0].slots[0].choices.find(c=>c.join(' + ')===choice.name)!;
  return resolved.models.map(m=>({model:m.role,items:[...m.fixed,...selected]}));
 }
 return resolve(squad.unit,squad.models)?.models.map(b=>{
  const chosen=squad.knightGear?.[b.slots[0]?.name];
  const model=squad.unit===corsairs&&b.role===corsairs&&specialists.includes(chosen??'')?chosen!:b.role;
  return {model,items:equippedItems(b,squad.knightGear)};
 })??[];
}
export function validAeldariGear(unit:string,gear:Gear,models?:number):boolean{
 const loadout=aeldariLoadout(unit,models),resolved=resolve(unit,models);
 if(!loadout||Object.entries(gear).some(([field,value])=>!loadout.slots.some(s=>s.name===field&&s.choices.some(c=>c.name===value)))||!validModelEquipment(resolved,gear))return false;
 if(unit===corsairs){
  const bearers=aeldariModelLoadouts({id:unit,unit,models,knightGear:gear});
  return specialists.every(role=>bearers.filter(b=>b.model===role).length<=1)&&bearers.filter(b=>b.model===corsairs).length>=4;
 }
 return true;
}
export function resizeAeldariGear(squad:RosterInstance,models:number):Record<string,string>|undefined{
 if(!squad.knightGear)return;
 const before=resolve(squad.unit,squad.models),after=resolve(squad.unit,models);if(!before||!after)return;
 const kept:Record<string,string>={},seen=new Map<string,number>();
 for(const bearer of after.models){
  const n=seen.get(bearer.role)??0;seen.set(bearer.role,n+1);
  const previous=before.models.filter(m=>m.role===bearer.role)[n];if(!previous)continue;
  for(const [index,field] of bearer.slots.entries()){
   const value=squad.knightGear[previous.slots[index]?.name];
   if(value!==undefined&&validAeldariGear(squad.unit,{...kept,[field.name]:value},models))kept[field.name]=value;
  }
 }
 if(uniformUnits.has(squad.unit)){
  const choice=after.equipment.slots[0].choices.find(c=>c.name===squad.knightGear?.['Unit weapons']);
  return choice?{'Unit weapons':choice.name}:{};
 }
 const token=tokenName(squad.unit);
 if(token){
  const count=Math.min(aeldariTokenLimit(squad.unit,models),aeldariWeaponCount(squad,token));
  kept[tokenField(squad.unit)]=after.equipment.slots.find(s=>s.name===tokenField(squad.unit))!.choices[count].name;
 }
 return kept;
}
export function aeldariWeaponCount(squad:RosterInstance,name:string):number{
 return equippedItems(aeldariLoadout(squad.unit,squad.models),squad.knightGear).filter(item=>key(item)===key(name)).length;
}
export const aeldariCard=(squad:RosterInstance|string)=>AELDARI_CARDS[typeof squad==='string'?squad:squad.unit];
export const fullAeldariCardStats=aeldariCard;
export function aeldariHasRangedWeapon(squad:RosterInstance):boolean{
 return aeldariCard(squad)?.weapons.some(w=>w.phase==='Shooting'&&aeldariWeaponCount(squad,w.name)>0)??false;
}
