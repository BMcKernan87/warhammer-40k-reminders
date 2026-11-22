import type {ArmySelection} from './catalog';
/** Current Necron Leader permissions, updated for 11e Necron Support and Leader eligibility. */
export const NECRON_LEADERS:Record<string,readonly string[]>={
 "Technomancer": [
  "Canoptek Wraiths",
  "Immortals",
  "Necron Warriors"
 ],
 "Plasmancer": [
  "Immortals",
  "Necron Warriors"
 ],
 "Chronomancer": [
  "Immortals",
  "Necron Warriors"
 ],
 "Geomancer": [
  "Canoptek Macrocytes",
  "Immortals",
  "Necron Warriors"
 ],
 "Psychomancer": [
  "Immortals",
  "Necron Warriors"
 ],
 "Overlord": [
  "Immortals",
  "Lychguard",
  "Necron Warriors"
 ],
 "Overlord with translocation shroud": [
  "Immortals",
  "Lychguard",
  "Necron Warriors"
 ],
 "Imotekh the Stormlord": [
  "Immortals",
  "Lychguard",
  "Necron Warriors"
 ],
 "Orikan the Diviner": [
  "Immortals",
  "Necron Warriors"
 ],
 "Trazyn the Infinite": [
  "Immortals",
  "Lychguard",
  "Necron Warriors"
 ]
};
const CRYPTEKS=new Set(['Technomancer','Plasmancer','Chronomancer','Orikan the Diviner','Geomancer','Psychomancer']);
const NOBLES=new Set(['Overlord','Overlord with translocation shroud','Imotekh the Stormlord','Trazyn the Infinite']);
export function eligibleBodyguards(army:ArmySelection,leader:string):string[]{
 if(army.faction!=='Necrons')return [];
 return (NECRON_LEADERS[leader]||[]).filter(unit=>(army.units[unit]||0)>0);
}
export function attachmentError(army:ArmySelection,leader:string,bodyguard:string):string|null{
 if(army.faction!=='Necrons'||!NECRON_LEADERS[leader]?.includes(bodyguard))return 'This Leader cannot join that unit';
 if(!(army.units[leader]>0)||!(army.units[bodyguard]>0))return 'Both units must be in the roster';
 const attachments=army.attachments||{};
 const leaders=Object.entries(attachments).filter(([l,b])=>l!==leader&&b===bodyguard).map(([l])=>l);
 if(leaders.length>=2)return 'A Bodyguard unit cannot have more than two Leaders';
 if(leaders.length===1&&!(CRYPTEKS.has(leader)&&NOBLES.has(leaders[0])||NOBLES.has(leader)&&CRYPTEKS.has(leaders[0])))return 'A second Leader must be a compatible Cryptek and Noble pairing';
 return null;
}
export function attachLeader(army:ArmySelection,leader:string,bodyguard:string|null):ArmySelection{
 if(bodyguard===null){const attachments={...army.attachments};delete attachments[leader];return {...army,attachments};}
 const error=attachmentError(army,leader,bodyguard);if(error)throw Error(error);
 return {...army,attachments:{...army.attachments,[leader]:bodyguard}};
}
export function validateAttachments(army:ArmySelection):boolean{
 if(!army.attachments)return true;
 if(typeof army.attachments!=='object'||Array.isArray(army.attachments))return false;
 let candidate:ArmySelection={...army,attachments:{}};
 try{for(const [leader,bodyguard] of Object.entries(army.attachments)){candidate=attachLeader(candidate,leader,bodyguard);}return true;}catch{return false;}
}
