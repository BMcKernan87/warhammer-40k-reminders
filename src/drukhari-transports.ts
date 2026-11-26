import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {PHASES} from './engine';
import {DRUKHARI_SHEETS} from './drukhari-data';
import {drukhariModelLoadouts} from './drukhari-loadouts';
import {drukhariKeywords} from './drukhari-keywords';
import {drukhariFormations} from './drukhari-formations';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

export {drukhariFormations} from './drukhari-formations';
export const DRUKHARI_SPLIT_UNITS=new Set(['Kabalite Warriors','Hand of the Archon','Wyches']);
export const drukhariCarrierCapacity:Readonly<Record<string,{spaces:number;dedicated:boolean;kind:'drukhari'|'harlequins'}>>={
 Raider:{spaces:11,dedicated:true,kind:'drukhari'},
 Venom:{spaces:6,dedicated:true,kind:'drukhari'},
 Starweaver:{spaces:6,dedicated:true,kind:'harlequins'},
};
const sheets=new Map(DRUKHARI_SHEETS.map(s=>[s.unit,s]));
const core='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';

function passengerGroups(army:ArmySelection,roster:readonly RosterInstance[]){
 const original=new Map(expandRoster(army).map(s=>[s.id,s]));
 return drukhariFormations(army,roster).flatMap(group=>{
  const start=original.get(group.root.id);
  const former=group.root.attachedTo&&!roster.some(s=>s.id===group.root.attachedTo)&&start&&knightJoinedBodyguard(army,start)?.id===group.root.attachedTo;
  if((group.root.attachedTo&&!former)||group.root.retinueTo||roster.some(s=>s.attachedTo===group.root.id&&!group.members.some(m=>m.id===s.id)))return [];
  const physical=group.members.flatMap(s=>drukhariModelLoadouts(s).map(model=>({squad:s,model,keywords:drukhariKeywords(army,s,model.model,roster)})));
  if(!physical.length||physical.length!==group.models||!physical.every(p=>p.keywords.has('INFANTRY')))return [];
  const native=physical.every(p=>p.keywords.has('DRUKHARI')&&!p.keywords.has('JUMP PACK'));
  const harlequins=physical.every(p=>p.keywords.has('HARLEQUINS'));
  if(!native&&!harlequins)return [];
  return [{...group,spaces:physical.length,kind:native?'drukhari' as const:'harlequins' as const,canFly:physical.some(p=>p.keywords.has('FLY'))}];
 });
}
/** Every physical model, including attached characters, must be permitted and fit. */
export function drukhariCargoFormations(army:ArmySelection,carrier:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
 const capacity=drukhariCarrierCapacity[carrier.unit];
 if(!capacity||army.faction!=='Drukhari'||!roster.some(s=>s.id===carrier.id&&s.unit===carrier.unit))return [];
 return passengerGroups(army,roster).filter(g=>g.root.id!==carrier.id&&g.kind===capacity.kind&&g.spaces<=capacity.spaces);
}
/** Core 01.02.06 includes attached models when dividing a formation as evenly as possible. */
export function drukhariSplitCargoFormations(army:ArmySelection,carrier:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
 if(carrier.unit!=='Venom'||army.faction!=='Drukhari'||!roster.some(s=>s.id===carrier.id&&s.unit===carrier.unit))return [];
 return passengerGroups(army,roster).filter(g=>g.kind==='drukhari'&&DRUKHARI_SPLIT_UNITS.has(g.root.unit)&&g.models>=2&&Math.floor(g.models/2)<=6)
  .map(g=>({...g,halves:[Math.floor(g.models/2),Math.ceil(g.models/2)] as const}));
}
export function drukhariCargoFits(army:ArmySelection,carrier:RosterInstance,ids:readonly string[],roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 const capacity=drukhariCarrierCapacity[carrier.unit];if(!capacity||!ids.length||new Set(ids).size!==ids.length)return false;
 const selected=drukhariCargoFormations(army,carrier,roster).filter(g=>ids.includes(g.root.id));
 return selected.length===ids.length&&selected.reduce((n,g)=>n+g.spaces,0)<=capacity.spaces;
}
/** Match distinct legal passengers; each Venom split yields exactly two halves, once only. */
export function drukhariDedicatedSatisfied(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 if(army.faction!=='Drukhari')return true;
 const vehicles=roster.filter(s=>drukhariCarrierCapacity[s.unit]?.dedicated).sort((a,b)=>drukhariCarrierCapacity[a.unit].spaces-drukhariCarrierCapacity[b.unit].spaces);
 const groups=passengerGroups(army,roster),failed=new Set<string>();
 type Half={spaces:number;kind:'drukhari'|'harlequins'};
 function fill(index:number,used:ReadonlySet<number>,halves:readonly Half[]):boolean{
  if(index===vehicles.length)return true;
  const possibleSplits=Math.min(vehicles.slice(index).filter(v=>v.unit==='Venom').length,groups.filter((g,i)=>!used.has(i)&&DRUKHARI_SPLIT_UNITS.has(g.root.unit)&&g.kind==='drukhari').length);
  if(vehicles.length-index>groups.length-used.size+halves.length+possibleSplits)return false;
  const key=JSON.stringify([index,[...used].sort((a,b)=>a-b),halves.map(h=>h.kind+':'+h.spaces).sort()]);
  if(failed.has(key))return false;
  const vehicle=vehicles[index],capacity=drukhariCarrierCapacity[vehicle.unit];
  for(let n=0;n<halves.length;n++)if(halves[n].kind===capacity.kind&&halves[n].spaces<=capacity.spaces&&fill(index+1,used,halves.filter((_,j)=>j!==n)))return true;
  for(let i=0;i<groups.length;i++){
   const g=groups[i];if(used.has(i)||g.kind!==capacity.kind)continue;
   const next=new Set([...used,i]);
   if(g.spaces<=capacity.spaces&&fill(index+1,next,halves))return true;
   if(vehicle.unit==='Venom'&&DRUKHARI_SPLIT_UNITS.has(g.root.unit)&&g.models>=2)for(const aboard of new Set([Math.floor(g.models/2),Math.ceil(g.models/2)])){
    if(aboard<=capacity.spaces&&fill(index+1,next,[...halves,{spaces:g.spaces-aboard,kind:g.kind}]))return true;
   }
  }
  failed.add(key);return false;
 }
 return fill(0,new Set(),[]);
}
export function drukhariTransportReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Drukhari')return [];
 const rows:GeneratedReminder[]=[];
 for(const carrier of roster){
  const capacity=drukhariCarrierCapacity[carrier.unit];if(!capacity)continue;
  const groups=drukhariCargoFormations(army,carrier,roster),split=drukhariSplitCargoFormations(army,carrier,roster);
  const targets=groups.length?'Eligible whole formations: '+groups.map(g=>g.root.id+' ('+g.models+' models)').join(', ')+'.':'No eligible whole formation fits.';
  const splitText=split.length?' At the start of Declare Battle Formations, this Venom can split one of '+split.map(g=>g.root.id+' ('+g.halves.join(' + ')+' models)').join(', ')+'. Include attached characters when dividing as evenly as possible. Assign each physical model and its equipment to exactly one half; the halves cannot be split again. One half must start aboard this Venom; the other may deploy separately or embark in another eligible transport. Each half has its own Starting Strength and only the models and bearer abilities actually assigned to it.':'';
  const limits='Capacity '+capacity.spaces+' '+(capacity.kind==='drukhari'?'Drukhari Infantry models; Jump Pack models cannot embark.':'Harlequins Infantry models.');
  const source=sheets.get(carrier.unit)!.source;
  rows.push({id:'11e-drukhari-cargo-'+carrier.id,title:carrier.id+' · Declare passengers',window:'Pre-battle',turn:'either',timing:'during',origin:'unit',units:[carrier.id],source,summary:limits+' Count every model in the attached formation. Start with passengers aboard or this Dedicated Transport is destroyed. '+targets+splitText});
  if(!groups.length&&!split.length)continue;
  rows.push({id:'11e-drukhari-embark-'+carrier.id,title:carrier.id+' · Embarkation',window:'Movement',turn:'own',timing:'during',origin:'unit',units:[carrier.id],source:core,summary:'After an eligible unit makes a Normal, Advance or Fall Back move, it can embark if every model is within 3″, it was not set up on the battlefield this turn, and this transport has enough remaining capacity for every model. Count all passengers already aboard. Embarked units are not on the battlefield: abilities requiring visibility or measurement to other units cannot meet those conditions. '+targets});
  rows.push({id:'11e-drukhari-disembark-'+carrier.id,title:carrier.id+' · Disembarkation',window:'Movement',turn:'own',timing:'during',origin:'unit',units:[carrier.id],source:core,summary:'An embarked unit can disembark if it did not embark this phase. Normally the transport cannot have Advanced or Fallen Back this phase. After a Normal or ingress move, use Rapid Disembark wholly within 3″: passengers cannot charge this turn, and ingress placement restrictions still apply. Otherwise, if the transport remained stationary or has not moved and placement is possible, use Tactical Disembark wholly within 3″ and unengaged, then select those passengers to make a Normal or Advance move. If Tactical placement is impossible, use Combat Disembark wholly within 6″: make a hazard roll for each model, permit engagement only with enemies already engaging this transport, then become Battle-shocked and unable to charge this turn. A model physically too large to fit wholly within 3″ can instead place its base within 1″ of the transport’s base or hull, unengaged. '+(carrier.unit==='Venom'?'Rapid Deployment (Pain) can instead permit Shock Disembark after this Venom Advances; follow that printed ability. ':'')+'For a split squad, use only that half’s physical models, equipment and source abilities. '+targets});
  if(carrier.unit==='Venom'||carrier.unit==='Starweaver'){
   const aerial=carrier.unit==='Venom',eligible=groups.filter(g=>!aerial||!g.canFly);
   const names=eligible.map(g=>g.root.id+' ('+g.models+' models)');
   if(aerial)names.push(...split.filter(g=>!g.canFly).map(g=>g.root.id+' (only its actual split half of 6 or fewer models)'));
   if(names.length)rows.push({id:'11e-drukhari-rapid-embark-'+carrier.id,title:carrier.id+' · '+(aerial?'Aerialists':'Rapid Embarkation'),window:'Fight',turn:'either',timing:'end',origin:'unit',units:[carrier.id],source,summary:'At the end of either Fight phase, if this transport is empty, select one friendly '+(aerial?'Drukhari':'Harlequins')+' Infantry unit of 6 or fewer models wholly within 6″. It must be unengaged'+(aerial?' and cannot be a unit that can Fly':'')+'. That unit can embark, including in a turn it disembarked from '+(aerial?'a transport':'this transport')+'. This explicit permission overrides the normal set-up-turn restriction. Eligible candidates: '+names.join(', ')+'.'});
  }
  for(const window of PHASES)rows.push({id:'11e-drukhari-emergency-'+carrier.id+'-'+window,title:carrier.id+' · Emergency disembarkation',window,turn:'either',timing:'during',origin:'unit',units:[carrier.id],source:core,summary:'If this transport is destroyed with passengers aboard, before removing it and before Deadly Demise, make a hazard roll for every embarked model. Set each model wholly within 6″ and as close as possible to the transport, unengaged if possible; only if that is impossible may it be set up engaged. Destroy any model that still cannot be placed. Each disembarked unit becomes Battle-shocked and cannot declare a charge until the end of the turn.'});
 }
 return rows;
}
