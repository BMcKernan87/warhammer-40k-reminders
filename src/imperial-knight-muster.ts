import {alliedUnitLimit} from './titan-support-data';
import type {ArmySelection} from './catalog';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {IMPERIAL_KNIGHT_SHEETS,knightMusterUnits} from './imperial-knights-data';
import {ASSIGNED_AGENT_SHEETS,assignedAgentFindings} from './knight-assigned-agents';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map([...IMPERIAL_KNIGHT_SHEETS,...ASSIGNED_AGENT_SHEETS].map(sheet=>[sheet.unit,sheet]));
function hasKeyword(unit:string,keyword:string):boolean{
 return sheets.get(unit)?.keywords?.includes(keyword)??false;
}

// Core 25.03 and Knightly Teachings (Spearhead-at-arms). Armigers in other
// detachments use their printed keywords, including when fielded alongside allies.
export function knightUnitLimit(army:ArmySelection,unit:string):number{
 const allied=alliedUnitLimit(army,unit);
 if(army.faction==='Imperial Knights'&&allied!==undefined)return allied;
 if(army.faction!=='Imperial Knights'||!knightMusterUnits(army).includes(unit))return 0;
 if(hasKeyword(unit,'EPIC HERO'))return 1;
 const limit=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit;
 const promoted=army.detachments2026?.includes('Spearhead-at-arms')&&hasKeyword(unit,'ARMIGER');
 return promoted||hasKeyword(unit,'BATTLELINE')||hasKeyword(unit,'DEDICATED TRANSPORT')?limit*2:limit;
}
export function knightWarlordCandidates(army:ArmySelection):RosterInstance[]{
 if(army.faction!=='Imperial Knights')return [];
 return expandRoster(army).filter(s=>hasKeyword(s.unit,'IMPERIAL KNIGHTS')&&hasKeyword(s.unit,'CHARACTER'));
}
export function resolvedKnightWarlord(army:ArmySelection):RosterInstance|undefined{
 const candidates=knightWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectKnightWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!knightWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an Imperial Knights Character as Warlord');
 return {...army,warlordId:id??undefined};
}

// Questor Forgepact permits precisely the five Mechanicus datasheets offered by
// knightMusterUnits. Core 25.04 adds purchased enhancements to their unit's value.
export function knightMusterFindings(army:ArmySelection):RosterFinding[]{
 if(army.faction!=='Imperial Knights')return [];
 const roster=expandRoster(army);
 if(!roster.length)return [];
 const findings=assignedAgentFindings(army);
 const counts=new Map<string,number>();
 for(const s of roster)counts.set(s.unit,(counts.get(s.unit)??0)+1);
 for(const [unit,count] of counts){
  const limit=knightUnitLimit(army,unit);
  if(!limit){
   findings.push({code:'knight-unit-ineligible',severity:'error',unit,message:hasKeyword(unit,'ADEPTUS MECHANICUS')?unit+' requires Questor Forgepact.':unit+' is unavailable for this Imperial Knights roster.'});
  }else if(count>limit)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds its '+limit+'-copy limit for this battle size and detachment.'});
 }
 for(const character of roster.filter(s=>hasKeyword(s.unit,'ADEPTUS MECHANICUS')&&(s.attachedTo||s.unit==='Skitarii Marshal'))){
  const support=character.unit==='Skitarii Marshal';
  if(!knightJoinedBodyguard(army,character))findings.push({code:support?'mandatory-support':'invalid-attachment',severity:'error',unit:character.unit,message:character.id+(support?' requires an available Support slot':' requires an available Leader slot')+' in a Ranger or Vanguard unit.'});
 }
 const costs=rosterCost2026(army);
 const mech=costs.entries.filter(s=>hasKeyword(s.unit,'ADEPTUS MECHANICUS'));
 if(army.detachments2026?.includes('Questor Forgepact')&&mech.length){
  const points=mech.reduce((total,s)=>total+(s.points??0),0);
  if(points>500)findings.push({code:'forgepact-ally-cap',severity:'error',message:'Questor Forgepact Mechanicus allies cost '+points+' points. Their combined allowance is 500 points.'});
  else if(mech.some(s=>s.points===null))findings.push({code:'forgepact-ally-cost-unverified',severity:'error',message:'A Mechanicus ally has an unknown cost. Its points are needed to verify the 500-point Forgepact allowance.'});
 }
 if(!resolvedKnightWarlord(army))findings.push({code:'warlord-required',severity:'error',message:knightWarlordCandidates(army).length?'Choose an Imperial Knights Character from the roster as Warlord.':'Include an Imperial Knights Character to serve as Warlord.'});
 const budget=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
 if(costs.knownPoints>budget)findings.push({code:'points-limit',severity:'error',message:'Known roster points ('+costs.knownPoints+') exceed the '+budget+' point battle limit.'});
 return findings;
}
