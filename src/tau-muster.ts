import type {ArmySelection} from './catalog';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {TAU_SHEETS,tauMusterUnits} from './tau-data';
import {tauKeywords} from './tau-keywords';
import {tauCargoFormations,tauTransportCapacity} from './tau-transports';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';
import {canFillTransports} from './transport-matching';

const native=new Set(TAU_SHEETS.map(s=>s.unit));
export function tauUnitLimit(army:ArmySelection,unit:string):number{
 if(!tauMusterUnits(army).includes(unit))return 0;
 const tags=tauKeywords(army,{id:'',unit});
 if(tags.has('EPIC HERO'))return 1;
 return BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit*(tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2:1);
}
export function tauWarlordCandidates(army:ArmySelection):RosterInstance[]{
 if(army.faction!=='T’au Empire')return [];
 const candidates=expandRoster(army).filter(s=>native.has(s.unit)&&tauKeywords(army,s).has('CHARACTER'));
 const supreme=candidates.filter(s=>s.unit==='Commander Shadowsun');
 return supreme.length?supreme:candidates;
}
export function resolvedTauWarlord(army:ArmySelection){
 const candidates=tauWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectTauWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!tauWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible T’au Empire Character as Warlord. Commander Shadowsun must be Warlord if included.');
 return {...army,warlordId:id??undefined};
}
export function tauMusterFindings(army:ArmySelection):RosterFinding[]{
 const roster=expandRoster(army);if(army.faction!=='T’au Empire'||!roster.length)return [];
 const findings:RosterFinding[]=[];
 const max=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
 for(const [unit,count] of Object.entries(army.units)){
  const cap=tauUnitLimit(army,unit);
  if(!cap)findings.push({code:'tau-ineligible',severity:'error',unit,message:unit+' is not a current matched-play T’au Empire datasheet.'});
  else if(count>cap)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds the '+cap+'-copy limit.'});
 }
 for(const s of roster)if(s.attachedTo&&!knightJoinedBodyguard(army,s))findings.push({code:'invalid-attachment',severity:'error',unit:s.unit,message:s.id+' requires an eligible Bodyguard with an available Leader slot. Only a 20-model Kroot Carnivores unit can take two different Shapers.'});
 if(roster.some(s=>s.unit==='Commander Farsight')&&roster.some(s=>tauKeywords(army,s).has('ETHEREAL')))findings.push({code:'farsight-ethereal',severity:'error',message:'Commander Farsight and Ethereal units cannot be included in the same army.'});
 if(!resolvedTauWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose a T’au Empire Character as Warlord; Commander Shadowsun must lead if included.'});
 const carriers=roster.filter(s=>tauTransportCapacity(s)?.dedicated).map(s=>tauCargoFormations(army,s,roster).map(g=>g.root.id));
 if(!canFillTransports(carriers,[...new Set(carriers.flat())],(ids,id)=>ids.includes(id)))findings.push({code:'dedicated-transport-passengers',severity:'error',message:'Each Devilfish must start with a different eligible whole formation aboard.'});
 const cost=rosterCost2026(army);
 const compulsory=cost.entries.filter(e=>tauKeywords(army,{id:e.id,unit:e.unit}).has('AIRCRAFT')).reduce((n,e)=>n+(e.points??0),0);
 if(compulsory>max/2)findings.push({code:'compulsory-reserves',severity:'error',message:'Compulsory starting Aircraft cost '+compulsory+' points and exceed the '+max/2+'-point Strategic Reserves allowance.'});
 if(cost.knownPoints>max)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds '+max+' points.'});
 return findings;
}
