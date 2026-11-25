import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {transportMovementReminders} from './transport-movement';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';
import {votannKeywords,votannSheets} from './votann-muster-data';

const sagitaur='Sagitaur',kapricus='Kapricus Carrier',hekaton='Hekaton Land Fortress';
const warrior='Hearthkyn Warriors',yaegirs='Hernkyn Yaegirs';
const capacity:Readonly<Record<string,number>>={[sagitaur]:6,[kapricus]:5,[hekaton]:14};
const source='https://assets.warhammer-community.com/eng_14-10_wh40k_faction_pack_leagues_of_votann-os3nsdjlao-buac8a7pzn.pdf';
type Formation=RosterInstance[];
type CargoOption={split:boolean;models:number;seats:number};

function formations(army:ArmySelection,roster:readonly RosterInstance[]):Formation[]{
 const attachments=new Map(roster.filter(s=>s.attachedTo).map(s=>[s.id,knightJoinedBodyguard(army,s)?.id]));
 return roster.filter(s=>!s.attachedTo).map(root=>[root,...roster.filter(s=>attachments.get(s.id)===root.id)]);
}
function spaces(army:ArmySelection,transport:string,group:Formation):number[]|undefined {
 if(!Object.hasOwn(capacity,transport))return;
 const seats=[];
 for(const squad of group){
  const sheet=votannSheets.get(squad.unit),count=squad.models??sheet?.sizes[0];
  const models=count===undefined?undefined:sheet?.compositionBySize?.[count];
  if(!models)return;
  for(const [model,number] of Object.entries(models)){
   const tags=votannKeywords(army,squad,model);
   if(!tags.has('INFANTRY')||tags.has('ARTILLERY'))return;
   if(transport===kapricus&&squad.unit!==yaegirs)return;
   const bulky=tags.has('EXOARMOUR')||tags.has('EXOFRAME')||tags.has('IRONKIN STEELJACKS');
   if(transport===sagitaur&&bulky)return;
   // This exemption is for the two printed escorts, not the Ironkin Assistant.
   const token=(squad.unit==='Grimnyr'&&/^CORV/i.test(model))||(squad.unit==='Brôkhyr Iron-master'&&/^E-COG/i.test(model));
   const weight=token?0:bulky?2:1;
   for(let i=0;i<number;i++)seats.push(weight);
  }
 }
 return seats;
}
const total=(n:number[])=>n.reduce((a,b)=>a+b,0);
function splitTransport(group:Formation):string|undefined{
 return group[0].unit===warrior?sagitaur:group[0].unit===yaegirs?kapricus:undefined;
}
function option(army:ArmySelection,transport:string,group:Formation,roster:readonly RosterInstance[]):CargoOption|undefined{
 const seats=spaces(army,transport,group);
 if(!seats)return;
 const full=total(seats);
 if(full<=capacity[transport])return {split:false,models:seats.length,seats:full};
 const splitter=splitTransport(group);
 if(!splitter||!roster.some(s=>s.unit===splitter))return;
 // Core 01.02.06 includes attached models when dividing the unit as evenly as possible.
 const count=Math.floor(seats.length/2),lightest=total([...seats].sort((a,b)=>a-b).slice(0,count));
 if(lightest<=capacity[transport])return {split:true,models:count,seats:lightest};
}
export function votannCargoOption(army:ArmySelection,transport:RosterInstance,passenger:RosterInstance):CargoOption|undefined {
 if(army.faction!=='Leagues of Votann'||passenger.attachedTo)return;
 const roster=expandRoster(army);
 if(!roster.some(s=>s.unit===transport.unit&&s.id===transport.id))return;
 const group=formations(army,roster).find(g=>g[0].id===passenger.id&&g[0].unit===passenger.unit);
 return group?option(army,transport.unit,group,roster):undefined;
}
export function votannTransportCanCarry(army:ArmySelection,transport:RosterInstance,passenger:RosterInstance):boolean{
 return !!votannCargoOption(army,transport,passenger);
}
export function votannTransportFindings(army:ArmySelection,roster=expandRoster(army)):RosterFinding[]{
 const carriers=roster.filter(s=>s.unit===kapricus).length,sagitaurs=roster.filter(s=>s.unit===sagitaur).length;
 if(!carriers&&!sagitaurs)return [];
 const groups=formations(army,roster),findings:RosterFinding[]=[];
 const scoutGroups=groups.filter(g=>g[0].unit===yaegirs&&option(army,kapricus,g,roster));
 // Each Carrier can initiate one split. Its other half can fill a second Carrier or a Sagitaur.
 const scoutHalves=2*Math.min(scoutGroups.length,carriers);
 const unusedScoutHalves=Math.max(0,scoutHalves-carriers);
 if(carriers>scoutHalves)findings.push({code:'kapricus-passengers',unit:kapricus,severity:'error',message:'Each Kapricus Carrier needs five eligible Yaegirs embarked. Each ten-model Yaegir formation can supply two Carriers.'});
 let sagitaurGroups=unusedScoutHalves;
 for(const group of groups.filter(g=>g[0].unit!==yaegirs)){
  const cargo=option(army,sagitaur,group,roster);
  if(!cargo)continue;
  sagitaurGroups++;
  if(!cargo.split||group[0].unit!==warrior)continue;
  const seats=spaces(army,sagitaur,group)!;
  // Warriors and the Characters who can join them have zero- or one-space models.
  // Both even model-count halves can embark if the combined occupied seats fit.
  if(total(seats)<=2*capacity[sagitaur])sagitaurGroups++;
 }
 if(sagitaurs>sagitaurGroups)findings.push({code:'sagitaur-passengers',unit:sagitaur,severity:'error',message:'Each Sagitaur requires separate eligible passengers within six spaces. A Hearthkyn unit can split once, with one half embarking in the Sagitaur that split it.'});
 return findings;
}
export function votannTransportReminders(army:ArmySelection,roster=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Leagues of Votann')return [];
 const groups=formations(army,roster),result:GeneratedReminder[]=[];
 const passengers=new Set<string>(),carriers:string[]=[];
 for(const transport of roster.filter(s=>Object.hasOwn(capacity,s.unit))){
  const options=groups.flatMap(g=>{const choice=option(army,transport.unit,g,roster);return choice?[{root:g[0],choice}]:[];});
  if(!options.length&&transport.unit===hekaton)continue;
  if(options.length){
   carriers.push(transport.id);
   for(const {root} of options)passengers.add(root.id);
  }
  const special=transport.unit===sagitaur?'You may split one unsplit Hearthkyn Warriors formation here.':transport.unit===kapricus?'You may split one unsplit Hernkyn Yaegirs formation here.':'Artillery cannot embark. Exoarmour, Exoframe and Ironkin Steeljacks use two spaces per model.';
  const split=transport.unit!==hekaton?' Divide the entire formation as evenly as possible, including attached models. One half must embark in this vehicle. The other can embark elsewhere or deploy separately. A Dedicated Transport that starts empty is destroyed.':'';
  const list=options.map(({root,choice})=>root.id+(choice.split?' (split half)':'')+' — '+choice.models+' models using '+choice.seats+' spaces'+(choice.split?' in one legal split':'')).join(', ');
  result.push({id:'11e-votann-cargo-'+transport.id,title:transport.unit+' · Declare passengers',window:'Pre-battle',turn:'either',timing:'during',origin:'unit',units:[transport.id],source,
   summary:special+split+' Capacity '+capacity[transport.unit]+'. '+(list?'Eligible passengers: '+list+'.':'No eligible passengers are available.')});
 }
 return [...result,...transportMovementReminders('11e-votann-',[...passengers],carriers)];
}
