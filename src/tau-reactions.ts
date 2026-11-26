import type {ArmySelection} from './catalog';
import {tauKeywords} from './tau-keywords';
import {tauMusterUnits} from './tau-data';
import {tauFormations} from './tau-transports';
import {expandRoster,type RosterInstance} from './roster-instances';

/** Lists permissions only; the actual trigger, range and target remain conditional. */
export function tauReactionShooting(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):string[]{
 if(army.faction!=='T’au Empire'||squad.unit!=='Krootox Riders'||!roster.some(s=>s.id===squad.id))return [];
 const current={...army,instances:[...roster]},legal=new Set(tauMusterUnits(current));
 const protectedUnits=tauFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit))&&['KROOT','INFANTRY'].every(k=>g.members.some(s=>tauKeywords(current,s).has(k))));
 if(!protectedUnits.length)return [];
 return ['Kroot Packmates: once per turn, one Krootox Riders unit may shoot after an enemy finishes attacks that targeted a friendly Kroot Infantry formation within 6″ of these Riders; shoot only that enemy if it is an eligible target. This is normal shooting, not snap shooting. If Hidden Hunters leaves the attacker with no eligible targets and it makes no attacks, Packmates cannot trigger'];
}
