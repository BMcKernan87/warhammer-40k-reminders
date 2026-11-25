import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {PHASES} from './engine';
import {CSM_ALL_SHEETS} from './csm-army-data';
import {csmArmyModelLoadouts} from './csm-army-loadouts';
import {csmKeywords} from './csm-keywords';
import {csmHasDetachment,csmMarksCompatible} from './csm-muster-data';
import {csmFormations} from './csm-formations';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

export {csmFormations} from './csm-formations';

const sheets=new Map(CSM_ALL_SHEETS.map(s=>[s.unit,s]));
export function csmTransportCapacity(carrier:RosterInstance){
 if(carrier.unit==='Chaos Rhino')return {spaces:12,dedicated:true,kind:'rhino' as const};
 if(carrier.unit==='Chaos Land Raider')return {spaces:12,dedicated:false,kind:'land-raider' as const};
}
/** Capacity is counted by physical models, including every model in Leader/Support units. */
export function csmCargoFormations(army:ArmySelection,carrier:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
 const capacity=csmTransportCapacity(carrier);
 if(!capacity||army.faction!=='Chaos Space Marines'||!roster.some(s=>s.id===carrier.id&&s.unit===carrier.unit))return [];
 const current={...army,instances:[...roster]},original=expandRoster(army);
 return csmFormations(army,roster).flatMap(group=>{
  const start=original.find(s=>s.id===group.root.id);
  const former=group.root.attachedTo&&!roster.some(s=>s.id===group.root.attachedTo)&&start&&knightJoinedBodyguard(army,start)?.id===group.root.attachedTo;
  if(group.root.id===carrier.id||(group.root.attachedTo&&!former)||group.root.retinueTo||roster.some(s=>s.attachedTo===group.root.id&&!group.members.some(m=>m.id===s.id)))return [];
  let models=0,spaces=0;
  for(const member of group.members){
   if(!csmMarksCompatible(current,carrier,member))return [];
   const sheet=sheets.get(member.unit),count=member.models??sheet?.sizes[0]??0;
   if(!sheet||!Number.isInteger(count)||count<1)return [];
   const physical=csmArmyModelLoadouts(member);if(physical.length!==count)return [];
   for(const model of physical){
    const tags=csmKeywords(army,member,model.model,roster);
    if(!tags.has('HERETIC ASTARTES')||!tags.has('INFANTRY')||tags.has('JUMP PACK')||tags.has('OBLITERATOR')||tags.has('OBLITERATORS'))return [];
    const large=tags.has('TERMINATOR')||tags.has('MUTILATOR')||tags.has('MUTILATORS')||tags.has('POSSESSED');
    if(capacity.kind==='rhino'&&large)return [];
    spaces+=large?2:1;models++;
   }
  }
  return spaces<=capacity.spaces?[{...group,models,spaces}]:[];
 });
}
export function csmCargoFits(army:ArmySelection,carrier:RosterInstance,ids:readonly string[],roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 const capacity=csmTransportCapacity(carrier);if(!capacity||!ids.length||new Set(ids).size!==ids.length)return false;
 const selected=csmCargoFormations(army,carrier,roster).filter(g=>ids.includes(g.root.id));
 return selected.length===ids.length&&selected.reduce((n,g)=>n+g.spaces,0)<=capacity.spaces;
}
export function csmTransportReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Chaos Space Marines')return [];
 const rows:GeneratedReminder[]=[];
 for(const carrier of roster){
  const capacity=csmTransportCapacity(carrier);if(!capacity)continue;
  const groups=csmCargoFormations(army,carrier,roster),targets=groups.length?'Eligible whole formations: '+groups.map(g=>g.root.id+' ('+g.models+' models; '+g.spaces+' spaces)').join(', ')+'.':'No eligible whole formation fits.';
  const limits=capacity.kind==='rhino'?'Capacity 12 Heretic Astartes Infantry models. Terminator, Jump Pack, Mutilator, Obliterator and Possessed models cannot embark.':'Capacity 12 Heretic Astartes Infantry spaces. Possessed, Mutilator and Terminator models use two spaces each; Jump Pack and Obliterator models cannot embark.';
  const source=sheets.get(carrier.unit)!.source;
  rows.push({id:'11e-csm-cargo-'+carrier.id,title:carrier.id+' · Declare passengers',window:'Pre-battle',turn:'either',timing:'during',origin:'unit',units:[carrier.id],source,summary:limits+' Count the complete attached formation, including every physical model in Leader and Support units. '+(csmHasDetachment(army,'Pactbound Zealots')?'Every passenger unit must share this transport’s Mark of Chaos. ':'')+(capacity.dedicated?'Start with passengers aboard or this Dedicated Transport is destroyed. ':'')+targets});
  if(!groups.length)continue;
  const core='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';
  rows.push({id:'11e-csm-embark-'+carrier.id,title:carrier.id+' · Embarkation',window:'Movement',turn:'own',timing:'during',origin:'unit',units:[carrier.id],source:core,summary:'After a whole eligible formation makes a Normal, Advance or Fall Back move, it can embark if every model is within 3″, it was not set up on the battlefield this turn, and this transport has enough remaining capacity for every model. Count all units already aboard. Embarked models are not on the battlefield; abilities requiring visibility or measurement to other units cannot meet those conditions. '+targets});
  rows.push({id:'11e-csm-disembark-'+carrier.id,title:carrier.id+' · Disembarkation',window:'Movement',turn:'own',timing:'during',origin:'unit',units:[carrier.id],source:core,summary:'An embarked unit can disembark if it did not embark this phase and this transport has not Advanced or Fallen Back this phase. After a Normal or ingress move, use Rapid Disembark wholly within 3″; passengers cannot charge this turn unless a specific Assault Ramp or Raid Leader rule permits Assault Disembark. After ingress, obey the transport’s ingress placement restrictions. Otherwise, if the transport remained stationary or has not moved, use Tactical Disembark wholly within 3″ and unengaged, then select those passengers to make a Normal or Advance move. If Tactical placement is impossible, use Combat Disembark wholly within 6″: make a hazard roll for each model, permit engagement only with enemies already engaging this transport, then become Battle-shocked and unable to charge this turn. A model physically too large to fit wholly within 3″ can instead place its base within 1″ of the transport’s base or hull, unengaged. '+targets});
  for(const window of PHASES)rows.push({id:'11e-csm-emergency-'+carrier.id+'-'+window,title:carrier.id+' · Emergency disembarkation',window,turn:'either',timing:'during',origin:'unit',units:[carrier.id],source:core,summary:'If this transport is destroyed with passengers aboard, before removing it and before Deadly Demise, make a hazard roll for every embarked model. Set each model wholly within 6″ and as close as possible to the transport, unengaged if possible; only if that is impossible may it be set up engaged. Destroy any model that still cannot be placed. Each disembarked unit becomes Battle-shocked and cannot declare a charge until the end of the turn.'});
 }
 return rows;
}
