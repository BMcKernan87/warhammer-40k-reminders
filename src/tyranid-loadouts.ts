import {factionModelEquipment} from './faction-model-equipment';
import {TYRANID_KITS} from './tyranid-loadouts.generated';
import {TYRANID_SHEETS} from './tyranid-data.generated';
import {TYRANID_CARDS} from './tyranid-card-profiles.generated';
import {equippedItems,knightItemsLabel,slot,type KnightEquipment} from './knight-gear-options';
import {resolveModelEquipment,type Gear} from './model-equipment-slots';
import type {RosterInstance} from './roster-instances';

const equipment=factionModelEquipment(TYRANID_KITS,TYRANID_SHEETS);
const sheets=new Map(TYRANID_SHEETS.map(s=>[s.unit,s]));
const modelKits=new Map(TYRANID_KITS.map(k=>[k.unit,{...k,tiers:sheets.get(k.unit)!.compositionBySize!}]));
const primary=['Fleshborer','Termagant devourer','Termagant spinefists'];
const specialist=['Shardlauncher','Spike rifle','Strangleweb'];
const copies=(name:string,n:number)=>Array<string>(n).fill(name);
const key=(name:string)=>name.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');

/** Whole-brood choices keep uniform standard guns legal while preserving the
 * distinct specialist weapons. Every listed weapon still belongs to one
 * physical model when the native profile/transport helpers resolve it. */
export function tyranidLoadout(unit:string,models?:number):KnightEquipment|undefined{
 const sheet=sheets.get(unit),size=models??sheet?.sizes[0];
 if(size===undefined||!sheet?.compositionBySize?.[size])return;
 if(unit==='Termagants'){
  const choices:string[][]=[],labels:string[]=[],cap=Math.floor(size/10);
  for(const base of primary)for(let a=0;a<=cap;a++)for(let b=0;b<=cap;b++)for(let c=0;c<=cap;c++){
   const specials=[...copies(specialist[0],a),...copies(specialist[1],b),...copies(specialist[2],c)];
   choices.push([...copies(base,size-specials.length),...specials]);
   labels.push(base+(specials.length?' + '+knightItemsLabel(specials):''));
  }
  const field=slot('Brood weapons',...choices);field.choices.forEach((c,i)=>c.name=labels[i]);
  return {fixed:copies('Chitinous claws and teeth',size),slots:[field]};
 }
 if(unit==='Ripper Swarms'){
  const field=slot('Brood ranged weapons',[],copies('Spinemaws',size));field.choices[1].name='Spinemaws';
  return {fixed:copies('Chitinous claws and teeth',size),slots:[field]};
 }
 return equipment.loadout(unit,size);
}
export function validTyranidGear(unit:string,gear:Gear,models?:number):boolean{
 const loadout=tyranidLoadout(unit,models);
 return !!loadout&&Object.entries(gear).every(([field,value])=>loadout.slots.some(s=>s.name===field&&s.choices.some(c=>c.name===value)))&&
  (['Termagants','Ripper Swarms'].includes(unit)||equipment.valid(unit,gear,models));
}
export function tyranidModelLoadouts(squad:RosterInstance):{model:string;items:string[]}[]{
 if(squad.unit==='Termagants'||squad.unit==='Ripper Swarms'){
  const loadout=tyranidLoadout(squad.unit,squad.models);if(!loadout)return [];
  const size=squad.models??sheets.get(squad.unit)!.sizes[0],guns=equippedItems({...loadout,fixed:[]},squad.knightGear);
  return Array.from({length:size},(_,i)=>({model:squad.unit==='Termagants'?'Termagant':'Ripper Swarm',items:['Chitinous claws and teeth',...(guns[i]?[guns[i]]:[])]}));
 }
 return equipment.bearers(squad);
}
export function tyranidWeaponCount(squad:RosterInstance,name:string):number{
 return tyranidModelLoadouts(squad).flatMap(m=>m.items).filter(item=>key(item)===key(name)).length;
}
export function tyranidHasRangedWeapon(squad:RosterInstance):boolean{
 return TYRANID_CARDS[squad.unit]?.weapons.some(w=>w.phase==='Shooting'&&tyranidWeaponCount(squad,w.name)>0)??false;
}
export function resizeTyranidGear(squad:RosterInstance,models:number):Record<string,string>|undefined{
 if(!squad.knightGear)return;
 const next=tyranidLoadout(squad.unit,models);if(!next)return;
 if(squad.unit==='Termagants'){
  const previous=tyranidModelLoadouts(squad).flatMap(m=>m.items),base=primary.find(p=>previous.includes(p))??primary[0];
  const desired=specialist.map(item=>Math.min(previous.filter(w=>w===item).length,Math.floor(models/10)));
  const choice=next.slots[0].choices.find(c=>c.items.includes(base)&&specialist.every((item,i)=>c.items.filter(w=>w===item).length===desired[i]));
  return choice?{[next.slots[0].name]:choice.name}:{};
 }
 if(squad.unit==='Ripper Swarms')return {'Brood ranged weapons':squad.knightGear['Brood ranged weapons']==='Spinemaws'?'Spinemaws':'None'};
 const kit=modelKits.get(squad.unit);if(!kit)return;
 const previous=resolveModelEquipment(kit,squad.models??sheets.get(squad.unit)!.sizes[0]);
 const resolved=resolveModelEquipment(kit,models);if(!previous||!resolved)return;
 const result:Record<string,string>={},seen=new Map<string,number>();
 for(const bearer of resolved.models){
  const ordinal=seen.get(bearer.role)??0;seen.set(bearer.role,ordinal+1);
  const original=previous.models.filter(m=>m.role===bearer.role)[ordinal];if(!original)continue;
  for(const [index,field] of bearer.slots.entries()){
   const value=squad.knightGear[original.slots[index]?.name];
   if(value!==undefined&&validTyranidGear(squad.unit,{...result,[field.name]:value},models))result[field.name]=value;
  }
 }
 return result;
}
