import {reconcileWarlord} from './necron-muster-legality';
import {NECRON_LOADOUTS,slotLimit,validOptionalGear,currentEquipmentName} from './necron-wargear';
import {verifiedUnitSizes2026} from './datasheets-2026';
import {instanceBodyguards,validMurdermindFormation,isModeledLeader} from './leader-eligibility';
import {supportsMixedPrimaryWeapons} from './mixed-weapons';
import {legalUnitSizes,defaultUnitSize} from './unit-sizes';
import {EQUIPMENT_OPTIONS} from './equipment';
import {NECRON_ENHANCEMENTS,NECRON_CHARACTERS,NECRON_EPIC_HEROES} from './enhancements';
import {upgradeError2026} from './upgrades-2026';
import type {ArmySelection} from './catalog';
import {NECRON_LEADERS,necronAttachmentRole} from './attachments';
export interface RosterInstance {id:string;unit:string;equipment?:string;models?:number;weaponCounts?:Record<string,number>;enhancement?:string;attachedTo?:string;resurrectionOrb?:boolean;wargear?:Record<string,number>}
export function expandRoster(army:ArmySelection):RosterInstance[]{
 if(army.instances)return army.instances;
 const result:RosterInstance[]=[];
 for(const [unit,count] of Object.entries(army.units))for(let i=1;i<=count;i++)result.push({id:unit+'#'+i,unit,models:verifiedUnitSizes2026(army,unit)?.[0]??legalUnitSizes(army.faction,unit)?.[0],equipment:army.equipment?.[unit]??EQUIPMENT_OPTIONS[army.faction]?.find(o=>o.unit===unit)?.defaultChoice,enhancement:i===1?army.enhancements?.[unit]:undefined});
 for(const [leader,bodyguard] of Object.entries(army.attachments||{})){
  const l=result.find(x=>x.unit===leader&&!x.attachedTo);
  const b=result.find(x=>x.unit===bodyguard);
  if(l&&b)l.attachedTo=b.id;
 }
 return result;
}
export function setInstanceWeaponCounts(army:ArmySelection,id:string,weaponCounts:Record<string,number>):ArmySelection{
 const instances=expandRoster(army).map(x=>({...x}));
 const target=instances.find(x=>x.id===id);
 if(!target)throw Error('Unknown squad');
 if(!supportsMixedPrimaryWeapons(army.faction,target.unit))throw Error('This datasheet requires the same primary weapon on every model');
 const options=EQUIPMENT_OPTIONS[army.faction]?.find(o=>o.unit===target.unit);
 if(!options)throw Error('No supported weapon configurations for this squad');
 const models=target.models??verifiedUnitSizes2026(army,target.unit)?.[0]??defaultUnitSize(army.faction,target.unit)??1;
 if(!Number.isInteger(models)||models<1)throw Error('Invalid model count');
 if(Object.entries(weaponCounts).some(([weapon,count])=>!options.choices.includes(weapon)||!Number.isInteger(count)||count<0))throw Error('Invalid weapon distribution');
 if(Object.values(weaponCounts).reduce((sum,count)=>sum+count,0)!==models)throw Error('Each model must have exactly one selected primary weapon');
 target.weaponCounts={...weaponCounts};
 delete target.equipment;
 const updated={...army,instances};
 if(!validateRosterInstances(updated))throw Error('Invalid weapon configuration');
 return updated;
}
export function setInstanceModelCount(army:ArmySelection,id:string,models:number):ArmySelection{
 if(!Number.isInteger(models)||models<1)throw Error('Invalid model count');
 const instances=expandRoster(army).map(x=>({...x}));
 const target=instances.find(x=>x.id===id);
 if(!target)throw Error('Unknown squad');
 const legal=verifiedUnitSizes2026(army,target.unit)||legalUnitSizes(army.faction,target.unit);
 if(!legal||!legal.includes(models))throw Error('Unsupported unit size');
 target.models=models;
 if(target.wargear){
  const gear:Record<string,number>={};
  for(const slot of NECRON_LOADOUTS[target.unit]?.slots??[]){
   let remaining=slotLimit(slot,models);
   for(const option of slot.choices){
    const retained=Math.min(target.wargear[option]??0,remaining);
    if(retained)gear[option]=retained;
    remaining-=retained;
   }
  }
  target.wargear=gear;
 }
 if(target.weaponCounts){
  const choices=EQUIPMENT_OPTIONS[army.faction]?.find(o=>o.unit===target.unit)?.choices;
  const current=target.weaponCounts;
  const first=choices?.find(w=>(current[w]??0)>0)||choices?.[0];
  if(first&&choices){
   // Retain existing weapon assignments where possible. Only newly added models
   // receive the first selected weapon; shrinking trims in catalog order.
   const retained:Record<string,number>={};
   let remaining=models;
   for(const weapon of choices){
    const count=Math.min(current[weapon]??0,remaining);
    if(count>0)retained[weapon]=count;
    remaining-=count;
   }
   if(remaining>0)retained[first]=(retained[first]??0)+remaining;
   target.weaponCounts=retained;
  }else delete target.weaponCounts;
 }
 const updated={...army,instances};
 if(!validateRosterInstances(updated))throw Error('Invalid model count');
 return updated;
}
export function setInstanceEquipment(army:ArmySelection,id:string,equipment:string):ArmySelection{
 const instances=expandRoster(army).map(x=>({...x}));const target=instances.find(x=>x.id===id);
 if(!target)throw Error('Unknown squad');
 if(!EQUIPMENT_OPTIONS[army.faction]?.some(o=>o.unit===target.unit&&o.choices.includes(equipment)))throw Error('Invalid equipment for this squad');
 if(target.unit==='Overlord'&&target.resurrectionOrb&&equipment==='Tachyon arrow and Overlord’s blade')throw Error('Resurrection Orb cannot be equipped alongside tachyon arrow');
 target.equipment=equipment;
 delete target.weaponCounts;
 return {...army,instances};
}
export function setInstanceResurrectionOrb(army:ArmySelection,id:string,equipped:boolean):ArmySelection{
 const instances=expandRoster(army).map(x=>({...x}));
 const target=instances.find(x=>x.id===id);
 if(!target||target.unit!=='Overlord')throw Error('Resurrection Orb selection requires a supported Overlord');
 if(typeof equipped!=='boolean')throw Error('Invalid Resurrection Orb selection');
 if(equipped&&(target.equipment||army.equipment?.['Overlord']||'Tachyon arrow and Overlord’s blade')==='Tachyon arrow and Overlord’s blade')throw Error('Replace the tachyon arrow with staff of light or voidscythe before equipping a Resurrection Orb');
 target.resurrectionOrb=equipped;
 return {...army,instances};
}
export function setInstanceWargear(army:ArmySelection,id:string,choice:string,count:number):ArmySelection {
 const instances=expandRoster(army);
 const target=instances.find(s=>s.id===id);
 if(army.faction!=='Necrons'||!target)throw Error('Unknown Necron squad');
 const changed={...target,wargear:{...target.wargear,[choice]:count}};
 if(!validOptionalGear(changed,target.models??verifiedUnitSizes2026(army,target.unit)?.[0]??1))throw Error('Wargear exceeds this squad’s permitted options or model count');
 if(count===0)delete changed.wargear[choice];
 return {...army,instances:instances.map(s=>s.id===id?changed:s)};
}
export function individualArmy(army:ArmySelection):ArmySelection {
 if(army.instances)return army;
 const instances=expandRoster(army);
 const upgrades2026=Object.fromEntries(instances.flatMap(s=>{
  const upgrade=army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit];
  return upgrade?[[s.id,upgrade]]:[];
 }));
 return {...army,instances,attachments:{},equipment:{},enhancements:{},upgrades2026};
}
export function setInstanceEnhancement(army:ArmySelection,id:string,enhancement:string|null):ArmySelection{
 const instances=expandRoster(army).map(x=>({...x}));const target=instances.find(x=>x.id===id);
 if(!target)throw Error('Unknown Character');
 if(enhancement===null)delete target.enhancement;else{
  if(!NECRON_CHARACTERS.has(target.unit)||NECRON_EPIC_HEROES.has(target.unit)||!NECRON_ENHANCEMENTS[army.detachment]?.includes(enhancement))throw Error('Ineligible Enhancement bearer or detachment');
  if(instances.some(x=>x.id!==id&&x.enhancement===enhancement)||Object.values(army.enhancements||{}).includes(enhancement))throw Error('Enhancement already assigned');
  if(instances.filter(x=>x.enhancement).length>=3&&!target.enhancement)throw Error('Maximum three Enhancements');
  target.enhancement=enhancement;
 }
 return {...army,instances};
}
export function setInstanceAttachment(army:ArmySelection,leaderId:string,bodyguardId:string|null):ArmySelection{
 const instances=expandRoster(army).map(x=>({...x}));
 const leader=instances.find(x=>x.id===leaderId);
 if(!leader||!isModeledLeader(army.faction,leader.unit))throw Error('Selected model is not a supported Leader');
 if(bodyguardId!==null){
  const body=instances.find(x=>x.id===bodyguardId);
  if(!body||!instanceBodyguards(army,leader).includes(body.unit))throw Error('Leader cannot join this Bodyguard');
  if(leader.id===body.id)throw Error('A Leader cannot attach to itself');
  leader.attachedTo=bodyguardId;
 }else delete leader.attachedTo;
 const updated={...army,instances};
 if(!validateRosterInstances(updated))throw Error('Incompatible Leader attachment or duplicate assignment');
 const upgradeError=upgradeError2026(updated);if(upgradeError)throw Error(upgradeError);
 return updated;
}
export function validateRosterInstances(army:ArmySelection):boolean{
 if(!army.instances)return true;
 if(!Array.isArray(army.instances))return false;
 const seen=new Set<string>();const counts:Record<string,number>={};
 for(const x of army.instances){
  if(!x||typeof x.id!=='string'||!x.id||seen.has(x.id)||typeof x.unit!=='string'||!(x.unit in army.units))return false;
  if(x.unit==='Overlord'&&x.resurrectionOrb&&(x.equipment||army.equipment?.['Overlord']||'Tachyon arrow and Overlord’s blade')==='Tachyon arrow and Overlord’s blade')return false;
  if(x.resurrectionOrb!==undefined&&(x.unit!=='Overlord'||typeof x.resurrectionOrb!=='boolean'))return false;
  if(x.models!==undefined&&(!Number.isInteger(x.models)||!(verifiedUnitSizes2026(army,x.unit)||legalUnitSizes(army.faction,x.unit))?.includes(x.models)))return false;
  if(x.wargear!==undefined&&(army.faction!=='Necrons'||!validOptionalGear(x, x.models??verifiedUnitSizes2026(army,x.unit)?.[0]??1)))return false;
  if(x.weaponCounts!==undefined){if(!supportsMixedPrimaryWeapons(army.faction,x.unit))return false;if(x.equipment!==undefined)return false;const options=EQUIPMENT_OPTIONS[army.faction]?.find(o=>o.unit===x.unit);if(!options||!x.weaponCounts||typeof x.weaponCounts!=='object'||Array.isArray(x.weaponCounts))return false;const entries=Object.entries(x.weaponCounts);if(entries.some(([weapon,count])=>!options.choices.includes(weapon)||!Number.isInteger(count)||count<0)||entries.reduce((sum,[,count])=>sum+count,0)!==(x.models??verifiedUnitSizes2026(army,x.unit)?.[0]??defaultUnitSize(army.faction,x.unit)??1))return false;}
  if(x.equipment!==undefined&&!EQUIPMENT_OPTIONS[army.faction]?.some(o=>o.unit===x.unit&&typeof x.equipment==='string'&&o.choices.includes(currentEquipmentName(x.unit,x.equipment))))return false;
  if(x.enhancement!==undefined&&(!NECRON_CHARACTERS.has(x.unit)||NECRON_EPIC_HEROES.has(x.unit)||!NECRON_ENHANCEMENTS[army.detachment]?.includes(x.enhancement)))return false;
  seen.add(x.id);counts[x.unit]=(counts[x.unit]||0)+1;
 }
 if(Object.entries(army.units).some(([unit,count])=>counts[unit]!==count))return false;
 const chosen=army.instances.map(x=>x.enhancement).filter((x):x is string=>!!x);
 if(chosen.length>3||new Set(chosen).size!==chosen.length)return false;
 if(chosen.some(value=>Object.values(army.enhancements||{}).includes(value)))return false;
 for(const x of army.instances){
  if(x.attachedTo===undefined)continue;
  const body=army.instances.find(b=>b.id===x.attachedTo);
  if(!body||!instanceBodyguards(army,x).includes(body.unit))return false;
  const leaders=army.instances.filter(l=>l.attachedTo===body.id);
  if(leaders.length>2||!validMurdermindFormation(army,body,leaders))return false;
  if(leaders.length===2&&(army.faction!=='Necrons'||new Set(leaders.map(l=>necronAttachmentRole(l.unit))).size!==2))return false;
 }
 return true;
}
// Battle events refer to squad IDs across reloads. A replacement squad must not inherit a removed bearer’s history.
export function retiredSquadNumbers(army:ArmySelection,removed:readonly RosterInstance[]):Record<string,number> {
 const retired={...army.retiredSquadNumbers};
 for(const squad of removed){
  const prefix=squad.unit+'#';
  if(!squad.id.startsWith(prefix))continue;
  const number=Number(squad.id.slice(prefix.length));
  if(Number.isSafeInteger(number)&&number>0)retired[squad.unit]=Math.max(number,retired[squad.unit]??0);
 }
 return retired;
}
export function removeRosterInstance(army:ArmySelection,id:string):ArmySelection{
 if(!army.instances)throw Error('Individual squads mode is not enabled');
 const target=army.instances.find(x=>x.id===id);
 if(!target)throw Error('Unknown squad');
 const instances=army.instances.filter(x=>x.id!==id).map(x=>x.attachedTo===id?{...x,attachedTo:undefined}:x);
 const units={...army.units};
 if(units[target.unit]===1)delete units[target.unit];else units[target.unit]--;
 const upgrades2026={...army.upgrades2026};
 delete upgrades2026[id];
 if(!units[target.unit])delete upgrades2026[target.unit];
 const updated={...army,units,instances,upgrades2026,retiredSquadNumbers:retiredSquadNumbers(army,[target])};
 if(!validateRosterInstances(updated))throw Error('Removing squad would invalidate roster');
 return reconcileWarlord(updated);
}
export function appendRosterInstances(army:ArmySelection,unit:string,count:number):RosterInstance[]{
 const instances=expandRoster(army);const existing=new Set(instances.map(x=>x.id));const next=[...instances];
 for(let i=0;i<count;i++){let n=1+(army.retiredSquadNumbers?.[unit]??0);while(existing.has(unit+'#'+n))n++;const id=unit+'#'+n;existing.add(id);next.push({id,unit,models:verifiedUnitSizes2026(army,unit)?.[0]??legalUnitSizes(army.faction,unit)?.[0],equipment:EQUIPMENT_OPTIONS[army.faction]?.find(o=>o.unit===unit)?.defaultChoice});}
 return next;
}

