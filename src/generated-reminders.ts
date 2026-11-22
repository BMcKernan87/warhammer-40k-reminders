import type {ArmySelection} from './catalog';
import type {Phase} from './engine';
import {factionSource} from './sources';
export type ReminderWindow=Phase|'End of opponent turn';
export interface GeneratedReminder {id:string;title:string;window:ReminderWindow;timing:'start'|'during'|'end';summary:string;source:string;origin:'army'|'detachment'|'unit';units?:string[]}
export function generateReminders(army:ArmySelection):GeneratedReminder[]{
 const source=factionSource(army).url;
 const result:GeneratedReminder[]=[];
 if(army.faction==='Necrons'){
  result.push({id:'necron-reanimation',title:'Reanimation Protocols',window:'Command',timing:'end',summary:'At the end of your Command phase, each eligible unit on the battlefield activates Reanimation Protocols and reanimates D3 wounds. Check model return restrictions.',source,origin:'army'});
  if(army.detachment==='Awakened Dynasty')result.push({id:'awakened-command-protocols',title:'Command Protocols',window:'Shooting',timing:'during',summary:'When a unit attacks, check whether it is being led by a Necron Character for its detachment Hit roll bonus. Also applies to melee attacks.',source,origin:'detachment'});
  if(army.detachment==='Hypercrypt Legion')result.push({id:'hypercrypt-hyperphasing',title:'Hyperphasing',window:'End of opponent turn',timing:'end',summary:'At the end of the opponent’s turn, eligible units outside Engagement Range can be placed into Strategic Reserves. Limit depends on battle size: Incursion 1, Strike Force 2, Onslaught 3.',source,origin:'detachment'});
  if(army.detachment==='Canoptek Court')result.push({id:'canoptek-power-matrix',title:'Power Matrix',window:'Shooting',timing:'during',summary:'Check whether the attacking Cryptek or Canoptek unit benefits from the current Power Matrix rule and battlefield control conditions.',source,origin:'detachment'});
 }else{
  result.push({id:'marine-oath',title:'Oath of Moment',window:'Command',timing:'start',summary:'At the start of your Command phase, select an enemy unit as your Oath target. Attacks against it can re-roll Hit rolls; check the additional Wound bonus conditions.',source,origin:'army'});
  if(army.detachment==='Gladius Task Force')result.push({id:'gladius-doctrines',title:'Combat Doctrines',window:'Command',timing:'during',summary:'Review the available Combat Doctrine selection, its timing, and whether a doctrine was already used this battle.',source,origin:'detachment'});
 }
 const unitRules:Record<string,Array<{id:string;title:string;window:ReminderWindow;timing:'start'|'during'|'end';summary:string}>>={
 'Technomancer':[{id:'technomancer-heal',title:'Technomancer · repair',window:'Movement',timing:'end',summary:'At the end of your Movement phase, select one friendly Necrons model within 6 inches to regain up to D3 lost wounds; each model can be selected once per turn.'}],
 'Canoptek Wraiths':[{id:'wraith-form',title:'Canoptek Wraiths · Wraith Form',window:'Movement',timing:'during',summary:'After a Normal move over an enemy unit, you may roll one D6 per Wraith model; each 4+ inflicts a mortal wound on that enemy unit.'}],
 'Immortals':[{id:'immortals-eradication',title:'Immortals · Implacable Eradication',window:'Shooting',timing:'during',summary:'Re-roll Wound rolls of 1; against enemies within range of an objective marker, you can instead re-roll the Wound roll.'}],
 };
 for(const unit of Object.keys(army.units)){
  for(const rule of unitRules[unit]||[])result.push({...rule,id:rule.id,source:source.replace(/\/$/,'')+'/'+encodeURIComponent(unit).replace(/%20/g,'-'),origin:'unit',units:[unit]});
 }
 for(const [unit,count] of Object.entries(army.units)){
  result.push({id:'datasheet-'+unit,title:unit+' datasheet',window:'Command',timing:'during',summary:count+' selected. Review this unit’s datasheet abilities, wargear, keywords and any conditional triggers before play. Detailed unit triggers are not yet encoded.',source,origin:'unit',units:[unit]});
 }
 return result;
}
export function remindersForWindow(army:ArmySelection,window:ReminderWindow):GeneratedReminder[]{return generateReminders(army).filter(r=>r.window===window);}
