import {matching11thRules,type Rule11th} from './rules-11th-registry';
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
const DETACHMENT_RULES:readonly Rule11th[]=[
 {id:'11e-necron-hod-hypermotility',title:'Hypermotility Protocols',window:'Movement',timing:'during',summary:'Selected Necron Warriors and Immortals gain Assault on ranged attacks and can start an action after advancing.',source:'https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf',origin:'detachment',faction:'Necrons',detachments:['Hand of the Dynasty'],anyUnits:['Necron Warriors','Immortals'],units:['Necron Warriors','Immortals']},
 {id:'11e-necron-hod-will',title:'Will of the Conqueror · 1CP',window:'Movement',timing:'end',summary:'At the end of your Movement phase, select an eligible Necron Warriors or Immortals unit and secure one objective it controls.',source:'https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf',origin:'detachment',faction:'Necrons',detachments:['Hand of the Dynasty'],anyUnits:['Necron Warriors','Immortals'],units:['Necron Warriors','Immortals']},
 {id:'11e-necron-hod-nanosaturation',title:'Nanosaturation · 1CP',window:'Shooting',timing:'during',summary:'In your opponent’s Shooting phase, after an enemy unit has shot at your Necron Warriors or Immortals, that unit may snap shoot at the attacker.',source:'https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf',origin:'detachment',faction:'Necrons',detachments:['Hand of the Dynasty'],anyUnits:['Necron Warriors','Immortals'],units:['Necron Warriors','Immortals']},
 {id:'11e-necron-hod-dominance',title:'Dominance Protocols · 1CP',window:'Command',timing:'during',summary:'Select a friendly Immortals unit in your Command phase; it gains +1 OC until the end of the turn.',source:'https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf',origin:'detachment',faction:'Necrons',detachments:['Hand of the Dynasty'],anyUnits:['Immortals'],units:['Immortals']}
,
 {"id":"11e-necron-hod-enlivened","title":"Enlivened Sentinels · Scouts 5\"","window":"Movement","timing":"start","summary":"Necron Warriors with the Enlivened Sentinels upgrade have Scouts 5\"; resolve the Scout move at the appropriate pre-battle step.","origin":"detachment","detachments":["Hand of the Dynasty"],"anyUnits":["Necron Warriors"],"enhancements":["Enlivened Sentinels"],"units":["Necron Warriors"],"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","faction":"Necrons"},
 {"id":"11e-necron-hod-tools","title":"Tools of Dominion · Rapid Fire 1","window":"Shooting","timing":"during","summary":"Immortals with the Tools of Dominion upgrade have Rapid Fire 1 on their ranged attacks.","origin":"detachment","detachments":["Hand of the Dynasty"],"anyUnits":["Immortals"],"enhancements":["Tools of Dominion"],"units":["Immortals"],"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","faction":"Necrons"},
 {"id":"11e-necron-skyshroud-deepstrike","title":"Transdimensional Deployment · Tomb Blades","window":"Movement","timing":"during","summary":"Tomb Blades have Deep Strike while Skyshroud Spearhead is selected. Check arrival and ingress positioning.","origin":"detachment","detachments":["Skyshroud Spearhead"],"anyUnits":["Tomb Blades"],"units":["Tomb Blades"],"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","faction":"Necrons"},
 {"id":"11e-necron-skyshroud-ingress","title":"Transdimensional Deployment · Ingress fire","window":"Shooting","timing":"during","summary":"Tomb Blades that made an ingress move this turn gain +1 to hit rolls with ranged attacks.","origin":"detachment","detachments":["Skyshroud Spearhead"],"anyUnits":["Tomb Blades"],"units":["Tomb Blades"],"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","faction":"Necrons"},
 {"id":"11e-necron-nightbringer-drain","title":"Nightbringer · Drain Life","window":"Fight","timing":"end","summary":"At the end of the Fight phase, roll a D6 for each enemy unit within 6\" of the Nightbringer; on 4+, it suffers D3 mortal wounds.","origin":"unit","anyUnits":["C’tan Shard of the Nightbringer"],"units":["C’tan Shard of the Nightbringer"],"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","faction":"Necrons"},
 {"id":"11e-necron-void-dragon-absorption","title":"Void Dragon · Matter Absorption","window":"Shooting","timing":"start","summary":"At the start of your Shooting phase, select an enemy Vehicle within 12\"; on a D6 roll of 2+, it suffers D3 mortal wounds and the Void Dragon regains up to that many lost wounds.","origin":"unit","anyUnits":["C’tan Shard of the Void Dragon"],"units":["C’tan Shard of the Void Dragon"],"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","faction":"Necrons"}
];
export function generate11thReminders(_army:ArmySelection):GeneratedReminder[]{
 const result=CORE_11TH.map(rule=>({...rule}));
 result.push(...matching11thRules(_army,DETACHMENT_RULES));
 if(_army.faction==='Orks'&&Object.keys(_army.units).length){
  const source='https://www.warhammer-community.com/en-gb/articles/ckwgwgyx/new-codex-orks-army-rules-to-get-you-riled-up/';
  result.push({id:'11e-orks-war-cry',title:'Waaagh! · War Cry (once per battle)',window:'Command',timing:'start',summary:'At the start of your Command phase, you may use War Cry once per battle. Friendly ORKS units with Waaagh! become riled up until the end of the next turn.',source,origin:'army'});
  result.push({id:'11e-orks-advance',title:'Waaagh! · Re-roll advances',window:'Movement',timing:'during',summary:'Friendly ORKS units with Waaagh! can re-roll Advance rolls. While riled up, their ranged attacks have Assault and advancing does not prevent them declaring a charge.',source,origin:'army'});
  result.push({id:'11e-orks-riled-save',title:'Waaagh! · Riled-up protection',window:'Shooting',timing:'during',summary:'While riled up, friendly ORKS units with Waaagh! have a 5+ invulnerable save.',source,origin:'army'});
  if((_army.units.Meganobz||0)>0)result.push({id:'11e-orks-meganobz-krumpin',title:'Meganobz · Krumpin’ Time',window:'Fight',timing:'during',summary:'While this Meganobz unit is riled up, add 1 to its Hit rolls in the Fight phase.',source,origin:'unit',units:['Meganobz']});
 }
 return result;
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
