import type {ArmySelection} from './catalog';
import {rosterCost2026} from './datasheets-2026';
import {BATTLE_SIZES_2026} from './edition-2026';
import {knightWeaponCount} from './knight-loadouts';
import {knightJoinedBodyguard} from './leader-eligibility';
import {ORK_SHEETS,orkKeywords} from './ork-data';
import type {RosterFinding} from './roster-findings';
import {expandRoster,type RosterInstance} from './roster-instances';

const sheets=new Map(ORK_SHEETS.map(s=>[s.unit,s]));
export function orkUnitLimit(army:ArmySelection,unit:string):number {
 if(army.faction!=='Orks'||!sheets.has(unit))return 0;
 const tags=orkKeywords(army,{id:'',unit});
 if(tags.has('EPIC HERO'))return 1;
 const limit=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].unitLimit;
 return tags.has('BATTLELINE')||tags.has('DEDICATED TRANSPORT')?2*limit:limit;
}
export function orkWarlordCandidates(army:ArmySelection):RosterInstance[] {
 if(army.faction!=='Orks')return [];
 const chars=expandRoster(army).filter(s=>orkKeywords(army,s).has('CHARACTER'));
 const supreme=chars.filter(s=>s.unit==='Ghazghkull Thraka');
 return supreme.length?supreme:chars;
}
export function resolvedOrkWarlord(army:ArmySelection):RosterInstance|undefined {
 const candidates=orkWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function selectOrkWarlord(army:ArmySelection,id:string|null):ArmySelection {
 if(id!==null&&!orkWarlordCandidates(army).some(s=>s.id===id))throw Error('Choose an eligible Ork Character as Warlord.');
 return {...army,warlordId:id??undefined};
}
const transportCapacity:Readonly<Record<string,number>>={
 Trukk:12,Battlewagon:22,Gunwagon:12,Morkanaut:12,Gorkanaut:12,Stompa:22,'Kill Rig':12,'Hunta Rig':22,'Big’ed Bossbunka':11,'Gargantuan Squiggoth':20,
};
export function orkTransportCapacity(transport:RosterInstance):number {
 if(transport.unit==='Gargantuan Squiggoth'&&knightWeaponCount(transport,'Supa-kannon'))return 15;
 return transportCapacity[transport.unit]??0;
}
export interface OrkCargoGroup {root:RosterInstance;members:RosterInstance[];spaces:number}
export function orkCargoGroups(army:ArmySelection,transport:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):OrkCargoGroup[] {
 if(army.faction!=='Orks'||!roster.some(s=>s.id===transport.id&&s.unit===transport.unit))return [];
 const capacity=orkTransportCapacity(transport);
 if(!capacity)return [];
 const rig=transport.unit==='Kill Rig'||transport.unit==='Hunta Rig';
 const excludesGhaz=['Trukk','Morkanaut','Gorkanaut','Big’ed Bossbunka'].includes(transport.unit);
 const attached=new Map(roster.filter(s=>s.attachedTo).map(s=>[s.id,knightJoinedBodyguard(army,s)?.id]));
 return roster.flatMap(root=>{
  if(root.id===transport.id||root.attachedTo||root.retinueTo||sheets.get(root.unit)?.attachmentRole==='support')return [];
  const attachedUnits=roster.filter(s=>s.attachedTo===root.id);
  if(attachedUnits.some(s=>attached.get(s.id)!==root.id))return [];
  const members=[root,...attachedUnits];
  let spaces=0;
  for(const squad of members){
   const tags=orkKeywords(army,squad);
   if(!tags.has('ORKS')||!tags.has('INFANTRY')||rig&&!tags.has('BEAST SNAGGA'))return [];
   if(excludesGhaz&&squad.unit==='Ghazghkull Thraka'||transport.unit==='Trukk'&&tags.has('JUMP PACK'))return [];
   const models=squad.models??sheets.get(squad.unit)?.sizes[0]??1;
   // Downtrodden applies to Gretchin models. A Runtherd or Zodgrod still takes one space.
   if(squad.unit==='Gretchin')spaces+=Math.ceil(models/2);
   else if(squad.unit==='Ghazghkull Thraka')spaces+=models*(transport.unit==='Gargantuan Squiggoth'?18:4);
   else spaces+=models*(tags.has('MEGA ARMOUR')||tags.has('JUMP PACK')?2:1);
  }
  return spaces<=capacity?[{root,members,spaces}]:[];
 });
}
export function eligibleOrkPassengers(army:ArmySelection,transport:RosterInstance,roster?:readonly RosterInstance[]):RosterInstance[]{
 return orkCargoGroups(army,transport,roster).map(group=>group.root);
}
export function orkTransportCanCarry(army:ArmySelection,transport:RosterInstance,passenger:RosterInstance):boolean {
 return eligibleOrkPassengers(army,transport).some(s=>s.id===passenger.id&&s.unit===passenger.unit);
}
export function orkCargoFits(army:ArmySelection,transport:RosterInstance,ids:readonly string[]):boolean {
 if(!ids.length||new Set(ids).size!==ids.length)return false;
 const groups=orkCargoGroups(army,transport).filter(g=>ids.includes(g.root.id));
 return groups.length===ids.length&&groups.reduce((n,g)=>n+g.spaces,0)<=orkTransportCapacity(transport);
}
export function orkMandatoryReservePoints(army:ArmySelection,entries:ReturnType<typeof rosterCost2026>['entries']):number {
 if(army.detachments2026?.includes('Flyboyz'))return 0;
 return entries.filter(e=>sheets.get(e.unit)?.keywords?.includes('AIRCRAFT')).reduce((n,e)=>n+(e.points??0),0);
}
export function orkMusterFindings(army:ArmySelection):RosterFinding[] {
 if(army.faction!=='Orks')return [];
 const roster=expandRoster(army);
 if(!roster.length)return [];
 const findings:RosterFinding[]=[];
 const counts=new Map<string,number>();
 for(const s of roster)counts.set(s.unit,(counts.get(s.unit)??0)+1);
 for(const [unit,count] of counts){
  const limit=orkUnitLimit(army,unit);
  if(!limit)findings.push({code:'ork-ineligible',severity:'error',unit,message:unit+' is unavailable for current matched play.'});
  else if(count>limit)findings.push({code:'rule-of-three',unit,severity:'error',message:unit+' exceeds its '+limit+'-copy limit.'});
 }
 for(const squad of roster){
  const support=sheets.get(squad.unit)?.attachmentRole==='support';
  if((support||squad.attachedTo)&&!knightJoinedBodyguard(army,squad))findings.push({code:support?'mandatory-support':'invalid-attachment',unit:squad.unit,severity:'error',message:squad.id+' requires a compatible Bodyguard with an available '+(support?'Support':'Leader')+' slot.'});
 }
 if(!resolvedOrkWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible Ork Character as Warlord.'});
 const trukks=roster.filter(s=>s.unit==='Trukk');
 if(trukks.length&&eligibleOrkPassengers(army,trukks[0],roster).length<trukks.length)findings.push({code:'dedicated-transport-passengers',severity:'error',unit:'Trukk',message:'Each Trukk must begin with a separate eligible Infantry unit embarked, within its 12-model capacity.'});
 const budget=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points;
 const cost=rosterCost2026(army);
 const compulsory=orkMandatoryReservePoints(army,cost.entries);
 if(compulsory>budget/2)findings.push({code:'compulsory-reserves',severity:'error',message:'Your Aircraft must start in Strategic Reserves. They cost '+compulsory+' points and exceed the '+(budget/2)+'-point starting allowance.'});
 if(cost.knownPoints>budget)findings.push({code:'points-limit',severity:'error',message:'The roster exceeds the '+budget+'-point battle limit.'});
 return findings;
}
