import {NECRON_SUPPORTS} from './attachments';
import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {ghostArkPassengers,necronFormationRoots} from './necron-retinues';
import {necronKeywords} from './necron-wargear';
import type {RosterInstance} from './roster-instances';

const core='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';

export function necronDeploymentReminders(army:ArmySelection,roster:RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Necrons'||!roster.length)return [];
 const formations=necronFormationRoots(army,roster);
 const out:GeneratedReminder[]=[];
 function add(id:string,title:string,window:ReminderWindow,timing:GeneratedReminder['timing'],summary:string,units:string[],source=core){
  if(units.length)out.push({id:'11e-necron-'+id,title,window,timing,turn:window==='End of opponent turn'?'opponent':undefined,summary,units,source,origin:'army'});
 }
 const aircraft=formations.filter(f=>necronKeywords.AIRCRAFT.has(f.body.unit)).map(f=>f.id);
 add('aircraft-deployment','Aircraft · compulsory reserves','Pre-battle','start',
  'Place each Aircraft in Strategic Reserves when declaring formations. Include its points in the starting allowance.',aircraft);
 add('aircraft-ingress','Aircraft · movement','Movement','during','An Aircraft can make only ingress moves. Models can move through it. Being engaged solely with Aircraft allows a unit to make a Normal or Advance move.',aircraft);
 add('aircraft-shooting','Aircraft · Plunging Fire','Shooting','during','Plunging Fire does not apply to attacks made by or targeting an Aircraft.',aircraft);
 add('aircraft-charge','Aircraft · charge targets','Charge','during','An Aircraft cannot declare a charge. Only Flying units can charge it.',aircraft);
 add('aircraft-fight','Aircraft · melee targets','Fight','during','An Aircraft can target only Flying units with melee attacks. Only Flying models can attack it in melee. Non-Flying units disregard Aircraft when choosing the closest enemy for pile-in, consolidation and surge moves.',aircraft);
 add('aircraft-return','Aircraft · return to Strategic Reserves','End of opponent turn','end','Return every friendly Aircraft that is on the battlefield to Strategic Reserves.',aircraft);

 const arks=roster.filter(s=>s.unit==='Ghost Ark');
 const scythes=roster.filter(s=>s.unit==='Night Scythe');
 const arkPassengers=arks.length?ghostArkPassengers(army).map(s=>s.id):[];
 const scythePassengers=scythes.length?formations.filter(f=>!NECRON_SUPPORTS.has(f.body.unit)&&f.members.some(s=>necronKeywords.INFANTRY.has(s.unit))).map(f=>f.id):[];
 add('night-scythe-embark','Night Scythe · embarkation','Pre-battle','start',
  'Each Night Scythe may start with one whole Necrons Infantry unit embarked. An attached formation with the Infantry keyword occupies that unit slot together.',scythePassengers,
  'https://wahapedia.ru/wh40k11ed/factions/necrons/Night-Scythe');
 const passengers=[...new Set([...arkPassengers,...scythePassengers])];
 add('passenger-embark','Embark in a transport','Movement','during',
  'After a Normal, Advance or Fall Back move, a whole eligible unit can embark if every model is within 3″, the transport has space, and the unit was not set up this turn.',passengers);
 add('passenger-disembark','Choose disembark mode','Movement','during',
  'In your Movement phase, an embarked unit can disembark unless it embarked this phase or its transport Advanced or Fell Back. After Normal or ingress, use Rapid within 3″ and forgo charging; after ingress also follow the transport’s setup restrictions. From a stationary or as-yet-unmoved transport, use Tactical within 3″ if possible, then make a Normal or Advance move. Otherwise use Combat within 6″, test Hazard per model, become battle-shocked and forgo charging.',passengers);
 if(passengers.length){
  // Destruction can be caused by rules in any phase. No embarkation choice is assumed.
  const transports=[...(arkPassengers.length?arks:[]),...(scythePassengers.length?scythes:[])].map(s=>s.id);
  for(const phase of ['Command','Movement','Shooting','Charge','Fight'] as const)
   add('emergency-disembark-'+phase,'Destroyed transport · emergency disembark',phase,'during',
    'Before removing a destroyed occupied transport, make a Hazard roll for each passenger model. Set survivors wholly within 6″ and as close as possible, unengaged if possible, then engaged if necessary. Destroy models that cannot be placed. The unit is battle-shocked and cannot charge this turn.',transports);
 }
 return out;
}
