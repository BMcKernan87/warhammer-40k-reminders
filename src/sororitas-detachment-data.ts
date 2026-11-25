import type {ArmySelection} from './catalog';
import {expandRoster} from './roster-instances';
import {sororitasKeywords} from './sororitas-army-data';
import {sororitasFormations} from './sororitas-transports';
import {SORORITAS_UPGRADES} from './sororitas-detachments.generated';

export function eligibleSororitasUpgrades(army:ArmySelection,unit:string,id?:string){
 if(army.faction!=='Adepta Sororitas')return [];
 const options=SORORITAS_UPGRADES.filter(u=>army.detachments2026?.includes(u.detachment)&&u.units.some(n=>n===unit));
 if(!options.some(u=>u.name==='Hagiomnifex'))return options;
 const roster=expandRoster(army),bearer=roster.find(s=>id?s.id===id:s.unit===unit);
 const formation=bearer&&sororitasFormations(army,roster).find(f=>f.members.some(s=>s.id===bearer.id));
 // The current pack excludes PENITENT units, including a joined unit that has
 // that keyword through one of its models. It does not merely exclude Priests.
 return options.filter(u=>u.name!=='Hagiomnifex'||!formation?.members.some(s=>sororitasKeywords(army,s).has('PENITENT')));
}
