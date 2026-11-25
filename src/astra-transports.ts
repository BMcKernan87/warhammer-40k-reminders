import type {GeneratedReminder} from "./generated-reminders";
import {BATTLELINE_INQUISITORS} from './assigned-agent-data';
import {astraMilitarumKeywords,astraSheets,loyalProtectors} from './astra-muster-data';
import {astraJoinedCommand} from './astra-protectors';
import {gscGuardModelSpaces} from './gsc-army-transports';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {ArmySelection} from './catalog';
import {expandRoster,type RosterInstance} from './roster-instances';

export interface AstraFormation {root:RosterInstance;members:RosterInstance[]}
export const astraTransportCapacity:Readonly<Record<string,number>>={
 Chimera:12,Taurox:12,'Taurox Prime':12,Valkyrie:12,'Centaur RSV':12,Banehammer:26,Doomhammer:26,Stormlord:40,
};
export function astraFormationGroups(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):AstraFormation[]{
 if(army.faction!=='Astra Militarum')return [];
 const snapshot={...army,instances:[...roster]};
 const joins=new Map<string,string>();
 for(const s of roster){
  const body=knightJoinedBodyguard(snapshot,s);
  if(body)joins.set(s.id,body.id);
 }
 for(const s of roster){
  const command=astraJoinedCommand(snapshot,s);
  if(command)joins.set(s.id,joins.get(command.id)??command.id);
 }
 return roster.filter(s=>!joins.has(s.id)).map(root=>({root,members:[root,...roster.filter(s=>joins.get(s.id)===root.id)]}));
}
function passengerSpaces(army:ArmySelection,carrier:RosterInstance,{root,members}:AstraFormation):number{
 if(root.attachedTo||root.retinueTo||loyalProtectors.has(root.unit)||astraSheets.get(root.unit)?.attachmentRole==='support')return Infinity;
 let total=0;
 for(const s of members){
  if(s.retinueTo&&loyalProtectors.has(s.unit)){total+=3;continue;}
  if(s.id!==root.id&&BATTLELINE_INQUISITORS.has(s.unit)){total+=1;continue;}
  const sheet=astraSheets.get(s.unit),size=s.models??sheet?.sizes[0]??0;
  if(!sheet||!size)return Infinity;
  const composition=sheet.compositionBySize?.[size]??{[s.unit]:size};
  for(const [model,count] of Object.entries(composition)){
   const tags=astraMilitarumKeywords(army,s,model);
   if(!tags.has('ASTRA MILITARUM')||(!tags.has('INFANTRY')&&s.unit!=='Cyclops Demolition Vehicle')||tags.has('ARTILLERY'))return Infinity;
   if(carrier.unit==='Taurox Prime'&&!tags.has('MILITARUM TEMPESTUS')&&!tags.has('CHARACTER'))return Infinity;
   total+=count*(tags.has('OGRYN')?3:gscGuardModelSpaces(s.unit,model));
  }
 }
 return total;
}
export function astraCargoFormations(army:ArmySelection,transport:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):AstraFormation[]{
 const capacity=astraTransportCapacity[transport.unit];
 if(!capacity||!roster.some(s=>s.id===transport.id&&s.unit===transport.unit))return [];
 return astraFormationGroups(army,roster).filter(group=>group.root.id!==transport.id&&
  !roster.some(s=>s.attachedTo===group.root.id&&!group.members.some(m=>m.id===s.id))&&passengerSpaces(army,transport,group)<=capacity);
}
export function astraTransportCanCarry(army:ArmySelection,transport:RosterInstance,body:RosterInstance){
 return astraCargoFormations(army,transport).some(group=>group.root.id===body.id);
}
export function astraTransportOptions(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 return roster.filter(s=>Object.hasOwn(astraTransportCapacity,s.unit)).map(transport=>({
  transport,dedicated:astraMilitarumKeywords(army,transport).has('DEDICATED TRANSPORT'),
  passengers:astraCargoFormations(army,transport,roster).map(g=>g.root.id),
 }));
}
export function astraEmbarkationReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Astra Militarum')return [];
 const reminders:GeneratedReminder[]=[];
 for(const s of roster.filter(s=>loyalProtectors.has(s.unit))){
  const host=astraJoinedCommand(army,s);
  reminders.push({id:'11e-astra-protector-'+s.id,title:s.id+' · Loyal Protector',window:'Pre-battle',timing:'start',turn:'either',origin:'unit',units:[s.id],source:astraSheets.get(s.unit)!.source,
   summary:host?'Join '+host.id+' at Declare Battle Formations. Increase its starting strength by one. Stay with the Command Squad for the battle, including after its Bodyguard is destroyed. Use three spaces when embarking with it.':'At Declare Battle Formations, join a Command Squad that has no other Loyal Protector. If there is no eligible host, this model misses the battle and counts as destroyed.'});
 }
 for(const {transport,passengers,dedicated} of astraTransportOptions(army,roster)){
  if(!passengers.length&&!dedicated)continue;
  const targets=passengers.length?'Eligible whole formations: '+passengers.join(', ')+'.':'No eligible formation can embark.';
  const source=astraSheets.get(transport.unit)!.source;
  reminders.push({id:'11e-astra-embark-'+transport.id,title:transport.id+' · Declare passengers',window:'Pre-battle',turn:'either',timing:'during',origin:'unit',units:[transport.id],source,
   summary:'Capacity '+astraTransportCapacity[transport.unit]+'. '+targets+(dedicated?' Start with at least one unit aboard or this Dedicated Transport is destroyed.':'')});
  if(passengers.length)reminders.push({id:'11e-astra-disembark-'+transport.id,title:transport.id+' · Disembarkation',window:'Movement',turn:'own',timing:'during',origin:'unit',units:[transport.id],source:'https://wahapedia.ru/wh40k11ed/the-rules/core-rules/',
   summary:'Passengers that did not embark this phase can disembark before this transport moves. After a Normal or ingress move, set up within 3″ and forgo charging. Check the carrier’s printed exceptions for disembarking after an Advance or Fall Back. '+targets});
 }
 return reminders;
}
