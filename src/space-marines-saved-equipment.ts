import type {RosterInstance} from './roster-instances';
import {spaceMarineLoadout} from './space-marines-loadouts';

const normal=(name:string)=>name.toLowerCase().replace(/\band\b/g,'').replace(/[^a-z0-9]/g,'');
/** Preserve the earlier uniform weapon picker when opening an existing army. */
export function spaceMarineSavedEquipment(squad:RosterInstance,replace=false):RosterInstance{
 if(!['Aggressor Squad','Inceptor Squad'].includes(squad.unit)||!squad.equipment)return squad;
 const field=spaceMarineLoadout(squad.unit,squad.models)?.slots.find(s=>s.name==='Unit weapons');
 if(!field||!replace&&squad.knightGear?.[field.name])return squad;
 const choice=field.choices.find(c=>normal(c.name)===normal(squad.equipment!));
 return choice?{...squad,knightGear:{...squad.knightGear,[field.name]:choice.name}}:squad;
}
