import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {THRILL_SEEKERS} from './emperors-children-data.generated';
import {emperorsChildrenMusterUnits} from './emperors-children-data';
import {emperorsChildrenHasRangedWeapon} from './emperors-children-loadouts';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';

const printed=new Set(THRILL_SEEKERS);
const source='https://wahapedia.ru/wh40k11ed/factions/emperor-s-children/#Thrill-Seekers';

export function emperorsChildrenArmyReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Emperor’s Children')return [];
 const legal=new Set(emperorsChildrenMusterUnits(army));
 const formations=new Map<string,RosterInstance[]>();
 for(const s of roster){
  if(!legal.has(s.unit)||!printed.has(s.unit))continue;
  const root=knightJoinedBodyguard(army,s)?.id??s.id;
  formations.set(root,[...(formations.get(root)??[]),s]);
 }
 if(!formations.size)return [];
 const all=[...formations.keys()],armed=[...formations].filter(([,squads])=>squads.some(emperorsChildrenHasRangedWeapon)).map(([id])=>id);
 const result:GeneratedReminder[]=[];
 const emit=(phase:'Movement'|'Shooting'|'Charge',summary:string,units:string[])=>{
  if(units.length)result.push({id:'11e-ec-thrill-seekers-'+phase,title:'Thrill Seekers',window:phase,turn:'own',timing:'during',summary,units,origin:'army',source});
 };
 emit('Movement','An Advance or Fall Back leaves these formations eligible to charge this turn'+(armed.length?' and those with a ranged weapon eligible to shoot':'')+'. When using Thrill Seekers, the formation cannot target any unit it was engaged with at the start of this turn or a target another unit has already charged or attacked this phase.',all);
 emit('Shooting','If this formation Advanced or Fell Back this turn, it may shoot. Exclude enemies it was engaged with at turn start and targets of another unit’s charge or attack in this phase.',armed);
 emit('Charge','If this formation Advanced or Fell Back this turn, it may declare a charge. An enemy it was engaged with at turn start is ineligible, as is a target of another unit’s charge or attack in this phase. Re-evaluate these exclusions when declaring each charge.',all);
 return result;
}
