import type {ArmySelection} from './catalog';
import {CHAOS_KNIGHT_SHEETS,chaosKnightMusterUnits} from './chaos-knights-data';
import {resolvedWarDogCharacterIds} from './chaos-knight-detachments';
import {daemonicPactFindings,isDaemonicPactUnit} from './daemonic-pact';
import {knightJoinedBodyguard} from './leader-eligibility';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(CHAOS_KNIGHT_SHEETS.map(sheet=>[sheet.unit,sheet]));
const has=(unit:string,keyword:string)=>sheets.get(unit)?.keywords?.includes(keyword)??false;

export function chaosKnightUnitLimit(army:ArmySelection,unit:string):number {
 if(army.faction!=='Chaos Knights'||!chaosKnightMusterUnits(army).includes(unit))return 0;
 if(has(unit,'EPIC HERO'))return 1;
 const limit=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit;
 const houndpackDog=army.detachments2026?.includes('Houndpack Lance')&&has(unit,'WAR DOG');
 return has(unit,'BATTLELINE')||has(unit,'DEDICATED TRANSPORT')||houndpackDog?2*limit:limit;
}
export function chaosKnightWarlordCandidates(army:ArmySelection):RosterInstance[] {
 if(army.faction!=='Chaos Knights')return [];
 const roster=expandRoster(army);
 const nominated=new Set(resolvedWarDogCharacterIds(army,roster));
 return roster.filter(model=>has(model.unit,'CHAOS KNIGHTS')&&(has(model.unit,'CHARACTER')||nominated.has(model.id)));
}
export function resolvedChaosKnightWarlord(army:ArmySelection):RosterInstance|undefined {
 const candidates=chaosKnightWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(model=>model.id===army.warlordId);
}
export function selectChaosKnightWarlord(army:ArmySelection,id:string|null):ArmySelection {
 if(id!==null&&!chaosKnightWarlordCandidates(army).some(model=>model.id===id))throw Error('Choose an eligible Chaos Knights Character as Warlord');
 return {...army,warlordId:id??undefined};
}

export function chaosKnightMusterFindings(army:ArmySelection):RosterFinding[] {
 if(army.faction!=='Chaos Knights')return [];
 const roster=expandRoster(army);
 if(!roster.length)return [];
 const findings:RosterFinding[]=[];
 const counts=new Map<string,number>();
 for(const squad of roster)counts.set(squad.unit,(counts.get(squad.unit)??0)+1);
 for(const [unit,count] of counts){
  const limit=chaosKnightUnitLimit(army,unit);
  if(!limit)findings.push({code:'chaos-knight-ineligible',unit,severity:'error',message:has(unit,'DAMNED')?unit+' requires Iconoclast Fiefdom.':unit+' is unavailable for this army.'});
  else if(count>limit)findings.push({code:'rule-of-three',unit,severity:'error',message:unit+' exceeds its '+limit+'-copy limit for this battle size and detachment.'});
 }
 if(army.detachments2026?.includes('Houndpack Lance')){
  if(roster.filter(s=>has(s.unit,'WAR DOG')).length<3)findings.push({code:'houndpack-minimum',severity:'error',message:'Houndpack Lance requires at least three War Dog units.'});
  else if(resolvedWarDogCharacterIds(army,roster).length!==3)findings.push({code:'houndpack-characters',severity:'error',message:'Choose the three Houndpack War Dogs that gain Character.'});
 }
 if(!resolvedChaosKnightWarlord(army))findings.push({code:'warlord-required',severity:'error',message:chaosKnightWarlordCandidates(army).length?'Choose a Chaos Knights Character as Warlord.':'Include an eligible Chaos Knights Character to serve as Warlord.'});
 const costs=rosterCost2026(army);
 findings.push(...daemonicPactFindings(army,roster,costs));
 if(roster.some(s=>isDaemonicPactUnit(s.unit))&&roster.some(s=>!isDaemonicPactUnit(s.unit)&&!has(s.unit,'CHAOS KNIGHTS')&&!has(s.unit,'HERETIC ASTARTES')))findings.push({code:'daemonic-pact-faction',severity:'error',message:'Daemonic Pact requires every other model to have Chaos Knights or Heretic Astartes.'});
 for(const squad of roster){
  const support=sheets.get(squad.unit)?.attachmentRole==='support';
  if((support||squad.attachedTo)&&!knightJoinedBodyguard(army,squad))findings.push({code:support?'mandatory-support':'invalid-attachment',severity:'error',unit:squad.unit,message:squad.id+' requires a compatible Bodyguard with an available '+(support?'Support':'Leader')+' slot.'});
 }
 const damned=costs.entries.filter(s=>has(s.unit,'DAMNED'));
 if(army.detachments2026?.includes('Iconoclast Fiefdom')&&damned.length){
  const subtotal=damned.reduce((n,s)=>n+(s.points??0),0);
  if(subtotal>500)findings.push({code:'iconoclast-points',severity:'error',message:'Damned allies cost '+subtotal+' points, exceeding the 500-point Iconoclast allowance.'});
  else if(damned.some(s=>s.points===null))findings.push({code:'iconoclast-cost-unknown',severity:'warning',message:'Complete the allied selections to calculate the 500-point Iconoclast allowance.'});
 }
 const budget=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
 if(costs.knownPoints>budget)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds the '+budget+'-point battle limit.'});
 return findings;
}
