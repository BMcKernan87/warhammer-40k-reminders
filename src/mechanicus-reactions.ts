import type {ArmySelection} from './catalog';
import {expandRoster,type RosterInstance} from './roster-instances';
import {mechanicusFormations} from './mechanicus-transports';
import {MECHANICUS_ARMY_SHEETS} from './mechanicus-army-data';
import {mechanicusKeywords} from './mechanicus-keywords';

/** Permission only: survivors and which models the enemy actually destroyed
 * are battlefield facts, so callers must retain the conditional wording. */
export function mechanicusReactionShooting(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):string[]{
 if(army.faction!=='Adeptus Mechanicus'||!army.detachments2026?.includes('Eradication Cohort'))return [];
 const snapshot={...army,instances:[...roster]};
 const form=mechanicusFormations(snapshot,roster).find(f=>f.members.some(s=>s.id===squad.id));
 if(!form||!['ADEPTUS MECHANICUS','SKITARII','INFANTRY'].every(k=>form.members.some(s=>mechanicusKeywords(snapshot,s).has(k))))return [];
 const size=form.members.reduce((n,s)=>n+(s.models??MECHANICUS_ARMY_SHEETS.find(d=>d.unit===s.unit)?.sizes[0]??1),0);
 if(size<2)return [];
 return ['Analytic Reprisals, only after this formation lost one or more models to that enemy’s shooting and still has Skitarii and Infantry when targeted, after destroyed sources’ effects expire; surviving models may shoot only that enemy, if it is an eligible target'];
}
