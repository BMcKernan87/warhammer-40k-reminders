import type {ArmySelection} from './catalog';
import {NECRON_LEADERS} from './attachments';
export interface RosterInstance {id:string;unit:string;equipment?:string;enhancement?:string;attachedTo?:string}
export function expandRoster(army:ArmySelection):RosterInstance[]{
 if(army.instances)return army.instances;
 const result:RosterInstance[]=[];
 for(const [unit,count] of Object.entries(army.units))for(let i=1;i<=count;i++)result.push({id:unit+'#'+i,unit,equipment:army.equipment?.[unit],enhancement:i===1?army.enhancements?.[unit]:undefined});
 for(const [leader,bodyguard] of Object.entries(army.attachments||{})){
  const l=result.find(x=>x.unit===leader&&!x.attachedTo);
  const b=result.find(x=>x.unit===bodyguard);
  if(l&&b)l.attachedTo=b.id;
 }
 return result;
}
export function setInstanceEquipment(army:ArmySelection,id:string,equipment:string):ArmySelection{
 const instances=expandRoster(army).map(x=>({...x}));const target=instances.find(x=>x.id===id);
 if(!target)throw Error('Unknown squad');
 target.equipment=equipment;
 return {...army,instances};
}
export function setInstanceEnhancement(army:ArmySelection,id:string,enhancement:string|null):ArmySelection{
 const instances=expandRoster(army).map(x=>({...x}));const target=instances.find(x=>x.id===id);
 if(!target)throw Error('Unknown Character');
 if(enhancement===null)delete target.enhancement;else target.enhancement=enhancement;
 return {...army,instances};
}
export function setInstanceAttachment(army:ArmySelection,leaderId:string,bodyguardId:string|null):ArmySelection{
 const instances=expandRoster(army).map(x=>({...x}));
 const leader=instances.find(x=>x.id===leaderId);
 if(!leader||!NECRON_LEADERS[leader.unit])throw Error('Selected model is not a supported Leader');
 if(bodyguardId!==null){
  const body=instances.find(x=>x.id===bodyguardId);
  if(!body||!NECRON_LEADERS[leader.unit].includes(body.unit))throw Error('Leader cannot join this Bodyguard');
  if(leader.id===body.id)throw Error('A Leader cannot attach to itself');
  leader.attachedTo=bodyguardId;
 }else delete leader.attachedTo;
 const updated={...army,instances};
 if(!validateRosterInstances(updated))throw Error('Incompatible Leader attachment or duplicate assignment');
 return updated;
}
const crypteks=new Set(['Technomancer','Plasmancer','Chronomancer','Orikan the Diviner']);
const nobles=new Set(['Overlord','Imotekh the Stormlord']);
export function validateRosterInstances(army:ArmySelection):boolean{
 if(!army.instances)return true;
 if(!Array.isArray(army.instances))return false;
 const seen=new Set<string>();const counts:Record<string,number>={};
 for(const x of army.instances){
  if(!x||typeof x.id!=='string'||!x.id||seen.has(x.id)||typeof x.unit!=='string'||!(x.unit in army.units))return false;
  if(x.equipment!==undefined&&typeof x.equipment!=='string')return false;
  if(x.enhancement!==undefined&&typeof x.enhancement!=='string')return false;
  seen.add(x.id);counts[x.unit]=(counts[x.unit]||0)+1;
 }
 if(Object.entries(army.units).some(([unit,count])=>counts[unit]!==count))return false;
 for(const x of army.instances){
  if(x.attachedTo===undefined)continue;
  const body=army.instances.find(b=>b.id===x.attachedTo);
  if(!body||!NECRON_LEADERS[x.unit]?.includes(body.unit))return false;
  const leaders=army.instances.filter(l=>l.attachedTo===body.id);
  if(leaders.length>2)return false;
  if(leaders.length===2&&!((crypteks.has(leaders[0].unit)&&nobles.has(leaders[1].unit))||(nobles.has(leaders[0].unit)&&crypteks.has(leaders[1].unit))))return false;
 }
 return true;
}
export function appendRosterInstances(army:ArmySelection,unit:string,count:number):RosterInstance[]{
 const instances=expandRoster(army);const existing=new Set(instances.map(x=>x.id));const next=[...instances];
 for(let i=0;i<count;i++){let n=1;while(existing.has(unit+'#'+n))n++;const id=unit+'#'+n;existing.add(id);next.push({id,unit});}
 return next;
}
