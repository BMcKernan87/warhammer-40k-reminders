import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {PHASES} from './engine';
import {AELDARI_SHEETS} from './aeldari-data';
import {aeldariModelLoadouts} from './aeldari-loadouts';
import {aeldariKeywords} from './aeldari-keywords';
import {aeldariFormations} from './aeldari-formations';
import {AELDARI_SUPPORT_ARTILLERY,aeldariJoinedArtillery} from './aeldari-artillery';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

export {aeldariFormations} from './aeldari-formations';
export const AELDARI_SPLIT_UNITS=new Set(['Ynnari Kabalite Warriors','Ynnari Wyches']);
const ynnariPassengers=new Set(['The Visarch','Ynnari Archon','Ynnari Incubi','Ynnari Kabalite Warriors','Ynnari Succubus','Ynnari Wyches','Yvraine']);
type CargoKind='asuryani'|'aeldari'|'harlequins'|'ynnari';
export const aeldariCarrierCapacity:Readonly<Record<string,{spaces:number;dedicated:boolean;kind:CargoKind}>>={
 Falcon:{spaces:6,dedicated:false,kind:'aeldari'},
 'Wave Serpent':{spaces:12,dedicated:true,kind:'asuryani'},
 Starweaver:{spaces:6,dedicated:true,kind:'harlequins'},
 'Ynnari Raider':{spaces:11,dedicated:true,kind:'ynnari'},
 'Ynnari Venom':{spaces:6,dedicated:true,kind:'ynnari'},
};
const sheets=new Map(AELDARI_SHEETS.map(s=>[s.unit,s]));
const core='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';

