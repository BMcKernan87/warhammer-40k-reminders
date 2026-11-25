import {alliedTitanAndKnightFindings} from './titan-support';
import {alliedUnitLimit} from './titan-support-data';
import type {ArmySelection} from './catalog';
import {CUSTODES_ARMY_SHEETS,CUSTODES_UNITS,custodesKeywords} from './adeptus-custodes-data';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {custodesPassengerFormations,SISTERS_RHINO} from './custodes-transports';
import {assignedAgentFindings} from './knight-assigned-agents';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(CUSTODES_ARMY_SHEETS.map(s=>[s.unit,s]));
const has=(unit:string,keyword:string)=>sheets.get(unit)?.keywords?.includes(keyword)??false;
export function custodesUnitLimit(army:ArmySelection,unit:string):number {
 if(army.faction!=='Adeptus Custodes')return 0;
 const allied=alliedUnitLimit(army,unit);
 if(allied!==undefined)return allied;
 if(!CUSTODES_UNITS.includes(unit))return 0;
 const tags=custodesKeywords(army,{unit,id:''});
 if(tags.has('EPIC HERO')||tags.has('IMPERIAL KNIGHTS')&&tags.has('TITANIC'))return 1;
 const limit=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit;
 return Math.min(tags.has('ARMIGER')?3:Infinity,tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2*limit:limit);
}
export function custodesWarlordCandidates(army:ArmySelection):RosterInstance[] {
 if(army.faction!=='Adeptus Custodes')return [];
 const vigil=army.detachments2026?.includes('Null Maiden Vigil');
 const candidates=expandRoster(army).filter(s=>has(s.unit,'CHARACTER')&&(has(s.unit,'ADEPTUS CUSTODES')||vigil&&has(s.unit,'ANATHEMA PSYKANA')));
 const trajann=candidates.filter(s=>s.unit==='Trajann Valoris');
 return trajann.length?trajann:candidates;
}
export function resolvedCustodesWarlord(army:ArmySelection):RosterInstance|undefined {
 const candidates=custodesWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectCustodesWarlord(army:ArmySelection,id:string|null):ArmySelection {
 if(id!==null&&!custodesWarlordCandidates(army).some(s=>s.id===id))throw Error('Select a Character eligible to be the Custodes Warlord.');
 return {...army,warlordId:id??undefined};
}
export function custodesRhinoPassengers(army:ArmySelection):RosterInstance[][] {
 return custodesPassengerFormations(army,SISTERS_RHINO);
}
export function custodesMusterFindings(army:ArmySelection):RosterFinding[] {
 if(army.faction!=='Adeptus Custodes')return [];
 const roster=expandRoster(army);
 if(!roster.length)return [];
 const findings:RosterFinding[]=[...assignedAgentFindings(army)];
 const counts=new Map<string,number>();
 for(const s of roster)counts.set(s.unit,(counts.get(s.unit)??0)+1);
 for(const [unit,count] of counts){
  const limit=custodesUnitLimit(army,unit);
  if(!limit)findings.push({code:'custodes-ineligible',unit,severity:'error',message:unit+' is unavailable for this Custodes army.'});
  else if(count>limit)findings.push({code:'rule-of-three',unit,severity:'error',message:unit+' exceeds its '+limit+'-copy limit.'});
 }
 if(!resolvedCustodesWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible Custodes Character as Warlord. Null Maiden Vigil also permits an Anathema Psykana Character.'});
 findings.push(...alliedTitanAndKnightFindings(army));
 for(const s of roster){
  const support=sheets.get(s.unit)?.attachmentRole==='support';
  if((support||s.attachedTo)&&!knightJoinedBodyguard(army,s))findings.push({code:support?'mandatory-support':'invalid-attachment',unit:s.unit,severity:'error',message:s.id+' requires a compatible Bodyguard with an available slot.'});
 }
 const rhinos=counts.get('Anathema Psykana Rhino')??0;
 if(rhinos&&custodesRhinoPassengers(army).length<rhinos)findings.push({code:'dedicated-transport-passengers',unit:'Anathema Psykana Rhino',severity:'error',message:'Each Anathema Psykana Rhino must begin with a separate eligible Anathema Psykana Infantry unit embarked. Its capacity is 12 models.'});
 const budget=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
 const cost=rosterCost2026(army);
 const aircraft=cost.entries.filter(e=>has(e.unit,'AIRCRAFT')).reduce((total,e)=>total+(e.points??0),0);
 if(aircraft>budget/2)findings.push({code:'compulsory-reserves',severity:'error',message:'Your Aircraft must start in Strategic Reserves. They cost '+aircraft+' points and exceed the '+(budget/2)+'-point starting allowance.'});
 if(cost.knownPoints>budget)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds the '+budget+'-point battle limit.'});
 return findings;
}
