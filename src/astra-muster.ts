import type {ArmySelection} from './catalog';
import type {RosterFinding} from './roster-findings';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {expandRoster} from './roster-instances';
import {assignedAgentFindings} from './knight-assigned-agents';
import {knightJoinedBodyguard} from './leader-eligibility';
import {alliedUnitLimit} from './titan-support-data';
import {astraCanPromote,astraMilitarumKeywords,astraMusterUnits,astraSheets,astraWarlordCandidates,loyalProtectors,resolvedAstraWarlord} from './astra-muster-data';
import {astraJoinedCommand} from './astra-protectors';
import {astraTransportOptions} from './astra-transports';
import {canFillTransports} from './transport-matching';

const graves=['Commissar Graves','Commissar Graves on Foot'];
export function astraUnitLimit(army:ArmySelection,unit:string){
 if(!astraMusterUnits(army).includes(unit))return 0;
 const allied=alliedUnitLimit(army,unit);
 if(allied!==undefined)return allied;
 if(graves.includes(unit)&&graves.some(form=>form!==unit&&army.units[form]))return 0;
 const tags=astraMilitarumKeywords(army,{id:'',unit});
 const limit=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit;
 return tags.has('EPIC HERO')?1:tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2*limit:limit;
}
export function selectAstraWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!astraWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible Astra Militarum Character.');
 return {...army,warlordId:id??undefined};
}
export function setAstraCharacter(army:ArmySelection,id:string,selected:boolean):ArmySelection{
 const roster=expandRoster(army);
 if(!roster.some(s=>s.id===id&&astraCanPromote(army,s)))throw Error('Steel Hammer can promote an Astra Militarum Titanic unit.');
 const upgrades2026={...army.upgrades2026};
 const s=roster.find(s=>s.id===id)!;
 if(!selected&&['Battalion Commander','Titan Killer','Assault Hatches'].includes(upgrades2026[id]??upgrades2026[s.unit])){
  if(upgrades2026[s.unit]){
   for(const copy of roster.filter(m=>m.unit===s.unit&&m.id!==id))upgrades2026[copy.id]??=upgrades2026[s.unit];
   delete upgrades2026[s.unit];
  }
  delete upgrades2026[id];
 }
 return {...army,instances:roster.map(s=>s.id===id?{...s,characterPromotion:selected||undefined}:s),upgrades2026,
  warlordId:!selected&&army.warlordId===id?undefined:army.warlordId};
}
export function astraMusterFindings(army:ArmySelection):RosterFinding[]{
 const roster=expandRoster(army);
 if(army.faction!=='Astra Militarum'||!roster.length)return [];
 const findings:RosterFinding[]=[...assignedAgentFindings(army)];
 const costs=rosterCost2026(army),budget=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
 if(costs.knownPoints>budget)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds '+budget+' points.'});
 const aircraft=costs.entries.filter(e=>astraMilitarumKeywords(army,{id:e.id,unit:e.unit}).has('AIRCRAFT')).reduce((n,e)=>n+(e.points??0),0);
 if(aircraft>budget/2)findings.push({code:'compulsory-reserves',severity:'error',message:'Compulsory starting Aircraft exceed the '+budget/2+'-point Strategic Reserves allowance.'});
 const warlord=resolvedAstraWarlord(army);
 if(!warlord)findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible Astra Militarum Character as Warlord.'});
 if(graves.every(unit=>army.units[unit]))findings.push({code:'graves-forms',severity:'error',message:'Select either Commissar Graves or Commissar Graves on Foot. Both represent the same Epic Hero.'});
 for(const [unit,count] of Object.entries(army.units)){
  if(graves.includes(unit)&&graves.every(name=>army.units[name]))continue;
  const cap=astraUnitLimit(army,unit);
  if(!cap)findings.push({code:'astra-ineligible',severity:'error',unit,message:unit+' is unavailable at this battle size.'});
  else if(count>cap)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds its '+cap+'-copy limit.'});
 }
 for(const s of roster){
  if(loyalProtectors.has(s.unit)&&!astraJoinedCommand(army,s))findings.push({code:'loyal-protector-required',severity:'error',unit:s.unit,message:s.id+' must join a Command Squad that has no other Loyal Protector.'});
  // Allied Character/Support findings are included in Assigned Agents.
  if(astraSheets.get(s.unit)?.keywords?.includes('ASTRA MILITARUM')&&s.attachedTo&&!knightJoinedBodyguard(army,s))findings.push({code:'invalid-attachment',severity:'error',unit:s.unit,message:s.id+' needs an eligible Bodyguard and an available attachment slot.'});
 }
 const required=astraTransportOptions(army,roster).filter(t=>t.dedicated);
 if(!canFillTransports(required,[...new Set(required.flatMap(t=>t.passengers))],(t,id)=>t.passengers.includes(id)))findings.push({code:'dedicated-transport-passengers',severity:'error',message:'Each Guard Dedicated Transport must start with a separate eligible whole formation aboard.'});
 return findings;
}