function passengerGroups(army:ArmySelection,roster:readonly RosterInstance[]){
 const original=new Map(expandRoster(army).map(s=>[s.id,s]));
 return aeldariFormations(army,roster).flatMap(group=>{
  const start=original.get(group.root.id),host=group.root.attachedTo??group.root.retinueTo;
  const originalBody=start&&(knightJoinedBodyguard(army,start)??aeldariJoinedArtillery(army,start));
  const former=host&&originalBody&&(!roster.some(s=>s.id===host)||!roster.some(s=>s.id===originalBody.id));
  if(host&&!former||roster.some(s=>(s.attachedTo===group.root.id||s.retinueTo===group.root.id)&&!group.members.some(m=>m.id===s.id))||group.members.some(s=>AELDARI_SUPPORT_ARTILLERY.has(s.unit)))return [];
  const physical=group.members.flatMap(s=>aeldariModelLoadouts(s).map(model=>({squad:s,model,keywords:aeldariKeywords(army,s,model.model,roster)})));
  if(!physical.length||physical.length!==group.models||!physical.every(p=>p.keywords.has('INFANTRY')))return [];
  const craftworld=(tag:string)=>physical.every(p=>p.keywords.has(tag)&&!p.keywords.has('JUMP PACK')&&(!p.keywords.has('YNNARI')||p.keywords.has('ASURYANI')||['Yvraine','The Visarch'].includes(p.squad.unit)));
  const kinds:CargoKind[]=[];
  if(craftworld('ASURYANI'))kinds.push('asuryani');
  if(craftworld('AELDARI'))kinds.push('aeldari');
  if(physical.every(p=>p.keywords.has('HARLEQUINS')))kinds.push('harlequins');
  if(physical.every(p=>ynnariPassengers.has(p.squad.unit)))kinds.push('ynnari');
  if(!kinds.length)return [];
  return [{...group,spaces:physical.reduce((n,p)=>n+(p.keywords.has('WRAITH CONSTRUCT')?2:1),0),kinds}];
 });
}
/** The printed Wave Serpent uses Asuryani; the Falcon uses the broader Aeldari keyword. */
export function aeldariCargoFormations(army:ArmySelection,carrier:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
 const capacity=aeldariCarrierCapacity[carrier.unit];
 if(!capacity||army.faction!=='Aeldari'||!roster.some(s=>s.id===carrier.id&&s.unit===carrier.unit))return [];
 return passengerGroups(army,roster).filter(g=>g.root.id!==carrier.id&&g.kinds.includes(capacity.kind)&&g.spaces<=capacity.spaces);
}
/** Core 01.02.06 includes attached models in a Venom's even split. */
export function aeldariSplitCargoFormations(army:ArmySelection,carrier:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)){
 if(carrier.unit!=='Ynnari Venom'||army.faction!=='Aeldari'||!roster.some(s=>s.id===carrier.id&&s.unit===carrier.unit))return [];
 return passengerGroups(army,roster).filter(g=>g.kinds.includes('ynnari')&&AELDARI_SPLIT_UNITS.has(g.root.unit)&&g.models>=2&&Math.floor(g.models/2)<=6)
  .map(g=>({...g,halves:[Math.floor(g.models/2),Math.ceil(g.models/2)] as const}));
}
export function aeldariCargoFits(army:ArmySelection,carrier:RosterInstance,ids:readonly string[],roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 const capacity=aeldariCarrierCapacity[carrier.unit];if(!capacity||!ids.length||new Set(ids).size!==ids.length)return false;
 const selected=aeldariCargoFormations(army,carrier,roster).filter(g=>ids.includes(g.root.id));
 return selected.length===ids.length&&selected.reduce((n,g)=>n+g.spaces,0)<=capacity.spaces;
}
/** A formation fills only one Dedicated Transport, unless an actual Venom splits it once. */
export function aeldariDedicatedSatisfied(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 if(army.faction!=='Aeldari')return true;
 const vehicles=roster.filter(s=>aeldariCarrierCapacity[s.unit]?.dedicated).sort((a,b)=>aeldariCarrierCapacity[a.unit].spaces-aeldariCarrierCapacity[b.unit].spaces);
 const groups=passengerGroups(army,roster),failed=new Set<string>();
 function fill(index:number,used:ReadonlySet<number>,halves:readonly number[]):boolean{
  if(index===vehicles.length)return true;
  const possibleSplits=Math.min(vehicles.slice(index).filter(v=>v.unit==='Ynnari Venom').length,groups.filter((g,i)=>!used.has(i)&&AELDARI_SPLIT_UNITS.has(g.root.unit)&&g.kinds.includes('ynnari')).length);
  if(vehicles.length-index>groups.length-used.size+halves.length+possibleSplits)return false;
  const key=JSON.stringify([index,[...used].sort((a,b)=>a-b),[...halves].sort((a,b)=>a-b)]);if(failed.has(key))return false;
  const vehicle=vehicles[index],capacity=aeldariCarrierCapacity[vehicle.unit];
  if(capacity.kind==='ynnari')for(let n=0;n<halves.length;n++)if(halves[n]<=capacity.spaces&&fill(index+1,used,halves.filter((_,j)=>j!==n)))return true;
  for(let i=0;i<groups.length;i++){
   const g=groups[i];if(used.has(i)||!g.kinds.includes(capacity.kind))continue;
   const next=new Set([...used,i]);
   if(g.spaces<=capacity.spaces&&fill(index+1,next,halves))return true;
   if(vehicle.unit==='Ynnari Venom'&&AELDARI_SPLIT_UNITS.has(g.root.unit)&&g.models>=2)for(const aboard of new Set([Math.floor(g.models/2),Math.ceil(g.models/2)]))if(aboard<=capacity.spaces&&fill(index+1,next,[...halves,g.models-aboard]))return true;
  }
  failed.add(key);return false;
 }
 return fill(0,new Set(),[]);
}
export function aeldariTransportReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Aeldari')return [];
 const rows:GeneratedReminder[]=[];
 for(const carrier of roster){
  const capacity=aeldariCarrierCapacity[carrier.unit];if(!capacity)continue;
  const groups=aeldariCargoFormations(army,carrier,roster),split=aeldariSplitCargoFormations(army,carrier,roster);
  const targets=groups.length?'Eligible whole formations: '+groups.map(g=>g.root.id+' ('+g.models+' models, '+g.spaces+' spaces)').join(', ')+'.':'No eligible whole formation fits.';
  const splitText=split.length?' At the start of Declare Battle Formations, this Ynnari Venom can split one of '+split.map(g=>g.root.id+' ('+g.halves.join(' + ')+' models)').join(', ')+'. Include attached models when dividing as evenly as possible. Assign each physical model and its equipment to exactly one half; the halves cannot be split again. One half must start aboard this Venom; the other may deploy separately or embark in another eligible transport. Each half has its own Starting Strength and only its actually assigned models, equipment and bearer abilities.':'';
  const limits=capacity.kind==='harlequins'?'6 Harlequins Infantry models':capacity.kind==='ynnari'?capacity.spaces+' models from The Visarch, Ynnari Archon, Ynnari Incubi, Ynnari Kabalite Warriors, Ynnari Succubus, Ynnari Wyches or Yvraine':capacity.spaces+' '+(capacity.kind==='asuryani'?'Asuryani':'Aeldari')+' Infantry spaces; each Wraith Construct model uses two spaces. Jump Pack models cannot embark. Ynnari models are excluded unless they are also Asuryani, Yvraine or The Visarch; every model must still meet the printed Infantry and '+(capacity.kind==='asuryani'?'Asuryani':'Aeldari')+' requirements';
  const source=sheets.get(carrier.unit)!.source;
  rows.push({id:'11e-aeldari-cargo-'+carrier.id,title:carrier.id+' · Declare passengers',window:'Pre-battle',turn:'either',timing:'during',origin:'unit',units:[carrier.id],source,summary:'Capacity '+limits+'. Count every model in the attached formation. Support Artillery and its joined unit cannot embark.'+(capacity.dedicated?' Start with passengers aboard or this Dedicated Transport is destroyed.':'')+' '+targets+splitText});
  if(!groups.length&&!split.length)continue;
  rows.push({id:'11e-aeldari-embark-'+carrier.id,title:carrier.id+' · Embarkation',window:'Movement',turn:'own',timing:'during',origin:'unit',units:[carrier.id],source:core,summary:'After an eligible unit makes a Normal, Advance or Fall Back move, it can embark if every model is within 3″, it was not set up on the battlefield this turn, and this transport has enough remaining capacity for every model. Count all passengers already aboard. Embarked units are not on the battlefield: abilities requiring visibility or measurement to other units cannot meet those conditions. '+targets});
  rows.push({id:'11e-aeldari-disembark-'+carrier.id,title:carrier.id+' · Disembarkation',window:'Movement',turn:'own',timing:'during',origin:'unit',units:[carrier.id],source:core,summary:'An embarked unit can disembark if it did not embark this phase. Normally the transport cannot have Advanced or Fallen Back this phase. After a Normal or ingress move, use Rapid Disembark wholly within 3″: passengers cannot charge this turn, and ingress placement restrictions still apply. Otherwise, if the transport remained stationary or has not moved and placement is possible, use Tactical Disembark wholly within 3″ and unengaged, then select those passengers to make a Normal or Advance move. If Tactical placement is impossible, use Combat Disembark wholly within 6″: make a hazard roll for each model, permit engagement only with enemies already engaging this transport, then become Battle-shocked and unable to charge this turn. A model physically too large to fit wholly within 3″ can instead place its base within 1″ of the transport’s base or hull, unengaged. For a split squad use only that half’s models, equipment and source abilities. '+targets});
  if(carrier.unit==='Ynnari Venom'||carrier.unit==='Starweaver'){
   const names=[...groups.map(g=>g.root.id+' ('+g.models+' models)'),...split.map(g=>g.root.id+' (only its actual split half of 6 or fewer models)')];
   if(names.length)rows.push({id:'11e-aeldari-rapid-embark-'+carrier.id,title:carrier.id+' · '+(carrier.unit==='Ynnari Venom'?'Lithe Embarkation':'Rapid Embarkation'),window:'Fight',turn:'either',timing:'end',origin:'unit',units:[carrier.id],source,summary:'At the end of either Fight phase, if this transport is empty, select one friendly '+(carrier.unit==='Ynnari Venom'?'Ynnari Infantry unit containing only models from its printed passenger list':'Harlequins Infantry unit')+' of 6 or fewer models wholly within 6″ and unengaged. That unit can embark, including in a turn it disembarked from this same transport. This explicit permission does not apply to disembarking from a different transport. Eligible candidates: '+names.join(', ')+'.'});
  }
  for(const window of PHASES)rows.push({id:'11e-aeldari-emergency-'+carrier.id+'-'+window,title:carrier.id+' · Emergency disembarkation',window,turn:'either',timing:'during',origin:'unit',units:[carrier.id],source:core,summary:'If this transport is destroyed with passengers aboard, before removing it and before Deadly Demise, make a hazard roll for every embarked model. Set each model wholly within 6″ and as close as possible to the transport, unengaged if possible; only if that is impossible may it be set up engaged. Destroy any model that still cannot be placed. Each disembarked unit becomes Battle-shocked and cannot declare a charge until the end of the turn.'});
 }
 return rows;
}
