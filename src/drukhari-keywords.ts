import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import {expandRoster} from './roster-instances';
import {DRUKHARI_SHEETS} from './drukhari-data';
import {drukhariModelLoadouts} from './drukhari-loadouts';

const sheets=new Map(DRUKHARI_SHEETS.map(s=>[s.unit,s]));
/** Model keywords stay with actual equipped models, including an optional Voidscarred Way Seeker. */
export function drukhariKeywords(army:ArmySelection,squad:RosterInstance,model?:string,_roster:readonly RosterInstance[]=expandRoster(army)):Set<string>{
 if(army.faction!=='Drukhari')return new Set();
 const sheet=sheets.get(squad.unit);if(!sheet)return new Set();
 const models=model?[model]:drukhariModelLoadouts(squad).map(m=>m.model);
 const tags=new Set([...sheet.keywords??[],...models.flatMap(name=>sheet.modelKeywords?.[name]??[])]);
 if(!model)tags.add(sheet.unit.toUpperCase());
 // Core 02.05: singular and plural instances of the same keyword are equivalent.
 for(const [singular,plural] of [['JUMP PACK','JUMP PACKS'],['HARLEQUIN','HARLEQUINS'],['SCOURGE','SCOURGES']])if(tags.has(singular)||tags.has(plural)){tags.add(singular);tags.add(plural);}
 return tags;
}
