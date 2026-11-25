import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {expandRoster} from './roster-instances';
import {validSupportAttachment} from './necron-muster-legality';
import {hasMurdermind,leaderBodyguards} from './leader-eligibility';
import {NECRON_SUPPORTS} from './attachments';
import {necronKeywords} from './necron-wargear';
import {verifiedUnitSizes2026} from './datasheets-2026';

export function retinueCrypteks(army:ArmySelection,bodyId:string):RosterInstance[]{
 const roster=expandRoster(army),body=roster.find(s=>s.id===bodyId);
 if(!body||body.attachedTo||body.retinueTo||body.unit==='Cryptothralls')return [];
 const crypteks=roster.filter(s=>s.attachedTo===bodyId&&necronKeywords.CRYPTEK.has(s.unit)&&validSupportAttachment(army,s));
 // Murdermind's special Destroyer-only formation cannot include non-Destroyer retinue models.
 if(crypteks.some(s=>hasMurdermind(army,s)&&!leaderBodyguards('Necrons',s.unit).includes(body.unit)))return [];
 return crypteks;
}
export function eligibleRetinueBodies(army:ArmySelection,id:string):RosterInstance[]{
 if(army.faction!=='Necrons')return [];
 const roster=expandRoster(army);
 if(!roster.some(s=>s.id===id&&s.unit==='Cryptothralls'&&!s.attachedTo))return [];
 return roster.filter(b=>retinueCrypteks(army,b.id).length>0&&!roster.some(s=>s.id!==id&&s.retinueTo===b.id));
}
export function setRetinue(army:ArmySelection,id:string,bodyId:string|null):ArmySelection{
 if(army.faction!=='Necrons'||!expandRoster(army).some(s=>s.id===id&&s.unit==='Cryptothralls'))throw Error('Select a Cryptothralls unit');
 if(bodyId!==null&&!eligibleRetinueBodies(army,id).some(s=>s.id===bodyId))throw Error('Retinue requires a legally Cryptek-led Bodyguard without another Cryptothralls unit');
 return {...army,instances:expandRoster(army).map(s=>s.id===id?{...s,retinueTo:bodyId??undefined}:s)};
}
export function reconcileRetinues(army:ArmySelection):ArmySelection{
 if(!army.instances)return army;
 const claimed=new Set<string>();
 const instances=army.instances.map(s=>{
  if(!s.retinueTo)return s;
  if(s.unit==='Cryptothralls'&&!s.attachedTo&&!claimed.has(s.retinueTo)&&retinueCrypteks(army,s.retinueTo).length){claimed.add(s.retinueTo);return s;}
  return {...s,retinueTo:undefined};
 });
 return {...army,instances};
}
export function validRetinues(army:ArmySelection):boolean{
 const roster=expandRoster(army);
 return roster.every(s=>s.retinueTo===undefined||(typeof s.retinueTo==='string'&&eligibleRetinueBodies(army,s.id).some(b=>b.id===s.retinueTo)));
}
export function formationBodyguardStrength(army:ArmySelection,id:string):number{
 const roster=expandRoster(army),body=roster.find(s=>s.id===id);
 if(!body)return 0;
 const size=(s:RosterInstance)=>s.models??verifiedUnitSizes2026(army,s.unit)?.[0]??1;
 return size(body)+roster.filter(s=>s.retinueTo===id&&eligibleRetinueBodies(army,s.id).some(b=>b.id===id)).reduce((n,s)=>n+size(s),0);
}
const infantryCharacters=new Set(['Chronomancer','Geomancer','Hexmark Destroyer','Illuminor Szeras','Imotekh the Stormlord','Nekrosor Ammentar','Orikan the Diviner','Overlord','Overlord with translocation shroud','Plasmancer','Psychomancer','Royal Warden','Skorpekh Lord','Technomancer','Trazyn the Infinite']);
// A whole formation must fit; a Warriors squad with two attached characters or a retinue cannot embark.
export function ghostArkPassengers(army:ArmySelection):RosterInstance[]{
 const roster=expandRoster(army);
 return roster.filter(s=>{
  if(s.attachedTo||s.retinueTo)return false;
  const members=[s,...roster.filter(m=>m.attachedTo===s.id||m.retinueTo===s.id)];
  if(s.unit==='Necron Warriors')return (s.models??verifiedUnitSizes2026(army,s.unit)?.[0]??0)<=10&&members.length<=2&&members.slice(1).every(m=>infantryCharacters.has(m.unit));
  return members.length===1&&infantryCharacters.has(s.unit)&&!NECRON_SUPPORTS.has(s.unit);
 });
}
