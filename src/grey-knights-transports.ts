import {BATTLELINE_INQUISITORS} from './assigned-agent-data';
import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {GREY_KNIGHTS_ARMY_SHEETS,greyKnightsKeywords,greyKnightsMusterUnits} from './grey-knights-data';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

interface Capacity {spaces:number;terminators:boolean;dedicated?:boolean;dreadnoughts?:number}
export const greyKnightsCarrierCapacity:Readonly<Record<string,Capacity>>={
 Rhino:{spaces:12,terminators:false,dedicated:true},Razorback:{spaces:6,terminators:false,dedicated:true},
 'Land Raider':{spaces:12,terminators:true},'Land Raider Crusader':{spaces:16,terminators:true},'Land Raider Redeemer':{spaces:14,terminators:true},
 'Stormraven Gunship':{spaces:12,terminators:true,dreadnoughts:1},'Grey Knights Thunderhawk Gunship':{spaces:30,terminators:true},
};
const sheets=new Map(GREY_KNIGHTS_ARMY_SHEETS.map(s=>[s.unit,s]));
export function greyKnightsFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 if(army.faction!=='Grey Knights')return [];
 const snapshot={...army,instances:[...roster]};
 const roots=new Map(roster.map(s=>[s.id,knightJoinedBodyguard(snapshot,s)?.id]));
 return roster.filter(s=>!roots.get(s.id)).map(root=>({root,members:[root,...roster.filter(s=>roots.get(s.id)===root.id)]}));
}
// Resolve a legal starting formation against the surviving roster. This is
// shared by persistent selections and while-leading abilities; callers decide
// separately whether an effect requires its original source to remain alive.
export function greyKnightsOriginalFormationResolver(army:ArmySelection,roster:readonly RosterInstance[],declared:readonly RosterInstance[]=expandRoster(army)){
 const legal=new Set(greyKnightsMusterUnits(army));
 const originalGroups=greyKnightsFormations(army,declared);
 const sameMember=(start:RosterInstance,current:RosterInstance)=>start.id===current.id&&start.unit===current.unit&&start.attachedTo===current.attachedTo&&start.retinueTo===current.retinueTo&&Boolean(start.keepUnattached)===Boolean(current.keepUnattached);
 // Validate the original formation even when the source has since died. A
 // previous selection is not a new activation by a surviving source.
 function originalFormation(s:RosterInstance){
  const original=originalGroups.find(g=>g.members.some(m=>sameMember(m,s)));
  if(!original||original.root.attachedTo||original.root.retinueTo)return;
  if(original.members.some(m=>!legal.has(m.unit)||(m.models??1)<=0||m.retinueTo||(m.attachedTo&&m.keepUnattached)||declared.filter(d=>d.id===m.id).length!==1))return;
  const ids=new Set(original.members.map(m=>m.id)),survivors:RosterInstance[]=[];
  // An invalid original join must not turn into a valid standalone source just
  // because formation resolution rejected that join or the Bodyguard died.
  if(declared.some(m=>!ids.has(m.id)&&(ids.has(m.attachedTo??'')||ids.has(m.retinueTo??''))))return;
  for(const member of original.members){
   const current=roster.filter(m=>m.id===member.id);
   if(current.length>1)return;
   const live=current[0];
   if(!live)continue;
   if(!sameMember(member,live))return;
   if((live.models??1)>0)survivors.push(live);
  }
  if(roster.some(m=>!ids.has(m.id)&&(ids.has(m.attachedTo??'')||ids.has(m.retinueTo??''))))return;
  return {original,survivors,leading:original.root.id!==s.id,bodyguardSurvives:survivors.some(m=>m.id===original.root.id)};
 }
 return originalFormation;
}

export function greyKnightsCargoFormations(army:ArmySelection,carrier:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
 const capacity=greyKnightsCarrierCapacity[carrier.unit];
 if(!capacity||!roster.some(s=>s.id===carrier.id&&s.unit===carrier.unit))return [];
 return greyKnightsFormations(army,roster).flatMap(group=>{
  if(group.root.attachedTo||group.root.retinueTo||roster.some(s=>s.attachedTo===group.root.id&&!group.members.some(m=>m.id===s.id)))return [];
  if(group.root.unit==='Venerable Dreadnought'&&capacity.dreadnoughts&&group.members.length===1)return [{...group,spaces:0,dreadnoughts:1}];
  let spaces=0;
  for(const s of group.members){
   const tags=greyKnightsKeywords(army,s);
   const authority=s.id!==group.root.id&&BATTLELINE_INQUISITORS.has(s.unit);
   if(!authority&&(!tags.has('GREY KNIGHTS')||!tags.has('INFANTRY')||tags.has('TERMINATOR')&&!capacity.terminators))return [];
   spaces+=(s.models??sheets.get(s.unit)?.sizes[0]??1)*(tags.has('TERMINATOR')?2:1);
  }
  return spaces<=capacity.spaces?[{...group,spaces,dreadnoughts:0}]:[];
 });
}
export function greyKnightsCargoFits(army:ArmySelection,transport:RosterInstance,ids:readonly string[],roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 const capacity=greyKnightsCarrierCapacity[transport.unit];
 if(!capacity||!ids.length||new Set(ids).size!==ids.length)return false;
 const loaded=greyKnightsCargoFormations(army,transport,roster).filter(g=>ids.includes(g.root.id));
 return loaded.length===ids.length&&loaded.reduce((n,g)=>n+g.spaces,0)<=capacity.spaces&&loaded.reduce((n,g)=>n+g.dreadnoughts,0)<=(capacity.dreadnoughts??0);
}
export function greyKnightsTransportReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Grey Knights')return [];
 const rows:GeneratedReminder[]=[];
 for(const transport of roster){
  const capacity=greyKnightsCarrierCapacity[transport.unit];if(!capacity)continue;
  const groups=greyKnightsCargoFormations(army,transport,roster);
  if(!groups.length&&!capacity.dedicated)continue;
  const targets=groups.length?'Eligible whole formations: '+groups.map(g=>g.root.id+(g.dreadnoughts?' (Dreadnought bay)':' ('+g.spaces+' spaces)')).join(', ')+'.':'No eligible passenger formation fits.';
  const description='Capacity '+capacity.spaces+' Grey Knights Infantry spaces'+(capacity.dreadnoughts?' plus one Venerable Dreadnought':'')+'. '+(capacity.terminators?'Terminators use two spaces each. ':'Terminators cannot embark. ')+(capacity.dedicated?'Start with passengers aboard or this Dedicated Transport is destroyed. ':'');
  rows.push({id:'11e-gk-cargo-'+transport.id,title:transport.id+' · Declare passengers',window:'Pre-battle',turn:'either',timing:'during',origin:'unit',units:[transport.id],source:sheets.get(transport.unit)!.source,summary:description+targets});
  if(groups.length)rows.push({id:'11e-gk-disembark-'+transport.id,title:transport.id+' · Disembarkation',window:'Movement',turn:'own',timing:'during',origin:'unit',units:[transport.id],source:'https://wahapedia.ru/wh40k11ed/the-rules/core-rules/',summary:'A unit that did not embark this phase can disembark before this transport moves. After a Normal or ingress move, set the unit up wholly within 3″. It cannot normally charge after a rapid disembarkation. '+targets});
 }
 return rows;
}
