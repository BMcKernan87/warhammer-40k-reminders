import type {GeneratedReminder} from './generated-reminders';

export function transportMovementReminders(prefix:string,passengers:string[],carriers:string[]):GeneratedReminder[]{
 if(!passengers.length)return [];
 const source='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';
 const rows:GeneratedReminder[]=[];
 function add(key:string,title:string,window:GeneratedReminder['window'],turn:GeneratedReminder['turn'],summary:string,units:string[]){
  rows.push({id:prefix+key,title,window,turn,timing:'during',summary,units,source,origin:'army'});
 }
 add('passenger-embark','Embark in a transport','Movement','either',
  'After a Normal, Advance or Fall Back move, a whole eligible unit can embark if every model is within 3″, the transport has space, and the unit was not set up this turn.',passengers);
 add('passenger-disembark','Choose disembark mode','Movement','own',
  'A unit that started the phase embarked can disembark normally unless its transport Advanced or Fell Back. After a Normal or ingress move, use Rapid within 3″ and forgo charging. After ingress also follow the transport’s setup restrictions. From a stationary or as-yet-unmoved transport, use Tactical within 3″ if possible, then make a Normal or Advance move. Otherwise use Combat within 6″, test Hazard per model, become battle-shocked and forgo charging. Combat passengers may engage enemies their transport is engaging.',passengers);
 for(const phase of ['Command','Movement','Shooting','Charge','Fight'] as const){
  add('emergency-disembark-'+phase,'Destroyed transport · emergency disembark',phase,'either',
   'Before removing a destroyed occupied transport, make a Hazard roll for each passenger model. Set survivors wholly within 6″ and as close as possible, unengaged if possible, then engaged if necessary. Destroy models that cannot be placed. The unit is battle-shocked and cannot charge this turn.',carriers);
 }
 return rows;
}
