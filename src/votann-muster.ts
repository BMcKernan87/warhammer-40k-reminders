import type {ArmySelection} from './catalog';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';
import {votannKeywords,votannSheets} from './votann-muster-data';
import {votannTransportFindings} from './votann-transports';

export function votannUnitLimit(army:ArmySelection,unit:string):number{
 if(army.faction!=='Leagues of Votann'||!votannSheets.has(unit))return 0;
 const tags=votannKeywords(army,{unit,id:''});
 if(tags.has('EPIC HERO'))return 1;
 const limit=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit;
 return tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2*limit:limit;
}
export function votannWarlordCandidates(army:ArmySelection):RosterInstance[]{
 if(army.faction!=='Leagues of Votann')return [];
 return expandRoster(army).filter(s=>votannKeywords(army,s).has('CHARACTER'));
}
export function resolvedVotannWarlord(army:ArmySelection):RosterInstance|undefined{
 const candidates=votannWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectVotannWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!votannWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible Kin Character as Warlord.');
 return {...army,warlordId:id??undefined};
}
export function votannMusterFindings(army:ArmySelection):RosterFinding[]{
 if(army.faction!=='Leagues of Votann')return [];
 const roster=expandRoster(army);
 if(!roster.length)return [];
 const findings=votannTransportFindings(army,roster);
 const counts=new Map<string,number>();
 for(const squad of roster)counts.set(squad.unit,(counts.get(squad.unit)??0)+1);
 for(const [unit,count] of counts){
  const limit=votannUnitLimit(army,unit);
  if(!limit)findings.push({code:'votann-ineligible',severity:'error',unit,message:unit+' is unavailable for a current Leagues of Votann army.'});
  else if(count>limit)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds its '+limit+'-copy limit.'});
 }
 for(const squad of roster){
  if(squad.attachedTo&&!knightJoinedBodyguard(army,squad))findings.push({code:'invalid-attachment',severity:'error',unit:squad.unit,message:squad.id+' requires a compatible Bodyguard with an available slot.'});
 }
 if(!resolvedVotannWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible Leagues of Votann Character as Warlord.'});
 const budget=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
 if(rosterCost2026(army).knownPoints>budget)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds the '+budget+'-point battle limit.'});
 return findings;
}
