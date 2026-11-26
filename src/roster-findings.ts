import {aeldariMusterFindings} from './aeldari-muster';
import {drukhariMusterFindings} from './drukhari-muster';
import {csmMusterFindings} from './csm-muster';
import {tyranidMusterFindings} from './tyranid-muster';
import {tauMusterFindings} from './tau-muster';
import {mechanicusMusterFindings} from './mechanicus-muster';
import {sororitasMusterFindings} from './sororitas-muster';
import {assignedAgentHost} from './assigned-agent-data';
import {greyKnightsMusterFindings} from './grey-knights-muster';
import {deathGuardMusterFindings} from './death-guard-muster';
import {thousandSonsMusterFindings} from './thousand-sons-muster';
import {emperorsChildrenMusterFindings} from './emperors-children-muster';
import {astraMusterFindings} from './astra-muster';
import {gscMusterFindings} from './gsc-muster';
import {alliedTitanAndKnightFindings} from './titan-support';
import {daemonMusterFindings} from './chaos-daemon-muster';
import {orkMusterFindings} from './ork-muster';
import {worldEatersMusterFindings} from './world-eaters-muster';
import {votannMusterFindings} from './votann-muster';
import {custodesMusterFindings} from './custodes-muster';
import {chaosKnightMusterFindings} from './chaos-knight-muster';
import {agentMusterFindings} from './agent-muster';
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
 const findings:RosterFinding[]=army.faction==='Aeldari'?aeldariMusterFindings(army):army.faction==='Drukhari'?drukhariMusterFindings(army):army.faction==='Chaos Space Marines'?csmMusterFindings(army):army.faction==='Tyranids'?tyranidMusterFindings(army):army.faction==='T’au Empire'?tauMusterFindings(army):army.faction==='Adeptus Mechanicus'?mechanicusMusterFindings(army):army.faction==='Adepta Sororitas'?sororitasMusterFindings(army):army.faction==='Grey Knights'?greyKnightsMusterFindings(army):army.faction==='Death Guard'?deathGuardMusterFindings(army):army.faction==='Thousand Sons'?thousandSonsMusterFindings(army):army.faction==='Emperor’s Children'?emperorsChildrenMusterFindings(army):army.faction==='Astra Militarum'?astraMusterFindings(army):army.faction==='World Eaters'?worldEatersMusterFindings(army):army.faction==='Genestealer Cults'?gscMusterFindings(army):army.faction==='Leagues of Votann'?votannMusterFindings(army):army.faction==='Orks'?orkMusterFindings(army):army.faction==='Adeptus Custodes'?custodesMusterFindings(army):army.faction==='Chaos Daemons'?daemonMusterFindings(army):army.faction==='Imperial Knights'?knightMusterFindings(army):chaosKnightMusterFindings(army);
 if(army.faction!=='Adeptus Custodes')findings.push(...alliedTitanAndKnightFindings(army));
 if(army.faction==='Imperial Agents'||assignedAgentHost(army.faction))findings.push(...agentMusterFindings(army));
 if(!army.detachments2026?.length)findings.push({code:'no-11e-detachment',severity:'warning',message:'Select at least one 11th-edition detachment to enable detachment-specific reminders.'});
 const upgradeError=upgradeError2026(army);if(upgradeError)findings.push({code:'invalid-11e-upgrade',severity:'error',message:upgradeError+'.'});
 const instances=expandRoster(army);
 const byUnit=new Map<string,typeof instances>();
 for(const instance of instances)byUnit.set(instance.unit,[...(byUnit.get(instance.unit)||[]),instance]);
 for(const [unit,group] of byUnit){
  if(army.faction==='Necrons'){
   const limit=necronUnitLimit(army,unit);
   if(group.length>limit)findings.push({code:'rule-of-three',severity:'error',unit,message:unit+': '+group.length+' squads exceed the 11th-edition limit of '+limit+'.'});
  }else if(!['Imperial Knights','Chaos Knights','Chaos Daemons','Imperial Agents','Adeptus Custodes','Orks','Leagues of Votann','Genestealer Cults','World Eaters','Astra Militarum','Emperor’s Children','Thousand Sons','Death Guard','Grey Knights','Adepta Sororitas','Adeptus Mechanicus','T’au Empire','Tyranids','Chaos Space Marines','Drukhari','Aeldari'].includes(army.faction)&&group.length>BATTLE_SIZES_2026[army.battleSize2026||'Strike Force'].unitLimit*(isBattleline(army.faction,unit)?2:1)&&!isDedicatedTransport(army.faction,unit))
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
 if(attached.length&&!['Necrons','Imperial Knights','Chaos Knights','Chaos Daemons','Imperial Agents','Adeptus Custodes','Orks','Leagues of Votann','Genestealer Cults','World Eaters','Astra Militarum','Emperor’s Children','Thousand Sons','Death Guard','Grey Knights','Adepta Sororitas','Adeptus Mechanicus','T’au Empire','Tyranids','Chaos Space Marines','Drukhari','Aeldari'].includes(army.faction))findings.push({code:'leader-exceptions',severity:'info',message:'Leader eligibility is partially modeled; special multi-Leader and datasheet exceptions still require verification.'});
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
