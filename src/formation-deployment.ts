import {aircraftCoreReminders} from './aircraft-core';
import {rosterCost2026} from './datasheets-2026';
import {orkMandatoryReservePoints} from './ork-muster';
import type {ArmySelection} from './catalog';
import type {ArmyFormation} from './core-stratagems-11th';
import {BATTLE_SIZES_2026} from './edition-2026';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';

export function formationDeploymentReminders(army:ArmySelection,formations:ArmyFormation[],keywords:(unit:string)=>readonly string[]):GeneratedReminder[]{
 const out:GeneratedReminder[]=[];
 const prefix=army.faction==='Necrons'?'11e-necron-':'11e-formation-';
 const source='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';
 function add(id:string,title:string,window:ReminderWindow,timing:GeneratedReminder['timing'],summary:string,units:string[]){
  if(units.length)out.push({id:prefix+id,title,window,timing,turn:window==='Movement'||window==='End of your turn'?'own':window==='Shooting'||window==='End of opponent turn'?'opponent':'either',summary,units,source,origin:'army'});
 }
 const reserveEligible=formations.filter(f=>!keywords(f.body.unit).includes('FORTIFICATION')).map(f=>f.id);
 const reserveLimit=BATTLE_SIZES_2026[army.battleSize2026??'Strike Force'].points/2;
 const entries=rosterCost2026(army).entries;
 const prices=new Map(entries.map(e=>[e.id,e.points]));
 const cost=(f:ArmyFormation)=>f.members.reduce((n,s)=>n+(prices.get(s.id)??0),0);
 const mandatoryAircraft=army.faction==='Orks'||army.faction==='Astra Militarum'?formations.filter(f=>keywords(f.body.unit).includes('AIRCRAFT')):[];
 if(army.faction==='Orks'&&mandatoryAircraft.length)out.push(...aircraftCoreReminders('11e-orks-',mandatoryAircraft.map(f=>f.id),army.detachments2026?.includes('Flyboyz')));
 const compulsory=army.faction==='Orks'?orkMandatoryReservePoints(army,entries):mandatoryAircraft.reduce((points,f)=>points+cost(f),0);
 const available=Math.max(0,reserveLimit-compulsory);
 const startingReserves=formations.filter(f=>reserveEligible.includes(f.id)&&!mandatoryAircraft.includes(f)&&cost(f)<=available).map(f=>f.id);
 const aircraftAllowance=compulsory?' After compulsory Aircraft, '+available+' points remain.':'';
 add('reserve-declaration','Declare Strategic Reserves','Pre-battle','start',
  'Declare whole formations in Strategic Reserves before deployment. The starting allowance is '+reserveLimit+' points, including units embarked in reserved transports. This cap ends when the battle starts.'+aircraftAllowance,startingReserves);
 add('reserve-arrival','Strategic Reserves · ingress','Movement','during',
  'In your Move Units step, select a unit in Strategic Reserves to arrive, normally from round two. Set it up wholly within 6″ of a battlefield edge and more than 8″ horizontally from enemies. Until round three, stay outside the enemy deployment zone. Apply any specific alternative placement or first-turn ability. An arriving unit normally cannot move again until the Charge phase. Embarked units arrive aboard their transport.',reserveEligible);
 add('reserve-deadline','Strategic Reserves · round three deadline','End of battle round','end',
  'At the end of battle round three, destroy reserves that have never made an ingress move. Exempt repositioned units and passengers aboard a transport that made ingress.',reserveEligible);
 for(const window of ['End of your turn','End of opponent turn'] as const){
  add('final-reserves-'+window,'Strategic Reserves · final turn',window,'end',
   'Only if this is the final player turn of the battle, destroy any units still in Strategic Reserves. Their destruction does not trigger rules for destroyed units.',reserveEligible);
 }
 const attached=formations.filter(f=>f.members.some(m=>m.attachedTo===f.id)).map(f=>f.id);
 for(const phase of ['Shooting','Fight'] as const){
  add('attached-defence-'+phase,'Attacks against attached units',phase,'during',
   'Use the highest Toughness among surviving Bodyguard models, including joined retinues. Once none remain, use the highest Toughness of the remaining Leader and Support models. A unit-destroyed trigger requires the death of the last model that started in the formation.',attached);
  add('attached-abilities-'+phase,'Attached abilities after casualties',phase,'during',
   'If an attack kills the last source of a formation-wide ability, finish that attacker’s attacks with the ability. Surviving Leaders and Supports keep their own leading abilities after losing their Bodyguard if they started attached. Bearer-only benefits stay on that model. Destroyed models no longer contribute keywords.',attached);
 }

 return out;
}
