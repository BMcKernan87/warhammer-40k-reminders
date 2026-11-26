import type {GeneratedReminder,ReminderWindow} from './generated-reminders';

export function aircraftCoreReminders(prefix:string,units:string[],freeReserves=false):GeneratedReminder[]{
 if(!units.length)return [];
 const source='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';
 const card=(key:string,title:string,window:ReminderWindow,turn:GeneratedReminder['turn'],timing:GeneratedReminder['timing'],summary:string):GeneratedReminder=>({
  id:prefix+'aircraft-'+key,title:'Aircraft · '+title,window,turn,timing,summary,units,source,origin:'army',
 });
 return [
  card('deployment','compulsory reserves','Pre-battle','either','start',
   'Place each Aircraft in Strategic Reserves when declaring formations.'+(freeReserves?'':' Include its points in the starting allowance.')),
  card('ingress','movement','Movement','either','during',
   'An Aircraft can only make ingress moves and cannot use Rapid Ingress. Other models may move through Aircraft. A unit engaged solely with Aircraft may make a Normal or Advance move. Plunging Fire does not apply to ranged attacks made by or targeting Aircraft, including normal Movement-phase reactions.'),
  card('shooting','Plunging Fire','Shooting','either','during',
   'Plunging Fire does not apply to ranged attacks made by or targeting Aircraft.'),
  card('charge','charge targets','Charge','either','during',
   'Aircraft cannot declare charges. Only Flying units can select an Aircraft as their charge target.'),
  card('fight','melee targets','Fight','either','during',
   'Aircraft can make melee attacks only against Flying units, and only Flying models can make melee attacks against Aircraft. Non-Flying units disregard Aircraft when choosing the closest enemy for pile-in, consolidation and surge moves.'),
  card('return','return to Strategic Reserves','End of opponent turn','opponent','end',
   'Return every friendly Aircraft that is on the battlefield to Strategic Reserves.'),
 ];
}
