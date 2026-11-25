import type {ArmySelection} from './catalog';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {MECHANICUS_SHEETS} from './mechanicus-data';
import {mechanicusMusterUnits} from './mechanicus-army-data';
import {mechanicusKeywords} from './mechanicus-keywords';
import {mechanicusCargoFormations,mechanicusCarrierCapacity} from './mechanicus-transports';
import {assignedAgentFindings} from './knight-assigned-agents';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';
import {alliedUnitLimit} from './titan-support-data';
import {canFillTransports} from './transport-matching';

const native=new Map(MECHANICUS_SHEETS.map(s=>[s.unit,s]));
export function mechanicusUnitLimit(army:ArmySelection,unit:string):number{
 if(!mechanicusMusterUnits(army).includes(unit))return 0;
 const allied=alliedUnitLimit(army,unit);if(allied!==undefined)return allied;
 const tags=mechanicusKeywords(army,{id:'',unit});
 if(tags.has('EPIC HERO'))return 1;
 return BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit*(tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2:1);
}
export function mechanicusWarlordCandidates(army:ArmySelection):RosterInstance[]{
 if(army.faction!=='Adeptus Mechanicus')return [];
 const candidates=expandRoster(army).filter(s=>native.has(s.unit)&&mechanicusKeywords(army,s).has('CHARACTER')&&s.unit!=='Sydonian Skatros');
 const supreme=candidates.filter(s=>s.unit==='Belisarius Cawl'||s.unit==='Thulia Ghuld');
 return supreme.length?supreme:candidates;
}
export function resolvedMechanicusWarlord(army:ArmySelection){
 const candidates=mechanicusWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectMechanicusWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!mechanicusWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible Adeptus Mechanicus Character as Warlord. If included, select Cawl or Thulia Ghuld. Sydonian Skatros cannot be Warlord.');
 return {...army,warlordId:id??undefined};
}
export function mechanicusMusterFindings(army:ArmySelection):RosterFinding[]{
 const roster=expandRoster(army);if(army.faction!=='Adeptus Mechanicus'||!roster.length)return [];
 const findings:RosterFinding[]=[...assignedAgentFindings(army)];
 const max=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
 for(const [unit,count] of Object.entries(army.units)){
  const cap=mechanicusUnitLimit(army,unit);
  if(!cap)findings.push({code:'mechanicus-ineligible',severity:'error',unit,message:unit+' is unavailable at the selected battle size.'});
  else if(count>cap)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds the '+cap+'-copy limit.'});
 }
 for(const s of roster){
  const sheet=native.get(s.unit);if(!sheet)continue;
  if(sheet.attachmentRole==='support'&&!knightJoinedBodyguard(army,s))findings.push({code:'mandatory-support',severity:'error',unit:s.unit,message:s.id+' needs an eligible Bodyguard.'});
  else if(s.attachedTo&&!knightJoinedBodyguard(army,s))findings.push({code:'invalid-attachment',severity:'error',unit:s.unit,message:s.id+' requires an eligible Bodyguard with an available slot.'});
 }
 if(!resolvedMechanicusWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible Adeptus Mechanicus Character as Warlord; Cawl or Thulia Ghuld must lead if included.'});
 const carriers=roster.filter(s=>mechanicusCarrierCapacity[s.unit]?.dedicated).map(s=>mechanicusCargoFormations(army,s,roster).map(g=>g.root.id));
 if(!canFillTransports(carriers,[...new Set(carriers.flat())],(ids,id)=>ids.includes(id)))findings.push({code:'dedicated-transport-passengers',severity:'error',message:'Each Skorpius Dunerider must start with a different eligible whole formation aboard.'});
 const cost=rosterCost2026(army);
 const compulsory=cost.entries.filter(e=>mechanicusKeywords(army,{id:e.id,unit:e.unit}).has('AIRCRAFT')).reduce((n,e)=>n+(e.points??0),0);
 if(compulsory>max/2)findings.push({code:'compulsory-reserves',severity:'error',message:'Compulsory starting Aircraft cost '+compulsory+' points and exceed the '+max/2+'-point Strategic Reserves allowance.'});
 if(cost.knownPoints>max)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds '+max+' points.'});
 return findings;
}