/** Resolve only unambiguous 11e Necron instance attachments. Never guess between squads. */
export function autoAttachUnambiguousInstances(army:ArmySelection):ArmySelection{
 if(army.faction!=='Necrons'||!army.instances)return army;
 let current=army;
 for(const leader of expandRoster(current)){
  if(leader.attachedTo||!necronAttachmentRole(leader.unit))continue;
  const candidates=expandRoster(current).filter(body=>
   instanceBodyguards(current,leader).includes(body.unit)&&
   !expandRoster(current).some(other=>other.attachedTo===body.id&&necronAttachmentRole(other.unit)===necronAttachmentRole(leader.unit))&&
   expandRoster(current).filter(other=>other.attachedTo===body.id).length<2
  );
  const legal=candidates.flatMap(body=>{try{return [setInstanceAttachment(current,leader.id,body.id)];}catch{return [];}});
  if(legal.length===1)current=legal[0];
 }
 return current;
}

/** Remove only attachments that become illegal when a detachment or upgrade is removed. */
export function reconcileInstanceAttachments(army:ArmySelection):ArmySelection{
 if(!army.instances)return army;
 let instances=army.instances.map(s=>({...s}));
 for(const leader of instances){
  if(!leader.attachedTo)continue;
  const body=instances.find(b=>b.id===leader.attachedTo);
  if(!body||!instanceBodyguards(army,leader).includes(body.unit))delete leader.attachedTo;
 }
 for(const body of instances){
  const leaders=instances.filter(l=>l.attachedTo===body.id);
  if(!validMurdermindFormation(army,body,leaders)){
   for(const l of leaders)if(!instanceBodyguards({...army,upgrades2026:{}},l).includes(body.unit))delete l.attachedTo;
  }
 }
 return {...army,instances};
}
