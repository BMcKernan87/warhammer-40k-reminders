import {aircraftCoreReminders} from './aircraft-core';
import {transportMovementReminders} from './transport-movement';
import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {ghostArkPassengers,necronFormationRoots,necronTransportFormations} from './necron-retinues';
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

 const transportFormations=necronTransportFormations(army,roster);
 const originalFormations=necronTransportFormations(army);
 const arks=transportFormations.filter(f=>f.body.unit==='Ghost Ark').map(f=>f.body);
 const scythes=transportFormations.filter(f=>f.body.unit==='Night Scythe').map(f=>f.body);
 const infantry=(f:typeof transportFormations[number])=>f.members.some(s=>necronKeywords.INFANTRY.has(s.unit));
 const arkPassengers=arks.length?ghostArkPassengers(army,roster).map(s=>s.id):[];
 const scythePassengers=scythes.length?transportFormations.filter(infantry).map(f=>f.id):[];
 add('night-scythe-embark','Night Scythe · embarkation','Pre-battle','start',
  'Each Night Scythe may start with one whole Necrons Infantry unit embarked. An attached formation with the Infantry keyword occupies that unit slot together.',scythePassengers,
  'https://wahapedia.ru/wh40k11ed/factions/necrons/Night-Scythe');
 const passengers=[...new Set([...arkPassengers,...scythePassengers])];
 const transports=[...(arkPassengers.length?arks:[]),...(scythePassengers.length?scythes:[])].map(s=>s.id);
 // A previous disembark's charge restriction survives losing the carrier or
 // the model that supplied the original unit's Infantry keyword. This names
 // only surviving original formations and does not restore Movement options.
 const hadArk=originalFormations.some(f=>f.body.unit==='Ghost Ark');
 const hadScythe=originalFormations.some(f=>f.body.unit==='Night Scythe');
 const originalPassengers=new Set([
  ...(hadArk?ghostArkPassengers(army).map(s=>s.id):[]),
  ...(hadScythe?originalFormations.filter(infantry).map(f=>f.id):[]),
 ]);
 const chargePassengers=[...new Set([
  ...transportFormations.filter(f=>originalPassengers.has(f.originalBody.id)).map(f=>f.id),
  ...(hadArk?ghostArkPassengers(army,roster).map(s=>s.id):[]),
  ...(hadScythe?transportFormations.filter(infantry).map(f=>f.id):[]),
 ])];
 out.push(...transportMovementReminders('11e-necron-',passengers,transports,chargePassengers));
 return out;
}
