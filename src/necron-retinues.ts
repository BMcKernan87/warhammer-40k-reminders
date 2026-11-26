import {aeldariJoinedArtillery,reconcileAeldariArtillery} from './aeldari-artillery';
import {astraJoinedCommand,reconcileAstraProtectors} from './astra-protectors';
import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {expandRoster} from './roster-instances';
import {validSupportAttachment} from './necron-muster-legality';
import {NECRON_SUPPORTS} from './attachments';
import {necronKeywords} from './necron-wargear';
import {verifiedUnitSizes2026} from './datasheets-2026';

export const NECRON_RETINUES=new Set(['Cryptothralls','Canoptek Tomb Crawlers']);
export function retinueCrypteks(army:ArmySelection,bodyId:string):RosterInstance[]{
 const roster=expandRoster(army),body=roster.find(s=>s.id===bodyId);
 if(!body||body.attachedTo||body.retinueTo||NECRON_RETINUES.has(body.unit))return [];
 return roster.filter(s=>s.attachedTo===bodyId&&necronKeywords.CRYPTEK.has(s.unit)&&validSupportAttachment(army,s));
}
export function eligibleRetinueBodies(army:ArmySelection,id:string):RosterInstance[]{
 if(army.faction!=='Necrons')return [];
 const roster=expandRoster(army);
 if(!roster.some(s=>s.id===id&&NECRON_RETINUES.has(s.unit)&&!s.attachedTo))return [];
 return roster.filter(b=>retinueCrypteks(army,b.id).length>0&&!roster.some(s=>s.id!==id&&s.retinueTo===b.id));
}
export function setRetinue(army:ArmySelection,id:string,bodyId:string|null):ArmySelection{
 if(army.faction!=='Necrons'||!expandRoster(army).some(s=>s.id===id&&NECRON_RETINUES.has(s.unit)))throw Error('Select a Cryptothralls or Tomb Crawlers retinue');
 if(bodyId!==null&&!eligibleRetinueBodies(army,id).some(s=>s.id===bodyId))throw Error('Retinue requires a legally Cryptek-led Bodyguard without another retinue');
 return {...army,instances:expandRoster(army).map(s=>s.id===id?{...s,retinueTo:bodyId??undefined}:s)};
}
export function reconcileRetinues(army:ArmySelection):ArmySelection{
 if(army.faction==='Aeldari')return reconcileAeldariArtillery(army);
 if(army.faction==='Astra Militarum')return reconcileAstraProtectors(army);
 if(!army.instances)return army;
 const claimed=new Set<string>();
 const instances=army.instances.map(s=>{
  if(!s.retinueTo)return s;
  if(NECRON_RETINUES.has(s.unit)&&!s.attachedTo&&!claimed.has(s.retinueTo)&&retinueCrypteks(army,s.retinueTo).length){claimed.add(s.retinueTo);return s;}
  return {...s,retinueTo:undefined};
 });
 return {...army,instances};
}
export function validRetinues(army:ArmySelection):boolean{
 const roster=expandRoster(army);
 if(army.faction==='Aeldari')return roster.every(s=>s.retinueTo===undefined||!!aeldariJoinedArtillery(army,s));
 if(army.faction==='Astra Militarum')return roster.every(s=>s.retinueTo===undefined||!!astraJoinedCommand(army,s));
 return roster.every(s=>s.retinueTo===undefined||(typeof s.retinueTo==='string'&&eligibleRetinueBodies(army,s.id).some(b=>b.id===s.retinueTo)));
}
export function formationBodyguardStrength(army:ArmySelection,id:string):number{
 const roster=expandRoster(army),body=roster.find(s=>s.id===id);
 if(!body)return 0;
 const size=(s:RosterInstance)=>s.models??verifiedUnitSizes2026(army,s.unit)?.[0]??1;
 return size(body)+roster.filter(s=>s.retinueTo===id&&eligibleRetinueBodies(army,s.id).some(b=>b.id===id)).reduce((n,s)=>n+size(s),0);
}
const infantryCharacter=(unit:string)=>necronKeywords.INFANTRY.has(unit)&&necronKeywords.CHARACTER.has(unit);
// Transport candidates keep the original legal attached unit (Core 19.01),
// including a surviving Support after its Bodyguard dies. Invalid or changed
// joins do not become independent passengers merely because casualties removed
// their original Bodyguard.
export function necronTransportFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):NecronFormation[]{
 if(army.faction!=='Necrons')return [];
 const original=new Map(expandRoster(army).map(s=>[s.id,s]));
 return necronFormationRoots(army,roster).filter(f=>f.members.every(s=>{
  const start=original.get(s.id);
  if(!start||start.unit!==s.unit||start.attachedTo!==s.attachedTo||start.retinueTo!==s.retinueTo)return false;
  if((s.attachedTo||NECRON_SUPPORTS.has(s.unit))&&!f.leading.some(m=>m.id===s.id))return false;
  if(s.retinueTo&&f.originalBody.id!==s.retinueTo)return false;
  return true;
 }));
}
// The card has separate capacities: ten actual Warrior models and one actual
// Necrons Infantry Character model. Unit-level keywords do not turn a joined
// model into either type (Core 18.01/19.03).
export function ghostArkPassengers(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):RosterInstance[]{
 return necronTransportFormations(army,roster).filter(f=>{
  let warriors=0,characters=0;
  for(const s of f.members){
   const models=s.models??verifiedUnitSizes2026(army,s.unit)?.[0]??0;
   if(!Number.isInteger(models)||models<1)return false;
   if(s.unit==='Necron Warriors')warriors+=models;
   else if(infantryCharacter(s.unit))characters+=models;
   else return false;
  }
  return warriors<=10&&characters<=1&&warriors+characters>0;
 }).map(f=>f.body);
}

