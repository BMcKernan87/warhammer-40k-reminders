import type {ArmySelection} from './catalog';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {SORORITAS_SHEETS} from './sororitas-data';
import {sororitasKeywords,sororitasMusterUnits} from './sororitas-army-data';
import {sororitasDedicatedSatisfied} from './sororitas-transports';
import {assignedAgentFindings} from './knight-assigned-agents';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';
import {alliedUnitLimit} from './titan-support-data';

const native=new Map(SORORITAS_SHEETS.map(s=>[s.unit,s]));
export function sororitasUnitLimit(army:ArmySelection,unit:string):number{
 if(!sororitasMusterUnits(army).includes(unit))return 0;
 const allied=alliedUnitLimit(army,unit);if(allied!==undefined)return allied;
 const tags=sororitasKeywords(army,{id:'',unit});
 if(tags.has('EPIC HERO'))return 1;
 return BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit*(tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2:1);
}
export function sororitasWarlordCandidates(army:ArmySelection):RosterInstance[]{
 if(army.faction!=='Adepta Sororitas')return [];
 const candidates=expandRoster(army).filter(s=>native.has(s.unit)&&sororitasKeywords(army,s).has('CHARACTER'));
 const vahl=candidates.filter(s=>s.unit==='Morvenn Vahl');
 return vahl.length?vahl:candidates;
}
export function resolvedSororitasWarlord(army:ArmySelection){
 const candidates=sororitasWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectSororitasWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!sororitasWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible Adepta Sororitas Character as Warlord. Morvenn Vahl must lead if included.');
 return {...army,warlordId:id??undefined};
}
export function sororitasMusterFindings(army:ArmySelection):RosterFinding[]{
 const roster=expandRoster(army);if(army.faction!=='Adepta Sororitas'||!roster.length)return [];
 const findings:RosterFinding[]=[...assignedAgentFindings(army)];
 const max=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
 for(const [unit,count] of Object.entries(army.units)){
  const cap=sororitasUnitLimit(army,unit);
  if(!cap)findings.push({code:'sororitas-ineligible',severity:'error',unit,message:unit+' is unavailable at the selected battle size.'});
  else if(count>cap)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds the '+cap+'-copy limit.'});
 }
 for(const s of roster){
  const sheet=native.get(s.unit);if(!sheet)continue;
  if(sheet.attachmentRole==='support'&&!knightJoinedBodyguard(army,s))findings.push({code:'mandatory-support',severity:'error',unit:s.unit,message:s.id+' needs an eligible Bodyguard.'});
  else if(s.attachedTo&&!knightJoinedBodyguard(army,s))findings.push({code:'invalid-attachment',severity:'error',unit:s.unit,message:s.id+' requires an eligible Bodyguard with an available slot.'});
 }
 if(!resolvedSororitasWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an Adepta Sororitas Character as Warlord.'});
 if(!sororitasDedicatedSatisfied(army,roster))findings.push({code:'dedicated-transport-passengers',severity:'error',message:'Each Sororitas Rhino and Immolator must start with distinct eligible passengers. An Immolator may split one eligible formation into two halves, including all attached models.'});
 if(rosterCost2026(army).knownPoints>max)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds '+max+' points.'});
 return findings;
}
