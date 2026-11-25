import {astraAttachmentSlots,astraCanPromote,usesAstraAttachmentSlots} from './astra-muster-data';
import {autoAstraProtector} from './astra-protectors';
import {validKnightGear,resizeKnightComposition} from './knight-loadouts';
import {applyModelLoadouts,modelLoadoutRows,validModelLoadouts,type ModelLoadout} from './necron-model-loadouts';
import {reconcileRetinues,validRetinues} from './necron-retinues';
import {reconcileWarlord} from './necron-muster-legality';
import {NECRON_LOADOUTS,slotLimit,validOptionalGear,currentEquipmentName} from './necron-wargear';
import {verifiedUnitSizes2026} from './datasheets-2026';
import {instanceBodyguards,isModeledLeader,rosterAttachmentRole} from './leader-eligibility';
import {supportsMixedPrimaryWeapons} from './mixed-weapons';
import {legalUnitSizes,defaultUnitSize} from './unit-sizes';
import {EQUIPMENT_OPTIONS} from './equipment';
import {NECRON_ENHANCEMENTS,NECRON_CHARACTERS,NECRON_EPIC_HEROES} from './enhancements';
import {upgradeError2026} from './upgrades-2026';
import type {ArmySelection} from './catalog';
export interface RosterInstance {id:string;unit:string;equipment?:string;models?:number;weaponCounts?:Record<string,number>;modelLoadouts?:ModelLoadout[];knightGear?:Record<string,string>;enhancement?:string;attachedTo?:string;keepUnattached?:boolean;retinueTo?:string;resurrectionOrb?:boolean;characterPromotion?:boolean;wargear?:Record<string,number>}
export function expandRoster(army:ArmySelection):RosterInstance[]{
 if(army.instances)return army.instances.map(squad=>{
  // Earlier saves can retain a unit-wide weapon alongside individual squad IDs.
  // An explicit distribution or per-squad choice always takes precedence.
  if(squad.weaponCounts)return squad;
  const saved=squad.equipment??army.equipment?.[squad.unit];
  if(!saved)return squad;
  const equipment=currentEquipmentName(squad.unit,saved);
  return equipment===squad.equipment?squad:{...squad,equipment};
 });
 const result:RosterInstance[]=[];
 for(const [unit,count] of Object.entries(army.units))for(let i=1;i<=count;i++)result.push({id:unit+'#'+i,unit,models:verifiedUnitSizes2026(army,unit)?.[0]??legalUnitSizes(army.faction,unit)?.[0],equipment:army.equipment?.[unit]??(army.faction==='Orks'?undefined:EQUIPMENT_OPTIONS[army.faction]?.find(o=>o.unit===unit)?.defaultChoice),enhancement:i===1?army.enhancements?.[unit]:undefined});
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
 if(target.modelLoadouts)target.modelLoadouts=modelLoadoutRows(target,models);
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
 if(target.modelLoadouts){
  const rows=target.modelLoadouts.slice(0,models);
  while(rows.length<models)rows.push({primary:NECRON_LOADOUTS[target.unit].primary?.[0],gear:[]});
  const resized=applyModelLoadouts(target,models,rows);
  const updated={...army,instances:instances.map(s=>s.id===id?resized:s)};
  if(!validateRosterInstances(updated))throw Error('Invalid model count');
  return updated;
 }
 target.models=models;
 if(target.knightGear)target.knightGear=resizeKnightComposition(target,models,army.faction);
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
 if(target.modelLoadouts)target.modelLoadouts=modelLoadoutRows(target,target.modelLoadouts.length);
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
 if(changed.modelLoadouts)changed.modelLoadouts=modelLoadoutRows(changed,changed.modelLoadouts.length);
 return {...army,instances:instances.map(s=>s.id===id?changed:s)};
}
export function setInstanceModelLoadouts(army:ArmySelection,id:string,rows:ModelLoadout[]):ArmySelection{
 const instances=expandRoster(army);
 const squad=instances.find(s=>s.id===id);
 if(army.faction!=='Necrons'||!squad)throw Error('Unknown Necron squad');
 const models=squad.models??verifiedUnitSizes2026(army,squad.unit)?.[0]??1;
 const updated=applyModelLoadouts(squad,models,rows);
 return {...army,instances:instances.map(s=>s.id===id?updated:s)};
}
export function individualArmy(army:ArmySelection):ArmySelection {
 if(army.instances){
  if(!army.equipment||!Object.keys(army.equipment).length)return army;
  return {...army,instances:expandRoster(army),equipment:{}};
 }
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
  delete leader.keepUnattached;
 }else{
  delete leader.attachedTo;
  if(rosterAttachmentRole(army.faction,leader.unit)==='leader')leader.keepUnattached=true;
 }
 const updated=reconcileRetinues({...army,instances});
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
  if(x.characterPromotion!==undefined&&(x.characterPromotion!==true||!astraCanPromote(army,x)))return false;
  if(x.keepUnattached!==undefined&&(x.keepUnattached!==true||x.attachedTo!==undefined||rosterAttachmentRole(army.faction,x.unit)!=='leader'))return false;
  if(x.unit==='Overlord'&&x.resurrectionOrb&&(x.equipment||army.equipment?.['Overlord']||'Tachyon arrow and Overlord’s blade')==='Tachyon arrow and Overlord’s blade')return false;
  if(x.resurrectionOrb!==undefined&&(x.unit!=='Overlord'||typeof x.resurrectionOrb!=='boolean'))return false;
  if(x.models!==undefined&&(!Number.isInteger(x.models)||!(verifiedUnitSizes2026(army,x.unit)||legalUnitSizes(army.faction,x.unit))?.includes(x.models)))return false;
  if(x.wargear!==undefined&&(army.faction!=='Necrons'||!validOptionalGear(x, x.models??verifiedUnitSizes2026(army,x.unit)?.[0]??1)))return false;
  if(x.knightGear!==undefined&&!validKnightGear(x,army.faction))return false;
  if(x.modelLoadouts!==undefined&&(army.faction!=='Necrons'||!validModelLoadouts(x,x.models??verifiedUnitSizes2026(army,x.unit)?.[0]??1)))return false;
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
  if(usesAstraAttachmentSlots(army,body)){if(!astraAttachmentSlots(body,leaders))return false;continue;}
  if(leaders.length>2)return false;
  if(leaders.length===2&&new Set(leaders.map(l=>rosterAttachmentRole(army.faction,l.unit))).size!==2)return false;
 }
 return validRetinues(army);
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
 const updated=reconcileRetinues({...army,units,instances,upgrades2026,retiredSquadNumbers:retiredSquadNumbers(army,[target])});
 if(!validateRosterInstances(updated))throw Error('Removing squad would invalidate roster');
 return autoAttachUnambiguousInstances(reconcileWarlord(updated));
}
export function appendRosterInstances(army:ArmySelection,unit:string,count:number):RosterInstance[]{
 const instances=expandRoster(army);const existing=new Set(instances.map(x=>x.id));const next=[...instances];
 for(let i=0;i<count;i++){let n=1+(army.retiredSquadNumbers?.[unit]??0);while(existing.has(unit+'#'+n))n++;const id=unit+'#'+n;existing.add(id);next.push({id,unit,models:verifiedUnitSizes2026(army,unit)?.[0]??legalUnitSizes(army.faction,unit)?.[0],equipment:EQUIPMENT_OPTIONS[army.faction]?.find(o=>o.unit===unit)?.defaultChoice});}
 return next;
}

