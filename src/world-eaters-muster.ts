import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';
import {isWarhound} from './titan-support-data';
import {isWorldEatersDreadblade,worldEatersKeywords,worldEatersMusterUnits,WORLD_EATERS_SHEETS} from './world-eaters-data';

const sheets=new Map(WORLD_EATERS_SHEETS.map(s=>[s.unit,s]));
const budget=(a:ArmySelection)=>BATTLE_SIZES_2026[a.battleSize2026??'Strike Force'];
export function worldEatersUnitLimit(army:ArmySelection,unit:string):number{
 if(!worldEatersMusterUnits(army).includes(unit))return 0;
 const tags=worldEatersKeywords(army,{unit,id:''});
 if(tags.has('EPIC HERO')||isWarhound(unit))return 1;
 const limit=budget(army).unitLimit*(tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2:1);
 if(!isWorldEatersDreadblade(unit))return limit;
 const other=expandRoster(army).filter(s=>s.unit!==unit&&isWorldEatersDreadblade(s.unit));
 if(tags.has('TITANIC'))return other.length?0:1;
 if(other.some(s=>worldEatersKeywords(army,s).has('TITANIC')))return 0;
 return Math.min(limit,Math.max(0,3-other.length));
}
export function worldEatersWarlordCandidates(army:ArmySelection):RosterInstance[]{
 if(army.faction!=='World Eaters')return [];
 const eligible=expandRoster(army).filter(s=>{
  const tags=worldEatersKeywords(army,s);
  return tags.has('WORLD EATERS')&&tags.has('CHARACTER');
 });
 const angron=eligible.filter(s=>s.unit==='Angron');
 return angron.length?angron:eligible;
}
export function resolvedWorldEatersWarlord(army:ArmySelection):RosterInstance|undefined {
 const candidates=worldEatersWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectWorldEatersWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!worldEatersWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible World Eaters Character as Warlord.');
 return {...army,warlordId:id??undefined};
}

