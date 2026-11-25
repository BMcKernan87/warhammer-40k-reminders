import {BATTLELINE_INQUISITORS} from './assigned-agent-data';
import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {MECHANICUS_ARMY_SHEETS} from './mechanicus-army-data';
import {mechanicusKeywords} from './mechanicus-keywords';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

export const mechanicusCarrierCapacity:Readonly<Record<string,{spaces:number;dedicated:boolean}>>={
 'Skorpius Dunerider':{spaces:12,dedicated:true},'Archaeopter Transvector':{spaces:11,dedicated:false},
};
const sheets=new Map(MECHANICUS_ARMY_SHEETS.map(s=>[s.unit,s]));
export function mechanicusFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 if(army.faction!=='Adeptus Mechanicus')return [];
 const snapshot={...army,instances:[...roster]};
 const roots=new Map(roster.map(s=>[s.id,knightJoinedBodyguard(snapshot,s)?.id]));
 return roster.filter(s=>!roots.get(s.id)).map(root=>({root,members:[root,...roster.filter(s=>roots.get(s.id)===root.id)]}));
}
/** Transport permissions apply to every physical model, not the unit's combined keywords. */
export function mechanicusCargoFormations(army:ArmySelection,carrier:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
 const capacity=mechanicusCarrierCapacity[carrier.unit];
 if(!capacity||!roster.some(s=>s.id===carrier.id&&s.unit===carrier.unit))return [];
 return mechanicusFormations(army,roster).flatMap(group=>{
  if(group.root.attachedTo||group.root.retinueTo||sheets.get(group.root.unit)?.attachmentRole==='support'||roster.some(s=>s.attachedTo===group.root.id&&!group.members.some(m=>m.id===s.id)))return [];
  let spaces=0;
  for(const squad of group.members){
   const sheet=sheets.get(squad.unit),count=squad.models??sheet?.sizes[0]??0;
   if(!sheet||!Number.isInteger(count)||count<1)return [];
   const authority=squad.id!==group.root.id&&BATTLELINE_INQUISITORS.has(squad.unit);
   if(!authority){
    const composition=sheet.compositionBySize?.[count];
    if(sheet.compositionBySize&&!composition)return [];
    const models=composition?Object.entries(composition).filter(([,n])=>n>0).map(([model])=>model):[undefined];
    for(const model of models){
     const tags=mechanicusKeywords(army,squad,model);
     if(!tags.has('ADEPTUS MECHANICUS')||!tags.has('INFANTRY')||tags.has('JUMP PACK')||tags.has('KATAPHRON')||squad.unit==='Sydonian Skatros')return [];
     if(carrier.unit==='Archaeopter Transvector'&&!tags.has('SKITARII')&&!tags.has('TECH-PRIEST'))return [];
    }
   }
   spaces+=count;
  }
  return spaces<=capacity.spaces?[{...group,spaces}]:[];
 });
}
export function mechanicusCargoFits(army:ArmySelection,carrier:RosterInstance,ids:readonly string[],roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 const capacity=mechanicusCarrierCapacity[carrier.unit];
 if(!capacity||!ids.length||new Set(ids).size!==ids.length)return false;
 const groups=mechanicusCargoFormations(army,carrier,roster).filter(g=>ids.includes(g.root.id));
 return groups.length===ids.length&&groups.reduce((n,g)=>n+g.spaces,0)<=capacity.spaces;
}
export function mechanicusTransportReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Adeptus Mechanicus')return [];
 const rows:GeneratedReminder[]=[];
 for(const carrier of roster){
  const capacity=mechanicusCarrierCapacity[carrier.unit];if(!capacity)continue;
  const groups=mechanicusCargoFormations(army,carrier,roster);
  const targets=groups.length?'Eligible whole formations: '+groups.map(g=>g.root.id+' ('+g.spaces+' spaces)').join(', ')+'.':'No eligible whole formation fits.';
  const kind=carrier.unit==='Archaeopter Transvector'?'Skitarii Infantry or Tech-Priest Infantry':'Adeptus Mechanicus Infantry';
  rows.push({id:'11e-mechanicus-cargo-'+carrier.id,title:carrier.id+' · Declare passengers',window:'Pre-battle',turn:'either',timing:'during',origin:'unit',units:[carrier.id],source:sheets.get(carrier.unit)!.source,summary:'Capacity '+capacity.spaces+' '+kind+' models, including attached Inquisitors with Authority of the Inquisition. Every physical model must qualify; count all attached Leader and Support models. Jump Pack, Kataphron and Sydonian Skatros models cannot embark. '+(capacity.dedicated?'Start with passengers aboard or this Dedicated Transport is destroyed. ':'')+targets});
  if(groups.length)rows.push({id:'11e-mechanicus-disembark-'+carrier.id,title:carrier.id+' · Disembarkation',window:'Movement',turn:'own',timing:'during',origin:'unit',units:[carrier.id],source:'https://wahapedia.ru/wh40k11ed/the-rules/core-rules/',summary:'A unit that did not embark this phase can disembark before this transport moves. After a Normal or ingress move, set the unit up wholly within 3″. It cannot normally charge after a rapid disembarkation. '+targets});
 }
 return rows;
}
