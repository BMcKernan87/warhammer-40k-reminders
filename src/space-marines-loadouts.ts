import {SM_NATIVE_SHEETS} from './space-marines-native.generated';
import {SM_KITS,SM_UNIT_EQUIPMENT} from './space-marines-loadouts.generated';
import {SM_CARDS} from './space-marines-card-profiles.generated';
import {equippedItems,slot,type KnightEquipment,type KnightSlot} from './knight-gear-options';
import {resolveModelEquipment,validModelEquipment,type Gear,type ResolvedKit} from './model-equipment-slots';
import type {RosterInstance} from './roster-instances';
export {SM_CARDS,type SpaceMarineCardStats} from './space-marines-card-profiles.generated';

const sheets=new Map(SM_NATIVE_SHEETS.map(s=>[s.unit,s]));
const kits=new Map(SM_KITS.map(k=>[k.unit,{...k,tiers:sheets.get(k.unit)!.compositionBySize!}]));
const key=(name:string)=>name.split(/\s+[-–—]\s+/)[0].normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const victrix='Victrix Honour Guard',specialists=['Chapter Ancient','Chapter Champion'];
interface Uniform{field:KnightSlot;indices:Set<number>;overrides:Map<number,KnightSlot>}
interface MarineKit extends ResolvedKit{uniform?:Uniform;specialists?:Map<number,KnightSlot>;unitSlots?:KnightSlot[]}
const unitEquipment:Readonly<Record<string,readonly {label:string;choices:readonly (readonly string[])[]}[]>>=SM_UNIT_EQUIPMENT;
const cache=new Map<string,MarineKit>();
const uniformSpecs:Record<string,{stock:string;role?:string;substitute?:string}>={
 'Aggressor Squad':{stock:'Flamestorm Gauntlets'},
 'Inceptor Squad':{stock:'Assault Bolters'},
 'Eliminator Squad':{stock:'Bolt Sniper Rifle',role:'Eliminator'},
 'Desolation Squad':{stock:'Superfrag Rocket Launcher',substitute:'Vengor Launcher'},
 'Vanguard Veteran Squad With Jump Packs':{stock:'Heavy Bolt Pistol',substitute:'Plasma pistol'},
};
function resolve(unit:string,models?:number):MarineKit|undefined{
 const kit=kits.get(unit),size=models??sheets.get(unit)?.sizes[0];
 if(!kit||size===undefined)return;
 const id=unit+'#'+size;
 if(!cache.has(id)){
  const result:MarineKit|undefined=resolveModelEquipment(kit,size);if(!result)return;
  if(unit===victrix){
   result.specialists=new Map();
   result.models.slice(0,2).forEach((m,index)=>{
    const field=slot(victrix+' '+(index+1)+' · Model',m.fixed,...specialists.map(role=>kit.roles.find(r=>r.role===role)!.fixed));
    field.choices.forEach((c,i)=>c.name=i?specialists[i-1]:victrix);
    m.fixed=[];m.slots=[field];result.specialists!.set(index,field);
   });
  }
  const spec=uniformSpecs[unit];
  if(spec){
   const indices=new Set<number>(),overrides=new Map<number,KnightSlot>();let options:readonly (readonly string[])[]|undefined;
   result.models.forEach((m,index)=>{
    if(spec.role&&m.role!==spec.role)return;
    const source=m.slots.find(s=>s.choices.some(c=>c.items.some(i=>key(i)===key(spec.stock))));
    if(!source)throw Error('Missing whole-unit weapon field for '+unit);
    const ordinary=source.choices.filter(c=>!spec.substitute||!c.items.some(i=>key(i)===key(spec.substitute!)));
    options??=ordinary.map(c=>c.items);
    if(JSON.stringify(options)!==JSON.stringify(ordinary.map(c=>c.items)))throw Error('Unequal whole-unit choices for '+unit);
    m.slots=m.slots.filter(s=>s!==source);indices.add(index);
    if(spec.substitute){
     const substitute=source.choices.find(c=>c.items.some(i=>key(i)===key(spec.substitute!)));
     if(substitute){
      const prefix=source.name.includes(' · ')?source.name.slice(0,source.name.indexOf(' · '))+' · ':'';
      const field=slot(prefix+spec.substitute,[],substitute.items);
      m.slots.push(field);overrides.set(index,field);
     }
    }
   });
   const field=slot(spec.role?'Eliminator weapons':'Unit weapons',...options!.map(c=>Array.from({length:indices.size},()=>[...c]).flat()));
   field.choices.forEach((c,i)=>c.name=options![i].join(' + '));
   result.uniform={field,indices,overrides};
  }
  result.unitSlots=unitEquipment[unit]?.map(s=>slot(s.label,...s.choices));
  result.equipment={fixed:result.models.flatMap(m=>m.fixed),slots:[...(result.uniform?[result.uniform.field]:[]),...result.models.flatMap(m=>m.slots),...result.unitSlots??[]]};
  cache.set(id,result);
 }
 return cache.get(id);
}

