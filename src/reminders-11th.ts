import {expandRoster} from './roster-instances';
import {necronKeywords} from './necron-wargear';
import {necronDatasheetReminders2026} from './necron-datasheet-reminders-2026';
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
{"id":"11e-necron-canoptek-power-matrix","anyUnits":[...necronKeywords.CRYPTEK,...Object.keys(Object.fromEntries([...[...necronKeywords.VEHICLE,...necronKeywords.INFANTRY].filter(unit=>unit.startsWith("Canoptek")).map(unit=>[unit,true])]))],"title":"Canoptek Court · Power Matrix","window":"Shooting","timing":"during","summary":"Cryptek and Canoptek units re-roll Hit rolls of 1; if wholly within the Power Matrix, re-roll Hit rolls instead. Re-evaluate matrix control at the start of each phase.","origin":"detachment","faction":"Necrons","detachments":["Canoptek Court"],"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html"},
{"id":"11e-necron-hypercrypt-hyperphasing","title":"Hypercrypt Legion · Hyperphasing","window":"End of opponent turn","timing":"end","summary":"At the end of your opponent's turn, select eligible Necrons units outside Engagement Range to place in Strategic Reserves: up to 1 Incursion, 2 Strike Force or 3 Onslaught.","origin":"detachment","faction":"Necrons","detachments":["Hypercrypt Legion"],"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html"},
{"id":"11e-necron-starshatter-onslaught","title":"Starshatter Arsenal · Relentless Onslaught","window":"Shooting","timing":"during","summary":"Non-Monster Necrons gain +1 to Hit against targets within range of objectives; non-Titanic Necrons Vehicle and Mounted ranged weapons gain Assault.","origin":"detachment","faction":"Necrons","detachments":["Starshatter Arsenal"],"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html"},
{"id":"11e-necron-cryconclave-augmentations","anyUnits":[...necronKeywords.CRYPTEK],"title":"Cryptek Conclave · Technosorcerous Augmentations","window":"Shooting","timing":"during","summary":"Cryptek ranged weapons have Assault. When a Cryptek unit shoots, choose Anti-Infantry 3+, Anti-Mounted 4+, Assault, Heavy or Ignores Cover for its ranged weapons this phase.","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"],"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html"},
{"id":"11e-necron-cursed-cold-fervour","anyUnits":[...necronKeywords.DESTROYER CULT],"title":"Cursed Legion · Cold Fervour","window":"Fight","timing":"during","summary":"Destroyer Cult weapons gain +2 Strength; after a Destroyer Cult unit destroys or reduces a target Below Half-strength, other eligible Necrons weapons gain +2 Strength for the turn.","origin":"detachment","faction":"Necrons","detachments":["Cursed Legion"],"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html"},
 {id:'11e-necron-hod-hypermotility',title:'Hypermotility Protocols',window:'Movement',timing:'during',summary:'Selected Necron Warriors and Immortals gain Assault on ranged attacks and can start an action after advancing.',source:'https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf',origin:'detachment',faction:'Necrons',detachments:['Hand of the Dynasty'],anyUnits:['Necron Warriors','Immortals'],units:['Necron Warriors','Immortals']},
 {id:'11e-necron-hod-will',title:'Will of the Conqueror · 1CP',window:'Movement',timing:'end',summary:'At the end of your Movement phase, select an eligible Necron Warriors or Immortals unit and secure one objective it controls.',source:'https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf',origin:'detachment',faction:'Necrons',detachments:['Hand of the Dynasty'],anyUnits:['Necron Warriors','Immortals'],units:['Necron Warriors','Immortals']},
 {id:'11e-necron-hod-nanosaturation',title:'Nanosaturation · 1CP',window:'Shooting',timing:'during',summary:'In your opponent’s Shooting phase, after an enemy unit has shot at your Necron Warriors or Immortals, that unit may snap shoot at the attacker.',source:'https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf',origin:'detachment',faction:'Necrons',detachments:['Hand of the Dynasty'],anyUnits:['Necron Warriors','Immortals'],units:['Necron Warriors','Immortals']},
 {id:'11e-necron-hod-dominance',title:'Dominance Protocols · 1CP',window:'Command',timing:'during',summary:'Select a friendly Immortals unit in your Command phase; it gains +1 OC until the end of the turn.',source:'https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf',origin:'detachment',faction:'Necrons',detachments:['Hand of the Dynasty'],anyUnits:['Immortals'],units:['Immortals']}
