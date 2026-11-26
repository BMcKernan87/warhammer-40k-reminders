import {SM_NATIVE_SHEETS} from './space-marines-native.generated';
import {SM_KITS,SM_UNIT_EQUIPMENT} from './space-marines-loadouts.generated';
import {CHAPTER_NATIVE_SHEETS,CHAPTER_COMPOSITIONS,CHAPTER_COMPOSITION_PRICES} from './space-marine-chapters-native.generated';
import {CHAPTER_KITS,CHAPTER_UNIT_EQUIPMENT,CHAPTER_SPLIT_RULES} from './space-marine-chapters-loadouts.generated';
import {spaceMarineCard as lookupSpaceMarineCard} from './space-marines-card-data';
import {isSpaceMarineFaction} from './space-marines-factions';
import {equippedItems,slot,type KnightEquipment,type KnightSlot} from './knight-gear-options';
import {resolveModelEquipment,validModelEquipment,type Gear,type ResolvedKit} from './model-equipment-slots';
import type {RosterInstance} from './roster-instances';
export {SM_CARDS,type SpaceMarineCardStats} from './space-marines-card-profiles.generated';

const identity=(faction:string,unit:string)=>faction+'\0'+unit;
const sheets=new Map([...SM_NATIVE_SHEETS,...CHAPTER_NATIVE_SHEETS].map(s=>[identity(s.faction,s.unit),s]));
const kits=new Map([...SM_KITS.map(k=>({...k,faction:'Space Marines'})),...CHAPTER_KITS].map(k=>[identity(k.faction,k.unit),{...k,tiers:sheets.get(identity(k.faction,k.unit))!.compositionBySize!}]));
const sheetFor=(unit:string,faction:string)=>isSpaceMarineFaction(faction)?sheets.get(identity(faction,unit))??sheets.get(identity('Space Marines',unit)):undefined;
const kitFor=(unit:string,faction:string)=>isSpaceMarineFaction(faction)?kits.get(identity(faction,unit))??kits.get(identity('Space Marines',unit)):undefined;
const key=(name:string)=>name.split(/\s+[-–—]\s+/)[0].normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const victrix='Victrix Honour Guard',specialists=['Chapter Ancient','Chapter Champion'];
interface Uniform{field:KnightSlot;indices:Set<number>;overrides:Map<number,KnightSlot>}
interface MarineKit extends ResolvedKit{uniform?:Uniform;specialists?:Map<number,KnightSlot>;unitSlots?:KnightSlot[];composition?:KnightSlot;splitFields?:KnightSlot[];splitModels?:Map<number,KnightSlot>}
const unitEquipment:Readonly<Record<string,readonly {label:string;choices:readonly (readonly string[])[]}[]>>=SM_UNIT_EQUIPMENT;
const cache=new Map<string,MarineKit>();
const uniformSpecs:Record<string,{stock:string;role?:string;substitute?:string;label?:string}>={
 'Aggressor Squad':{stock:'Flamestorm Gauntlets'},
 'Inceptor Squad':{stock:'Assault Bolters'},
 'Eliminator Squad':{stock:'Bolt Sniper Rifle',role:'Eliminator'},
 'Desolation Squad':{stock:'Superfrag Rocket Launcher',substitute:'Vengor Launcher'},
 'Vanguard Veteran Squad With Jump Packs':{stock:'Heavy Bolt Pistol',substitute:'Plasma pistol'},
 'Deathwing Knights':{stock:'Mace of Absolution',role:'Deathwing Knights',label:'Deathwing Knight weapons'},
};
const compositionName=(models:Readonly<Record<string,number>>)=>Object.entries(models).filter(([,n])=>n).map(([role,n])=>n+' × '+role).join(' + ');
function resolve(unit:string,models?:number,faction='Space Marines',gear?:Gear):MarineKit|undefined{
 const kit=kitFor(unit,faction),size=models??sheetFor(unit,faction)?.sizes[0];
 if(!kit||size===undefined)return;
 const alternatives=CHAPTER_COMPOSITIONS[faction]?.[unit]?.[size],base=kit.tiers[size];
 const ordered=alternatives?[...alternatives].sort((a,b)=>Number(compositionName(b)===compositionName(base))-Number(compositionName(a)===compositionName(base))):undefined;
 const composition=ordered&&ordered.length>1?{name:'Unit composition',choices:ordered.map(models=>({name:compositionName(models),items:[]}))}:undefined;
 const selected=ordered?.find(c=>compositionName(c)===gear?.['Unit composition'])??base;
 const splitRule=CHAPTER_SPLIT_RULES[faction]?.[unit],canSplit=!!splitRule&&(splitRule.kind==='equal'||!!selected?.['Hunting Wolf']);
 const split=canSplit&&gear?.['Battle formation']==='Split unit';
 const id=identity(faction,unit)+'#'+size+'#'+(selected?compositionName(selected):'')+'#'+split;
 if(!cache.has(id)){
  const result:MarineKit|undefined=resolveModelEquipment(selected?{...kit,tiers:{...kit.tiers,[size]:selected}}:kit,size);if(!result)return;
  result.composition=composition;
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
   const field=slot(spec.label??(spec.role?'Eliminator weapons':'Unit weapons'),...options!.map(c=>Array.from({length:indices.size},()=>[...c]).flat()));
   field.choices.forEach((c,i)=>c.name=options![i].join(' + '));
   result.uniform={field,indices,overrides};
  }
  result.unitSlots=(CHAPTER_UNIT_EQUIPMENT[faction]?.[unit]??unitEquipment[unit])?.map(s=>slot(s.label,...s.choices));
  if(canSplit){
   const selection=(name:string,values:string[]):KnightSlot=>({name,choices:values.map(name=>({name,items:[]}))});
   result.splitFields=[selection('Battle formation',['Keep together','Split unit'])];
   if(split&&splitRule?.kind==='equal'){
    result.splitFields.push(selection('Leader group',['Automatic','Group 1','Group 2']),selection('Support group',['Automatic','Group 1','Group 2']));
    result.splitModels=new Map();const ordinals=new Map<string,number>();
    result.models.forEach((m,index)=>{
     const n=(ordinals.get(m.role)??0)+1;ordinals.set(m.role,n);
     const label=m.role+(result.models.filter(x=>x.role===m.role).length>1?' '+n:'');
     const choices=index<Math.ceil(result.models.length/2)?['Group 1','Group 2']:['Group 2','Group 1'];
     const field=selection(label+' · Split group',choices);result.splitModels!.set(index,field);result.splitFields!.push(field);
    });
   }
  }
  result.equipment={fixed:result.models.flatMap(m=>m.fixed),slots:[...(result.composition?[result.composition]:[]),...(result.uniform?[result.uniform.field]:[]),...result.models.flatMap(m=>m.slots),...result.unitSlots??[],...result.splitFields??[]]};
  cache.set(id,result);
 }
 return cache.get(id);
}

