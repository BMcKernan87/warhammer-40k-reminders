import {emperorsChildrenTransportReminders} from './emperors-children-transports';
import {ecProfileReminders} from './ec-datasheet-core';
import {emperorsChildrenIntrinsicReminders} from './emperors-children-intrinsic';
import {emperorsChildrenDetachmentReminders} from './emperors-children-detachments';
import {emperorsChildrenArmyReminders} from './emperors-children-army';
import {emperorsChildrenKeywords,emperorsChildrenMusterUnits} from './emperors-children-data';
import {emperorsChildrenHasRangedWeapon} from './emperors-children-loadouts';
import {isDreadblade} from './dreadblade-allies';
import {worldEatersDetachmentReminders} from './world-eaters-detachments';
import {worldEatersIntrinsicReminders} from './world-eaters-intrinsic';
import {worldEaterProfileReminders} from './world-eater-core';
import {astraMilitarumDetachmentReminders} from './astra-militarum-detachments';
import {astraDatasheetReminders} from './astra-datasheets';
import {astraOrderReminders} from './astra-orders';
import {astraAgentName,astraMilitarumKeywords,astraMusterUnits} from './astra-muster-data';
import {astraFormationGroups,astraEmbarkationReminders} from './astra-transports';
import {astraMilitarumHasRangedWeapon} from './astra-militarum-loadouts';
import {isFreeblade} from './titan-support-data';
import {gscDetachmentReminders} from './gsc-detachments';
import {worldEatersBlessingReminders} from './world-eaters-blessings';
import {worldEatersKeywords,worldEatersMusterUnits,isWorldEatersDreadblade} from './world-eaters-data';
import {worldEaterHasRangedWeapon} from './world-eater-loadouts';
import {worldEatersTransportReminders} from './world-eaters-muster';
import {orkDetachmentReminders,orkHasRangedAttack} from './ork-detachments';
import {orkKeywords} from './ork-data';
import {votannDatasheetReminders} from './votann-datasheets';
import {votannStratagemReminders} from './votann-stratagems';
import {gscCultAmbushReminders} from './gsc-cult-ambush';
import {gscDatasheetReminders} from './gsc-datasheets';
import {gscArmyKeywords} from './gsc-muster';
import {gscHasRangedWeapon} from './gsc-loadouts';
import {gscAlliedReminders} from './gsc-allied-reminders';
import {gscEmbarkationReminders} from './gsc-army-transports';
import {votannArmyReminders} from './votann-army';
import {shadowLegionHasRangedWeapon, shadowMarineReminders} from './shadow-legion-cards';
import {alliedTitanAndKnightReminders,applyWarhoundStratagemCost} from './titan-support';
import {isWarhound} from './titan-support-data';
import {applyStratagemWindow} from './stratagem-windows';
import {targetedNecronEnhancements} from './necron-targeted-enhancements';
import {necronDeploymentReminders} from './necron-deployment';
import {formationShootingReminders} from './formation-shooting';
import {formationDeploymentReminders} from './formation-deployment';
import {coreStratagemReminders} from './core-stratagems-11th';
import {DATASHEETS_2026} from './datasheets-2026';
import {votannEnhancementReminders} from './votann-enhancements';
import {knightJoinedBodyguard} from './leader-eligibility';
import {daemonArmyReminders} from './chaos-daemon-detachments';
import {custodesDatasheetReminders} from './custodes-datasheets';
import {custodesHasRangedWeapon} from './custodes-loadouts';
import {custodesKeywords} from './adeptus-custodes-data';
import {custodesFormationReminders} from './custodes-formations';
import {orkDatasheetReminders} from './ork-datasheets';
import {orkTransportReminders} from './ork-transports';
import {votannHasRangedWeapon} from './votann-loadouts';
import {votannKeywords} from './votann-muster-data';
import {votannTransportReminders} from './votann-transports';
import {custodesDetachmentReminders} from './custodes-detachments';
import {chaosKnightDetachmentReminders,resolvedWarDogCharacterIds} from './chaos-knight-detachments';
import {daemonDatasheetReminders,daemonHasRangedWeapon} from './daemon-datasheets';
import {chaosKnightDatasheetReminders,chaosKnightHasRangedWeapon} from './chaos-knight-datasheets';
import {knightDetachmentReminders} from './imperial-knight-detachments';
import {agentTransports} from './agent-transports';
import {agentDetachmentReminders} from './imperial-agent-detachments';
import {assignedAgentHasRanged,assignedAgentReminders} from './knight-assigned-agents';
import {imperialKnightDatasheetReminders,knightHasRangedWeapon} from './imperial-knight-datasheets';
import {ghostArkPassengers,necronFormationRoots} from './necron-retinues';
import {verifiedUnitSizes2026} from './datasheets-2026';
import {expandRoster,type RosterInstance} from './roster-instances';
import {canoptekHypercryptReminders} from './necron-canoptek-hypercrypt';
import {remainingNecronReminders} from './necron-remaining-detachments';
import {hasNecronRangedWeapon,necronKeywords} from './necron-wargear';
import {naturalScoutReminders,necronDatasheetReminders2026} from './necron-datasheet-reminders-2026';
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
 {id:'11e-movement-reserves',title:'Reinforcements and ingress',window:'Movement',timing:'during',summary:'In your Move Units step, select eligible units in Strategic Reserves to make ingress moves in the order you choose alongside your other units.',source:CORE_SOURCE,origin:'army'},
 {id:'11e-shoot',title:'Shoot with eligible units',window:'Shooting',timing:'during',summary:'Select eligible units to shoot, choose weapons and targets, then resolve attacks.',source:CORE_SOURCE,origin:'army'},
 {id:'11e-charge',title:'Declare and resolve charges',window:'Charge',timing:'during',summary:'Declare eligible charges, roll the charge distance and complete legal charge moves.',source:CORE_SOURCE,origin:'army'},
 {id:'11e-fight',title:'Fight phase sequence',window:'Fight',timing:'during',summary:'Resolve start-of-phase effects, pile-in moves, Fights First combats, remaining fights and consolidation.',source:CORE_SOURCE,origin:'army'},
 {id:'11e-core-overwatch',title:'Fire Overwatch · 1CP',window:'Movement',timing:'end',summary:'End of opponent’s Movement phase: choose one friendly unengaged non-Titanic unit to snap shoot one visible eligible enemy within 24″. Normally hits only on unmodified 6s; these are not critical hits. A specific rule may change the hit threshold, but Hit rolls cannot be re-rolled. No Charge-phase Fire Overwatch.',source:CORE_SOURCE,origin:'army'},
 {id:'11e-move-every-unit',title:'Select every unit to move',window:'Movement',timing:'during',summary:'Select each of your units once in the Move Units step, including units in Strategic Reserves or embarked in Transports. Remaining stationary counts as a selection.',source:CORE_SOURCE,origin:'army'}
];
const DETACHMENT_RULES:readonly Rule11th[]=[
{"id":"11e-necron-starshatter-onslaught",requiresRangedWeapon:true,"anyUnits":[...necronKeywords.INFANTRY,...necronKeywords.VEHICLE,...necronKeywords.MOUNTED,"Canoptek Wraiths","Canoptek Scarab Swarms","Canoptek Macrocytes","Canoptek Tomb Crawlers"],"title":"Starshatter Arsenal · Relentless Onslaught","window":"Shooting","timing":"during","summary":"Necron models excluding Monsters gain +1 to Hit against targets within range of objectives; ranged weapons of non-Titanic Vehicle and Mounted models gain Assault.","origin":"detachment","faction":"Necrons","detachments":["Starshatter Arsenal"],"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html"},
{"id":"11e-necron-starshatter-onslaught-fight","anyUnits":[...necronKeywords.INFANTRY,...necronKeywords.VEHICLE,...necronKeywords.MOUNTED,"Canoptek Wraiths","Canoptek Scarab Swarms","Canoptek Macrocytes","Canoptek Tomb Crawlers"],"title":"Starshatter Arsenal · Relentless Onslaught","window":"Fight","timing":"during","summary":"Necron models excluding Monsters gain +1 to Hit when making melee attacks against targets within range of objectives.","origin":"detachment","faction":"Necrons","detachments":["Starshatter Arsenal"],"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/datasheets.html"},
{"id":"11e-necron-cryconclave-augmentations",requiresRangedWeapon:true,"anyUnits":[...necronKeywords.CRYPTEK],"title":"Cryptek Conclave · Technosorcerous Augmentations","window":"Shooting","timing":"during","summary":"Cryptek models always have Assault on ranged weapons. In your Shooting phase, when a Cryptek formation is selected to fire, choose Anti-Infantry 3+, Anti-Mounted 4+, Assault, Heavy or Ignores Cover for every model’s ranged weapons until phase end.","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"],"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/"},
 {id:'11e-necron-hod-hypermotility',title:'Hypermotility Protocols',window:'Movement',timing:'during',summary:'Selected Necron Warriors and Immortals gain Assault on ranged attacks and can start an action after advancing.',source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',faction:'Necrons',detachments:['Hand of the Dynasty'],anyUnits:['Necron Warriors','Immortals'],units:['Necron Warriors','Immortals']},
 {id:'11e-necron-hod-will',title:'Will of the Conqueror · 1CP',window:'Movement',timing:'end',summary:'At the end of your Movement phase, select an eligible Necron Warriors or Immortals unit and secure one objective it controls.',source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',faction:'Necrons',detachments:['Hand of the Dynasty'],anyUnits:['Necron Warriors','Immortals'],units:['Necron Warriors','Immortals']},
 {id:'11e-necron-hod-nanosaturation',requiresRangedWeapon:true,title:'Nanosaturation · 1CP',window:'Shooting',timing:'during',summary:'In your opponent’s Shooting phase, after an enemy unit has shot at your Necron Warriors or Immortals, that unit may snap shoot at the attacker.',source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',faction:'Necrons',detachments:['Hand of the Dynasty'],anyUnits:['Necron Warriors','Immortals'],units:['Necron Warriors','Immortals']},
 {id:'11e-necron-hod-dominance',title:'Dominance Protocols · 1CP',window:'Command',timing:'during',summary:'In either Command phase, select a friendly Immortals formation; increase its OC by 1 until that turn ends.',source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',faction:'Necrons',detachments:['Hand of the Dynasty'],anyUnits:['Immortals'],units:['Immortals']}
,
 {"id":"11e-necron-hod-enlivened","title":"Enlivened Sentinels · Scouts 5\"","window":"Pre-battle","timing":"start","summary":"Necron Warriors with the Enlivened Sentinels upgrade have Scouts 5\"; resolve the Scout move at the appropriate pre-battle step.","origin":"detachment","detachments":["Hand of the Dynasty"],"anyUnits":["Necron Warriors"],"enhancements":["Enlivened Sentinels"],"units":["Necron Warriors"],"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","faction":"Necrons"},
 {"id":"11e-necron-hod-tools",requiresRangedWeapon:true,"title":"Tools of Dominion · Rapid Fire 1","window":"Shooting","timing":"during","summary":"Immortals with the Tools of Dominion upgrade have Rapid Fire 1 on their ranged attacks.","origin":"detachment","detachments":["Hand of the Dynasty"],"anyUnits":["Immortals"],"enhancements":["Tools of Dominion"],"units":["Immortals"],"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","faction":"Necrons"},
 {"id":"11e-necron-skyshroud-deepstrike","title":"Transdimensional Deployment · Tomb Blades","window":"Movement","timing":"during","summary":"Tomb Blades have Deep Strike while Skyshroud Spearhead is selected. Check arrival and ingress positioning.","origin":"detachment","detachments":["Skysword Spearhead"],"anyUnits":["Tomb Blades"],"units":["Tomb Blades"],"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","faction":"Necrons"},
 {"id":"11e-necron-skyshroud-ingress",requiresRangedWeapon:true,"title":"Transdimensional Deployment · Ingress fire","window":"Shooting","timing":"during","summary":"Tomb Blades that made an ingress move this turn gain +1 to hit rolls with ranged attacks.","origin":"detachment","detachments":["Skysword Spearhead"],"anyUnits":["Tomb Blades"],"units":["Tomb Blades"],"source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","faction":"Necrons"},
 {id:'11e-necron-skyshroud-omnilocked',requiresRangedWeapon:true,title:'Omnilocked Strafing · 1CP',window:'Movement',timing:'during',summary:'Your turn: when selecting a Mounted unit to Fall Back, allow it to shoot afterward.',origin:'detachment',faction:'Necrons',detachments:['Skysword Spearhead'],anyUnits:[...necronKeywords.MOUNTED],source:'https://wahapedia.ru/wh40k11ed/factions/necrons/'},
 {id:'11e-necron-skyshroud-swift',title:'Swift as Death · 1CP',window:'Movement',timing:'during',summary:'Opponent’s turn: after an enemy moves within 8″ of an unengaged friendly Mounted unit, that unit may make a Normal move up to D3+3″.',origin:'detachment',faction:'Necrons',detachments:['Skysword Spearhead'],anyUnits:[...necronKeywords.MOUNTED],source:'https://wahapedia.ru/wh40k11ed/factions/necrons/'},
 {id:'11e-necron-skyshroud-evasive',title:'Evasive Protocols · 1CP',window:'Shooting',timing:'during',summary:'Opponent’s turn: when a Mounted unit is targeted, ranged attacks stronger than its Toughness suffer −1 to wound.',origin:'detachment',faction:'Necrons',detachments:['Skysword Spearhead'],anyUnits:[...necronKeywords.MOUNTED],source:'https://wahapedia.ru/wh40k11ed/factions/necrons/'},
 {id:'11e-necron-skyshroud-recursive',title:'Recursive Reanimation',window:'Command',timing:'during',summary:'Add 1 to this upgraded Tomb Blades unit’s Reanimation roll.',origin:'detachment',faction:'Necrons',detachments:['Skysword Spearhead'],anyUnits:['Tomb Blades'],enhancements:['Recursive Reanimation'],units:['Tomb Blades'],source:'https://wahapedia.ru/wh40k11ed/factions/necrons/'},
 {id:'11e-necron-skyshroud-deepening',requiresRangedWeapon:true,title:'Deepening Madness',window:'Shooting',timing:'during',summary:'This upgraded Destroyer Cult Mounted unit’s ranged attacks have Assault.',origin:'detachment',faction:'Necrons',detachments:['Skysword Spearhead'],anyUnits:['Lokhust Destroyers','Lokhust Heavy Destroyers','Lokhust Lord'],enhancements:['Deepening Madness'],units:['Lokhust Destroyers','Lokhust Heavy Destroyers','Lokhust Lord'],source:'https://wahapedia.ru/wh40k11ed/factions/necrons/'},
{"id":"11e-necron-phaeron-engines","title":"Empowered Engines","window":"Movement","timing":"during","summary":"Necron Titanic Fly formations add 6″ to Move; grounded Titanic units do not qualify.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["The Phaeron's Armoury"],"anyUnits":["Monolith","Obelisk","Tesseract Vault"]},
{"id":"11e-necron-phaeron-quantum-shoot","title":"Subsurface Quantumweave · 1CP","window":"Shooting","timing":"during","summary":"Opponent’s Shooting: after a Titanic Fly formation is targeted, worsen incoming AP by 1 until that attacker finishes.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["The Phaeron's Armoury"],"anyUnits":["Monolith","Obelisk","Tesseract Vault"]},
{"id":"11e-necron-phaeron-quantum-fight","title":"Subsurface Quantumweave · 1CP","window":"Fight","timing":"during","summary":"Either Fight: after a Titanic Fly formation is targeted, worsen incoming AP by 1 until that attacker finishes.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["The Phaeron's Armoury"],"anyUnits":["Monolith","Obelisk","Tesseract Vault"]},
{"id":"11e-necron-phaeron-particle","title":"Particle Pulse · 1CP","window":"Shooting","timing":"start","summary":"Your turn: pick a visible enemy within 12 inches of the engine; increase its detection range by 3 inches.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["The Phaeron's Armoury"],"anyUnits":["Monolith","Obelisk","Tesseract Vault"]},
{"id":"11e-necron-phaeron-cosmic","title":"Cosmic Storm · 1CP","window":"Shooting","timing":"during","summary":"Your turn: when selected to fire, improve Tesla Sphere AP by 1.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["The Phaeron's Armoury"],"anyUnits":["Obelisk","Tesseract Vault"]},
{"id":"11e-necron-phaeron-mortality","title":"Mortality Shroud","window":"Command","timing":"during","summary":"Opponent’s Battle-shock step: enemy units within 8 inches below starting strength take a Battle-shock roll.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["The Phaeron's Armoury"],"anyUnits":["Obelisk"],"enhancements":["Mortality Shroud"],"units":["Obelisk"]},
 {id:"11e-necron-starshatter-merciless-shoot",requiresRangedWeapon:true,title:"Merciless Reclamation · 2CP",window:'Shooting',timing:'during',summary:"Your turn, before an eligible unit shoots: gain +1 to wound against enemies in objective range for this phase. Exclude Monsters and Titanic units.",source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',faction:'Necrons',detachments:['Starshatter Arsenal'],anyUnits:[...necronKeywords.INFANTRY,...necronKeywords.VEHICLE,...necronKeywords.MOUNTED,'Canoptek Wraiths','Canoptek Scarab Swarms','Canoptek Macrocytes','Canoptek Tomb Crawlers','The Silent King'].filter(u=>!necronKeywords.TITANIC.has(u)&&!necronKeywords.MONSTER.has(u))},
 {id:"11e-necron-starshatter-merciless-fight",title:"Merciless Reclamation · 2CP",window:'Fight',timing:'during',summary:"Before an eligible unit fights: gain +1 to wound against enemies in objective range for this phase. Exclude Monsters and Titanic units.",source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',faction:'Necrons',detachments:['Starshatter Arsenal'],anyUnits:[...necronKeywords.INFANTRY,...necronKeywords.VEHICLE,...necronKeywords.MOUNTED,'Canoptek Wraiths','Canoptek Scarab Swarms','Canoptek Macrocytes','Canoptek Tomb Crawlers','The Silent King'].filter(u=>!necronKeywords.TITANIC.has(u)&&!necronKeywords.MONSTER.has(u))},
 {id:"11e-necron-starshatter-unyielding-shoot",title:"Unyielding Forms · 2CP",window:'Shooting',timing:'during',summary:"Opponent’s turn, after targeting: attacks exceeding your selected unit’s Toughness suffer −1 to wound this phase. Select a non-Titanic Vehicle or Mounted unit.",source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',faction:'Necrons',detachments:['Starshatter Arsenal'],anyUnits:[...necronKeywords.VEHICLE,...necronKeywords.MOUNTED].filter(u=>!necronKeywords.TITANIC.has(u)&&!necronKeywords.MONSTER.has(u))},
 {id:"11e-necron-starshatter-unyielding-fight",title:"Unyielding Forms · 2CP",window:'Fight',timing:'during',summary:"After enemy targeting: attacks exceeding your selected unit’s Toughness suffer −1 to wound this phase. Select a non-Titanic Vehicle or Mounted unit.",source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',faction:'Necrons',detachments:['Starshatter Arsenal'],anyUnits:[...necronKeywords.VEHICLE,...necronKeywords.MOUNTED].filter(u=>!necronKeywords.TITANIC.has(u)&&!necronKeywords.MONSTER.has(u))},
 {id:"11e-necron-starshatter-chronoshift",title:"Chronoshift · 1CP",window:'Movement',timing:'during',summary:"Your turn, before selecting the unit to move: replace its Advance roll with +6″ Move. Select a non-Titanic Vehicle or Mounted unit.",source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',faction:'Necrons',detachments:['Starshatter Arsenal'],anyUnits:[...necronKeywords.VEHICLE,...necronKeywords.MOUNTED].filter(u=>!necronKeywords.TITANIC.has(u)&&!necronKeywords.MONSTER.has(u))},
 {id:"11e-necron-starshatter-tunnel",title:"Dimensional Tunnel · 1CP",window:'Movement',timing:'during',summary:"Your turn: selected unit can move horizontally through models and terrain this phase. Select a non-Titanic Vehicle or Mounted unit.",source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',faction:'Necrons',detachments:['Starshatter Arsenal'],anyUnits:[...necronKeywords.VEHICLE,...necronKeywords.MOUNTED].filter(u=>!necronKeywords.TITANIC.has(u)&&!necronKeywords.MONSTER.has(u))},
 {id:"11e-necron-starshatter-servitude",title:"Endless Servitude · 1CP",window:'Fight',timing:'end',summary:"Your turn: activate Reanimation Protocols for an eligible unit in range of an objective you control. Exclude Monsters and Titanic units.",source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',faction:'Necrons',detachments:['Starshatter Arsenal'],anyUnits:[...necronKeywords.INFANTRY,...necronKeywords.VEHICLE,...necronKeywords.MOUNTED,'Canoptek Wraiths','Canoptek Scarab Swarms','Canoptek Macrocytes','Canoptek Tomb Crawlers','The Silent King'].filter(u=>!necronKeywords.TITANIC.has(u)&&!necronKeywords.MONSTER.has(u))},
 {id:"11e-necron-starshatter-reactive",title:"Reactive Reposition · 1CP",window:'Shooting',timing:'during',summary:"Opponent’s turn, after an enemy has shot an eligible unit: that unit can make a Normal move up to D6″. Exclude Monsters and Titanic units.",source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',faction:'Necrons',detachments:['Starshatter Arsenal'],anyUnits:[...necronKeywords.INFANTRY,...necronKeywords.VEHICLE,...necronKeywords.MOUNTED,'Canoptek Wraiths','Canoptek Scarab Swarms','Canoptek Macrocytes','Canoptek Tomb Crawlers','The Silent King'].filter(u=>!necronKeywords.TITANIC.has(u)&&!necronKeywords.MONSTER.has(u))},
{"id":"11e-necron-enh-nebuloscope",requiresRangedWeapon:true,"title":"Miniaturised Nebuloscope","window":"Shooting","timing":"during","summary":"This bearer’s unit has Ignores Cover on ranged weapons.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Starshatter Arsenal"],"anyUnits":["Technomancer","Plasmancer","Chronomancer","Overlord","Overlord with translocation shroud","Skorpekh Lord","Hexmark Destroyer","Catacomb Command Barge","Royal Warden","Psychomancer","Geomancer","Lokhust Lord"],"units":["Technomancer","Plasmancer","Chronomancer","Overlord","Overlord with translocation shroud","Skorpekh Lord","Hexmark Destroyer","Catacomb Command Barge","Royal Warden","Psychomancer","Geomancer","Lokhust Lord"],"enhancements":["Miniaturised Nebuloscope"]},
{"id":"11e-necron-conclave-molecular-shooting",requiresRangedWeapon:true,"title":"Molecular Targeting · 1CP","window":"Shooting","timing":"during","summary":"Your Shooting phase, before selecting a unit to shoot: ignore BS/WS and hit modifiers; Cryptek units can also ignore wound modifiers. Lasts this phase.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"]},
{"id":"11e-necron-conclave-animus-shooting","title":"Animus Curse · 1CP","window":"Shooting","timing":"during","summary":"Opponent’s Shooting: after enemy attacks destroy a Cryptek model, target that destroyed model; friendly Necrons re-roll hits against that attacker for the rest of the battle.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"],"anyUnits":["Chronomancer","Geomancer","Illuminor Szeras","Orikan the Diviner","Plasmancer","Psychomancer","Technomancer"]},
{"id":"11e-necron-conclave-molecular-fight","title":"Molecular Targeting · 1CP","window":"Fight","timing":"during","summary":"Before selecting a unit to fight in either Fight phase: ignore BS/WS and hit modifiers; Cryptek units can also ignore wound modifiers. Lasts this phase.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"]},
{"id":"11e-necron-conclave-animus-fight","title":"Animus Curse · 1CP","window":"Fight","timing":"during","summary":"Either Fight: after enemy attacks destroy a Cryptek model, target that destroyed model; friendly Necrons re-roll hits against that attacker for the rest of the battle.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"],"anyUnits":["Chronomancer","Geomancer","Illuminor Szeras","Orikan the Diviner","Plasmancer","Psychomancer","Technomancer"]},
{"id":"11e-necron-conclave-synergy","title":"Synergistic Empowerment · 1CP","window":"Shooting","timing":"start","summary":"Start of your Shooting phase: select a Cryptek unit and grant the Cryptek keyword to a friendly non-Vehicle, non-Monster Necron model within 12″ of a Cryptek model in that unit for this phase.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"],"anyUnits":["Chronomancer","Geomancer","Illuminor Szeras","Orikan the Diviner","Plasmancer","Psychomancer","Technomancer"]},
{"id":"11e-necron-conclave-untapped",requiresRangedWeapon:true,"title":"Untapped Power · 1CP","window":"Shooting","timing":"during","summary":"Your Shooting phase, before selecting a Cryptek unit to shoot: select one extra Augmentations weapon ability when it shoots this phase.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"],"anyUnits":["Chronomancer","Geomancer","Illuminor Szeras","Orikan the Diviner","Plasmancer","Psychomancer","Technomancer"]},
{"id":"11e-necron-conclave-syphon","title":"Potentiality Syphon · 1CP","window":"Command","timing":"during","summary":"Opponent’s turn: activate Reanimation for a friendly unit in objective range; Cryptek units restore one extra wound.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"]},
{"id":"11e-necron-conclave-abacus-command","title":"Quantum Abacus","window":"Command","timing":"during","summary":"When targeting this bearer’s unit with a stratagem, roll D6 (+1 in objective range); 4+ refunds 1 CP.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"],"anyUnits":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer","Overlord","Overlord with translocation shroud","Royal Warden","Hexmark Destroyer","Skorpekh Lord","Lokhust Lord","Catacomb Command Barge"],"enhancements":["Quantum Abacus"],"units":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer","Overlord","Overlord with translocation shroud","Royal Warden","Hexmark Destroyer","Skorpekh Lord","Lokhust Lord","Catacomb Command Barge"]},
{"id":"11e-necron-conclave-abacus-movement","title":"Quantum Abacus","window":"Movement","timing":"during","summary":"When targeting this bearer’s unit with a stratagem, roll D6 (+1 in objective range); 4+ refunds 1 CP.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"],"anyUnits":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer","Overlord","Overlord with translocation shroud","Royal Warden","Hexmark Destroyer","Skorpekh Lord","Lokhust Lord","Catacomb Command Barge"],"enhancements":["Quantum Abacus"],"units":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer","Overlord","Overlord with translocation shroud","Royal Warden","Hexmark Destroyer","Skorpekh Lord","Lokhust Lord","Catacomb Command Barge"]},
{"id":"11e-necron-conclave-abacus-shooting","title":"Quantum Abacus","window":"Shooting","timing":"during","summary":"When targeting this bearer’s unit with a stratagem, roll D6 (+1 in objective range); 4+ refunds 1 CP.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"],"anyUnits":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer","Overlord","Overlord with translocation shroud","Royal Warden","Hexmark Destroyer","Skorpekh Lord","Lokhust Lord","Catacomb Command Barge"],"enhancements":["Quantum Abacus"],"units":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer","Overlord","Overlord with translocation shroud","Royal Warden","Hexmark Destroyer","Skorpekh Lord","Lokhust Lord","Catacomb Command Barge"]},
{"id":"11e-necron-conclave-abacus-charge","title":"Quantum Abacus","window":"Charge","timing":"during","summary":"When targeting this bearer’s unit with a stratagem, roll D6 (+1 in objective range); 4+ refunds 1 CP.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"],"anyUnits":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer","Overlord","Overlord with translocation shroud","Royal Warden","Hexmark Destroyer","Skorpekh Lord","Lokhust Lord","Catacomb Command Barge"],"enhancements":["Quantum Abacus"],"units":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer","Overlord","Overlord with translocation shroud","Royal Warden","Hexmark Destroyer","Skorpekh Lord","Lokhust Lord","Catacomb Command Barge"]},
{"id":"11e-necron-conclave-abacus-fight","title":"Quantum Abacus","window":"Fight","timing":"during","summary":"When targeting this bearer’s unit with a stratagem, roll D6 (+1 in objective range); 4+ refunds 1 CP.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"],"anyUnits":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer","Overlord","Overlord with translocation shroud","Royal Warden","Hexmark Destroyer","Skorpekh Lord","Lokhust Lord","Catacomb Command Barge"],"enhancements":["Quantum Abacus"],"units":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer","Overlord","Overlord with translocation shroud","Royal Warden","Hexmark Destroyer","Skorpekh Lord","Lokhust Lord","Catacomb Command Barge"]},
{"id":"11e-necron-conclave-atomic",requiresRangedWeapon:true,"title":"Atomic Disintegrators","window":"Shooting","timing":"during","summary":"Your turn: Augmentations may also grant Anti-Monster 5+ or Anti-Vehicle 5+.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"],"anyUnits":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer"],"enhancements":["Atomic Disintegrators"],"units":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer"]},
{"id":"11e-necron-conclave-gauntlet",requiresRangedWeapon:true,"title":"Gauntlet of Compression","window":"Shooting","timing":"during","summary":"Increase the bearer’s unit’s ranged weapon Range by 6″.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"],"anyUnits":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer","Overlord","Overlord with translocation shroud","Royal Warden","Hexmark Destroyer","Skorpekh Lord","Lokhust Lord","Catacomb Command Barge"],"enhancements":["Gauntlet of Compression"],"units":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer","Overlord","Overlord with translocation shroud","Royal Warden","Hexmark Destroyer","Skorpekh Lord","Lokhust Lord","Catacomb Command Barge"]},
{"id":"11e-necron-conclave-bolas","title":"Gravitic Bolas","window":"Shooting","timing":"during","summary":"Your turn: after bearer shoots, choose a non-Titanic enemy it hit; until your next turn that enemy suffers −2″ Move and −2 to charge rolls.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cryptek Conclave"],"anyUnits":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer"],"enhancements":["Gravitic Bolas"],"units":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer"]},
{"id":"11e-necron-cursed-ankh-move","title":"Destroyer Ankh","window":"Movement","timing":"during","summary":"Bearer gains Destroyer Cult; models in its unit add 2″ Move.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cursed Legion"],"anyUnits":["Catacomb Command Barge","Overlord","Overlord with translocation shroud"],"units":["Catacomb Command Barge","Overlord","Overlord with translocation shroud"],"enhancements":["Destroyer Ankh"]},
{"id":"11e-necron-cursed-ankh-fight","title":"Destroyer Ankh","window":"Fight","timing":"during","summary":"Bearer gains +2 melee weapon Attacks.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cursed Legion"],"anyUnits":["Catacomb Command Barge","Overlord","Overlord with translocation shroud"],"units":["Catacomb Command Barge","Overlord","Overlord with translocation shroud"],"enhancements":["Destroyer Ankh"]},
{"id":"11e-necron-cursed-murdermind-formation","title":"Murdermind","window":"Pre-battle","timing":"during","summary":"Bearer gains Destroyer Cult; may join Ophydian, Skorpekh, Lokhust or Lokhust Heavy Destroyers as Support. A permitted Cryptek Retinue or Canoptek Retinue can join this Cryptek-led Bodyguard.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cursed Legion"],"anyUnits":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer"],"units":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer"],"enhancements":["Murdermind"]},
{"id":"11e-necron-cursed-murdermind-move","title":"Murdermind","window":"Movement","timing":"during","summary":"Bearer alone gains 3″ Move.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cursed Legion"],"anyUnits":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer"],"units":["Chronomancer","Geomancer","Plasmancer","Psychomancer","Technomancer"],"enhancements":["Murdermind"]},
{"id":"11e-necron-cursed-mark-shooting",requiresRangedWeapon:true,"title":"Mark of the Nekrosor","window":"Shooting","timing":"during","summary":"Models in the bearer’s unit add 1 to their attack Hit rolls.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cursed Legion"],"anyUnits":["Hexmark Destroyer","Lokhust Lord","Skorpekh Lord"],"units":["Hexmark Destroyer","Lokhust Lord","Skorpekh Lord"],"enhancements":["Mark of the Nekrosor"]},
{"id":"11e-necron-cursed-mark-fight","title":"Mark of the Nekrosor","window":"Fight","timing":"during","summary":"Models in the bearer’s unit add 1 to their attack Hit rolls.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cursed Legion"],"anyUnits":["Hexmark Destroyer","Lokhust Lord","Skorpekh Lord"],"units":["Hexmark Destroyer","Lokhust Lord","Skorpekh Lord"],"enhancements":["Mark of the Nekrosor"]},
{"id":"11e-necron-cursed-circlet","title":"Cursed Circlet","window":"Shooting","timing":"during","summary":"Opponent’s turn: after an enemy shoots and kills a model in the bearer’s unit, it may surge up to D6″.","source":"https://wahapedia.ru/wh40k11ed/factions/necrons/","origin":"detachment","faction":"Necrons","detachments":["Cursed Legion"],"anyUnits":["Hexmark Destroyer","Lokhust Lord","Skorpekh Lord"],"units":["Hexmark Destroyer","Lokhust Lord","Skorpekh Lord"],"enhancements":["Cursed Circlet"]}
];

