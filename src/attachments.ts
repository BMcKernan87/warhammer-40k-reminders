import type {ArmySelection} from './catalog';
import {IMPORTED_DATASHEETS_2026} from './datasheets-2026.generated';

// The MFM identifies which Bodyguards a Leader or Support can join (core 19.01).
const attachmentSheets=IMPORTED_DATASHEETS_2026.filter(sheet=>sheet.attachmentRole&&sheet.bodyguards?.length);
export const NECRON_LEADERS:Record<string,readonly string[]>=Object.fromEntries(attachmentSheets.map(sheet=>[sheet.unit,sheet.bodyguards!]));
export const NECRON_SUPPORTS=new Set(attachmentSheets.filter(sheet=>sheet.attachmentRole==='support').map(sheet=>sheet.unit));
export function necronAttachmentRole(unit:string):'leader'|'support'|null{
 if(NECRON_SUPPORTS.has(unit))return 'support';
 return Object.prototype.hasOwnProperty.call(NECRON_LEADERS,unit)?'leader':null;
}
export function eligibleBodyguards(army:ArmySelection,leader:string):string[]{
 if(army.faction!=='Necrons')return [];
 return (NECRON_LEADERS[leader]||[]).filter(unit=>(army.units[unit]||0)>0);
}
export function attachmentError(army:ArmySelection,leader:string,bodyguard:string):string|null{
 if(army.faction!=='Necrons'||!NECRON_LEADERS[leader]?.includes(bodyguard))return 'This Leader cannot join that unit';
 if(!(army.units[leader]>0)||!(army.units[bodyguard]>0))return 'Both units must be in the roster';
 const attachments=army.attachments||{};
 const role=necronAttachmentRole(leader);
 if(!role)return 'Unsupported Necron Leader or Support';
 const sameSlot=Object.entries(attachments).some(([other,body])=>other!==leader&&body===bodyguard&&necronAttachmentRole(other)===role);
 if(sameSlot)return 'Only one '+(role==='leader'?'Leader':'Support')+' may join each Bodyguard';
 const attached=Object.entries(attachments).filter(([other,body])=>other!==leader&&body===bodyguard);
 if(attached.length>=2)return 'A Bodyguard can have at most one Leader and one Support';
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

/** Assign an unattached Necron character only when there is exactly one legal destination.
 * Multiple possible bodyguards are left for the player to choose. */
export function autoAttachUnambiguousNecrons(army:ArmySelection):ArmySelection{
 if(army.faction!=='Necrons'||army.instances)return army;
 let result=army;
 for(const leader of Object.keys(NECRON_LEADERS)){
  if((result.units[leader]||0)!==1||result.attachments?.[leader])continue;
  const candidates=eligibleBodyguards(result,leader).filter(body=>attachmentError(result,leader,body)===null);
  if(candidates.length===1)result=attachLeader(result,leader,candidates[0]);
 }
 return result;
}