export interface WorldEatersCargoFormation {body:RosterInstance;members:RosterInstance[];spaces:number}
export function worldEatersCargoFormations(army:ArmySelection,transport:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):WorldEatersCargoFormation[]{
 if(army.faction!=='World Eaters'||!roster.some(s=>s.id===transport.id&&s.unit===transport.unit))return [];
 const rhino=transport.unit==='Chaos Rhino';
 if(!rhino&&transport.unit!=='Chaos Land Raider')return [];
 const capacity=rhino?12:14;
 return roster.flatMap(body=>{
  if(body.attachedTo||body.retinueTo)return [];
  const attached=roster.filter(s=>s.attachedTo===body.id);
  if(attached.some(s=>knightJoinedBodyguard(army,s)?.id!==body.id))return [];
  const members=[body,...attached];
  let spaces=0;
  for(const m of members){
   const tags=worldEatersKeywords(army,m);
   if(!tags.has('WORLD EATERS')||!tags.has('INFANTRY'))return [];
   const heavy=tags.has('POSSESSED')||tags.has('TERMINATOR');
   if(rhino&&heavy)return [];
   spaces+=(m.models??sheets.get(m.unit)?.sizes[0]??1)*(heavy?2:1);
  }
  return spaces<=capacity?[{body,members,spaces}]:[];
 });
}
export function worldEatersMusterFindings(army:ArmySelection):RosterFinding[]{
 if(army.faction!=='World Eaters')return [];
 const roster=expandRoster(army);
 if(!roster.length)return [];
 const findings:RosterFinding[]=[];
 const counts=new Map<string,number>();
 for(const s of roster)counts.set(s.unit,(counts.get(s.unit)??0)+1);
 const available=worldEatersMusterUnits(army);
 for(const [unit,count] of counts){
  if(!available.includes(unit))findings.push({code:'world-eaters-ineligible',severity:'error',unit,message:unit+' is unavailable for the chosen World Eaters detachment or battle size.'});
  else if(!isWorldEatersDreadblade(unit)&&!isWarhound(unit)&&count>worldEatersUnitLimit(army,unit))findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds its permitted number of copies.'});
 }
 const knights=roster.filter(s=>isWorldEatersDreadblade(s.unit));
 const titanic=knights.some(s=>worldEatersKeywords(army,s).has('TITANIC'));
 if(knights.length>(titanic?1:3))findings.push({code:'dreadblade-allowance',severity:'error',message:'Choose one Titanic Dreadblade or up to three War Dog models.'});
 for(const [unit,count] of counts)if(isWorldEatersDreadblade(unit)&&worldEatersKeywords(army,{id:'',unit}).has('WAR DOG')){
  const max=budget(army).unitLimit*(worldEatersKeywords(army,{id:'',unit}).has('BATTLELINE')?2:1);
  if(count>max)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds the battle-size copy limit.'});
 }
 for(const s of roster){
  if(s.attachedTo&&!knightJoinedBodyguard(army,s))findings.push({code:'invalid-attachment',severity:'error',unit:s.unit,message:s.id+' requires a legal Bodyguard with an available Leader slot.'});
  if(isWorldEatersDreadblade(s.unit)&&(s.enhancement||army.upgrades2026?.[s.id]||army.upgrades2026?.[s.unit]))findings.push({code:'dreadblade-enhancement',severity:'error',unit:s.unit,message:s.id+' cannot take an enhancement as a Dreadblade.'});
 }
 const warlord=roster.find(s=>s.id===army.warlordId);
 if(warlord&&!worldEatersKeywords(army,warlord).has('WORLD EATERS'))findings.push({code:'world-eaters-warlord-ineligible',severity:'error',unit:warlord.unit,message:warlord.id+' cannot serve as the World Eaters Warlord.'});
 if(!resolvedWorldEatersWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible World Eaters Character as Warlord. Angron must lead if present.'});
 const rhinos=roster.filter(s=>s.unit==='Chaos Rhino');
 if(rhinos.length&&rhinos.length>worldEatersCargoFormations(army,rhinos[0],roster).length)findings.push({code:'dedicated-transport-passengers',severity:'error',unit:'Chaos Rhino',message:'Each Chaos Rhino must start with a different eligible Infantry formation embarked, within its 12 spaces.'});
 const cost=rosterCost2026(army),limit=budget(army).points;
 const legionIds=new Set(roster.filter(s=>worldEatersKeywords(army,s).has('BLOOD LEGIONS')).map(s=>s.id));
 const legionTotal=cost.entries.filter(e=>legionIds.has(e.id)).reduce((n,e)=>n+(e.points??0),0);
 if(legionTotal>limit/2)findings.push({code:'blood-legions-allowance',severity:'error',message:'Blood Legions cost '+legionTotal+' points, exceeding the '+(limit/2)+'-point Khorne Daemonkin allowance.'});
 if(cost.knownPoints>limit)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds the '+limit+'-point battle limit.'});
 return findings;
}

export function worldEatersTransportReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='World Eaters')return [];
 const result:GeneratedReminder[]=[];
 for(const carrier of roster.filter(s=>s.unit==='Chaos Land Raider'||s.unit==='Chaos Rhino')){
  const groups=worldEatersCargoFormations(army,carrier,roster),rhino=carrier.unit==='Chaos Rhino';
  const source=sheets.get(carrier.unit)!.source;
  const ids=groups.map(g=>g.body.id);
  const list=groups.map(g=>g.body.id+' ('+g.spaces+' spaces)').join(', ');
  result.push({id:'11e-world-eaters-transport-'+carrier.id,title:carrier.id+' · Declare embarked formations',window:'Pre-battle',turn:'either',timing:'during',origin:'unit',source,units:[carrier.id,...ids],
   summary:(rhino?'This Dedicated Transport must start with at least one eligible formation embarked or it is destroyed. Capacity 12 World Eaters Infantry. Possessed and Terminators cannot embark.':'Capacity 14 World Eaters Infantry. Possessed and Terminators each occupy two spaces.')+(list?' Whole formations available: '+list+'. Count their combined spaces if boarding more than one.':' No complete roster formation fits.')});
  if(ids.length)result.push({id:'11e-world-eaters-disembark-'+carrier.id,title:carrier.id+' · Disembarkation',window:'Movement',turn:'own',timing:'during',origin:'unit',source,units:[carrier.id,...ids],
   summary:'Passengers must not have embarked this phase. After a Normal or ingress move make a rapid disembark wholly within 3″ and cannot charge that turn, unless a printed ability grants another move. Before the transport moves, a tactical disembark wholly within 3″ permits a Normal or Advance move. Possible passengers: '+ids.join(', ')+'.'});
 }
 return result;
}