/** Fail closed: only verified 11e Scout grants are emitted, by actual roster instance. */
function upgradedScoutReminders(army:ArmySelection):GeneratedReminder[]{
 const instances=expandRoster(army);
 const source='https://wahapedia.ru/wh40k11ed/factions/necrons/';
 if(army.faction!=='Necrons'||!(army.detachments2026||[]).includes('Hand of the Dynasty'))return [];
 const aboardArk=instances.some(s=>s.unit==='Ghost Ark')?ghostArkPassengers(army).map(s=>s.id):[];
 return instances.filter(s=>s.unit==='Necron Warriors'&&(army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit])==='Enlivened Sentinels').map(s=>({
  id:'11e-scout-'+s.id,title:s.id+' · Scouts 5"',window:'Pre-battle' as const,timing:'during' as const,
  summary:'Enlivened Sentinels grants Scouts 5″ to this entire Warrior formation, including attached models. During Resolve Pre-battle Abilities, if wholly within your deployment zone, move up to 5″ and finish more than 8″ horizontally from enemies. If in Strategic Reserves, you may instead set up wholly within your deployment zone.'+
   (aboardArk.includes(s.id)?' If this unit starts embarked in a Dedicated Transport wholly in your deployment zone, the Ghost Ark can scout instead if every passenger has Scouts.':''),
  source,origin:'unit' as const,units:[s.id]
 }));
}

