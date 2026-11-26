import {BATTLELINE_INQUISITORS} from './assigned-agent-data';
import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {SORORITAS_ARMY_SHEETS,sororitasKeywords} from './sororitas-army-data';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

export const sororitasCarrierCapacity:Readonly<Record<string,{spaces:number;dedicated:boolean}>>={
 'Sororitas Rhino':{spaces:12,dedicated:true},Immolator:{spaces:6,dedicated:true},
};
const splitUnits=new Set(['Battle Sisters Squad','Dominion Squad','Sisters Novitiate Squad']);
const sheets=new Map(SORORITAS_ARMY_SHEETS.map(s=>[s.unit,s]));
export function sororitasFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 if(army.faction!=='Adepta Sororitas')return [];
 const snapshot={...army,instances:[...roster]};
 const roots=new Map(roster.map(s=>[s.id,knightJoinedBodyguard(snapshot,s)?.id]));
 return roster.filter(s=>!roots.get(s.id)).map(root=>({root,members:[root,...roster.filter(s=>roots.get(s.id)===root.id)]}));
}
function passengers(army:ArmySelection,roster:readonly RosterInstance[]){
 return sororitasFormations(army,roster).flatMap(group=>{
  if(group.root.attachedTo||group.root.retinueTo||roster.some(s=>s.attachedTo===group.root.id&&!group.members.some(m=>m.id===s.id)))return [];
  let spaces=0;
  for(const s of group.members){
   const tags=sororitasKeywords(army,s);
   const authority=s.id!==group.root.id&&BATTLELINE_INQUISITORS.has(s.unit);
   if(!authority&&(!tags.has('ADEPTA SORORITAS')||!tags.has('INFANTRY')||tags.has('JUMP PACK')||/Triumph Of Saint Katherine/i.test(s.unit)))return [];
   spaces+=s.models??sheets.get(s.unit)?.sizes[0]??1;
  }
  return [{...group,spaces}];
 });
}
/** Whole formations only. Split halves have not been assigned physical models. */
export function sororitasCargoFormations(army:ArmySelection,carrier:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
 const capacity=sororitasCarrierCapacity[carrier.unit];
 if(!capacity||!roster.some(s=>s.id===carrier.id&&s.unit===carrier.unit))return [];
 return passengers(army,roster).filter(g=>g.spaces<=capacity.spaces);
}
export function sororitasSplitCargoFormations(army:ArmySelection,carrier:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
 if(carrier.unit!=='Immolator'||!roster.some(s=>s.id===carrier.id&&s.unit===carrier.unit))return [];
 return passengers(army,roster).filter(g=>splitUnits.has(g.root.unit)&&Math.floor(g.spaces/2)<=6).map(g=>({...g,halves:[Math.floor(g.spaces/2),Math.ceil(g.spaces/2)] as const}));
}
export function sororitasCargoFits(army:ArmySelection,carrier:RosterInstance,ids:readonly string[],roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 const capacity=sororitasCarrierCapacity[carrier.unit];
 if(!capacity||!ids.length||new Set(ids).size!==ids.length)return false;
 const groups=sororitasCargoFormations(army,carrier,roster).filter(g=>ids.includes(g.root.id));
 return groups.length===ids.length&&groups.reduce((n,g)=>n+g.spaces,0)<=capacity.spaces;
}
/** A split supplies exactly two units, with at least one aboard its Immolator. */
export function sororitasDedicatedSatisfied(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 const vehicles=roster.filter(s=>sororitasCarrierCapacity[s.unit]?.dedicated).sort((a,b)=>sororitasCarrierCapacity[a.unit].spaces-sororitasCarrierCapacity[b.unit].spaces);
 const groups=passengers(army,roster),failed=new Set<string>();
 function fill(index:number,used:ReadonlySet<number>,halves:readonly number[]):boolean{
  if(index===vehicles.length)return true;
  if(vehicles.length-index>groups.length-used.size+halves.length+Math.min(vehicles.slice(index).filter(v=>v.unit==='Immolator').length,groups.filter((g,i)=>!used.has(i)&&splitUnits.has(g.root.unit)).length))return false;
  const key=JSON.stringify([index,[...used].sort((a,b)=>a-b),[...halves].sort((a,b)=>a-b)]);
  if(failed.has(key))return false;
  const vehicle=vehicles[index],capacity=sororitasCarrierCapacity[vehicle.unit].spaces;
  for(let n=0;n<halves.length;n++)if(halves[n]<=capacity&&fill(index+1,used,halves.filter((_,j)=>j!==n)))return true;
  for(let i=0;i<groups.length;i++){
   if(used.has(i))continue;
   const g=groups[i],next=new Set([...used,i]);
   if(g.spaces<=capacity&&fill(index+1,next,halves))return true;
   if(vehicle.unit==='Immolator'&&splitUnits.has(g.root.unit))for(const aboard of new Set([Math.floor(g.spaces/2),Math.ceil(g.spaces/2)])){
    if(aboard<=capacity&&fill(index+1,next,[...halves,g.spaces-aboard]))return true;
   }
  }
  failed.add(key);return false;
 }
 return fill(0,new Set(),[]);
}
export function sororitasTransportReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Adepta Sororitas')return [];
 const result:GeneratedReminder[]=[];
 for(const transport of roster){
  const capacity=sororitasCarrierCapacity[transport.unit];if(!capacity)continue;
  const groups=sororitasCargoFormations(army,transport,roster),split=sororitasSplitCargoFormations(army,transport,roster);
  const targets=groups.length?'Whole formations that fit: '+groups.map(g=>g.root.id+' ('+g.spaces+' spaces)').join(', ')+'.':'No eligible whole formation fits.';
  const splitText=split.length?' At the start of Declare Battle Formations, this Immolator may split one of '+split.map(g=>g.root.id+' ('+g.halves.join(' + ')+' models)').join(', ')+'. Count all attached models when dividing as evenly as possible. One half must start aboard this Immolator; the other can deploy separately or embark in another eligible transport. Allocate every physical model and its equipment to one half. If the original unit has Cherub, only one resulting half retains it; choose which.':'';
  result.push({id:'11e-sororitas-cargo-'+transport.id,title:transport.id+' · Declare passengers',window:'Pre-battle',turn:'either',timing:'during',origin:'unit',units:[transport.id],source:sheets.get(transport.unit)!.source,summary:'Capacity '+capacity.spaces+' Adepta Sororitas Infantry models, including attached Inquisitors with Authority of the Inquisition. Jump Pack models and the Triumph of Saint Katherine cannot embark. Start with passengers aboard or this Dedicated Transport is destroyed. '+targets+splitText});
  if(groups.length||split.length)result.push({id:'11e-sororitas-disembark-'+transport.id,title:transport.id+' · Disembarkation',window:'Movement',turn:'own',timing:'during',origin:'unit',units:[transport.id],source:'https://wahapedia.ru/wh40k11ed/the-rules/core-rules/',summary:'A unit that did not embark this phase can disembark before this transport moves. After a Normal or ingress move, set up wholly within 3″; the unit cannot normally charge after this rapid disembarkation. Use only the models and equipment in the embarked half of a split squad. '+targets});
 }
 return result;
}