export const spaceMarineLoadout=(unit:string,models?:number):KnightEquipment|undefined=>resolve(unit,models)?.equipment;
export function spaceMarineModelLoadouts(squad:RosterInstance):{model:string;items:string[]}[]{
 const result=resolve(squad.unit,squad.models);if(!result)return [];
 const uniform=result.uniform;
 const chosen=uniform?.field.choices.find(c=>c.name===(squad.knightGear?.[uniform.field.name]??uniform.field.choices[0].name));
 const perModel=chosen&&uniform?chosen.items.slice(0,chosen.items.length/uniform.indices.size):[];
 return result.models.map((m,index)=>{
  const field=result.specialists?.get(index),selected=field?.choices.find(c=>c.name===(squad.knightGear?.[field.name]??field.choices[0].name));
  const model=selected?.name??m.role;
  const override=uniform?.overrides.get(index),hasOverride=override?.choices.find(c=>c.name===squad.knightGear?.[override.name])?.items.length;
  const items=equippedItems(m,squad.knightGear);
  if(uniform?.indices.has(index)&&!hasOverride)items.push(...perModel);
  return {model,items};
 });
}
export function validSpaceMarineGear(unit:string,gear:Gear,models?:number):boolean{
 const result=resolve(unit,models),loadout=result?.equipment;
 if(!loadout||Object.entries(gear).some(([field,value])=>!loadout.slots.some(s=>s.name===field&&s.choices.some(c=>c.name===value)))||!validModelEquipment(result,gear))return false;
 const physical=spaceMarineModelLoadouts({id:unit,unit,models,knightGear:gear});
 if(unit===victrix&&(specialists.some(role=>physical.filter(m=>m.model===role).length>1)||physical.filter(m=>m.model===victrix).length<1))return false;
 // The shield option exchanges every pistol; both plasma options require that
 // model's Heavy Bolt Pistol and contain no exception to the whole-unit swap.
 if(unit==='Vanguard Veteran Squad With Jump Packs'&&physical.some(m=>m.items.some(i=>key(i)==='combatshield'))&&physical.some(m=>m.items.some(i=>key(i)==='plasmapistol')))return false;
 return true;
}
export function resizeSpaceMarineGear(squad:RosterInstance,models:number):Record<string,string>|undefined{
 if(!squad.knightGear)return;
 const after=spaceMarineLoadout(squad.unit,models);if(!after)return;
 const kept:Record<string,string>={};
 for(const field of after.slots){const value=squad.knightGear[field.name];if(value!==undefined&&field.choices.some(c=>c.name===value)&&validSpaceMarineGear(squad.unit,{...kept,[field.name]:value},models))kept[field.name]=value;}
 return kept;
}
export function spaceMarineWeaponCount(squad:RosterInstance,name:string):number{
 const kit=resolve(squad.unit,squad.models),unitItems=equippedItems({fixed:[],slots:kit?.unitSlots??[]},squad.knightGear);
 return [...spaceMarineModelLoadouts(squad).flatMap(m=>m.items),...unitItems].filter(item=>key(item)===key(name)).length;
}
export const spaceMarineCard=(squad:RosterInstance|string)=>SM_CARDS[typeof squad==='string'?squad:squad.unit];
export const fullSpaceMarineCardStats=spaceMarineCard;
export const spaceMarineHasRangedWeapon=(squad:RosterInstance)=>spaceMarineCard(squad)?.weapons.some(w=>w.phase==='Shooting'&&spaceMarineWeaponCount(squad,w.name)>0)??false;
