import type {ArmySelection} from './catalog';
import {sororitasKeywords,sororitasMusterUnits} from './sororitas-army-data';
import {SORORITAS_SHEETS} from './sororitas-data.generated';
import {sororitasCargoFormations,sororitasFormations,sororitasSplitCargoFormations} from './sororitas-transports';
import {expandRoster,type RosterInstance} from './roster-instances';

/** Conditional normal shooting, distinct from the fixed Hit rolls of Overwatch. */
export function sororitasReactionShooting(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):string[]{
 if(army.faction!=='Adepta Sororitas')return [];
 const legal=new Set(sororitasMusterUnits(army));
 if(!legal.has(squad.unit))return [];
 const group=sororitasFormations(army,roster).find(g=>g.members.some(s=>s.id===squad.id));
 if(!group||group.members.some(s=>!legal.has(s.unit)))return [];
 const result:string[]=[];
 const size=group.members.reduce((n,s)=>n+(s.models??SORORITAS_SHEETS.find(d=>d.unit===s.unit)?.sizes[0]??1),0);
 if(size>1&&army.detachments2026?.includes('Hallowed Martyrs')&&group.members.some(s=>sororitasKeywords(army,s).has('ADEPTA SORORITAS')))
  result.push('Praise the Fallen, only after an enemy unit shoots and destroys one or more models in this formation: its surviving models may shoot only that eligible enemy unit');
 if(army.detachments2026?.includes('Bringers of Flame')){
  const carriers=roster.filter(s=>{
   const tags=sororitasKeywords(army,s);
   return tags.has('ADEPTA SORORITAS')&&tags.has('TRANSPORT')&&sororitasCargoFormations(army,s,roster).some(g=>g.root.id===group.root.id);
  });
  if(carriers.length)result.push('Blazing Ire, only if this entire formation was embarked in '+carriers.map(s=>s.id).join(' or ')+' when that transport was shot: disembark, then shoot only the eligible attacking unit');
  const split=roster.filter(s=>sororitasSplitCargoFormations(army,s,roster).some(g=>g.root.id===group.root.id));
  if(split.length)result.push('Blazing Ire, only for the half of '+group.root.id+' actually embarked in '+split.map(s=>s.id).join(' or ')+' when that transport was shot: disembark and shoot only the eligible attacker, using only surviving models and equipment allocated to that half; any required '+squad.id+' model or ability bearer must be in that same half');
 }
 return result;
}