/** Assign only when the character and recipient are unambiguous for that role. */
export function autoAttachUnambiguousInstances(army:ArmySelection):ArmySelection{
 if(!army.instances||!['Astra Militarum','Necrons','Imperial Knights','Chaos Knights','Chaos Daemons','Imperial Agents','Adeptus Custodes','Orks','Leagues of Votann','Genestealer Cults','World Eaters','Emperor’s Children','Thousand Sons'].includes(army.faction))return army;
 let current=army;
 let changed=true;
 while(changed){
  changed=false;
  const roster=expandRoster(current);
  const unresolved=roster.filter(s=>rosterAttachmentRole(army.faction,s.unit)&&!s.attachedTo&&!s.keepUnattached);
  // A unique destination is still ambiguous if two characters require the same available slot.
  const proposals=new Map<string,{leader:RosterInstance;bodyId:string}[]>();
  for(const leader of unresolved){
   const legal=roster.filter(body=>instanceBodyguards(current,leader).includes(body.unit)).filter(body=>{
    try{setInstanceAttachment(current,leader.id,body.id);return true;}catch{return false;}
   });
   if(legal.length!==1)continue;
   const key=rosterAttachmentRole(army.faction,leader.unit)+'/'+legal[0].id;
   proposals.set(key,[...(proposals.get(key)??[]),{leader,bodyId:legal[0].id}]);
  }
  // Required Supports take precedence when upgrades on two candidates conflict across roles.
  const choices=[...proposals.values()].filter(group=>{
   if(group.length===1)return true;
   if(group.length!==2)return false;
   // A printed two-Leader exception can make both destinations unambiguous.
   // Check the pair together, including enhancement and per-datasheet limits.
   try{
    const [first,second]=group;
    const assigned=setInstanceAttachment(current,first.leader.id,first.bodyId);
    setInstanceAttachment(assigned,second.leader.id,second.bodyId);
    return true;
   }catch{return false;}
  }).map(group=>group[0]);
  const forced=choices.find(choice=>rosterAttachmentRole(army.faction,choice.leader.unit)==='support')??choices[0];
  if(forced){
   current=setInstanceAttachment(current,forced.leader.id,forced.bodyId);
   changed=true;
  }
 }
 return autoAstraProtector(current);
}

/** Remove only attachments that become illegal when a detachment or upgrade is removed. */
export function reconcileInstanceAttachments(army:ArmySelection):ArmySelection{
 if(!army.instances)return army;
 let instances=army.instances.map(s=>{const copy={...s};if(copy.characterPromotion&&!astraCanPromote(army,copy))delete copy.characterPromotion;return copy;});
 for(const leader of instances){
  if(!leader.attachedTo)continue;
  const body=instances.find(b=>b.id===leader.attachedTo);
  if(!body||!instanceBodyguards(army,leader).includes(body.unit))delete leader.attachedTo;
 }
 return reconcileRetinues({...army,instances});
}
