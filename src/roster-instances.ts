import {verifiedUnitSizes2026} from './datasheets-2026';
import {leaderBodyguards,isModeledLeader} from './leader-eligibility';
import {supportsMixedPrimaryWeapons} from './mixed-weapons';
import {legalUnitSizes,defaultUnitSize} from './unit-sizes';
import {EQUIPMENT_OPTIONS} from './equipment';
import {NECRON_ENHANCEMENTS,NECRON_CHARACTERS,NECRON_EPIC_HEROES} from './enhancements';
import type {ArmySelection} from './catalog';
import {NECRON_LEADERS,necronAttachmentRole} from './attachments';
export interface RosterInstance {id:string;unit:string;equipment?:string;models?:number;weaponCounts?:Record<string,number>;enhancement?:string;attachedTo?:string;resurrectionOrb?:boolean}
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
export function setInstanceWeaponCounts(army:ArmySelection,id:string,weaponCounts:Record<string,number>):ArmySelection{
 const instances=expandRoster(army).map(x=>({...x}));
 const target=instances.find(x=>x.id===id);
 if(!target)throw Error('Unknown squad');
 if(!supportsMixedPrimaryWeapons(army.faction,target.unit))throw Error('This datasheet requires the same primary weapon on every model');
 const options=EQUIPMENT_OPTIONS[army.faction]?.find(o=>o.unit===target.unit);
 if(!options)throw Error('No supported weapon configurations for this squad');
 const models=target.models??defaultUnitSize(army.faction,target.unit)??1;
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
 if(target.weaponCounts){
  const choices=EQUIPMENT_OPTIONS[army.faction]?.find(o=>o.unit===target.unit)?.choices;
  const current=Object.entries(target.weaponCounts);
  const first=choices?.find(w=>current.some(([key,count])=>key===w&&count>0))||choices?.[0];
  if(first)target.weaponCounts={[first]:models};
  else delete target.weaponCounts;
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
  if(!body||!leaderBodyguards(army.faction,leader.unit).includes(body.unit))throw Error('Leader cannot join this Bodyguard');
  if(leader.id===body.id)throw Error('A Leader cannot attach to itself');
  leader.attachedTo=bodyguardId;
 }else delete leader.attachedTo;
 const updated={...army,instances};
 if(!validateRosterInstances(updated))throw Error('Incompatible Leader attachment or duplicate assignment');
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
  if(x.weaponCounts!==undefined){if(!supportsMixedPrimaryWeapons(army.faction,x.unit))return false;if(x.equipment!==undefined)return false;const options=EQUIPMENT_OPTIONS[army.faction]?.find(o=>o.unit===x.unit);if(!options||!x.weaponCounts||typeof x.weaponCounts!=='object'||Array.isArray(x.weaponCounts))return false;const entries=Object.entries(x.weaponCounts);if(entries.some(([weapon,count])=>!options.choices.includes(weapon)||!Number.isInteger(count)||count<0)||entries.reduce((sum,[,count])=>sum+count,0)!==(x.models??defaultUnitSize(army.faction,x.unit)??1))return false;}
  if(x.equipment!==undefined&&!EQUIPMENT_OPTIONS[army.faction]?.some(o=>o.unit===x.unit&&o.choices.includes(x.equipment!)))return false;
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
  if(!body||!leaderBodyguards(army.faction,x.unit).includes(body.unit))return false;
  const leaders=army.instances.filter(l=>l.attachedTo===body.id);
  if(leaders.length>2)return false;
  if(leaders.length===2&&(army.faction!=='Necrons'||new Set(leaders.map(l=>necronAttachmentRole(l.unit))).size!==2))return false;
 }
 return true;
}
export function removeRosterInstance(army:ArmySelection,id:string):ArmySelection{
 if(!army.instances)throw Error('Individual squads mode is not enabled');
 const target=army.instances.find(x=>x.id===id);
 if(!target)throw Error('Unknown squad');
 const instances=army.instances.filter(x=>x.id!==id).map(x=>x.attachedTo===id?{...x,attachedTo:undefined}:x);
 const units={...army.units};
 if(units[target.unit]===1)delete units[target.unit];else units[target.unit]--;
 const updated={...army,units,instances};
 if(!validateRosterInstances(updated))throw Error('Removing squad would invalidate roster');
 return updated;
}
export function appendRosterInstances(army:ArmySelection,unit:string,count:number):RosterInstance[]{
 const instances=expandRoster(army);const existing=new Set(instances.map(x=>x.id));const next=[...instances];
 for(let i=0;i<count;i++){let n=1;while(existing.has(unit+'#'+n))n++;const id=unit+'#'+n;existing.add(id);next.push({id,unit});}
 return next;
}
