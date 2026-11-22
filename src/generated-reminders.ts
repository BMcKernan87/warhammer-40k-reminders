import {necronStratagemReminders} from './necron-stratagems';
import {verifiedNecronReminders} from './verified-necrons';
import {selectedEquipment} from './equipment';
import type {ArmySelection} from './catalog';
import type {Phase} from './engine';
import {factionSource} from './sources';
export type ReminderWindow=Phase|'End of opponent turn';
export const REMINDER_WINDOWS:readonly ReminderWindow[]=['Command','Movement','Shooting','Charge','Fight','End of opponent turn'];
export interface GeneratedReminder {id:string;title:string;window:ReminderWindow;timing:'start'|'during'|'end';summary:string;source:string;origin:'army'|'detachment'|'unit';units?:string[]}
export function generateReminders(army:ArmySelection):GeneratedReminder[]{
 const source=factionSource(army).url;
 const result:GeneratedReminder[]=[];
 if(army.faction==='Necrons'){result.push(...verifiedNecronReminders(army));result.push(...necronStratagemReminders(army));}
 if(army.faction==='Necrons'){

  if(army.detachment==='Awakened Dynasty'&&Object.keys(army.attachments||{}).length>0)result.push({id:'awakened-command-protocols',title:'Command Protocols · +1 to Hit',window:'Shooting',timing:'during',summary:'For each attached unit led by a NECRONS CHARACTER, add 1 to Hit rolls whenever its models attack, including during the Fight phase. Attached units: '+Object.entries(army.attachments||{}).map(([leader,bodyguard])=>leader+' + '+bodyguard).join('; ')+'.',source,origin:'detachment'});
  if(army.detachment==='Hypercrypt Legion')result.push({id:'hypercrypt-hyperphasing',title:'Hyperphasing',window:'End of opponent turn',timing:'end',summary:'At the end of the opponent’s turn, eligible units outside Engagement Range can be placed into Strategic Reserves. Limit depends on battle size: Incursion 1, Strike Force 2, Onslaught 3.',source,origin:'detachment'});

 }else if(army.faction==='Space Marines'){
  result.push({id:'marine-oath',title:'Oath of Moment',window:'Command',timing:'start',summary:'At the start of your Command phase, select an enemy unit as your Oath target. Attacks against it can re-roll Hit rolls; check the additional Wound bonus conditions.',source,origin:'army'});
  if(army.detachment==='Gladius Task Force')result.push({id:'gladius-doctrines',title:'Combat Doctrines',window:'Command',timing:'during',summary:'Review the available Combat Doctrine selection, its timing, and whether a doctrine was already used this battle.',source,origin:'detachment'});
 }
 const unitRules:Record<string,Array<{id:string;title:string;window:ReminderWindow;timing:'start'|'during'|'end';summary:string}>>={

 'Canoptek Wraiths':[{id:'wraith-form',title:'Canoptek Wraiths · Wraith Form',window:'Movement',timing:'during',summary:'After a Normal move over an enemy unit, you may roll one D6 per Wraith model; each 4+ inflicts a mortal wound on that enemy unit.'}],
 'Immortals':[{id:'immortals-eradication',title:'Immortals · Implacable Eradication',window:'Shooting',timing:'during',summary:'Re-roll Wound rolls of 1; against enemies within range of an objective marker, you can instead re-roll the Wound roll.'}],
 };
 for(const unit of Object.keys(army.units)){
  if(army.faction==='Necrons')for(const rule of unitRules[unit]||[])result.push({...rule,id:rule.id,source,origin:'unit',units:[unit]});
 }
 if(army.faction==='Necrons'){
  const abilities:Record<string,Array<{id:string;title:string;window:ReminderWindow;timing:'start'|'during'|'end';summary:string}>>={

   'Chronomancer':[{id:'chronomancer-chronometron',title:'Chronometron',window:'Shooting',timing:'end',summary:'After this model’s unit shoots, if it is outside Engagement Range it can make a Normal move up to 5 inches; that unit cannot declare a charge this turn.'}],



  };
  for(const unit of Object.keys(army.units))for(const rule of abilities[unit]||[])result.push({...rule,source,origin:'unit',units:[unit]});
  for(const [leader,bodyguard] of Object.entries(army.attachments||{})){
   const attachmentSource='https://wahapedia.ru/wh40k10ed/factions/necrons/'+encodeURIComponent(leader).replace(/%20/g,'-');
   const effects:Record<string,Array<{id:string;title:string;window:ReminderWindow;timing:'start'|'during'|'end';summary:string}>>={


    'Chronomancer':[{id:'chronomancer-mantle',title:'Timesplinter Mantle · -1 to Hit',window:'Shooting',timing:'during',summary:'While the Chronomancer leads this unit, subtract 1 from Hit rolls for attacks targeting the attached unit, including melee attacks.'}]
   };
   for(const effect of effects[leader]||[])result.push({...effect,id:'attached-'+leader+'-'+bodyguard+'-'+effect.id,title:leader+' + '+bodyguard+' · '+effect.title,source:attachmentSource,origin:'unit',units:[leader,bodyguard]});
  }
 }
 for(const unit of Object.keys(army.units)){const choice=selectedEquipment(army,unit);if(choice)result.push({id:'equipment-'+unit+'-'+choice,title:unit+' · '+choice,window:'Shooting',timing:'during',summary:'Check the selected '+choice+' weapon profile, range and weapon abilities when this unit shoots. Other loadouts are not included in this reminder.',source,origin:'unit',units:[unit]});}
 if(army.faction==='Orks')result.push({id:'orks-waaagh',title:'Waaagh!',window:'Command',timing:'start',summary:'Review Waaagh! declaration timing, effects and eligible Orks units in current faction rules.',source,origin:'army'});
 if(army.faction==='Tyranids')result.push({id:'tyranids-shadow',title:'Shadow in the Warp',window:'Command',timing:'during',summary:'Review Shadow in the Warp declaration timing and Battle-shock effects in current faction rules.',source,origin:'army'});

 return result;
}
export function remindersForWindow(army:ArmySelection,window:ReminderWindow):GeneratedReminder[]{return generateReminders(army).filter(r=>r.window===window);}

export function groupedReminders(army:ArmySelection):Array<{window:ReminderWindow;reminders:GeneratedReminder[]}>{return REMINDER_WINDOWS.map(window=>({window,reminders:remindersForWindow(army,window)}));}
