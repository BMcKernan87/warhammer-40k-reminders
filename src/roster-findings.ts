import {knightMusterFindings} from './imperial-knight-muster';
import {ghostArkPassengers} from './necron-retinues';
import {necronUnitLimit,legalWarlordCandidates,resolvedWarlord,unresolvedSupports} from './necron-muster-legality';
import {BATTLE_SIZES_2026,DETACHMENTS_2026,detachmentBudget} from './edition-2026';
import type {ArmySelection} from './catalog';
import {expandRoster} from './roster-instances';
import {rosterCost2026,verifiedUnitSizes2026} from './datasheets-2026';
import {upgradeError2026} from './upgrades-2026';
export interface RosterFinding {code:string;severity:'error'|'warning'|'info';message:string;unit?:string}
/** Auditable checks only. This is not a substitute for current official points and mission rules. */
export function rosterFindings(army:ArmySelection):RosterFinding[]{
 const findings:RosterFinding[]=army.faction==='Imperial Knights'?knightMusterFindings(army):[];
 if(!army.detachments2026?.length)findings.push({code:'no-11e-detachment',severity:'warning',message:'Select at least one 11th-edition detachment to enable detachment-specific reminders.'});
 const upgradeError=upgradeError2026(army);if(upgradeError)findings.push({code:'invalid-11e-upgrade',severity:'error',message:upgradeError+'.'});
 const instances=expandRoster(army);
 const byUnit=new Map<string,typeof instances>();
 for(const instance of instances)byUnit.set(instance.unit,[...(byUnit.get(instance.unit)||[]),instance]);
 for(const [unit,group] of byUnit){
  if(army.faction==='Necrons'){
   const limit=necronUnitLimit(army,unit);
   if(group.length>limit)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+': '+group.length+' squads exceed the 11th-edition limit of '+limit+'.'});
  }else if(army.faction!=='Imperial Knights'&&group.length>BATTLE_SIZES_2026[army.battleSize2026||'Strike Force'].unitLimit*(isBattleline(army.faction,unit)?2:1)&&!isDedicatedTransport(army.faction,unit))
   findings.push({code:'rule-of-three',severity:'warning',unit,message:unit+': '+group.length+' units exceed the baseline selected battle-size copy limit; check official datasheet-specific exceptions.'});
  const sizes=verifiedUnitSizes2026(army,unit);
  if(!sizes)findings.push({code:'size-unverified',severity:'info',unit,message:unit+': 11th-edition model-count legality has not been source-verified for this datasheet.'});
  for(const x of group)if(sizes&&!x.models&&sizes.length>1)findings.push({code:'size-default',severity:'info',unit,message:x.id+': using the minimum verified unit size ('+sizes[0]+') until you choose another size.'});
 }
 if(army.detachments2026?.length&&DETACHMENTS_2026[army.faction]){const budget=detachmentBudget(army.faction,army.detachments2026,army.battleSize2026||'Strike Force');if(!budget.valid)findings.push({code:'detachment-points',severity:'error',message:'Selected 2026 detachments exceed their DP budget or are invalid.'});else findings.push({code:'detachment-points',severity:'info',message:'2026 detachments: '+budget.spent+' of '+budget.limit+' DP used; Force Dispositions: '+budget.dispositions.join(', ')+'.'});}
 if(army.faction==='Necrons'&&instances.length){
  for(const support of unresolvedSupports(army))findings.push({code:'mandatory-support',severity:'error',unit:support.unit,message:support.id+' must join an eligible Bodyguard before battle.'});
  const arks=instances.filter(s=>s.unit==='Ghost Ark');
  const passengers=ghostArkPassengers(army);
  if(arks.length>passengers.length)findings.push({code:'dedicated-transport-passengers',severity:'error',unit:'Ghost Ark',message:'Not enough distinct eligible whole formations to start all '+arks.length+' Ghost Arks embarked; empty Dedicated Transports are destroyed at Declare Battle Formations.'});
  const candidates=legalWarlordCandidates(army);
  if(!candidates.length)findings.push({code:'warlord-required',severity:'error',message:'Include an eligible non-C’tan Character to serve as Warlord.'});
  else if(!resolvedWarlord(army))findings.push({code:'warlord-required',severity:'error',message:'Choose an eligible Warlord from the roster.'});
 }
 const attached=instances.filter(x=>x.attachedTo);
 if(attached.length&&army.faction!=='Necrons'&&army.faction!=='Imperial Knights')findings.push({code:'leader-exceptions',severity:'info',message:'Leader eligibility is partially modeled; special multi-Leader and datasheet exceptions still require verification.'});
 if(!DETACHMENTS_2026[army.faction]?.length)findings.push({code:'detachment-unavailable',severity:'warning',message:'No 11th-edition detachments are available for this faction.'});
 const costs=rosterCost2026(army);
 const pointLimit=BATTLE_SIZES_2026[army.battleSize2026||'Strike Force'].points;
 if(army.faction==='Necrons'&&costs.knownPoints>pointLimit)findings.push({code:'points-limit',severity:'error',message:'Known roster points ('+costs.knownPoints+') exceed the '+pointLimit+' point battle limit.'});
 if(costs.unknownUnits.length)findings.push({code:'points-unavailable',severity:'info',message:costs.unknownUnits.length+' roster entries have no source-verified 11th-edition points. Total points and tournament legality cannot yet be validated.'});
 return findings;
}
const battleline:Partial<Record<ArmySelection['faction'],readonly string[]>>={
 Necrons:['Necron Warriors','Immortals'],
 Orks:['Boyz','Beast Snagga Boyz'],
 Tyranids:['Termagants','Hormagaunts','Gargoyles'],
 'Space Marines':['Intercessor Squad','Assault Intercessor Squad','Heavy Intercessor Squad']
};
function isBattleline(faction:ArmySelection['faction'],unit:string):boolean{return battleline[faction]?.includes(unit)??false;}
function isDedicatedTransport(faction:ArmySelection['faction'],unit:string):boolean{return faction==='Orks'&&unit==='Trukk';}
