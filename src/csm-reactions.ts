import type {ArmySelection} from './catalog';
import {csmMusterUnits} from './csm-army-data';
import {expandRoster,type RosterInstance} from './roster-instances';

/** Permission only: the actual attack, range and eligible target stay conditional. */
export function csmReactionShooting(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):string[]{
 if(army.faction!=='Chaos Space Marines'||squad.unit!=='Cypher'||!csmMusterUnits(army).includes(squad.unit)||!roster.some(s=>s.id===squad.id&&s.unit===squad.unit))return [];
 return ['Guns Blazing: once per turn in the opponent’s Shooting phase, after an enemy finishes ranged attacks that targeted a friendly Heretic Astartes unit within 3″ of this Cypher model, Cypher may shoot only that enemy if it is an eligible target. Use normal shooting, with no intrinsic Ballistic Skill penalty; phase-locked rules still require their stated phase'];
}
