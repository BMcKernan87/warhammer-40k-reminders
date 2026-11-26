import type {ArmySelection} from './catalog';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {TYRANID_SHEETS,tyranidMusterUnits} from './tyranid-data';
import {tyranidKeywords} from './tyranid-keywords';
import {tyranidCanPromote} from './tyranid-muster-data';
import {tyranidCargoFormations} from './tyranid-transports';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';
import {canFillTransports} from './transport-matching';

const native=new Set(TYRANID_SHEETS.map(s=>s.unit));
export function tyranidUnitLimit(army:ArmySelection,unit:string):number{
 if(!tyranidMusterUnits(army).includes(unit))return 0;
 const tags=tyranidKeywords(army,{id:'',unit});
 if(tags.has('EPIC HERO'))return 1;
 return BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit*(tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2:1);
}
export function tyranidWarlordCandidates(army:ArmySelection):RosterInstance[]{
 if(army.faction!=='Tyranids')return [];
 return expandRoster(army).filter(s=>native.has(s.unit)&&s.unit!=='Deathleaper'&&tyranidKeywords(army,s).has('CHARACTER'));
}
export function resolvedTyranidWarlord(army:ArmySelection){
 const candidates=tyranidWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectTyranidWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!tyranidWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible Tyranids Character as Warlord. Deathleaper cannot be Warlord.');
 return {...army,warlordId:id??undefined};
}
export function setTyranidCharacter(army:ArmySelection,id:string,selected:boolean):ArmySelection{
 const roster=expandRoster(army),bearer=roster.find(s=>s.id===id);
 if(!bearer||!tyranidCanPromote(army,bearer))throw Error('Subterranean Assault can select up to two Trygons as Characters.');
 if(selected&&roster.filter(s=>s.id!==id&&s.characterPromotion).length>=2)throw Error('Select at most two Trygon Characters.');
 const upgrades2026={...army.upgrades2026};
 if(!selected){
  if(upgrades2026[bearer.unit]){
   for(const copy of roster.filter(s=>s.unit===bearer.unit&&s.id!==id))upgrades2026[copy.id]??=upgrades2026[bearer.unit];
   delete upgrades2026[bearer.unit];
  }
  delete upgrades2026[id];
 }
 return {...army,instances:roster.map(s=>s.id===id?{...s,characterPromotion:selected||undefined}:s),upgrades2026,warlordId:!selected&&army.warlordId===id?undefined:army.warlordId};
}
/** Aerial Seeding exempts actual passengers, including eligible 12W Aircraft. */
export function tyranidReserveAccounting(army:ArmySelection){
 const roster=expandRoster(army),prices=new Map(rosterCost2026(army).entries.map(e=>[e.id,e.points??0]));
 const aircraft=roster.filter(s=>tyranidKeywords(army,s).has('AIRCRAFT'));
 const pods=roster.filter(s=>s.unit==='Tyrannocyte');
 const eligible=new Set(pods.flatMap(p=>tyranidCargoFormations(army,p,roster).map(g=>g.root.id)));
 const exemptible=aircraft.filter(s=>eligible.has(s.id)).sort((a,b)=>(prices.get(b.id)??0)-(prices.get(a.id)??0)).slice(0,pods.length);
 const aircraftPoints=aircraft.reduce((n,s)=>n+(prices.get(s.id)??0),0);
 const possibleExemption=exemptible.reduce((n,s)=>n+(prices.get(s.id)??0),0);
 return {aircraftPoints,possibleExemption,minimumAircraftPoints:aircraftPoints-possibleExemption,exemptible:exemptible.map(s=>s.id)};
}
export function tyranidMusterFindings(army:ArmySelection):RosterFinding[]{
 const roster=expandRoster(army);if(army.faction!=='Tyranids'||!roster.length)return [];
 const findings:RosterFinding[]=[],max=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
 for(const [unit,count] of Object.entries(army.units)){
  const cap=tyranidUnitLimit(army,unit);
  if(!cap)findings.push({code:'tyranid-ineligible',severity:'error',unit,message:unit+' is not a current matched-play Tyranids datasheet.'});
  else if(count>cap)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds the '+cap+'-copy limit.'});
 }
 for(const squad of roster)if(squad.attachedTo&&!knightJoinedBodyguard(army,squad))findings.push({code:'invalid-attachment',severity:'error',unit:squad.unit,message:squad.id+' requires an eligible Bodyguard with an available Leader slot.'});
 if(roster.filter(s=>s.characterPromotion).length>2||roster.some(s=>s.characterPromotion&&!tyranidCanPromote(army,s)))findings.push({code:'trygon-characters',severity:'error',message:'Only Subterranean Assault can select up to two Trygons as Characters.'});
 if(!resolvedTyranidWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible Tyranids Character as Warlord. Deathleaper cannot be Warlord.'});
 const pods=roster.filter(s=>s.unit==='Tyrannocyte'),podIds=new Set(pods.map(s=>s.id));
 const carriers=pods.map(s=>tyranidCargoFormations(army,s,roster).map(g=>g.root.id));
 // As for Final Day pods, a nested chain must end in an actual passenger;
 // mutually embarked empty Tyrannocytes cannot satisfy Dedicated Transport.
 if(pods.length&&!carriers.some(ids=>ids.some(id=>!podIds.has(id)))||!canFillTransports(carriers,[...new Set(carriers.flat())],(ids,id)=>ids.includes(id)))findings.push({code:'dedicated-transport-passengers',severity:'error',message:'Each Tyrannocyte must start with an eligible whole formation aboard; circular transport assignments do not supply passengers.'});
 const cost=rosterCost2026(army);
 const compulsory=tyranidReserveAccounting(army).minimumAircraftPoints;
 if(compulsory>max/2)findings.push({code:'compulsory-reserves',severity:'error',message:'Compulsory starting Aircraft cost '+compulsory+' points and exceed the '+max/2+'-point Strategic Reserves allowance. Tyrannocytes and their actual passengers are exempt.'});
 if(cost.knownPoints>max)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds '+max+' points.'});
 return findings;
}
