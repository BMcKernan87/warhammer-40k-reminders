import {aircraftCoreReminders} from './aircraft-core';
import {transportMovementReminders} from './transport-movement';
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
 out.push(...aircraftCoreReminders('11e-necron-',aircraft));

 const arks=roster.filter(s=>s.unit==='Ghost Ark');
 const scythes=roster.filter(s=>s.unit==='Night Scythe');
 const arkPassengers=arks.length?ghostArkPassengers(army).map(s=>s.id):[];
 const scythePassengers=scythes.length?formations.filter(f=>!NECRON_SUPPORTS.has(f.body.unit)&&f.members.some(s=>necronKeywords.INFANTRY.has(s.unit))).map(f=>f.id):[];
 add('night-scythe-embark','Night Scythe · embarkation','Pre-battle','start',
  'Each Night Scythe may start with one whole Necrons Infantry unit embarked. An attached formation with the Infantry keyword occupies that unit slot together.',scythePassengers,
  'https://wahapedia.ru/wh40k11ed/factions/necrons/Night-Scythe');
 const passengers=[...new Set([...arkPassengers,...scythePassengers])];
 const transports=[...(arkPassengers.length?arks:[]),...(scythePassengers.length?scythes:[])].map(s=>s.id);
 out.push(...transportMovementReminders('11e-necron-',passengers,transports));
 return out;
}
