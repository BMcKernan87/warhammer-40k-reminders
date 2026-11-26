import type {ArmySelection} from './catalog';
import {AELDARI_SHEETS} from './aeldari-data';
import {aeldariMusterUnits} from './aeldari-muster-data';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(AELDARI_SHEETS.map(s=>[s.unit,s]));
/** The current MFM lets a Farseer Skyrunner lead a Warlock Skyrunners Support unit. */
export function aeldariJoinedBodyguard(army:ArmySelection,member:RosterInstance):RosterInstance|undefined{
 if(army.faction!=='Aeldari'||!member.attachedTo)return undefined;
 const roster=expandRoster(army),allowed=new Set(aeldariMusterUnits(army));
 const rootFor=(s:RosterInstance):RosterInstance|undefined=>{
  if(!s.attachedTo||s.retinueTo||!allowed.has(s.unit))return undefined;
  const body=roster.find(b=>b.id===s.attachedTo);
  if(!body||body.id===s.id||body.retinueTo||!allowed.has(body.unit)||!sheets.get(s.unit)?.bodyguards?.includes(body.unit))return undefined;
  if(!body.attachedTo)return body;
  // This printed relation shares the Windriders' one Leader and one Support slot.
  if(s.unit!=='Farseer Skyrunner'||body.unit!=='Warlock Skyrunners')return undefined;
  const host=roster.find(b=>b.id===body.attachedTo);
  return host&&host.id!==s.id&&!host.attachedTo&&!host.retinueTo&&sheets.get(body.unit)?.bodyguards?.includes(host.unit)?host:undefined;
 };
 const root=rootFor(member);if(!root)return undefined;
 const members=roster.filter(s=>s.attachedTo&&(s.attachedTo===root.id||roster.some(b=>b.attachedTo===root.id&&b.id===s.attachedTo)));
 if(!members.some(s=>s.id===member.id)||members.some(s=>rootFor(s)?.id!==root.id))return undefined;
 const roles=members.map(s=>sheets.get(s.unit)?.attachmentRole);
 return roles.length<=2&&roles.every(Boolean)&&new Set(roles).size===roles.length?root:undefined;
}
