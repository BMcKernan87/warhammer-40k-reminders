import {alliedUnitLimit} from './titan-support-data';
import type {ArmySelection} from './catalog';
import {DAEMON_SHEETS,daemonKeywords,daemonMusterUnits,shadowLegionBans} from './chaos-daemons-data';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(DAEMON_SHEETS.map(s=>[s.unit,s]));
const has=(unit:string,kw:string)=>sheets.get(unit)?.keywords?.includes(kw)??false;
export function daemonUnitLimit(army:ArmySelection,unit:string):number {
 const allied=alliedUnitLimit(army,unit);
 if(army.faction==='Chaos Daemons'&&allied!==undefined)return allied;
 if(army.faction!=='Chaos Daemons'||!daemonMusterUnits(army).includes(unit))return 0;
 if(has(unit,'EPIC HERO')||has(unit,'TITANIC')&&has(unit,'CHAOS KNIGHTS'))return 1;
 const limit=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit;
 return Math.min(has(unit,'WAR DOG')?3:Infinity,has(unit,'BATTLELINE')||has(unit,'DEDICATED TRANSPORT')?2*limit:limit);
}
export function daemonWarlordCandidates(army:ArmySelection):RosterInstance[] {
 if(army.faction!=='Chaos Daemons')return [];
 const options=daemonMusterUnits(army);
 const candidates=expandRoster(army).filter(s=>options.includes(s.unit)&&s.unit!=='Exalted Flamer'&&
  has(s.unit,'LEGIONES DAEMONICA')&&daemonKeywords(army,s).has('CHARACTER'));
 const supreme=candidates.filter(s=>s.unit==='Be’lakor');
 return supreme.length?supreme:candidates;
}
export function resolvedDaemonWarlord(army:ArmySelection):RosterInstance|undefined {
 const choices=daemonWarlordCandidates(army);
 return choices.length===1?choices[0]:choices.find(s=>s.id===army.warlordId);
}
export function selectDaemonWarlord(army:ArmySelection,id:string|null):ArmySelection {
 if(id!==null&&!daemonWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible Character from the Daemon army.');
 return {...army,warlordId:id??undefined};
}
export function daemonMusterFindings(army:ArmySelection):RosterFinding[] {
 if(army.faction!=='Chaos Daemons')return [];
 const roster=expandRoster(army);
 if(!roster.length)return [];
 const findings:RosterFinding[]=[];
 const counts=new Map<string,number>();
 for(const s of roster)counts.set(s.unit,(counts.get(s.unit)??0)+1);
 for(const [unit,count] of counts){
  const limit=daemonUnitLimit(army,unit);
  if(!limit)findings.push({code:'daemon-ineligible',unit,severity:'error',message:shadowLegionBans(unit)?unit+' cannot be included in Shadow Legion.':unit+' is unavailable in this detachment combination.'});
  else if(count>limit)findings.push({code:'rule-of-three',unit,severity:'error',message:unit+' exceeds its '+limit+'-copy limit.'});
 }
 if(!resolvedDaemonWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible Character as Warlord for this Daemon army.'});
 const dreadblades=roster.filter(s=>has(s.unit,'CHAOS KNIGHTS'));
 if(dreadblades.length>3||(dreadblades.some(s=>has(s.unit,'TITANIC'))&&dreadblades.length>1))findings.push({code:'dreadblade-allowance',severity:'error',message:'Dreadblades permit one Titanic Chaos Knight or up to three War Dogs.'});
 const costs=rosterCost2026(army);
 const limit=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
 const marines=costs.entries.filter(e=>has(e.unit,'HERETIC ASTARTES'));
 const subtotal=marines.reduce((sum,e)=>sum+(e.points??0),0);
 if(marines.length&&army.detachments2026?.includes('Shadow Legion')){
  if(subtotal>limit/2)findings.push({code:'shadow-legion-points',severity:'error',message:'Shadow Legion Heretic Astartes cost '+subtotal+' points, exceeding the '+limit/2+'-point allowance.'});
  else if(marines.some(e=>e.points===null))findings.push({code:'shadow-legion-cost-unknown',severity:'error',message:'Complete the allied selections to calculate the Shadow Legion allowance.'});
 }
 if(costs.knownPoints>limit)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds the '+limit+'-point battle limit.'});
 for(const s of roster){
  if(s.attachedTo&&!knightJoinedBodyguard(army,s))findings.push({code:'invalid-attachment',unit:s.unit,severity:'error',message:s.id+' requires a compatible Bodyguard with an available slot.'});
  if((s.unit==='Exalted Flamer'||has(s.unit,'CHAOS KNIGHTS'))&&(s.enhancement||army.upgrades2026?.[s.id]||army.upgrades2026?.[s.unit]))findings.push({code:'daemon-upgrade-forbidden',unit:s.unit,severity:'error',message:s.id+' cannot receive an enhancement.'});
 }
 return findings;
}
