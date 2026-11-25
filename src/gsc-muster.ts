import type {ArmySelection} from './catalog';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {GSC_UNITS,gscKeywords} from './gsc-data';
import {GSC_ALLIED_SHEETS} from './gsc-allies-data.generated';
import {gscAlliedMusterUnits,gscAllyFindings,gscAlliedKeywords} from './gsc-allies';
import {gscMissingPassengers} from './gsc-army-transports';
import {knightJoinedBodyguard,rosterAttachmentRole} from './leader-eligibility';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';

export const formerAcolyte='Acolyte Hybrids';
export const acolyteVariants=['Acolyte Hybrids With Autopistols','Acolyte Hybrids With Hand Flamers'] as const;
const allies=new Map(GSC_ALLIED_SHEETS.map(s=>[s.unit,s]));
export function gscArmyKeywords(army:ArmySelection,squad:RosterInstance):Set<string>{
 const sheet=allies.get(squad.unit);
 return sheet?gscAlliedKeywords(squad):gscKeywords(army,squad);
}
export function gscMusterUnits(army:ArmySelection):string[]{
 return army.faction==='Genestealer Cults'?[...GSC_UNITS,...gscAlliedMusterUnits(army)]:[];
}
export function gscUnitLimit(army:ArmySelection,unit:string):number{
 if(!gscMusterUnits(army).includes(unit))return 0;
 const tags=gscArmyKeywords(army,{unit,id:''});
 if(unit==='Patriarch'||tags.has('EPIC HERO'))return 1;
 const limit=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit;
 return tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2*limit:limit;
}
export function gscWarlordCandidates(army:ArmySelection):RosterInstance[]{
 if(army.faction!=='Genestealer Cults')return [];
 const native=expandRoster(army).filter(s=>gscKeywords(army,s).has('CHARACTER'));
 const patriarch=native.find(s=>s.unit==='Patriarch');
 return patriarch?[patriarch]:native;
}
export function resolvedGscWarlord(army:ArmySelection):RosterInstance|undefined{
 const candidates=gscWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectGscWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!gscWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible Cult Character as Warlord.');
 return {...army,warlordId:id??undefined};
}
export function gscMusterFindings(army:ArmySelection):RosterFinding[]{
 const roster=expandRoster(army);
 if(army.faction!=='Genestealer Cults'||!roster.length)return [];
 const findings=gscAllyFindings(army);
 for(const [unit,count] of Object.entries(army.units)){
  const limit=gscUnitLimit(army,unit);
  if(unit===formerAcolyte)findings.push({code:'gsc-acolyte-variant',severity:'error',unit,message:'Choose the current datasheet for each saved Acolyte Hybrids squad.'});
  else if(!limit&&!allies.has(unit))findings.push({code:'gsc-ineligible',severity:'error',unit,message:unit+' cannot be selected in this Genestealer Cults army.'});
  else if(limit&&count>limit)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds its '+limit+'-copy limit.'});
 }
 for(const squad of roster){
  if(rosterAttachmentRole(army.faction,squad.unit)==='support'&&!knightJoinedBodyguard(army,squad))findings.push({code:'mandatory-support',severity:'error',unit:squad.unit,message:squad.id+' must join an eligible Bodyguard before battle.'});
  else if(squad.attachedTo&&!knightJoinedBodyguard(army,squad))findings.push({code:'invalid-attachment',severity:'error',unit:squad.unit,message:squad.id+' requires a compatible Bodyguard with an available slot.'});
 }
 if(!resolvedGscWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible Genestealer Cults Character as Warlord.'});
 if(gscMissingPassengers(army,roster))findings.push({code:'gsc-dedicated-passengers',severity:'error',message:'Every Dedicated Transport must start with a separate eligible formation embarked.'});
 const budget=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
 if(rosterCost2026(army).knownPoints>budget)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds the '+budget+'-point battle limit.'});
 return findings;
}

// Earlier saves did not record which of the two Acolyte datasheets a squad
// represented. Keep its ID and references when the player identifies it.
export function identifySavedAcolytes(army:ArmySelection,id:string,variant:string):ArmySelection{
 if(army.faction!=='Genestealer Cults'||!acolyteVariants.some(name=>name===variant))throw Error('Choose a current Acolyte datasheet.');
 const roster=expandRoster(army),squad=roster.find(s=>s.id===id);
 if(!squad||squad.unit!==formerAcolyte)throw Error('This squad already has a current datasheet.');
 const units={...army.units,[variant]:(army.units[variant]??0)+1};
 units[formerAcolyte]--;
 if(!units[formerAcolyte])delete units[formerAcolyte];
 return {...army,units,instances:roster.map(s=>s.id===id?{...s,unit:variant}:s)};
}
