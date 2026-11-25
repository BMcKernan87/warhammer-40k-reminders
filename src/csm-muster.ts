import type {ArmySelection} from './catalog';
import type {RosterFinding} from './roster-findings';
import {CSM_SHEETS} from './csm-data';
import {csmMusterUnits,isCsmCult} from './csm-army-data';
import {csmKeywords} from './csm-keywords';
import {csmMarkChoices,type CsmMark} from './csm-muster-data';
import {eligibleCsmUpgrades} from './csm-detachment-data';
import {csmCargoFormations} from './csm-transports';
import {isDreadblade} from './dreadblade-allies';
import {daemonicPactFindings,isDaemonicPactUnit} from './daemonic-pact';
import {isWarhound} from './titan-support-data';
import {BATTLE_SIZES_2026} from './edition-2026';
import {rosterCost2026} from './datasheets-2026';
import {knightJoinedBodyguard,rosterAttachmentRole} from './leader-eligibility';
import {expandRoster,reconcileInstanceAttachments,autoAttachUnambiguousInstances,type RosterInstance} from './roster-instances';
import {canFillTransports} from './transport-matching';

const native=new Set(CSM_SHEETS.map(s=>s.unit));
const budget=(army:ArmySelection)=>BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'];
const baseline=(army:ArmySelection,squad:RosterInstance)=>{
 const tags=csmKeywords(army,squad);
 return tags.has('EPIC HERO')||isWarhound(squad.unit)?1:budget(army).unitLimit*(tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2:1);
};
export function csmUnitLimit(army:ArmySelection,unit:string):number{
 if(!csmMusterUnits(army).includes(unit))return 0;
 const cap=baseline(army,{id:'',unit});if(!isDreadblade(unit))return cap;
 const others=expandRoster(army).filter(s=>s.unit!==unit&&isDreadblade(s.unit));
 if(csmKeywords(army,{id:'',unit}).has('TITANIC'))return others.length?0:1;
 if(others.some(s=>csmKeywords(army,s).has('TITANIC')))return 0;
 return Math.min(cap,Math.max(0,3-others.length));
}
export function csmWarlordCandidates(army:ArmySelection):RosterInstance[]{
 if(army.faction!=='Chaos Space Marines')return [];
 const candidates=expandRoster(army).filter(s=>native.has(s.unit)&&csmKeywords(army,s).has('CHARACTER'));
 const abaddon=candidates.filter(s=>s.unit==='Abaddon The Despoiler');
 return abaddon.length?abaddon:candidates;
}
export function resolvedCsmWarlord(army:ArmySelection){
 const candidates=csmWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectCsmWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!csmWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible Chaos Space Marines Character. Abaddon must be Warlord when present.');
 return {...army,warlordId:id??undefined};
}
export function setCsmMark(army:ArmySelection,id:string,mark:CsmMark|null):ArmySelection{
 const roster=expandRoster(army),selected=roster.find(s=>s.id===id);
 if(!selected||!csmMarkChoices(army,selected).length||mark!==null&&!csmMarkChoices(army,selected).includes(mark))throw Error('Choose a legal Daemonic Allegiance or Mark of Chaos for this unit.');
 let updated={...army,instances:roster.map(s=>s.id===id?{...s,csmMark:mark??undefined}:s),upgrades2026:{...army.upgrades2026}};
 const upgrade=updated.upgrades2026[id]??updated.upgrades2026[selected.unit];
 if(upgrade&&!eligibleCsmUpgrades(updated,selected.unit,id).some(u=>u.name===upgrade)){
  if(updated.upgrades2026[selected.unit]){
   for(const other of roster.filter(s=>s.unit===selected.unit&&s.id!==id))updated.upgrades2026[other.id]??=updated.upgrades2026[selected.unit];
   delete updated.upgrades2026[selected.unit];
  }
  delete updated.upgrades2026[id];
 }
 return autoAttachUnambiguousInstances(reconcileInstanceAttachments(updated));
}
export function csmMusterFindings(army:ArmySelection):RosterFinding[]{
 const roster=expandRoster(army);if(army.faction!=='Chaos Space Marines'||!roster.length)return [];
 const findings:RosterFinding[]=[],allowed=new Set(csmMusterUnits(army)),limit=budget(army).points,cost=rosterCost2026(army);
 for(const [unit,count] of Object.entries(army.units)){
  if(!allowed.has(unit))findings.push({code:'csm-ineligible',severity:'error',unit,message:unit+' is unavailable for this detachment, battle size or allied combination.'});
  else if(count>baseline(army,{id:'',unit}))findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds its '+baseline(army,{id:'',unit})+'-copy limit.'});
 }
 for(const s of roster){
  if(csmMarkChoices(army,s).length&&!s.csmMark)findings.push({code:'csm-allegiance-required',severity:'error',unit:s.unit,message:'Choose the Daemonic Allegiance or Mark of Chaos for '+s.id+'.'});
  if(s.csmMark&&!csmMarkChoices(army,s).includes(s.csmMark))findings.push({code:'csm-allegiance-invalid',severity:'error',unit:s.unit,message:s.id+' has an ineligible allegiance or mark.'});
  const support=rosterAttachmentRole(army.faction,s.unit)==='support';
  if((s.attachedTo||support)&&!knightJoinedBodyguard(army,s))findings.push({code:support?'mandatory-support':'invalid-attachment',severity:'error',unit:s.unit,message:s.id+' requires an eligible Bodyguard with an available '+(support?'Support':'Leader')+' slot and a compatible Mark of Chaos.'});
  if(isDreadblade(s.unit)&&(army.upgrades2026?.[s.id]||army.upgrades2026?.[s.unit]||s.enhancement))findings.push({code:'dreadblade-enhancement',severity:'error',unit:s.unit,message:s.id+' cannot receive an enhancement as a Dreadblade.'});
 }
 const knights=roster.filter(s=>isDreadblade(s.unit));
 if(knights.length>(knights.some(s=>csmKeywords(army,s).has('TITANIC'))?1:3))findings.push({code:'dreadblade-allowance',severity:'error',message:'Select one Titanic Dreadblade or up to three War Dog models.'});
 const chosen=roster.find(s=>s.id===army.warlordId);
 if(chosen&&!csmWarlordCandidates(army).some(s=>s.id===chosen.id))findings.push({code:'csm-warlord-ineligible',severity:'error',unit:chosen.unit,message:chosen.id+' cannot be your Warlord. Abaddon must lead when present.'});
 if(!resolvedCsmWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible Chaos Space Marines Character as Warlord. Abaddon must lead when present.'});
 const cult=cost.entries.filter(s=>isCsmCult(s.unit)).reduce((n,s)=>n+(s.points??0),0);
 if(cult>limit/4)findings.push({code:'cults-of-dark-gods-allowance',severity:'error',message:'Cults of the Dark Gods units cost '+cult+' points, exceeding the '+limit/4+'-point allowance.'});
 findings.push(...daemonicPactFindings(army,roster,cost));
 if(roster.some(s=>isDaemonicPactUnit(s.unit))&&roster.some(s=>!isDaemonicPactUnit(s.unit)&&!csmKeywords(army,s).has('HERETIC ASTARTES')&&!csmKeywords(army,s).has('CHAOS KNIGHTS')))findings.push({code:'daemonic-pact-faction',severity:'error',message:'Daemonic Pact requires every other model to have Heretic Astartes or Chaos Knights.'});
 const rhinos=roster.filter(s=>s.unit==='Chaos Rhino'),cargo=rhinos.map(s=>csmCargoFormations(army,s,roster).map(g=>g.root.id));
 if(!canFillTransports(cargo,[...new Set(cargo.flat())],(ids,id)=>ids.includes(id)))findings.push({code:'dedicated-transport-passengers',severity:'error',message:'Each Chaos Rhino must start with a distinct eligible whole formation aboard, respecting capacity and Mark of Chaos.'});
 if(cost.knownPoints>limit)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds '+limit+' points.'});
 return findings;
}
