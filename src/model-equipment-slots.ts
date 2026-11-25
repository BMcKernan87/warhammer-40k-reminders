import {equippedItems,slot,type KnightEquipment,type KnightSlot} from './knight-gear-options';

export type ItemList=readonly string[];
export type Gear=Readonly<Record<string,string>>;
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
export interface ModelEquipmentTable{
  unit:string;
  roles:readonly GuardRole[];
  tiers:Readonly<Record<number,Readonly<Record<string,number>>>>;
  limits:readonly GuardLimit[];
  ranged:ItemList;
  costs:Readonly<Record<string,number>>;
}
interface Bearer{role:string;fixed:ItemList;slots:KnightSlot[]}
export interface ResolvedKit{equipment:KnightEquipment;models:Bearer[];limits:readonly GuardLimit[]}

export function resolveModelEquipment(kit:ModelEquipmentTable,size:number):ResolvedKit|undefined{
 const tier=kit.tiers[size];
 if(!tier)return;
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
 return result;
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
export function validModelEquipment(resolved:ResolvedKit|undefined,gear:Gear):boolean {
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

export function resizeModelEquipment(kit:ResolvedKit|undefined,gear:Gear):Record<string,string>|undefined{
 if(!kit)return;
 const result:Record<string,string>={};
 for(const s of kit.equipment.slots){
  const value=gear[s.name];
  if(s.choices.some(c=>c.name===value)&&validModelEquipment(kit,{...result,[s.name]:value}))result[s.name]=value;
 }
 return result;
}
