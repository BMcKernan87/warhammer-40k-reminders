import type {ArmySelection} from './catalog';
import type {Datasheet2026} from './datasheets-2026';
import type {GeneratedReminder} from './generated-reminders';
import {GSC_SHEETS} from './gsc-data';
import {GSC_ALLIED_SHEETS} from './gsc-allies-data.generated';
import {gscAlliedMusterUnits} from './gsc-allies';
import {gscCargoFormations,gscFormations,type GscFormation} from './gsc-transports';
import {expandRoster,type RosterInstance} from './roster-instances';
import {canFillTransports} from './transport-matching';

const sheets=new Map<string,Datasheet2026>([...GSC_SHEETS,...GSC_ALLIED_SHEETS].map(s=>[s.unit,s]));
const capacity:Readonly<Record<string,number>>={
 'Goliath Truck':12,'Goliath Rockgrinder':6,Chimera:12,Taurox:12,'Taurox Prime':12,
 'Centaur RSV':12,Valkyrie:12,Banehammer:26,Doomhammer:26,Stormlord:40,Tyrannocyte:20,
};
function isValidGroup(roster:readonly RosterInstance[],{body,members}:GscFormation):boolean{
 return !body.attachedTo&&!body.retinueTo&&sheets.get(body.unit)?.attachmentRole!=='support'&&
  !roster.some(s=>s.attachedTo===body.id&&!members.some(member=>member.id===s.id));
}
// The EMBARKING ability uses the same weight for passenger space and
// for an equipped model's contribution to Firing Deck.
export function gscFiringDeckModelSlots(unit:string,model:string):number{
 return unit==='Cadian Heavy Weapons Squad'||unit==='Catachan Heavy Weapons Squad'||
  (unit==='Krieg Heavy Weapons Squad'&&model==='Heavy Weapons Gunner')?2:1;
}
export function gscGuardModelSpaces(unit:string,model:string):number{
 return unit==='Cyclops Demolition Vehicle'?7:gscFiringDeckModelSlots(unit,model);
}
function alliedFits(transport:RosterInstance,group:GscFormation,available:ReadonlySet<string>):boolean{
 if(transport.id===group.body.id||!available.has(transport.unit))return false;
 let seats=0,models=0,monsters=0;
 for(const squad of group.members){
  const sheet=sheets.get(squad.unit);
  if(!available.has(squad.unit)||!sheet)return false;
  const size=squad.models??sheet.sizes[0],composition=sheet.compositionBySize?.[size];
  if(!composition)return false;
  for(const [model,count] of Object.entries(composition)){
   const tags=new Set([...(sheet.keywords??[]),...(sheet.modelKeywords?.[model]??[])]);
   models+=count;
   if(transport.unit==='Tyrannocyte'){
    if(!tags.has('TYRANIDS'))return false;
    const wounds=(sheet.modelProfiles?.[model]??sheet.profile)?.wounds;
    if(wounds===undefined)return false;
    if(tags.has('MONSTER')&&wounds<=12){monsters+=count;continue;}
    if(!tags.has('INFANTRY'))return false;
    seats+=count*(wounds>1?3:1);
   }else{
    if(!tags.has('ASTRA MILITARUM')||(!tags.has('INFANTRY')&&squad.unit!=='Cyclops Demolition Vehicle')||tags.has('ARTILLERY'))return false;
    if(transport.unit==='Taurox Prime'&&!tags.has('CHARACTER')&&!tags.has('MILITARUM TEMPESTUS'))return false;
    seats+=count*gscGuardModelSpaces(squad.unit,model);
   }
  }
 }
 return monsters?models===1&&monsters===1:seats>0&&seats<=capacity[transport.unit];
}
export function gscTransportOptions(army:ArmySelection,roster=expandRoster(army)){
 const groups=gscFormations(army,roster).filter(group=>isValidGroup(roster,group));
 const allies=new Set(gscAlliedMusterUnits(army));
 return roster.filter(s=>Object.hasOwn(capacity,s.unit)).map(transport=>{
  const native=transport.unit==='Goliath Truck'||transport.unit==='Goliath Rockgrinder';
  const groupsThatFit=native?gscCargoFormations(army,transport,roster):groups.filter(g=>alliedFits(transport,g,allies));
  return {transport,passengers:groupsThatFit.map(g=>g.body.id),dedicated:sheets.get(transport.unit)?.keywords?.includes('DEDICATED TRANSPORT')??false};
 });
}
export function gscMissingPassengers(army:ArmySelection,roster=expandRoster(army)):boolean{
 const required=gscTransportOptions(army,roster).filter(o=>o.dedicated);
 // A ring of occupied Tyrannocytes cannot deploy. A chain needs an actual
 // non-transport passenger at its innermost end.
 const pods=new Set(required.filter(o=>o.transport.unit==='Tyrannocyte').map(o=>o.transport.id));
 if(pods.size&&!required.some(o=>pods.has(o.transport.id)&&o.passengers.some(id=>!pods.has(id))))return true;
 return !canFillTransports(required,[...new Set(required.flatMap(o=>o.passengers))],(o,id)=>o.passengers.includes(id));
}
export function gscEmbarkationReminders(army:ArmySelection,roster=expandRoster(army)):GeneratedReminder[]{
 const result:GeneratedReminder[]=[];
 for(const {transport,passengers,dedicated} of gscTransportOptions(army,roster)){
  if(!passengers.length&&!dedicated)continue;
  const source=sheets.get(transport.unit)!.source;
  const targets=passengers.length?'Eligible whole formations: '+passengers.join(', ')+'.':'No eligible passengers are present.';
  const notes=transport.unit==='Tyrannocyte'?' It may carry one Tyranids Monster with at most 12 wounds, or 20 Tyranids Infantry spaces, using three per model with more than one wound.':transport.unit==='Taurox Prime'?' Every passenger must be a Militarum Tempestus Infantry model or an Astra Militarum Infantry Character model.':'';
  result.push({id:'11e-gsc-cargo-'+transport.id,title:transport.unit+' · Declare passengers',window:'Pre-battle',turn:'either',timing:'during',origin:'unit',units:[transport.id],source,
   summary:'Capacity '+capacity[transport.unit]+'. '+targets+notes+(dedicated?' At Declare Battle Formations, start with at least one unit aboard. An empty Dedicated Transport is destroyed.':'')});
  if(passengers.length&&transport.unit!=='Tyrannocyte')result.push({id:'11e-gsc-disembark-'+transport.id,title:transport.unit+' · Disembarkation',window:'Movement',turn:'own',timing:'during',origin:'unit',units:[transport.id],source:'https://wahapedia.ru/wh40k11ed/the-rules/core-rules/',
   summary:'Passengers that did not embark this phase can disembark before the transport moves. After a Normal or ingress move disembark within 3″, with no charge this turn. Apply printed exceptions to the normal Advance and Fall Back restrictions. '+targets});
 }
 return result;
}
