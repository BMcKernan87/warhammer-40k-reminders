import type {ArmySelection} from './catalog';
import {CATALOG} from './catalog';
import {expandRoster} from './roster-instances';
import {legalUnitSizes} from './unit-sizes';
import {isModeledLeader} from './leader-eligibility';
export interface RosterFinding {code:string;severity:'error'|'warning'|'info';message:string;unit?:string}
/** Auditable checks only. This is not a substitute for current official points and mission rules. */
export function rosterFindings(army:ArmySelection):RosterFinding[]{
 const findings:RosterFinding[]=[];
 const instances=expandRoster(army);
 const byUnit=new Map<string,typeof instances>();
 for(const instance of instances)byUnit.set(instance.unit,[...(byUnit.get(instance.unit)||[]),instance]);
 for(const [unit,group] of byUnit){
  if(group.length>3&&!isBattleline(unit)&&!isDedicatedTransport(unit))
   findings.push({code:'rule-of-three',severity:'warning',unit,message:unit+': '+group.length+' units selected. Check the current datasheet limits, exceptions and mission pack.'});
  const sizes=legalUnitSizes(army.faction,unit);
  if(!sizes)findings.push({code:'size-unverified',severity:'info',unit,message:unit+': model-count legality has not been configured for this datasheet.'});
  for(const x of group)if(sizes&&!x.models&&sizes.length>1)findings.push({code:'size-default',severity:'info',unit,message:x.id+': using assumed minimum '+sizes[0]+' models until you select the squad size.'});
 }
 const attached=instances.filter(x=>x.attachedTo);
 if(attached.length&&army.faction!=='Necrons')findings.push({code:'leader-exceptions',severity:'info',message:'Leader eligibility is partially modeled; special multi-Leader and datasheet exceptions still require verification.'});
 if(CATALOG[army.faction].detachments.some(x=>x.includes('(unverified)')))findings.push({code:'detachment-unverified',severity:'warning',message:'This faction’s detachment catalog is not yet verified.'});
 findings.push({code:'points-unavailable',severity:'info',message:'Points have not been loaded from a versioned official Munitorum Field Manual. Total points and the 2,000-point limit cannot yet be validated.'});
 return findings;
}
const battleline:Record<string,readonly string[]>={
 Necrons:['Necron Warriors','Immortals'],
 Orks:['Boyz','Beast Snagga Boyz'],
 Tyranids:['Termagants','Hormagaunts','Gargoyles'],
 'Space Marines':['Intercessor Squad','Assault Intercessor Squad','Heavy Intercessor Squad']
};
function isBattleline(unit:string):boolean{return Object.values(battleline).some(units=>units.includes(unit));}
function isDedicatedTransport(unit:string):boolean{return ['Trukk'].includes(unit);}