,
 {"id":"11e-necron-hod-enlivened","title":"Enlivened Sentinels · Scouts 5\"","window":"Pre-battle","timing":"start","summary":"Necron Warriors with the Enlivened Sentinels upgrade have Scouts 5\"; resolve the Scout move at the appropriate pre-battle step.","origin":"detachment","detachments":["Hand of the Dynasty"],"anyUnits":["Necron Warriors"],"enhancements":["Enlivened Sentinels"],"units":["Necron Warriors"],"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","faction":"Necrons"},
 {"id":"11e-necron-hod-tools","title":"Tools of Dominion · Rapid Fire 1","window":"Shooting","timing":"during","summary":"Immortals with the Tools of Dominion upgrade have Rapid Fire 1 on their ranged attacks.","origin":"detachment","detachments":["Hand of the Dynasty"],"anyUnits":["Immortals"],"enhancements":["Tools of Dominion"],"units":["Immortals"],"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","faction":"Necrons"},
 {"id":"11e-necron-skyshroud-deepstrike","title":"Transdimensional Deployment · Tomb Blades","window":"Movement","timing":"during","summary":"Tomb Blades have Deep Strike while Skysword Spearhead is selected. Check arrival and ingress positioning.","origin":"detachment","detachments":["Skysword Spearhead"],"anyUnits":["Tomb Blades"],"units":["Tomb Blades"],"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","faction":"Necrons"},
 {"id":"11e-necron-skyshroud-ingress","title":"Transdimensional Deployment · Ingress fire","window":"Shooting","timing":"during","summary":"Tomb Blades that made an ingress move this turn gain +1 to hit rolls with ranged attacks.","origin":"detachment","detachments":["Skysword Spearhead"],"anyUnits":["Tomb Blades"],"units":["Tomb Blades"],"source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf","faction":"Necrons"}
];

/** Fail closed: only verified 11e Scout grants are emitted, by actual roster instance. */
export function eligibleScoutReminders(army:ArmySelection):GeneratedReminder[]{
 const instances=expandRoster(army);
 const source='https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf';
 if(army.faction!=='Necrons'||!(army.detachments2026||[]).includes('Hand of the Dynasty'))return [];
 return instances.filter(s=>s.unit==='Necron Warriors'&&(army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit])==='Enlivened Sentinels').filter(s=>!instances.some(leader=>leader.attachedTo===s.id)).map(s=>({
  id:'11e-scout-'+s.id,title:s.id+' · Scouts 5"',window:'Pre-battle' as const,timing:'during' as const,
  summary:'During Resolve Pre-battle Abilities, this upgraded unit has Scouts 5". If wholly within your deployment zone it may make a Scout move of up to 5", ending more than 8" horizontally from enemy units. If in Strategic Reserves it may instead set up wholly within your deployment zone. Check battlefield geometry before resolving.',
  source,origin:'unit' as const,units:[s.id]
 }));
}

export function generate11thReminders(_army:ArmySelection):GeneratedReminder[]{
 const result=CORE_11TH.map(rule=>({...rule}));
 result.push(...matching11thRules(_army,DETACHMENT_RULES).filter(r=>r.id!=='11e-necron-hod-enlivened'));
 result.push(...eligibleScoutReminders(_army));
 result.push(...necronDatasheetReminders2026(_army));
 if(_army.faction==='Necrons'&&Object.values(_army.units).some(n=>n>0)){
  result.push({id:'11e-necron-reanimation',title:'Reanimation Protocols · D3 wounds',window:'Command',timing:'end',summary:'At the end of your Command phase, each friendly unit on the battlefield with Reanimation Protocols activates and heals D3 wounds. Restore damaged models before returning destroyed models.',source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'army'});

 }
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
