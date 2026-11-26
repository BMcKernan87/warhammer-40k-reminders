import type {ArmySelection} from './catalog';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {GREY_KNIGHTS_SHEETS,greyKnightsKeywords,greyKnightsMusterUnits} from './grey-knights-data';
import {greyKnightsCargoFormations,greyKnightsCarrierCapacity} from './grey-knights-transports';
import {assignedAgentFindings} from './knight-assigned-agents';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';
import {alliedUnitLimit} from './titan-support-data';
import {canFillTransports} from './transport-matching';

const native=new Set(GREY_KNIGHTS_SHEETS.map(s=>s.unit));
export function greyKnightsUnitLimit(army:ArmySelection,unit:string):number{
 if(!greyKnightsMusterUnits(army).includes(unit))return 0;
 const allied=alliedUnitLimit(army,unit);
 if(allied!==undefined)return allied;
 const tags=greyKnightsKeywords(army,{id:'',unit});
 if(tags.has('EPIC HERO'))return 1;
 return BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit*(tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2:1);
}
export function greyKnightsWarlordCandidates(army:ArmySelection):RosterInstance[]{
 return army.faction==='Grey Knights'?expandRoster(army).filter(s=>native.has(s.unit)&&greyKnightsKeywords(army,s).has('CHARACTER')):[];
}
export function resolvedGreyKnightsWarlord(army:ArmySelection){
 const candidates=greyKnightsWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectGreyKnightsWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!greyKnightsWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose a Grey Knights Character as Warlord.');
 return {...army,warlordId:id??undefined};
}
export function greyKnightsMusterFindings(army:ArmySelection):RosterFinding[]{
 const roster=expandRoster(army);
 if(army.faction!=='Grey Knights'||!roster.length)return [];
 const findings:RosterFinding[]=[...assignedAgentFindings(army)];
 const max=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
 for(const [unit,count] of Object.entries(army.units)){
  const cap=greyKnightsUnitLimit(army,unit);
  if(!cap)findings.push({code:'gk-ineligible',severity:'error',unit,message:unit+' is unavailable at the selected battle size.'});
  else if(count>cap)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds the '+cap+'-copy limit.'});
 }
 for(const s of roster){
  if(native.has(s.unit)&&s.attachedTo&&!knightJoinedBodyguard(army,s))findings.push({code:'invalid-attachment',severity:'error',unit:s.unit,message:s.id+' requires an eligible Bodyguard with an available slot.'});
 }
 if(!resolvedGreyKnightsWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose a Grey Knights Character as Warlord.'});
 const transport=roster.filter(s=>greyKnightsCarrierCapacity[s.unit]?.dedicated).map(s=>greyKnightsCargoFormations(army,s,roster).map(g=>g.root.id));
 if(!canFillTransports(transport,[...new Set(transport.flat())],(ids,id)=>ids.includes(id)))findings.push({code:'dedicated-transport-passengers',severity:'error',message:'Each Rhino and Razorback must start with a different eligible whole formation aboard.'});
 const cost=rosterCost2026(army);
 const compulsory=cost.entries.filter(e=>greyKnightsKeywords(army,{id:e.id,unit:e.unit}).has('AIRCRAFT')).reduce((n,e)=>n+(e.points??0),0);
 if(compulsory>max/2)findings.push({code:'compulsory-reserves',severity:'error',message:'Compulsory starting Aircraft cost '+compulsory+' points and exceed the '+max/2+'-point Strategic Reserves allowance.'});
 if(cost.knownPoints>max)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds '+max+' points.'});
 return findings;
}
