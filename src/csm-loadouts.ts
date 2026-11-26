import {CSM_KITS,CSM_HAVOC_GUNS} from './csm-loadouts.generated';
import {CSM_SHEETS,CSM_ACCURSED_COMPOSITIONS} from './csm-data.generated';
import {CSM_CARDS} from './csm-card-profiles.generated';
import {equippedItems,type KnightEquipment} from './knight-gear-options';
import {resolveModelEquipment,validModelEquipment,type Gear,type ResolvedKit} from './model-equipment-slots';
import type {RosterInstance} from './roster-instances';

const sheets=new Map(CSM_SHEETS.map(s=>[s.unit,s]));
const kits=new Map(CSM_KITS.map(k=>[k.unit,{...k,tiers:sheets.get(k.unit)!.compositionBySize!}]));
const cache=new Map<string,ResolvedKit>();
const copies=(name:string,n:number)=>Array<string>(n).fill(name);
const key=(name:string)=>name.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
const compositionName=(c:{Torment:number;Mutant:number})=>`${c.Torment} Torments + ${c.Mutant} Mutants`;

function resolve(unit:string,models?:number):ResolvedKit|undefined{
 const kit=kits.get(unit),size=models??sheets.get(unit)?.sizes[0];
 if(!kit||size===undefined)return;
 const id=unit+'#'+size;
 if(!cache.has(id)){
  const result=resolveModelEquipment(kit,size);if(!result)return;
  if(unit==='Havocs'){
   // Preserve the printed two-autocannon/two-lascannon starting loadout
   // while all four physical Havocs retain the same replacement choices.
   result.models.filter(m=>m.role==='Havoc').forEach((model,i)=>{
    const slot=model.slots[0],stock=slot.choices.find(c=>c.items.includes(CSM_HAVOC_GUNS[i]));
    if(stock)slot.choices=[stock,...slot.choices.filter(c=>c!==stock)];
   });
  }
  cache.set(id,result);
 }
 return cache.get(id);
}

export function csmLoadout(unit:string,models?:number):KnightEquipment|undefined{
 if(unit==='Accursed Cultists'){
  const choices=CSM_ACCURSED_COMPOSITIONS[models??8];if(!choices)return;
  return {fixed:[],slots:[{name:'Composition',choices:choices.map(c=>({name:compositionName(c),items:[...copies('Hideous mutations',c.Torment),...copies('Blasphemous appendages',c.Mutant)]}))}]};
 }
 return resolve(unit,models)?.equipment;
}
export function validCsmGear(unit:string,gear:Gear,models?:number):boolean{
 const loadout=csmLoadout(unit,models);
 return !!loadout&&Object.entries(gear).every(([field,value])=>loadout.slots.some(s=>s.name===field&&s.choices.some(c=>c.name===value)))&&
  (unit==='Accursed Cultists'||validModelEquipment(resolve(unit,models),gear));
}
export function csmModelLoadouts(squad:RosterInstance):{model:string;items:string[]}[]{
 if(squad.unit==='Accursed Cultists'){
  const options=CSM_ACCURSED_COMPOSITIONS[squad.models??8];if(!options)return [];
  const selected=squad.knightGear?.Composition;
  const mix=selected?options.find(c=>compositionName(c)===selected):options[0];if(!mix)return [];
  return [...Array.from({length:mix.Torment},()=>({model:'Torment',items:['Hideous mutations']})),...Array.from({length:mix.Mutant},()=>({model:'Mutant',items:['Blasphemous appendages']}))];
 }
 return resolve(squad.unit,squad.models)?.models.map(b=>({model:b.role,items:equippedItems(b,squad.knightGear)}))??[];
}
export function csmWeaponCount(squad:RosterInstance,name:string):number{
 return csmModelLoadouts(squad).flatMap(m=>m.items).filter(item=>key(item)===key(name)).length;
}
export function csmHasRangedWeapon(squad:RosterInstance):boolean{
 return CSM_CARDS[squad.unit]?.weapons.some(w=>w.phase==='Shooting'&&csmWeaponCount(squad,w.name)>0)??false;
}
export function resizeCsmGear(squad:RosterInstance,models:number):Record<string,string>|undefined{
 if(!squad.knightGear)return;
 if(squad.unit==='Accursed Cultists'){
  const options=CSM_ACCURSED_COMPOSITIONS[models];if(!options)return;
  const torments=csmModelLoadouts(squad).filter(m=>m.model==='Torment').length;
  const desired=Math.max(options[0].Torment,Math.min(options.at(-1)!.Torment,torments));
  return {Composition:compositionName(options.find(c=>c.Torment===desired)!)};
 }
 const previous=resolve(squad.unit,squad.models),next=resolve(squad.unit,models);if(!previous||!next)return;
 const result:Record<string,string>={},seen=new Map<string,number>();
 for(const bearer of next.models){
  const ordinal=seen.get(bearer.role)??0;seen.set(bearer.role,ordinal+1);
  const original=previous.models.filter(m=>m.role===bearer.role)[ordinal];if(!original)continue;
  for(const [index,field] of bearer.slots.entries()){
   const value=squad.knightGear[original.slots[index]?.name];
   if(value!==undefined&&validCsmGear(squad.unit,{...result,[field.name]:value},models))result[field.name]=value;
  }
 }
 return result;
}
