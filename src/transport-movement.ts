import type {GeneratedReminder} from './generated-reminders';
import type {RosterInstance} from './roster-instances';

// Previously legal cargo keeps its disembark restriction after the carrier or
// its Bodyguard dies. A replacement identity or changed join cannot inherit it.
export function survivingTransportPassengers(groups:readonly (readonly RosterInstance[])[],roster:readonly RosterInstance[]):string[]{
 const current=new Map(roster.map(s=>[s.id,s]));
 return [...new Set(groups.flatMap(group=>{
  if(group.some(before=>{const after=current.get(before.id);return after&&(before.unit!==after.unit||before.attachedTo!==after.attachedTo||before.retinueTo!==after.retinueTo);}))return [];
  const survivor=group.find(before=>current.has(before.id));
  return survivor?[survivor.id]:[];
 }))];
}

export function transportMovementReminders(prefix:string,passengers:string[],carriers:string[],chargePassengers=passengers):GeneratedReminder[]{
 if(!passengers.length&&!chargePassengers.length)return [];
 const source='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';
 const rows:GeneratedReminder[]=[];
 function add(key:string,title:string,window:GeneratedReminder['window'],turn:GeneratedReminder['turn'],summary:string,units:string[]){
  rows.push({id:prefix+key,title,window,turn,timing:'during',summary,units,source,origin:'army'});
 }
 if(passengers.length&&carriers.length){
  add('passenger-embark','Embark in a transport','Movement','either',
   'After a Normal, Advance or Fall Back move, a whole eligible unit can embark if every model is within 3″, the transport has space, and the unit was not set up this turn.',passengers);
  add('passenger-disembark','Choose disembark mode','Movement','own',
   'Normal disembark rules in your Movement phase: the unit must be aboard a transport on the battlefield, must not have embarked there this phase, and the transport must not have Advanced or Fallen Back this phase. Keep the unit coherent and unengaged unless the mode permits otherwise. After a Normal or ingress move this phase, use Rapid: set every model wholly within 3″ and forgo charging this turn. After ingress also follow the transport’s placement restrictions. Otherwise, if the transport remained stationary or has not yet been selected to move this phase, use Tactical if placement is possible: set every model wholly within 3″, then make a Normal or Advance move. Otherwise use Combat: test Hazard per model, set every model wholly within 6″, become battle-shocked and forgo charging this turn. Combat passengers may engage only enemies their transport is engaging.',passengers);
  for(const phase of ['Command','Movement','Shooting','Charge','Fight'] as const){
   add('emergency-disembark-'+phase,'Destroyed transport · emergency disembark',phase,'either',
    'Before removing a destroyed occupied transport, make a Hazard roll for each passenger model. Set survivors wholly within 6″ and as close as possible, unengaged if possible, then engaged if necessary. Destroy models that cannot be placed. The unit is battle-shocked and cannot charge this turn.',carriers);
  }
 }
 // Core 18.04–18.07: these are consequences of a prior move, not new cargo
 // selections. Tactical and Assault do not themselves impose a charge ban.
 if(chargePassengers.length)add('passenger-charge-restriction','Disembarked passengers · charge restriction','Charge','either',
  'Only if this unit made a Rapid, Combat, Emergency or Shock disembark move this turn, it cannot declare a charge until turn end, even if the transport is destroyed. Apply this only to the unit or split half that actually disembarked. Tactical or Assault disembark does not itself impose this restriction; still apply other charge limits and any explicit exception.',chargePassengers);
 return rows;
}
