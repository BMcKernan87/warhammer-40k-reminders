import {ASTRA_MILITARUM_KITS} from './astra-militarum-loadouts.generated';
import {equippedItems,slot,type KnightEquipment,type KnightSlot} from './knight-gear-options';
import type {RosterInstance} from './roster-instances';

type ItemList=readonly string[];
type Gear=Readonly<Record<string,string>>;
interface GuardRole {
  role:string;
  fixed:ItemList;
  slots:readonly {label:string;choices:readonly ItemList[]}[];
}
interface GuardLimit {
  role?:string;
  thresholds:readonly {models:number;choices:number;per_choice?:number}[];
  choices:readonly ItemList[];
}
export interface GuardKit{
  unit:string;
  roles:readonly GuardRole[];
  tiers:Readonly<Record<number,Readonly<Record<string,number>>>>;
  limits:readonly GuardLimit[];
  ranged:ItemList;
  costs:Readonly<Record<string,number>>;
}
interface Bearer{role:string;fixed:ItemList;slots:KnightSlot[]}
interface ResolvedKit{equipment:KnightEquipment;models:Bearer[];limits:readonly GuardLimit[]}
const kits=new Map(ASTRA_MILITARUM_KITS.map(r=>[r.unit,r]));
const cache=new Map<string,ResolvedKit>();
const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');

function reconKit():ResolvedKit{
 // The second long-las competes with a two-model team. Keeping their weapons
 // in one choice prevents a lone loader or a third sniper on the sheet.
 const gun='Lasgun',ccw='Close combat weapon';
 const fixed=[...Array<string>(10).fill(ccw),gun,gun,gun,gun];
 const slots=[
  slot('Autostubber trooper',gun,'Autostubber'),
  slot('Special weapon trooper',gun,'Plasma gun','Meltagun'),
  slot('Marksman',gun,'Long-las'),
  slot('Signals trooper',gun,[gun,'Vox-caster','Vox-relay beacon']),
  slot('Two remaining specialists',[gun,gun],[gun,'Long-las'],['Laspistol','Laspistol','Missile launcher']),
 ];
 return {equipment:{fixed,slots},models:[],limits:[]};
}
function resolve(unit:string,models?:number):ResolvedKit|undefined {
 const kit=kits.get(unit);
 if(!kit)return;
 const size=models??Number(Object.keys(kit.tiers)[0]),tier=kit.tiers[size];
 if(!tier)return;
 const key=unit+'#'+size,cached=cache.get(key);
 if(cached)return cached;
 if(unit==='Cadian Recon Squad'){
  const result=reconKit();cache.set(key,result);return result;
 }
 const bearers:Bearer[]=[];
 for(const role of kit.roles){
  const count=tier[role.role],max=Math.max(...Object.values(kit.tiers).map(t=>t[role.role]));
  for(let n=1;n<=count;n++){
   const label=role.role.replace(/#(\d+)$/,' $1')+(max>1?' '+n:'');
   const prefix=size===1&&max===1?'':label+' · ';
   const slots=role.slots.map(s=>slot(prefix+s.label,...s.choices));
   bearers.push({role:role.role,fixed:role.fixed,slots});
  }
 }
 const result={equipment:{fixed:bearers.flatMap(b=>b.fixed),slots:bearers.flatMap(b=>b.slots)},models:bearers,limits:kit.limits};
 cache.set(key,result);
 return result;
}
export function broodBrotherLoadout(unit:string,models?:number):KnightEquipment|undefined{
 return resolve(unit,models)?.equipment;
}
function contains(items:ItemList,wanted:ItemList):boolean{
 const remaining=[...items];
 for(const item of wanted){
  const index=remaining.indexOf(item);
  if(index<0)return false;
  remaining.splice(index,1);
 }
 return true;
}
export function validBroodBrotherGear(unit:string,gear:Gear,models?:number):boolean {
 const resolved=resolve(unit,models);
 if(!resolved?.limits.length)return true;
 const bearers=resolved.models.map(b=>({role:b.role,items:equippedItems(b,gear)}));
 return resolved.limits.every(limit=>{
  const current=limit.thresholds.filter(b=>b.models<=bearers.length).at(-1);
  const owners=bearers.filter(b=>!limit.role||b.role===limit.role);
  const optionCounts=limit.choices.map(choice=>owners.filter(b=>contains(b.items,choice)).length);
  return optionCounts.every(n=>n<=(current?.per_choice??current?.choices??0))&&
   optionCounts.reduce((sum,n)=>sum+n,0)<=(current?.choices??0);
 });
}
export function resizeBroodBrotherGear(unit:string,gear:Gear,models:number):Record<string,string>|undefined{
 const kit=resolve(unit,models);
 if(!kit)return;
 const result:Record<string,string>={};
 for(const s of kit.equipment.slots){
  const value=gear[s.name];
  if(s.choices.some(c=>c.name===value)&&validBroodBrotherGear(unit,{...result,[s.name]:value},models))result[s.name]=value;
 }
 return result;
}
export function broodBrotherModelLoadouts(squad:RosterInstance):{model:string;items:readonly string[]}[]{
 const resolved=resolve(squad.unit,squad.models);
 if(!resolved)return [];
 if(squad.unit==='Cadian Recon Squad'){
  const choices=resolved.equipment.slots.map(s=>s.choices.find(c=>c.name===squad.knightGear?.[s.name])??s.choices[0]);
  const pair=choices[4].items;
  const guns=pair.includes('Missile launcher')?[['Laspistol'],['Laspistol','Missile launcher']]:[[pair[0]],[pair[1]]];
  return [
   {model:'Recon Sergeant',items:['Close combat weapon','Lasgun']},
   ...[...choices.slice(0,4).map(c=>c.items),...guns,['Lasgun'],['Lasgun'],['Lasgun']].map(items=>({model:'Recon Trooper',items:['Close combat weapon',...items]})),
  ];
 }
 if(!resolved.models.length)return [{model:squad.unit,items:[]}];
 return resolved.models.map(b=>({model:b.role.replace(/#\d+$/,''),items:equippedItems(b,squad.knightGear)}));
}
export const guardFactionUpdate='https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_astra_militarum-1hevkhdpmv-stfkch2tsz.pdf#page=24';
export function kasrkinProfileConflict(squad:RosterInstance):boolean{
 return squad.unit==='Kasrkin'&&broodBrotherModelLoadouts(squad).some(b=>b.model==='Kasrkin Sergeant'&&b.items.includes('Power weapon'));
}
export function broodBrotherHasRangedWeapon(squad:RosterInstance):boolean{
 const kit=kits.get(squad.unit);
 if(!kit)return false;
 const ranged=new Set(kit.ranged.map(norm));
 return equippedItems(broodBrotherLoadout(squad.unit,squad.models),squad.knightGear).some(name=>ranged.has(norm(name)));
}
export function broodBrotherWargearPoints(squad:RosterInstance):number{
 const costs=kits.get(squad.unit)?.costs;
 if(!costs||!Object.keys(costs).length)return 0;
 const prices=new Map(Object.entries(costs).map(([name,points])=>[norm(name),points]));
 return equippedItems(broodBrotherLoadout(squad.unit,squad.models),squad.knightGear).reduce((total,name)=>total+(prices.get(norm(name))??0),0);
}