export function eligibleScoutReminders(army:ArmySelection):GeneratedReminder[]{
 return [...naturalScoutReminders(army),...upgradedScoutReminders(army)];
}

export function generate11thReminders(_army:ArmySelection):GeneratedReminder[]{
 const chaos=_army.faction==='Chaos Knights';
 const agents=_army.faction==='Imperial Agents';
 const daemons=_army.faction==='Chaos Daemons';
 const custodes=_army.faction==='Adeptus Custodes';
 const cult=_army.faction==='Genestealer Cults';
 const votann=_army.faction==='Leagues of Votann';
 const orks=_army.faction==='Orks';
 const worldEaters=_army.faction==='World Eaters';
 const guard=_army.faction==='Astra Militarum';
 const emperorsChildren=_army.faction==='Emperor’s Children';
 const formedArmy=_army.faction==='Necrons'||_army.faction==='Imperial Knights'||chaos||agents||daemons||custodes||orks||votann||cult||worldEaters||emperorsChildren||guard;
 const result=CORE_11TH.filter(rule=>!formedArmy||!['11e-movement-reserves','11e-core-overwatch'].includes(rule.id)).map(rule=>({...rule}));
 const selectedUnits=worldEaters?new Set(worldEatersMusterUnits(_army)):emperorsChildren?new Set(emperorsChildrenMusterUnits(_army)):guard?new Set(astraMusterUnits(_army)):undefined;
 const roster=expandRoster(_army).filter(s=>!selectedUnits||selectedUnits.has(s.unit));
 result.push(...alliedTitanAndKnightReminders(_army,roster));
 if(chaos||daemons)result.push(...daemonDatasheetReminders(_army,roster));
 if(daemons)result.push(...chaosKnightDatasheetReminders(_army,roster),...daemonArmyReminders(_army,roster),...shadowMarineReminders(_army,roster));
 if(orks)result.push(...orkDetachmentReminders(_army,roster),...orkDatasheetReminders(_army,roster));
 if(votann)result.push(...votannArmyReminders(_army,roster),...votannDatasheetReminders(_army,roster),...votannStratagemReminders(_army,roster),...votannTransportReminders(_army,roster));
 if(guard)result.push(...astraDatasheetReminders(_army,roster),...astraMilitarumDetachmentReminders(_army,roster),...astraOrderReminders(_army,roster),...astraEmbarkationReminders(_army,roster),...assignedAgentReminders(_army));
 if(cult)result.push(...gscEmbarkationReminders(_army,roster),...gscCultAmbushReminders(_army,roster),...gscDatasheetReminders(_army,roster),...gscDetachmentReminders(_army,roster),...gscAlliedReminders(_army,roster));
 if(emperorsChildren)result.push(...emperorsChildrenDetachmentReminders(_army,roster),...ecProfileReminders(_army,roster),...emperorsChildrenIntrinsicReminders(_army,roster),...emperorsChildrenArmyReminders(_army,roster),...emperorsChildrenTransportReminders(_army,roster),...chaosKnightDatasheetReminders(_army,roster));
 if(worldEaters)result.push(...worldEatersBlessingReminders(_army,roster),...worldEatersDetachmentReminders(_army,roster),...worldEatersIntrinsicReminders(_army,roster),...worldEaterProfileReminders(_army,roster),...worldEatersTransportReminders(_army,roster),...chaosKnightDatasheetReminders(_army,roster));
 if(custodes)result.push(...custodesDetachmentReminders(_army,roster),...custodesDatasheetReminders(_army,roster));
 if(formedArmy){
  const sheets=new Map(DATASHEETS_2026.filter(s=>s.faction===_army.faction).map(s=>[s.unit,s]));
  // Formation eligibility includes keywords printed for an individual model.
  // Model-specific effects still need the named bearer to survive.
  const unitKeywords=new Map([...sheets].map(([unit,sheet])=>[unit,
    [...new Set([...(sheet.keywords??[]),...Object.values(sheet.modelKeywords??{}).flat()])]]));
  const promoted=new Set(resolvedWarDogCharacterIds(_army,roster));
  const keywords=(unit:string,id?:string)=>{
   if(isWarhound(unit))return unitKeywords.get(unit)??[];
   if(guard)return [...astraMilitarumKeywords(_army,roster.find(s=>s.id===id)??{unit,id:id??''})];
   if(cult)return [...gscArmyKeywords(_army,{unit,id:id??''})];
   if(emperorsChildren)return [...emperorsChildrenKeywords(_army,roster.find(s=>s.id===id)??{unit,id:id??''})];
   if(worldEaters)return [...worldEatersKeywords(_army,roster.find(s=>s.id===id)??{unit,id:id??''})];
   if(orks)return [...orkKeywords(_army,roster.find(s=>s.id===id)??{unit,id:id??''})];
   if(votann)return [...votannKeywords(_army,roster.find(s=>s.id===id)??{unit,id:id??''})];
   if(custodes)return [...custodesKeywords(_army,{unit,id:id??''})];
   const tags=unitKeywords.get(unit)??[];
   return id&&promoted.has(id)?[...tags,'CHARACTER']:tags;
  };
  const modelRestrictions=(unit:string,keyword:string)=>sheets.get(unit)?.keywords?.includes(keyword)?[]:
    Object.entries(sheets.get(unit)?.modelKeywords??{}).filter(([,values])=>values.includes(keyword)).map(([name])=>name);
  const bodies=new Map(roster.map(s=>[s.id,knightJoinedBodyguard(_army,s)?.id]));
  const formations=guard?astraFormationGroups(_army,roster).map(g=>({id:g.root.id,body:g.root,members:g.members})):_army.faction==='Necrons'?necronFormationRoots(_army,roster):
    roster.filter(s=>!bodies.get(s.id)).map(body=>({id:body.id,body,members:[body,...roster.filter(s=>bodies.get(s.id)===body.id)]}));
  const hasGun=guard?(s:RosterInstance)=>isWarhound(s.unit)||(isFreeblade(s.unit)?knightHasRangedWeapon(s):astraAgentName(s.unit)?assignedAgentHasRanged(s,astraAgentName(s.unit)):astraMilitarumHasRangedWeapon(s)):emperorsChildren?(s:RosterInstance)=>isWarhound(s.unit)||(isDreadblade(s.unit)?chaosKnightHasRangedWeapon(s):emperorsChildrenHasRangedWeapon(s)):cult?gscHasRangedWeapon:worldEaters?(s:RosterInstance)=>isWarhound(s.unit)||(isWorldEatersDreadblade(s.unit)?chaosKnightHasRangedWeapon(s):worldEaterHasRangedWeapon(s)):votann?votannHasRangedWeapon:orks?(s:RosterInstance)=>orkHasRangedAttack(_army,s):_army.faction==='Necrons'?hasNecronRangedWeapon:chaos||daemons?(s:RosterInstance)=>isWarhound(s.unit)||chaosKnightHasRangedWeapon(s)||daemonHasRangedWeapon(s)||shadowLegionHasRangedWeapon(s):
    (s:(typeof roster)[number])=>isWarhound(s.unit)||knightHasRangedWeapon(s)||assignedAgentHasRanged(s)||(custodes&&custodesHasRangedWeapon(s));
  result.push(...formationDeploymentReminders(_army,formations,keywords),
   ...formationShootingReminders(formations,keywords,hasGun),...coreStratagemReminders(formations,keywords,hasGun,modelRestrictions));
  if(agents||custodes||guard||_army.faction==='Imperial Knights')result.push(...agentTransports(_army).cues);
  if(custodes)result.push(...assignedAgentReminders(_army));
  if(agents)result.push(...assignedAgentReminders(_army),...agentDetachmentReminders(_army,roster));
  else if(chaos)result.push(...chaosKnightDetachmentReminders(_army,roster),...chaosKnightDatasheetReminders(_army,roster));
  else if(_army.faction==='Imperial Knights')result.push(...knightDetachmentReminders(_army,roster),...imperialKnightDatasheetReminders(_army,roster),...assignedAgentReminders(_army));
  else if(_army.faction==='Necrons')result.push(...necronDeploymentReminders(_army,roster));
 }
 if(_army.faction==='Adeptus Custodes')result.push(...custodesFormationReminders(_army,roster));
 if(_army.faction==='Orks')result.push(...orkTransportReminders(_army,roster));
 if(_army.faction==='Leagues of Votann')result.push(...votannEnhancementReminders(_army,roster));
 const staticRows=matching11thRules(_army,DETACHMENT_RULES).filter(r=>r.id!=='11e-necron-hod-enlivened');
 if(_army.faction==='Necrons'){
  const formations=necronFormationRoots(_army,roster);
  result.push(...targetedNecronEnhancements(_army,formations));
  const targets=(rule:Rule11th)=>formations.filter(f=>(!rule.requiresRangedWeapon||f.members.some(hasNecronRangedWeapon))&&(!rule.anyUnits||f.members.some(s=>rule.anyUnits!.includes(s.unit)))&&(!rule.units||f.members.some(s=>rule.units!.includes(s.unit)))).map(f=>f.id);
  const formationScoped=new Set(['11e-necron-enh-nebuloscope','11e-necron-skyshroud-deepening','11e-necron-conclave-atomic','11e-necron-conclave-gauntlet','11e-necron-cursed-ankh-move','11e-necron-cursed-mark-shooting','11e-necron-cursed-mark-fight','11e-necron-cursed-circlet']);
  if(formations.length){
   const canRevive=formations.some(f=>f.members.length>1||(f.body.models??verifiedUnitSizes2026(_army,f.body.unit)?.[0]??1)>1);
   const instructions=['At the end of your Command phase, each surviving unit on the battlefield heals D3 wounds. Roll once for each unit, including each attached formation as a single unit. Embarked units and units in reserves skip this activation.'];
   if(canRevive)instructions.push('Resolve one wound at a time. Heal a wounded model first. Once all surviving models have full wounds, return a destroyed non-Character model with one wound. Set it in coherency with models that began the phase on the battlefield, engaging only enemies already engaged with its unit.');
   if(formations.some(f=>f.members.some(s=>s.attachedTo===f.id)))instructions.push('A surviving attached Leader or Support can restore its lost Bodyguards. A destroyed Character cannot return through this healing.');
   result.push({id:'11e-necron-reanimation',title:'Reanimation Protocols · D3 wounds',window:'Command',timing:'end',summary:instructions.join(' '),source:'https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf#page=29',origin:'army',units:formations.map(f=>f.id)});
  }
  for(const r of staticRows){
   const rule=DETACHMENT_RULES.find(x=>x.id===r.id||r.id.startsWith(x.id+'-')&&x.enhancements);
   if(!rule){result.push(r);continue;}
   if(rule.enhancements){
    // Bearer-specific reminders retain the bearer, and formation buffs also name the actual joined Bodyguard.
    const bearer=roster.find(s=>r.units?.includes(s.id));
    const root=bearer&&formations.find(f=>f.members.some(s=>s.id===bearer.id));
    if(rule.requiresRangedWeapon&&!root?.members.some(hasNecronRangedWeapon))continue;
    const scoped=formationScoped.has(rule.id)||rule.id.startsWith('11e-necron-conclave-abacus-');
    result.push(scoped&&root&&bearer&&root.id!==bearer.id?{...r,units:[bearer.id,root.id],title:r.title+' → '+root.id}:r);
   }else{
    const eligible=rule.id.startsWith('11e-necron-conclave-animus-')?roster.filter(s=>necronKeywords.CRYPTEK.has(s.unit)).map(s=>s.id):targets(rule);
    if(eligible.length)result.push({...r,units:eligible});
   }
  }
 }else result.push(...staticRows);
 if(_army.faction==='Necrons'){
  if(_army.detachments2026?.includes('Cryptek Conclave')){
   const roots=necronFormationRoots(_army,roster);
   const cryptekRoots=roots.filter(f=>f.members.some(m=>necronKeywords.CRYPTEK.has(m.unit)));
   const conditional=roots.filter(f=>!cryptekRoots.includes(f)&&f.members.some(m=>!necronKeywords.VEHICLE.has(m.unit)&&!necronKeywords.MONSTER.has(m.unit))).map(f=>f.id);
   const mixed=cryptekRoots.filter(f=>f.members.some(m=>!necronKeywords.CRYPTEK.has(m.unit)&&!necronKeywords.MONSTER.has(m.unit)&&!necronKeywords.VEHICLE.has(m.unit)&&hasNecronRangedWeapon(m))).map(f=>f.id);
   if(mixed.length)result.push({id:'11e-necron-conclave-synergy-attached',title:'Synergistic Empowerment · attached models',window:'Shooting',timing:'start',summary:'Your Shooting phase. A formation that already has a Cryptek can still contain other eligible models. If one such model within 12″ of a Cryptek gains the keyword, its own ranged weapons gain Assault for the phase. Other models gain Assault only if the whole unit chooses it as its Augmentation or has a separate grant.',source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',units:mixed});
   if(cryptekRoots.length&&conditional.length)result.push({id:'11e-necron-conclave-synergy-carryover',title:'Synergistic Empowerment · temporary Cryptek keyword',window:'Shooting',timing:'during',summary:'Only if a model in this formation received the Cryptek keyword through Synergistic Empowerment at phase start: that model’s ranged weapons gain Assault, the formation qualifies for an Augmentations weapon ability when selected to shoot, and it can qualify for Cryptek-only stratagems. The effect ends this phase.',source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',units:conditional});
  }
  // Recursive Reanimation triggers whenever protocols activate, not only Command.
  const recursive=result.filter(r=>r.id.startsWith('11e-necron-skyshroud-recursive'));
  for(const r of recursive)for(const window of ['Movement','Shooting','Charge','Fight'] as const)result.push({...r,id:r.id+'-'+window,window});
  const hand=result.find(r=>r.id==='11e-necron-hod-hypermotility');
  if(hand)result.push({...hand,id:hand.id+'-shooting',window:'Shooting',summary:'Warriors and Immortals formations have Assault on ranged attacks, including after advancing.'});
  const sky=result.find(r=>r.id==='11e-necron-skyshroud-deepstrike');
  if(sky)result.push({...sky,id:sky.id+'-prebattle',window:'Pre-battle',timing:'start',summary:'Tomb Blades gain Deep Strike; declare reserves if eligible during battle formation setup.'});
  const strafe=result.find(r=>r.id==='11e-necron-skyshroud-omnilocked');
  if(strafe)result.push({...strafe,id:strafe.id+'-shooting',title:'Omnilocked Strafing · carryover',window:'Shooting',summary:'If you used the stratagem when this formation Fell Back this turn, it remains eligible to shoot.'});
 }
 result.push(...canoptekHypercryptReminders(_army,roster),...remainingNecronReminders(_army,roster));
 if(_army.faction==='Necrons'&&_army.detachments2026?.includes('Cryptek Conclave')){
  for(const body of necronFormationRoots(_army,roster).filter(f=>['Necron Warriors','Immortals'].includes(f.body.unit)&&f.members.some(l=>l.id!==f.id&&necronKeywords.CRYPTEK.has(l.unit)&&necronKeywords.INFANTRY.has(l.unit))).map(f=>f.body)){
   for(const window of ['Shooting','Fight'] as const)result.push({id:'11e-necron-conclave-microscarab-'+body.id+'-'+window,title:body.id+' · Microscarab Swarm · 1CP',window,timing:'during',summary:(window==='Shooting'?'Opponent’s turn. ':'')+'Immediately after enemy targets are selected, this formation gains a '+(body.unit==='Immortals'?'4+':'5+')+' invulnerable save for the phase.',source:'https://wahapedia.ru/wh40k11ed/factions/necrons/',origin:'detachment',units:[body.id]});
  }
 }

 if(_army.faction==='Necrons'&&_army.detachments2026?.includes('Cursed Legion')){
  const source='https://wahapedia.ru/wh40k11ed/factions/necrons/';
  const formations=necronFormationRoots(_army,roster);
  const nonHeavy=formations.filter(f=>!f.members.some(s=>necronKeywords.MONSTER.has(s.unit)||necronKeywords.VEHICLE.has(s.unit))).map(f=>f.id);
  const destroyers=formations.filter(f=>f.members.some(s=>necronKeywords['DESTROYER CULT'].has(s.unit)||['Murdermind','Destroyer Ankh'].includes(_army.upgrades2026?.[s.id]??_army.upgrades2026?.[s.unit]??''))).map(f=>f.id);
  const emit=(id:string,title:string,window:ReminderWindow,summary:string,timing:'start'|'during'|'end'='during')=>result.push({id:'11e-necron-cursed-'+id,title,window,timing,summary,source,origin:'detachment',units:id.startsWith('cold-')?formations.filter(f=>f.members.some(s=>!necronKeywords.MONSTER.has(s.unit)&&!necronKeywords.TITANIC.has(s.unit))).map(f=>f.id):id.startsWith('image-')||id.startsWith('driven-')?destroyers:nonHeavy});
  for(const window of ['Shooting','Fight'] as const){
   const turn=window==='Shooting'?'Your Shooting phase. ':'Either Fight phase. ';
   if(destroyers.length){
    emit(window==='Fight'?'cold-fervour':'cold-fervour-shooting','Cursed Legion · Cold Fervour',window,'Destroyer Cult models gain +2 weapon Strength. The first time each turn a Destroyer Cult unit kills a unit or brings it Below Half-strength, after resolving its attacks, other friendly Necron models (not Destroyer Cult, Monster or Titanic) gain +2 weapon Strength for the rest of the turn.');
    emit('image-'+window.toLowerCase(),'Image of Death · 1CP',window,(window==='Shooting'?'Opponent’s Shooting phase. ':'Either Fight phase. ')+'Immediately after an enemy targets a Destroyer Cult unit, subtract 1 from Hit rolls of attacks targeting it for this phase.');
    if(nonHeavy.length)emit('mortis-'+window.toLowerCase(),'Mortis Protocols · 1CP',window,turn+'Immediately after the first Destroyer Cult kill this turn, activate Reanimation for one non-Monster, non-Vehicle Necron unit within 9″ of that Destroyer Cult unit.');
   }
   if(nonHeavy.length)emit('methodical-'+window.toLowerCase(),'Methodical Murder · 1CP',window,turn+'Select a non-Monster, non-Vehicle Necron unit not yet selected to shoot or fight. Its weapons gain Sustained Hits 1 this phase.');
  }
  if(destroyers.length)for(const window of ['Shooting','Charge'] as const)emit('driven-'+window.toLowerCase(),'Driven to Butchery · 1CP',window,'Your turn: select a Destroyer Cult unit; until turn end it may shoot and charge after Advancing. Once per turn.');
  if(nonHeavy.length){
   emit('spreading','Spreading Madness · 1CP','Charge','Your turn: select a non-Monster, non-Vehicle unit that has not declared a charge; add 2 to its charge roll if a target is engaged with a friendly unit, for this phase.');
   emit('unnatural','Unnatural Aggression · 2CP','Charge','At the end of the opponent’s Charge phase, select an eligible non-Monster, non-Vehicle unit within 6″ of enemies; declare and resolve a charge only against eligible enemies within 6″, without receiving a Charge bonus.','end');
  }
 }
 if(_army.faction==='Necrons'&&_army.detachments2026?.includes('Pantheon of Woe')){
  const source='https://wahapedia.ru/wh40k11ed/factions/necrons/';
  const monsters=roster.filter(s=>necronKeywords.MONSTER.has(s.unit));
  const others=necronFormationRoots(_army,roster).filter(f=>!f.members.some(s=>necronKeywords.MONSTER.has(s.unit))).map(f=>f.body);
  const emit=(id:string,title:string,window:ReminderWindow,summary:string,timing:'start'|'during'|'end'='during',units?:string[])=>result.push({id:'11e-necron-pantheon-'+id,title,window,timing,summary,source,origin:'detachment',units:units??(id.startsWith('mass-')||id.startsWith('entropy-')?others.map(s=>s.id):necronFormationRoots(_army,roster).map(f=>f.id))});
  if(monsters.length){
   for(const window of ['Command','Movement','Shooting','Charge','Fight'] as const){
    emit('cosmic-'+window.toLowerCase(),'Cosmic Distortion · Distortion Fields',window,'At phase start, each Monster may suffer 3 mortal wounds to extend its 6″ aura to 9″ for this phase. Enemies within the aura unravel; attacks targeting them improve AP by 1.','start',monsters.map(s=>s.id));
    emit('cascade-'+window.toLowerCase(),'Disharmonisation Cascade · 1CP',window,'Either turn: immediately after a friendly Monster model is destroyed, before Deadly Demise, use this on that model; this phase its Deadly Demise triggers on 3+ rather than 6.','during',monsters.map(s=>s.id));
   }
   emit('erosion','Molecular Erosion · 1CP','Command','Either Command phase: select a Monster and a visible unravelling enemy. Enemy takes Battle-shock at −1; if failed, suffer D3+1 mortal wounds. Once per battle round.','during',monsters.map(s=>s.id));
   emit('melding','Phase Melding · 1CP','Movement','Opponent’s turn: when an unravelling enemy selects Fall Back, target an engaged friendly Necron unit. All enemy models take Desperate Escape tests; subtract 1 if battle-shocked.');
   if(others.length)for(const window of ['Shooting','Fight'] as const)emit('mass-'+window.toLowerCase(),'Mass Transmogrification · 1CP',window,(window==='Shooting'?'Your Shooting phase. ':'Either Fight phase. ')+'After a friendly Monster destroys an enemy that was unravelling at phase start, activate Reanimation for a non-Monster Necron unit within 6″ of that Monster. Once per turn.');
   for(const m of monsters){
    const bound=(id:string,title:string,window:ReminderWindow,summary:string,timing:'start'|'during'|'end'='during')=>emit(id+'-'+m.id,m.id+' · '+title,window,summary,timing,[m.id]);
    if(m.unit==='C’tan Shard of the Deceiver')for(const window of ['Command','Movement','Shooting','Charge','Fight'] as const)bound('singularity-'+window.toLowerCase(),'Singularity Matrix',window,'Once per turn, when the opponent targets their unit within 12″ of the living bearer with a Stratagem, you may increase that use’s CP cost by 1.');
    if(m.unit==='C’tan Shard of the Nightbringer')bound('goad','Quantum Goad','Charge','May charge after Advancing.');
    if(m.unit==='C’tan Shard of the Void Dragon')bound('damper','Animus Damper','Shooting','Once per turn at the start of opponent’s Shooting phase, select a visible enemy Vehicle. It takes a Leadership test; its attacks suffer −1 Hit this phase, and −1 Wound if it fails.','start');
    if(m.unit==='Transcendent C’tan')bound('tether','Reletavistic Tether','Movement','Your turn: when making an ingress or advance move with Transdimensional Displacement, may end more than 6″ horizontally from enemies instead of more than 8″; if within 8″, cannot charge this turn.');
   }
  }
  if(others.length)for(const window of ['Shooting','Fight'] as const)emit('entropy-'+window.toLowerCase(),'Entrophasic Aura Targeting · 1CP',window,(window==='Shooting'?'Your Shooting phase. ':'Either Fight phase. ')+'Choose a non-Monster unit not yet selected to shoot or fight. Re-roll Hit rolls of 1 this phase, and Wound rolls of 1 against unravelling targets.');
  if(roster.length)emit('chrono','Chronodistortion · 1CP','Fight','Immediately after enemy targeting, select the targeted Necron unit. This phase, destroyed models that have not fought roll a D6 (+1 if attacker unravelling); on 4+ fight after attacker resolves its attacks, then remove.');
 }
 result.push(...eligibleScoutReminders(_army));
 result.push(...necronDatasheetReminders2026(_army));
 const warhounds=new Set(roster.filter(s=>isWarhound(s.unit)).map(s=>s.id));
 return result.map(rule=>applyWarhoundStratagemCost(_army.faction==='Necrons'||rule.id.startsWith('11e-core-')?applyStratagemWindow(rule):rule,warhounds));
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