export interface NecronFormation {
 id:string;
 body:RosterInstance;
 members:RosterInstance[];
 originalBody:RosterInstance;
 /** Surviving Leader/Support units that legally started the battle attached. */
 leading:RosterInstance[];
}

// Validate joins against the mustered army before filtering casualties. Retinues
// join the Bodyguard until the end of the battle; Core 19.01/19.04 likewise retain
// the surviving attached formation and its own leading abilities after losses.
// Purchased squads retain separate identity and points.
export function necronFormationRoots(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):NecronFormation[] {
 const original=expandRoster(army),byId=new Map(original.map(s=>[s.id,s]));
 const joined=new Map<string,string>();
 for(const s of original){
  if(s.attachedTo&&validSupportAttachment(army,s))joined.set(s.id,s.attachedTo);
  if(s.retinueTo&&eligibleRetinueBodies(army,s.id).some(b=>b.id===s.retinueTo))joined.set(s.id,s.retinueTo);
 }
 const groups=new Map<string,{originalBody:RosterInstance;members:RosterInstance[]}>();
 for(const [index,squad] of roster.entries()){
  const start=byId.get(squad.id);
  const unchanged=start?.unit===squad.unit&&start.attachedTo===squad.attachedTo&&start.retinueTo===squad.retinueTo;
  const originalId=unchanged?(joined.get(squad.id)??squad.id):undefined;
  // Changed identities or links do not inherit another unit's original membership.
  const key=originalId===undefined?'current:'+index:'original:'+originalId;
  const group=groups.get(key)??{originalBody:originalId===undefined?squad:byId.get(originalId)!,members:[]};
  group.members.push(squad);groups.set(key,group);
 }
 const positions=new Map(roster.map((s,i)=>[s.id,i]));
 return [...groups.values()].map(({originalBody,members}):NecronFormation=>{
  const body=members.find(s=>s.id===originalBody.id)
   ??members.find(s=>s.retinueTo===originalBody.id&&joined.get(s.id)===originalBody.id)
   ??members[0];
  return {id:body.id,body,originalBody,members:[body,...members.filter(s=>s!==body)],
   leading:members.filter(s=>s.attachedTo===originalBody.id&&joined.get(s.id)===originalBody.id)};
 }).sort((a,b)=>positions.get(a.id)!-positions.get(b.id)!);
}
