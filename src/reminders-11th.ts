import type {ArmySelection} from './catalog';
import {detachmentBudget,DETACHMENTS_2026,EDITION_2026_SOURCE} from './edition-2026';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {REMINDER_WINDOWS} from './generated-reminders';
/** 11th-edition reminders ONLY. Legacy 10e datasheet/stratagem rules are never included. */
const CORE_SOURCE='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';
const CORE_11TH:readonly GeneratedReminder[]=[
 {id:'11e-core-cp',title:'Gain Core CP',window:'Command',timing:'during',summary:'In the Gain Core CP step, both players gain 1 Command Point.',source:CORE_SOURCE,origin:'army'},
 {id:'11e-battle-shock',title:'Battle-shock rolls',window:'Command',timing:'during',summary:'During the Battle-shock step, roll for each of your units that is already battle-shocked or at or below half-strength. A successful roll clears existing battle-shock.',source:CORE_SOURCE,origin:'army'},
 {id:'11e-command-abilities',title:'Command abilities',window:'Command',timing:'during',summary:'Resolve your eligible Command abilities after the Battle-shock step.',source:CORE_SOURCE,origin:'army'},
 {id:'11e-movement-reserves',title:'Reinforcements and ingress',window:'Movement',timing:'during',summary:'After moving units, resolve eligible Strategic Reserves arrivals and ingress moves; check their set-up restrictions.',source:CORE_SOURCE,origin:'army'},
 {id:'11e-shoot',title:'Shoot with eligible units',window:'Shooting',timing:'during',summary:'Select eligible units to shoot, choose weapons and targets, then resolve attacks.',source:CORE_SOURCE,origin:'army'},
 {id:'11e-charge',title:'Declare and resolve charges',window:'Charge',timing:'during',summary:'Declare eligible charges, roll the charge distance and complete legal charge moves.',source:CORE_SOURCE,origin:'army'},
 {id:'11e-fight',title:'Fight phase sequence',window:'Fight',timing:'during',summary:'Resolve start-of-phase effects, pile-in moves, Fights First combats, remaining fights and consolidation.',source:CORE_SOURCE,origin:'army'},
 {id:'11e-move-every-unit',title:'Select every unit to move',window:'Movement',timing:'during',summary:'Select each of your units once in the Move Units step, including units in Strategic Reserves or embarked in Transports. Remaining stationary counts as a selection.',source:CORE_SOURCE,origin:'army'}
];
export function generate11thReminders(_army:ArmySelection):GeneratedReminder[]{
 return CORE_11TH.map(rule=>({...rule}));
}
export function grouped11thReminders(army:ArmySelection):{window:ReminderWindow;reminders:GeneratedReminder[]}[]{
 const all=generate11thReminders(army);
 return REMINDER_WINDOWS.map(window=>({window,reminders:all.filter(r=>r.window===window)}));
}
export function armySetup11th(army:ArmySelection):{label:string;description:string;source:string}[]{
 const selected=army.detachments2026||[];
 const budget=detachmentBudget(army.faction,selected,army.battleSize2026||'Strike Force');
 const result=[{label:'Choose your 11th-edition detachments',description:budget.supported?(selected.length?selected.join(', ')+' ('+budget.spent+'/'+budget.limit+' DP)':'Select detachments from the 11th-edition catalog'):'11th-edition detachments not imported for this faction',source:EDITION_2026_SOURCE}];
 if(budget.supported&&budget.valid)result.push({label:'Force Dispositions',description:budget.dispositions.join(', '),source:EDITION_2026_SOURCE});
 if(!DETACHMENTS_2026[army.faction])result.push({label:'Faction coverage unavailable',description:'No verified 11th-edition detachment data is installed for this faction.',source:EDITION_2026_SOURCE});
 return result;
}