export const spaceMarineLoadout=(unit:string,models?:number,faction='Space Marines',gear?:Gear):KnightEquipment|undefined=>resolve(unit,models,faction,gear)?.equipment;
export function spaceMarineModelLoadouts(squad:RosterInstance,faction='Space Marines'):{model:string;items:string[]}[]{
 const result=resolve(squad.unit,squad.models,faction,squad.knightGear);if(!result)return [];
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
export interface SpaceMarineModelIdentity {id:string;model:string;items:string[]}
/** Stable physical identities survive equipment edits, composition changes and
 * resizing. A role's existing models retain their ordinals; new models append. */
export function spaceMarineModelIdentities(squad:RosterInstance,faction='Space Marines'):SpaceMarineModelIdentity[]{
 const ordinals=new Map<string,number>();
 return spaceMarineModelLoadouts(squad,faction).map(m=>{
  const n=(ordinals.get(m.model)??0)+1;ordinals.set(m.model,n);
  return {...m,id:squad.id+'::'+m.model+'#'+n};
 });
}
export type SpaceMarineSplitGroupChoice='Automatic'|'Group 1'|'Group 2';
export interface SpaceMarineSplitSelection {
 rule:string;source:string;kind:'equal'|'roles';attachments:'choose'|'headtakers';
 groups:[{key:'1';modelIds:string[]},{key:'2';modelIds:string[]}];
 leaderGroup:SpaceMarineSplitGroupChoice;supportGroup:SpaceMarineSplitGroupChoice;
}
/** The formation layer adds attached units and checks equal total strengths.
 * These assignments contain only this purchased unit's actual physical models. */
export function spaceMarineSplitSelection(squad:RosterInstance,faction='Space Marines'):SpaceMarineSplitSelection|undefined{
 const rule=CHAPTER_SPLIT_RULES[faction]?.[squad.unit],kit=resolve(squad.unit,squad.models,faction,squad.knightGear);
 if(!rule||!kit?.splitFields||squad.knightGear?.['Battle formation']!=='Split unit')return;
 const physical=spaceMarineModelIdentities(squad,faction);
 const groups:SpaceMarineSplitSelection['groups']=[{key:'1',modelIds:[]},{key:'2',modelIds:[]}];
 physical.forEach((model,index)=>{
  const field=kit.splitModels?.get(index),choice=field&&(squad.knightGear?.[field.name]??field.choices[0].name);
  const group=rule.kind==='roles'?(model.model==='Hunting Wolf'?1:0):choice==='Group 2'?1:0;
  groups[group].modelIds.push(model.id);
 });
 const attached=(field:string):SpaceMarineSplitGroupChoice=>rule.kind==='roles'?'Group 1':squad.knightGear?.[field]==='Group 1'?'Group 1':squad.knightGear?.[field]==='Group 2'?'Group 2':'Automatic';
 return {...rule,attachments:rule.kind==='roles'?'headtakers':'choose',groups,leaderGroup:attached('Leader group'),supportGroup:attached('Support group')};
}
export function validSpaceMarineGear(unit:string,gear:Gear,models?:number,faction='Space Marines'):boolean{
 const result=resolve(unit,models,faction,gear),loadout=result?.equipment;
 if(!loadout||Object.entries(gear).some(([field,value])=>!loadout.slots.some(s=>s.name===field&&s.choices.some(c=>c.name===value)))||!validModelEquipment(result,gear))return false;
 const physical=spaceMarineModelLoadouts({id:unit,unit,models,knightGear:gear},faction);
 if(unit===victrix&&(specialists.some(role=>physical.filter(m=>m.model===role).length>1)||physical.filter(m=>m.model===victrix).length<1))return false;
 // The shield option exchanges every pistol; both plasma options require that
 // model's Heavy Bolt Pistol and contain no exception to the whole-unit swap.
 if(unit==='Vanguard Veteran Squad With Jump Packs'&&physical.some(m=>m.items.some(i=>key(i)==='combatshield'))&&physical.some(m=>m.items.some(i=>key(i)==='plasmapistol')))return false;
 return true;
}
export function resizeSpaceMarineGear(squad:RosterInstance,models:number,faction='Space Marines'):Record<string,string>|undefined{
 if(!squad.knightGear)return;
 const kept:Record<string,string>={};
 const alternatives=CHAPTER_COMPOSITIONS[faction]?.[squad.unit]?.[models];
 if(alternatives?.length){
  let selected=alternatives.find(c=>compositionName(c)===squad.knightGear?.['Unit composition']);
  if(!selected){
   const before=spaceMarineModelLoadouts(squad,faction),minor=Object.keys(alternatives[0]).at(-1)!,count=before.filter(m=>m.model===minor).length;
   // Retain the existing wolf/neophyte contingent when changing total strength.
   // Equal choices use the ordinary default, with more line Marines.
   selected=[...alternatives].sort((a,b)=>Math.abs(a[minor]-count)-Math.abs(b[minor]-count)||a[minor]-b[minor])[0];
  }
  if(alternatives.length>1)kept['Unit composition']=compositionName(selected);
 }
 const preliminary=spaceMarineLoadout(squad.unit,models,faction,kept);
 if(squad.knightGear['Battle formation']==='Split unit'&&preliminary?.slots.some(s=>s.name==='Battle formation'))kept['Battle formation']='Split unit';
 const after=spaceMarineLoadout(squad.unit,models,faction,kept);if(!after)return;
 for(const field of after.slots){if(field.name==='Unit composition')continue;const value=squad.knightGear[field.name];if(value!==undefined&&field.choices.some(c=>c.name===value)&&validSpaceMarineGear(squad.unit,{...kept,[field.name]:value},models,faction))kept[field.name]=value;}
 return kept;
}
export function spaceMarineWeaponCount(squad:RosterInstance,name:string,faction='Space Marines'):number{
 const kit=resolve(squad.unit,squad.models,faction,squad.knightGear),unitItems=equippedItems({fixed:[],slots:kit?.unitSlots??[]},squad.knightGear);
 return [...spaceMarineModelLoadouts(squad,faction).flatMap(m=>m.items),...unitItems].filter(item=>key(item)===key(name)).length;
}
export function spaceMarineCompositionPrice(squad:RosterInstance,copy:number,faction='Space Marines'):number|undefined{
 const prices=CHAPTER_COMPOSITION_PRICES[faction]?.[squad.unit];if(!prices||!Number.isInteger(copy)||copy<1)return;
 const physical=spaceMarineModelLoadouts(squad,faction);if(!physical.length)return;
 const models:Record<string,number>={};for(const model of physical)models[model.model]=(models[model.model]??0)+1;
 const eligible=prices.filter(p=>Object.entries(models).every(([role,n])=>(p.models[role]??0)>=n));
 const amounts=eligible.map(p=>p.pointsByCopy[Math.max(...Object.keys(p.pointsByCopy).map(Number).filter(n=>n<=copy))]);
 return amounts.length?Math.min(...amounts):undefined;
}
export const spaceMarineCard=(squad:RosterInstance|string,faction='Space Marines')=>isSpaceMarineFaction(faction)?lookupSpaceMarineCard(typeof squad==='string'?squad:squad.unit,faction):undefined;
export const fullSpaceMarineCardStats=spaceMarineCard;
export const spaceMarineHasRangedWeapon=(squad:RosterInstance,faction='Space Marines')=>spaceMarineCard(squad,faction)?.weapons.some(w=>w.phase==='Shooting'&&spaceMarineWeaponCount(squad,w.name,faction)>0)??false;
