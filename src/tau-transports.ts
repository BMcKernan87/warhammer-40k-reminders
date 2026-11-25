import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {TAU_SHEETS} from './tau-data';
import {tauKeywords} from './tau-keywords';
import {tauModelLoadouts,tauWeaponCount} from './tau-loadouts';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(TAU_SHEETS.map(s=>[s.unit,s]));
export type TauCapacity={kind:'infantry'|'drones';spaces:number;dedicated:boolean}|{kind:'manta';infantry:number;vehicles:number;battlesuits:number;dedicated:false};
export function tauTransportCapacity(carrier:RosterInstance):TauCapacity|undefined{
 if(carrier.unit==='Devilfish')return {kind:'infantry',spaces:12,dedicated:true};
 if(carrier.unit==='Tidewall Shieldline')return {kind:'infantry',spaces:tauWeaponCount(carrier,'Tidewall defence platform')?22:11,dedicated:false};
 if(carrier.unit==='Tidewall Droneport'||carrier.unit==='Tidewall Gunrig')return {kind:'infantry',spaces:11,dedicated:false};
 if(carrier.unit==='Tiger Shark'&&tauWeaponCount(carrier,'Transport bay')>0)return {kind:'drones',spaces:12,dedicated:false};
 if(carrier.unit==='Manta')return {kind:'manta',infantry:200,vehicles:4,battlesuits:8,dedicated:false};
}
export function tauFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 if(army.faction!=='T’au Empire')return [];
 const original=new Map(expandRoster(army).map(s=>[s.id,s]));
 // A casualty snapshot does not change the Starting Strength that permitted two Shapers.
 const snapshot={...army,instances:roster.map(s=>s.unit==='Kroot Carnivores'&&original.get(s.id)?.models===20?{...s,models:20}:s)};
 const roots=new Map(roster.map(s=>[s.id,knightJoinedBodyguard(snapshot,s)?.id]));
 const survivors=new Map<string,RosterInstance[]>();
 for(const squad of roster){
  const start=original.get(squad.id);
  const former=start&&knightJoinedBodyguard(army,start)?.id;
  if(former&&squad.attachedTo===former&&!roster.some(s=>s.id===former))survivors.set(former,[...survivors.get(former)??[],squad]);
 }
 // Core 19.01.01 explicitly replaces older rules that split surviving Leaders.
 for(const members of survivors.values())for(const member of members.slice(1))roots.set(member.id,members[0].id);
 return roster.filter(s=>!roots.get(s.id)).map(root=>({root,members:[root,...roster.filter(s=>roots.get(s.id)===root.id)]}));
}
interface TauBays{infantry:number;vehicles:number;battlesuits:number;flexible:number}
const emptyBays=():TauBays=>({infantry:0,vehicles:0,battlesuits:0,flexible:0});
function baysFit(capacity:Extract<TauCapacity,{kind:'manta'}>,bays:TauBays):boolean{
 return bays.infantry<=capacity.infantry&&bays.vehicles<=capacity.vehicles&&bays.battlesuits<=capacity.battlesuits&&
  bays.flexible<=capacity.infantry-bays.infantry+capacity.battlesuits-bays.battlesuits;
}
/** Passenger permission and bay usage are checked for every physical model in the formation. */
export function tauCargoFormations(army:ArmySelection,carrier:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
 const capacity=tauTransportCapacity(carrier);
 if(!capacity||!roster.some(s=>s.id===carrier.id&&s.unit===carrier.unit))return [];
 const snapshot={...army,instances:[...roster]};
 return tauFormations(army,roster).flatMap(group=>{
  const original=expandRoster(army).find(s=>s.id===group.root.id);
  const survivingLeader=group.root.attachedTo&&!roster.some(s=>s.id===group.root.attachedTo)&&original&&knightJoinedBodyguard(army,original)?.id===group.root.attachedTo;
  if(group.root.id===carrier.id||(group.root.attachedTo&&!survivingLeader)||group.root.retinueTo||roster.some(s=>s.attachedTo===group.root.id&&!group.members.some(m=>m.id===s.id)))return [];
  let spaces=0;const bays=emptyBays();
  for(const squad of group.members){
   const sheet=sheets.get(squad.unit),count=squad.models??sheet?.sizes[0]??0;
   if(!sheet||!Number.isInteger(count)||count<1)return [];
   const models=tauModelLoadouts(squad);
   if(models.length!==count)return [];
   for(const model of models){
    const tags=tauKeywords(snapshot,squad,model.model);
    if(!tags.has('T’AU EMPIRE'))return [];
    if(capacity.kind==='infantry'){
     if(!tags.has('INFANTRY')||tags.has('BATTLESUIT')||tags.has('KROOT')||squad.unit==='Vespid Stingwings')return [];
    }else if(capacity.kind==='drones'){
     if(!tags.has('TACTICAL DRONES'))return [];
    }else{
     const infantry=tags.has('INFANTRY')||tags.has('TACTICAL DRONES');
     const profile=sheet.modelProfiles?.[model.model]??sheet.profile;
     const wounds=(profile?.wounds??Infinity)+model.items.filter(i=>i.toLowerCase()==='shield drone').length;
     const battlesuit=tags.has('BATTLESUIT')&&wounds<=9;
     if(['Devilfish','Sky Ray Gunship','Hammerhead Gunship'].includes(squad.unit))bays.vehicles++;
     else if(infantry&&battlesuit)bays.flexible++;
     else if(infantry)bays.infantry++;
     else if(battlesuit)bays.battlesuits++;
     else return [];
    }
    spaces++;
   }
  }
  return (capacity.kind==='manta'?baysFit(capacity,bays):spaces<=capacity.spaces)?[{...group,spaces,bays}]:[];
 });
}
export function tauCargoFits(army:ArmySelection,carrier:RosterInstance,ids:readonly string[],roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 const capacity=tauTransportCapacity(carrier);
 if(!capacity||!ids.length||new Set(ids).size!==ids.length)return false;
 const groups=tauCargoFormations(army,carrier,roster).filter(g=>ids.includes(g.root.id));
 if(groups.length!==ids.length)return false;
 if(capacity.kind!=='manta')return groups.reduce((n,g)=>n+g.spaces,0)<=capacity.spaces;
 const bays=groups.reduce((total,g)=>({infantry:total.infantry+g.bays.infantry,vehicles:total.vehicles+g.bays.vehicles,battlesuits:total.battlesuits+g.bays.battlesuits,flexible:total.flexible+g.bays.flexible}),emptyBays());
 return baysFit(capacity,bays);
}
export function tauTransportReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='T’au Empire')return [];
 const rows:GeneratedReminder[]=[];
 for(const carrier of roster){
  const capacity=tauTransportCapacity(carrier);if(!capacity)continue;
  const groups=tauCargoFormations(army,carrier,roster);
  const targets=groups.length?'Eligible whole formations: '+groups.map(g=>g.root.id+' ('+g.spaces+' models)').join(', ')+'.':'No eligible whole formation fits.';
  const permission=capacity.kind==='manta'?'Separate bays hold 200 T’au Empire Infantry or Tactical Drone models, four Devilfish/Sky Ray Gunship/Hammerhead models, and eight Battlesuit models with Wounds 9 or less. Check the actual model profile including shield drones. A model occupies only one eligible bay; do not pool the three limits.':capacity.kind==='drones'?'Transport bay holds 12 Tactical Drones models. Equipped drone tokens are not Tactical Drones units and cannot fill this bay.':'Capacity '+capacity.spaces+' T’au Empire Infantry models. Battlesuit, Kroot and Vespid Stingwings models cannot embark.';
  rows.push({id:'11e-tau-cargo-'+carrier.id,title:carrier.id+' · Declare passengers',window:'Pre-battle',turn:'either',timing:'during',origin:'unit',units:[carrier.id],source:sheets.get(carrier.unit)!.source,summary:permission+' Count every physical model in an attached formation, including its Leader; equipped drone tokens take no passenger spaces. '+(capacity.dedicated?'Start with passengers aboard or this Dedicated Transport is destroyed. ':'')+targets});
  if(groups.length)rows.push({id:'11e-tau-disembark-'+carrier.id,title:carrier.id+' · Disembarkation',window:'Movement',turn:'own',timing:'during',origin:'unit',units:[carrier.id],source:'https://wahapedia.ru/wh40k11ed/the-rules/core-rules/',summary:'A unit that did not embark this phase can disembark before this transport moves. After a Normal or ingress move, set the unit up wholly within 3″. It cannot normally charge after a rapid disembarkation. '+targets});
 }
 return rows;
}
