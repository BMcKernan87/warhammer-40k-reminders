import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {TYRANID_SHEETS} from './tyranid-data';
import {tyranidKeywords} from './tyranid-keywords';
import {tyranidModelLoadouts} from './tyranid-loadouts';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(TYRANID_SHEETS.map(s=>[s.unit,s]));
export function tyranidTransportCapacity(carrier:RosterInstance){
 if(carrier.unit==='Tyrannocyte')return {kind:'tyrannocyte' as const,spaces:20,dedicated:true};
 if(carrier.unit==='Harridan')return {kind:'harridan' as const,spaces:20,primeSpaces:1,dedicated:false};
 if(carrier.unit==='Hierophant')return {kind:'hierophant' as const,spaces:20,dedicated:false};
}
export function tyranidFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 if(army.faction!=='Tyranids')return [];
 const native=roster.filter(s=>sheets.has(s.unit)),snapshot={...army,instances:[...native]};
 const roots=new Map(native.map(s=>[s.id,knightJoinedBodyguard(snapshot,s)?.id]));
 return native.filter(s=>!roots.get(s.id)).map(root=>({root,members:[root,...native.filter(s=>roots.get(s.id)===root.id)]}));
}
interface Usage{infantry:number;monsters:number;gargoyles:number;primes:number}
function fits(kind:NonNullable<ReturnType<typeof tyranidTransportCapacity>>['kind'],u:Usage):boolean{
 if(kind==='harridan')return u.gargoyles<=20&&u.primes<=1;
 if(kind==='tyrannocyte'&&u.monsters)return u.monsters===1&&u.infantry===0;
 return u.infantry<=20&&u.monsters===0;
}
/** Check every physical model, including models in a multi-model Leader unit. */
export function tyranidCargoFormations(army:ArmySelection,carrier:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
 const capacity=tyranidTransportCapacity(carrier);
 if(!capacity||!roster.some(s=>s.id===carrier.id&&s.unit===carrier.unit))return [];
 const current={...army,instances:[...roster]},original=expandRoster(army);
 return tyranidFormations(army,roster).flatMap(group=>{
  const start=original.find(s=>s.id===group.root.id);
  const formerLeader=group.root.attachedTo&&!roster.some(s=>s.id===group.root.attachedTo)&&start&&knightJoinedBodyguard(army,start)?.id===group.root.attachedTo;
  if(group.root.id===carrier.id||(group.root.attachedTo&&!formerLeader)||group.root.retinueTo||roster.some(s=>s.attachedTo===group.root.id&&!group.members.some(m=>m.id===s.id)))return [];
  const usage:Usage={infantry:0,monsters:0,gargoyles:0,primes:0};let models=0;
  for(const squad of group.members){
   const sheet=sheets.get(squad.unit),count=squad.models??sheet?.sizes[0]??0;
   if(!sheet||!Number.isInteger(count)||count<1)return [];
   const physical=tyranidModelLoadouts(squad);if(physical.length!==count)return [];
   for(const model of physical){
    const tags=tyranidKeywords(current,squad,model.model),profile=sheet.modelProfiles?.[model.model]??sheet.profile;
    if(!tags.has('TYRANIDS')||!profile)return [];
    if(capacity.kind==='harridan'){
     if(squad.unit==='Gargoyles')usage.gargoyles++;
     else if(squad.unit==='Winged Tyranid Prime')usage.primes++;
     else return [];
    }else if(tags.has('INFANTRY')&&(capacity.kind!=='hierophant'||!tags.has('FLY'))){
     usage.infantry+=profile.wounds>1?3:1;
    }else if(capacity.kind==='tyrannocyte'&&tags.has('MONSTER')&&profile.wounds<=12){
     usage.monsters++;
    }else return [];
    models++;
   }
  }
  const spaces=capacity.kind==='harridan'?usage.gargoyles+usage.primes:usage.infantry+usage.monsters;
  return fits(capacity.kind,usage)?[{...group,models,spaces,usage}]:[];
 });
}
export function tyranidCargoFits(army:ArmySelection,carrier:RosterInstance,ids:readonly string[],roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 const capacity=tyranidTransportCapacity(carrier);
 if(!capacity||!ids.length||new Set(ids).size!==ids.length)return false;
 const groups=tyranidCargoFormations(army,carrier,roster).filter(g=>ids.includes(g.root.id));
 if(groups.length!==ids.length)return false;
 const usage=groups.reduce((u,g)=>({infantry:u.infantry+g.usage.infantry,monsters:u.monsters+g.usage.monsters,gargoyles:u.gargoyles+g.usage.gargoyles,primes:u.primes+g.usage.primes}),{infantry:0,monsters:0,gargoyles:0,primes:0});
 return fits(capacity.kind,usage);
}
export function tyranidTransportReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Tyranids')return [];
 const rows:GeneratedReminder[]=[];
 for(const carrier of roster){
  const capacity=tyranidTransportCapacity(carrier);if(!capacity)continue;
  const groups=tyranidCargoFormations(army,carrier,roster);
  const targets=groups.length?'Eligible whole formations: '+groups.map(g=>g.root.id+' ('+g.models+' models; '+g.spaces+' spaces)').join(', ')+'.':'No eligible whole formation fits.';
  const permission=capacity.kind==='harridan'?'Separate capacity holds 20 Gargoyle models and one Winged Tyranid Prime. The Prime does not use a Gargoyle space.':capacity.kind==='hierophant'?'Capacity 20 Tyranids Infantry spaces. Every model with more than one Wound takes three spaces. Models with Fly cannot embark.':'Capacity 20 Tyranids Infantry spaces, or one Tyranids Monster model with Wounds 12 or less. Every Infantry model with more than one Wound takes three spaces. The Infantry and single-Monster alternatives cannot be mixed.';
  const source=sheets.get(carrier.unit)!.source;
  rows.push({id:'11e-tyranid-cargo-'+carrier.id,title:carrier.id+' · Declare passengers',window:'Pre-battle',turn:'either',timing:'during',origin:'unit',units:[carrier.id],source,summary:permission+' Count each physical model in the entire attached formation, including all models in its Leader unit. '+(capacity.dedicated?'Start with passengers aboard or this Dedicated Transport is destroyed. ':'')+targets});
  if(capacity.kind==='tyrannocyte'){
   rows.push({id:'11e-tyranid-seeding-reserves-'+carrier.id,title:carrier.id+' · Aerial Seeding reserves',window:'Pre-battle',turn:'either',timing:'during',origin:'unit',units:[carrier.id],source,summary:'This Tyrannocyte must start in Reserves. It and its actual embarked units do not count towards the starting Reserves limits. '+targets});
   rows.push({id:'11e-tyranid-seeding-arrival-'+carrier.id,title:carrier.id+' · Aerial Seeding arrival',window:'Movement',turn:'own',timing:'during',origin:'unit',units:[carrier.id],source,summary:'This model may arrive in your first, second or third Movement phase, regardless of mission restrictions. Immediately disembark every embarked unit using Rapid Disembark: set each model wholly within 3″ of this Tyrannocyte, more than 8″ from all enemy models, and following the same ingress placement restrictions as the Tyrannocyte. Those units cannot declare a charge until the end of the turn. If a passenger is physically too large to fit wholly within 3″, place its base within 1″ of the Tyrannocyte’s base or hull instead, while remaining unengaged and obeying the other placement restrictions. Once this Tyrannocyte has been set up, no unit can embark in it. '+targets});
  }else if(groups.length)rows.push({id:'11e-tyranid-disembark-'+carrier.id,title:carrier.id+' · Disembarkation',window:'Movement',turn:'own',timing:'during',origin:'unit',units:[carrier.id],source:'https://wahapedia.ru/wh40k11ed/the-rules/core-rules/',summary:'A unit that did not embark this phase can disembark before this transport moves. After a Normal or ingress move, set it up wholly within 3″; it cannot normally charge after a rapid disembarkation. '+targets});
 }
 return rows;
}
