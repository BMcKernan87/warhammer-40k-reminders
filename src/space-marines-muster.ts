import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import type {RosterFinding} from './roster-findings';
import {SM_ALL_SHEETS,isNativeSpaceMarine,spaceMarineAgentName} from './space-marines-data';
import {spaceMarineChapters,spaceMarineChapter,spaceMarineHasDetachment,spaceMarineMusterUnits} from './space-marines-muster-data';
import {spaceMarineKeywords,spaceMarinePhysicalModels} from './space-marines-keywords';
import {spaceMarineAttachmentRole} from './space-marines-attachments';
import {spaceMarineDedicatedSatisfied,spaceMarineMinimumPodPassengerPoints} from './space-marines-transports';
import {BATTLE_SIZES_2026} from './edition-2026';
import {rosterCost2026,type RosterCost2026} from './datasheets-2026';
import {assignedAgentFindings} from './knight-assigned-agents';
import {knightJoinedBodyguard} from './leader-eligibility';
import {alliedUnitLimit} from './titan-support-data';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(SM_ALL_SHEETS.map(s=>[s.unit,s]));
const source='https://wahapedia.ru/wh40k11ed/factions/space-marines/';
export function spaceMarineUnitLimit(army:ArmySelection,unit:string):number{
 if(!spaceMarineMusterUnits(army).includes(unit))return 0;
 const ally=alliedUnitLimit(army,unit);if(ally!==undefined)return ally;
 const tags=sheets.get(unit)?.keywords??[];
 if(tags.includes('EPIC HERO'))return 1;
 return BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit*(tags.includes('BATTLELINE')||tags.includes('DEDICATED TRANSPORT')?2:1);
}
export function spaceMarineWarlordCandidates(army:ArmySelection):RosterInstance[]{
 if(army.faction!=='Space Marines')return [];
 const allowed=new Set(spaceMarineMusterUnits(army)),support=spaceMarineHasDetachment(army,'Deathwatch Support');
 const candidates=expandRoster(army).filter(s=>isNativeSpaceMarine(s.unit)&&allowed.has(s.unit)&&spaceMarineKeywords(army,s).has('CHARACTER')&&(!support||!spaceMarineKeywords(army,s).has('DEATHWATCH')));
 const guilliman=candidates.filter(s=>s.unit==='Roboute Guilliman');return guilliman.length?guilliman:candidates;
}
export function resolvedSpaceMarineWarlord(army:ArmySelection){
 const candidates=spaceMarineWarlordCandidates(army);return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectSpaceMarineWarlord(army:ArmySelection,id:string|null):ArmySelection{
 if(id!==null&&!spaceMarineWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible Space Marines Character as Warlord. Guilliman must be Warlord if included; Deathwatch Support allies cannot be Warlord.');
 return {...army,warlordId:id??undefined};
}
/** Carrier/Aircraft base only: potential Pod passengers must remain selectable
 * in the ordinary reserve-candidate list instead of being counted twice. */
export function spaceMarineMandatoryReservePoints(army:ArmySelection,entries=rosterCost2026(army).entries){
 return entries.filter(e=>sheets.get(e.unit)?.keywords?.includes('AIRCRAFT')||e.unit==='Drop Pod').reduce((n,e)=>n+(e.points??0),0);
}
export function spaceMarineMinimumReservePoints(army:ArmySelection,entries?:RosterCost2026['entries']):number|null{
 const costs=entries??rosterCost2026(army).entries,passengers=spaceMarineMinimumPodPassengerPoints(army,expandRoster(army),costs);
 return passengers===null?null:spaceMarineMandatoryReservePoints(army,costs)+passengers;
}
export function spaceMarineMusterFindings(army:ArmySelection):RosterFinding[]{
 const roster=expandRoster(army);if(army.faction!=='Space Marines'||!roster.length)return [];
 const findings:RosterFinding[]=[...assignedAgentFindings(army)],cost=rosterCost2026(army),maximum=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
 const chapters=spaceMarineChapters(army);
 if(chapters.size>1)findings.push({code:'space-marines-chapter-conflict',severity:'error',message:'Space Marine Chapters permits only one Chapter. Current units or chapter detachments require '+[...chapters].join(', ')+'. Deathwatch Support is the specific exception for Deathwatch allies.'});
 for(const [unit,count] of Object.entries(army.units)){
  const limit=spaceMarineUnitLimit(army,unit);
  if(!limit)findings.push({code:'space-marines-ineligible',severity:'error',unit,message:unit+' is unavailable for this Chapter, detachment or battle size. A Deathwatch army cannot include Scout Squad, Terminator Squad or Terminator Assault Squad.'});
  else if(count>limit)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+' exceeds its '+limit+'-copy limit.'});
 }
 for(const squad of roster){
  if(!isNativeSpaceMarine(squad.unit))continue;
  const support=spaceMarineAttachmentRole(squad.unit,army)==='support';
  if((support||squad.attachedTo)&&!knightJoinedBodyguard(army,squad))findings.push({code:support?'mandatory-support':'invalid-attachment',severity:'error',unit:squad.unit,message:squad.id+' needs an eligible Bodyguard with an available '+(support?'Support':'Leader')+' slot.'+(squad.unit==='Cato Sicarius'?' Cato becomes Support when the army includes Marneus Calgar.':'')});
 }
 // Optional Victrix Epic Hero models are restricted across squads, not across the entire datasheet.
 const epic=new Map<string,string[]>();
 for(const squad of roster)for(const model of spaceMarinePhysicalModels(squad))if(spaceMarineKeywords(army,squad,model.model).has('EPIC HERO')){
  const key=model.model.toLowerCase().replaceAll('’',"'");epic.set(key,[...epic.get(key)??[],squad.id]);
 }
 for(const [model,ids] of epic)if(ids.length>1)findings.push({code:'space-marines-epic-model',severity:'error',message:'Only one '+model+' Epic Hero model can be included. Selected in '+ids.join(', ')+'.'});
 if(spaceMarineHasDetachment(army,'Deathwatch Support')){
  const allied=roster.filter(s=>isNativeSpaceMarine(s.unit)&&spaceMarineKeywords(army,s).has('DEATHWATCH')),ids=new Set(allied.map(s=>s.id));
  const points=cost.entries.filter(e=>ids.has(e.id)).reduce((n,e)=>n+(e.points??0),0);
  if(points>500)findings.push({code:'space-marines-deathwatch-allowance',severity:'error',message:'Deathwatch Support permits at most 500 points of Deathwatch units, including paid equipment and enhancements. Selected Deathwatch units cost '+points+' points.'});
 }
 if(army.warlordId&&!spaceMarineWarlordCandidates(army).some(s=>s.id===army.warlordId))findings.push({code:'space-marines-warlord-ineligible',severity:'error',message:'The selected Warlord is ineligible. Guilliman must be Warlord when included; Deathwatch Support allies and Assigned Agents cannot be Warlord.'});
 if(!resolvedSpaceMarineWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible Adeptus Astartes Character as Warlord.'});
 if(!spaceMarineDedicatedSatisfied(army,roster))findings.push({code:'dedicated-transport-passengers',severity:'error',message:'Every Drop Pod, Impulsor and Rhino must start with a distinct eligible whole formation within its printed model capacity. Count all attached Leaders and Supports.'});
 const compulsory=spaceMarineMinimumReservePoints(army,cost.entries);
 if(compulsory!==null&&compulsory>maximum/2)findings.push({code:'mandatory-reserves-limit',severity:'error',message:'Compulsory Aircraft, Drop Pods and the minimum possible passengers aboard those Pods require at least '+compulsory+' points in starting Strategic Reserves, exceeding the '+maximum/2+'-point allowance. This minimum keeps every native Dedicated Transport occupied by a distinct eligible whole formation and includes attached models, paid equipment and upgrades.'});
 if(cost.knownPoints>maximum)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds '+maximum+' points.'});
 return findings;
}
export function spaceMarineArmyReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Space Marines'||!roster.some(s=>isNativeSpaceMarine(s.unit)))return [];
 const chapter=spaceMarineChapter(army),support=spaceMarineHasDetachment(army,'Deathwatch Support'),points=rosterCost2026(army).entries.filter(e=>!spaceMarineAgentName(e.unit)&&sheets.get(e.unit)?.keywords?.includes('DEATHWATCH')).reduce((n,e)=>n+(e.points??0),0);
 return [{id:'11e-sm-space-marine-chapters',title:'Space Marine Chapters',window:'Pre-battle',turn:'either',timing:'during',origin:'army',units:roster.filter(s=>isNativeSpaceMarine(s.unit)).map(s=>s.id),source,summary:'An Adeptus Astartes unit’s second Faction keyword identifies its Chapter. Include units from only one Chapter.'+(chapter?' This roster’s Chapter is '+chapter+'.':' Units with no printed Chapter keyword do not acquire one from the army’s other units.')+(chapter==='DEATHWATCH'?' Veteran Recruits excludes Scout Squad, Terminator Squad and Terminator Assault Squad.':'')+(support?' Deathwatch Support permits Deathwatch allies from another Chapter, up to 500 points; the selected Deathwatch units cost '+points+' points. A Deathwatch model cannot be Warlord without an explicit exception, and Kill Team formations can only contain enhancements from Deathwatch Support.':'')+' Generic attached models retain their own printed keywords; sharing a unit’s keywords does not change each model’s transport eligibility.'}];
}
