import type {ArmySelection} from './catalog';
import {NATIVE_AGENT_SHEETS} from './assigned-agent-data';
import {agentTransports} from './agent-transports';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterFinding} from './roster-findings';
import {expandRoster} from './roster-instances';

const sheets=new Map(NATIVE_AGENT_SHEETS.map(s=>[s.unit,s]));
function has(unit:string,keyword:string){
  const data=sheets.get(unit);
  return !!data&&(data.keywords?.includes(keyword)||Object.values(data.modelKeywords??{}).some(ks=>ks.includes(keyword)));
}
export function agentUnitLimit(army:ArmySelection,unit:string){
  if(army.faction!=='Imperial Agents'||!sheets.has(unit))return 0;
  if(has(unit,'EPIC HERO'))return 1;
  const limit=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit;
  return has(unit,'BATTLELINE')||has(unit,'DEDICATED TRANSPORT')?limit*2:limit;
}
export function agentWarlordCandidates(army:ArmySelection){
  return expandRoster(army).filter(s=>has(s.unit,'CHARACTER')&&!has(s.unit,'OFFICIO ASSASSINORUM'));
}
export function resolvedAgentWarlord(army:ArmySelection){
  const candidates=agentWarlordCandidates(army);
  return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectAgentWarlord(army:ArmySelection,id:string|null){
  if(id!==null&&!agentWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible Imperial Agents Character as Warlord');
  return {...army,warlordId:id??undefined};
}
export function agentMusterFindings(army:ArmySelection):RosterFinding[]{
  const findings:RosterFinding[]=[];
  const roster=expandRoster(army);
  if(!roster.length)return findings;
  if(army.faction==='Imperial Agents'){
    for(const [unit,count] of Object.entries(army.units)){
      const cap=agentUnitLimit(army,unit);
      if(cap===0)findings.push({severity:'error',code:'legacy-agent',unit,message:'Choose a current datasheet to replace '+unit+'.'});
      else if(count>cap)findings.push({severity:'error',code:'rule-of-three',unit,message:unit+' exceeds its '+cap+'-copy limit.'});
    }
    if(!resolvedAgentWarlord(army))findings.push({severity:'error',code:'warlord-required',message:'Choose an eligible Imperial Agents Character as Warlord. Assassins cannot serve as Warlord.'});
    for(const s of roster){
      if(sheets.get(s.unit)?.attachmentRole==='support'&&!knightJoinedBodyguard(army,s))findings.push({severity:'error',code:'mandatory-support',unit:s.unit,message:s.id+' needs an eligible Bodyguard.'});
    }
    const cap=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
    if(rosterCost2026(army).knownPoints>cap)findings.push({severity:'error',code:'points-limit',message:'The roster exceeds the '+cap+'-point allowance.'});
  }
  if(army.faction==='Imperial Agents'||army.faction==='Imperial Knights'){
    const {required,dedicatedSatisfied}=agentTransports(army);
    if(!dedicatedSatisfied)findings.push({severity:'error',code:'agent-transport-passengers',message:'The roster needs enough distinct eligible passengers to start every Dedicated Transport occupied: '+required.join(', ')+'.'});
  }
  return findings;
}
