import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
const source='https://wahapedia.ru/wh40k10ed/factions/necrons/';
const records:Record<string,{window:GeneratedReminder['window'];timing:GeneratedReminder['timing'];summary:string}>={
 'Veil of Darkness':{window:'End of opponent turn',timing:'end',summary:'Once per battle at the end of your opponent’s turn, if the bearer’s unit is outside Engagement Range, remove it from the battlefield. In the Reinforcements step of your next Movement phase, set it up more than 9 inches horizontally from all enemy models.'},
 'Nether-realm Casket':{window:'Shooting',timing:'during',summary:'While the bearer leads a unit, models in that attached unit have Stealth: subtract 1 from ranged Hit rolls targeting them.'},
 'Phasal Subjugator':{window:'Shooting',timing:'during',summary:'Friendly NECRONS units excluding CHARACTER units within 6 inches of the bearer add 1 to Hit rolls when attacking. Applies to shooting and melee.'},
 'Enaegic Dermal Bond':{window:'Fight',timing:'during',summary:'The bearer has Feel No Pain 4+. Roll a D6 each time it would lose a wound; on 4+ that wound is not lost. Applies in any phase.'}
};
export function necronEnhancementReminders(army:ArmySelection):GeneratedReminder[]{
 if(army.faction!=='Necrons'||army.detachment!=='Awakened Dynasty')return [];
 return Object.entries(army.enhancements||{}).flatMap(([bearer,enhancement])=>{
 const rule=records[enhancement];if(!rule)return [];
 return [{id:'enhancement-'+bearer+'-'+enhancement,title:bearer+' · '+enhancement,window:rule.window,timing:rule.timing,summary:rule.summary,source,origin:'unit' as const,units:[bearer,...(army.attachments?.[bearer]?[army.attachments[bearer]]:[])]}];
 });
}
