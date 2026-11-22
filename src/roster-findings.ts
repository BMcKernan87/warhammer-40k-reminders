import {BATTLE_SIZES_2026,DETACHMENTS_2026,detachmentBudget} from './edition-2026';
import type {ArmySelection} from './catalog';
import {CATALOG} from './catalog';
import {expandRoster} from './roster-instances';
import {legalUnitSizes} from './unit-sizes';
import {isModeledLeader} from './leader-eligibility';
export interface RosterFinding {code:string;severity:'error'|'warning'|'info';message:string;unit?:string}
/** Auditable checks only. This is not a substitute for current official points and mission rules. */
export function rosterFindings(army:ArmySelection):RosterFinding[]{
 const findings:RosterFinding[]=[{code:'edition-mismatch',severity:'error',message:'This roster builder currently models Warhammer 40,000 10th-edition detachments and abilities. The current 2026 edition uses revised faction packs, Detachment Points and Force Dispositions. Do not treat this roster or reminder sheet as current-edition legal.'}];
 const instances=expandRoster(army);
 const byUnit=new Map<string,typeof instances>();
 for(const instance of instances)byUnit.set(instance.unit,[...(byUnit.get(instance.unit)||[]),instance]);
 for(const [unit,group] of byUnit){
  if(group.length>BATTLE_SIZES_2026[army.battleSize2026||'Strike Force'].unitLimit*(isBattleline(unit)?2:1)&&!isDedicatedTransport(unit))
   findings.push({code:'rule-of-three',severity:'warning',unit,message:unit+': '+group.length+' units exceed the selected 2026 battle-size copy limit (before datasheet-specific exceptions).'});
  const sizes=legalUnitSizes(army.faction,unit);
  if(!sizes)findings.push({code:'size-unverified',severity:'info',unit,message:unit+': model-count legality has not been configured for this datasheet.'});
  for(const x of group)if(sizes&&!x.models&&sizes.length>1)findings.push({code:'size-default',severity:'info',unit,message:x.id+': using assumed minimum '+sizes[0]+' models until you select the squad size.'});
 }
 if(army.detachments2026?.length&&DETACHMENTS_2026[army.faction]){const budget=detachmentBudget(army.faction,army.detachments2026,army.battleSize2026||'Strike Force');if(!budget.valid)findings.push({code:'detachment-points',severity:'error',message:'Selected 2026 detachments exceed their DP budget or are invalid.'});else findings.push({code:'detachment-points',severity:'info',message:'2026 detachments: '+budget.spent+' of '+budget.limit+' DP used; Force Dispositions: '+budget.dispositions.join(', ')+'.'});}
 const attached=instances.filter(x=>x.attachedTo);
 if(attached.length&&army.faction!=='Necrons')findings.push({code:'leader-exceptions',severity:'info',message:'Leader eligibility is partially modeled; special multi-Leader and datasheet exceptions still require verification.'});
 if(CATALOG[army.faction].detachments.some(x=>x.includes('(unverified)')))findings.push({code:'detachment-unverified',severity:'warning',message:'This faction’s detachment catalog is not yet verified.'});
 findings.push({code:'points-unavailable',severity:'info',message:'Current-edition unit, upgrade and Detachment Points have not been loaded from the official online Munitorum Field Manual. Total points and legality cannot yet be validated.'});
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
