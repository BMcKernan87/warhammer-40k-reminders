import type {ArmySelection} from './catalog';
import {BATTLE_SIZES_2026} from './edition-2026';
import {NECRON_ENHANCEMENT_POINTS,REPEATABLE_NECRON_UPGRADES,PANTHEON_BINDINGS} from './necron-enhancement-points';
import {NECRON_CHARACTER_BEARERS,DESTROYER_BEARERS,OVERLORD_BEARERS,REMAINING_NECRON_SOURCE} from './necron-remaining-detachments';
import {COURT_BEARERS,HYPERCRYPT_BEARERS,COURT_HYPERCRYPT_SOURCE} from './necron-canoptek-hypercrypt';
import {expandRoster,reconcileInstanceAttachments} from './roster-instances';
export interface Upgrade2026 {name:string;faction:'Necrons';detachment:string;unit:string;source:string}
const NECRON_SOURCE='https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf';
export const UPGRADES_2026:readonly Upgrade2026[]=[
 {name:'Enlivened Sentinels',faction:'Necrons',detachment:'Hand of the Dynasty',unit:'Necron Warriors',source:NECRON_SOURCE},
 {name:'Tools of Dominion',faction:'Necrons',detachment:'Hand of the Dynasty',unit:'Immortals',source:NECRON_SOURCE},
 {name:'Recursive Reanimation',faction:'Necrons',detachment:'Skysword Spearhead',unit:'Tomb Blades',source:NECRON_SOURCE},
 {name:'Deepening Madness',faction:'Necrons',detachment:'Skysword Spearhead',unit:'Lokhust Destroyers',source:NECRON_SOURCE},
 {name:'Deepening Madness',faction:'Necrons',detachment:'Skysword Spearhead',unit:'Lokhust Heavy Destroyers',source:NECRON_SOURCE},
 {name:'Deepening Madness',faction:'Necrons',detachment:'Skysword Spearhead',unit:'Lokhust Lord',source:NECRON_SOURCE},
 {name:'Mortality Shroud',faction:'Necrons',detachment:"The Phaeron's Armoury",unit:'Obelisk',source:NECRON_SOURCE},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Technomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Plasmancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Chronomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Overlord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Overlord with translocation shroud","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Skorpekh Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Hexmark Destroyer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Catacomb Command Barge","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Royal Warden","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Psychomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Geomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Lokhust Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Dread Majesty","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Dread Majesty","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Catacomb Command Barge","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Technomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Plasmancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Chronomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord with translocation shroud","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Skorpekh Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Hexmark Destroyer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Catacomb Command Barge","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Royal Warden","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Psychomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Geomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Lokhust Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Technomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Plasmancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Chronomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord with translocation shroud","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Skorpekh Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Hexmark Destroyer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Catacomb Command Barge","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Royal Warden","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Psychomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Geomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Lokhust Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Technomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Plasmancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Chronomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord with translocation shroud","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Skorpekh Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Hexmark Destroyer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Catacomb Command Barge","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Royal Warden","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Psychomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Geomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Lokhust Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Chronomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Geomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Plasmancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Psychomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Technomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Overlord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Overlord with translocation shroud","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Royal Warden","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Hexmark Destroyer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Skorpekh Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Lokhust Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Catacomb Command Barge","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Atomic Disintegrators","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Chronomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Atomic Disintegrators","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Geomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Atomic Disintegrators","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Plasmancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Atomic Disintegrators","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Psychomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Atomic Disintegrators","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Technomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Chronomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Geomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Plasmancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Psychomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Technomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Overlord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Overlord with translocation shroud","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Royal Warden","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Hexmark Destroyer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Skorpekh Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Lokhust Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Catacomb Command Barge","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gravitic Bolas","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Chronomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gravitic Bolas","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Geomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gravitic Bolas","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Plasmancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gravitic Bolas","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Psychomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Gravitic Bolas","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Technomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Destroyer Ankh","faction":"Necrons","detachment":"Cursed Legion","unit":"Catacomb Command Barge","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Destroyer Ankh","faction":"Necrons","detachment":"Cursed Legion","unit":"Overlord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Destroyer Ankh","faction":"Necrons","detachment":"Cursed Legion","unit":"Overlord with translocation shroud","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Murdermind","faction":"Necrons","detachment":"Cursed Legion","unit":"Chronomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Murdermind","faction":"Necrons","detachment":"Cursed Legion","unit":"Geomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Murdermind","faction":"Necrons","detachment":"Cursed Legion","unit":"Plasmancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Murdermind","faction":"Necrons","detachment":"Cursed Legion","unit":"Psychomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Murdermind","faction":"Necrons","detachment":"Cursed Legion","unit":"Technomancer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Mark of the Nekrosor","faction":"Necrons","detachment":"Cursed Legion","unit":"Hexmark Destroyer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Mark of the Nekrosor","faction":"Necrons","detachment":"Cursed Legion","unit":"Lokhust Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Mark of the Nekrosor","faction":"Necrons","detachment":"Cursed Legion","unit":"Skorpekh Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Cursed Circlet","faction":"Necrons","detachment":"Cursed Legion","unit":"Hexmark Destroyer","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Cursed Circlet","faction":"Necrons","detachment":"Cursed Legion","unit":"Lokhust Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},
{"name":"Cursed Circlet","faction":"Necrons","detachment":"Cursed Legion","unit":"Skorpekh Lord","source":"https://assets.warhammer-community.com/eng_09-06_warhammer40000_faction_pack_necrons-qodfthk7tt-bzeqy07okc.pdf"},

 ...COURT_BEARERS.flatMap(unit=>['Dimensional Sanctum','Hyperphasic Fulcrum','Autodivinator','Metalodermal Tesla Weave'].map(name=>({name,faction:'Necrons' as const,detachment:'Canoptek Court',unit,source:COURT_HYPERCRYPT_SOURCE}))),
 ...HYPERCRYPT_BEARERS.flatMap(unit=>['Dimensional Overseer','Arisen Tyrant','Hyperspatial Transfer Node','Osteoclave Fulcrum'].map(name=>({name,faction:'Necrons' as const,detachment:'Hypercrypt Legion',unit,source:COURT_HYPERCRYPT_SOURCE}))),
 ...NECRON_CHARACTER_BEARERS.flatMap(unit=>['Veil of Darkness','Nether-realm Casket','Phasal Subjugator','Enaegic Dermal Bond'].map(name=>({name,faction:'Necrons' as const,detachment:'Awakened Dynasty',unit,source:REMAINING_NECRON_SOURCE}))),
 ...NECRON_CHARACTER_BEARERS.flatMap(unit=>['Eternal Madness','Ingrained Superiority'].map(name=>({name,faction:'Necrons' as const,detachment:'Annihilation Legion',unit,source:REMAINING_NECRON_SOURCE}))),
 ...DESTROYER_BEARERS.flatMap(unit=>['Soulless Reaper','Eldritch Nightmare'].map(name=>({name,faction:'Necrons' as const,detachment:'Annihilation Legion',unit,source:REMAINING_NECRON_SOURCE}))),
 ...OVERLORD_BEARERS.flatMap(unit=>['Honourable Combatant','Unflinching Will','Warrior Noble','Eternal Conqueror'].map(name=>({name,faction:'Necrons' as const,detachment:'Obeisance Phalanx',unit,source:REMAINING_NECRON_SOURCE})))
];
export function eligibleUpgrades2026(army:ArmySelection,unit:string):Upgrade2026[]{
 return UPGRADES_2026.filter(u=>u.faction===army.faction&&u.unit===unit&&(army.detachments2026||[]).includes(u.detachment));
}
export function upgradeName2026(army:ArmySelection,instance:{id:string;unit:string}):string|undefined{
 return army.upgrades2026?.[instance.id]??army.upgrades2026?.[instance.unit];
}
export function upgradeError2026(army:ArmySelection):string|null{
 const values=army.upgrades2026;
 if(values!==undefined&&(!values||typeof values!=='object'||Array.isArray(values)))return 'Invalid enhancement assignments';
 if(values===undefined||Object.keys(values).length===0)return null;
 if(army.instances!==undefined&&(!Array.isArray(army.instances)||army.instances.some(s=>!s||typeof s.id!=='string'||typeof s.unit!=='string')))return 'Invalid enhancement roster';
 if(!army.units||typeof army.units!=='object')return 'Invalid enhancement roster';
 const roster=expandRoster(army);
 if(Object.entries(values||{}).some(([key,name])=>typeof name!=='string'||!roster.some(s=>s.id===key||s.unit===key)))return 'Enhancement assigned to an absent unit';
 const counts=new Map<string,number>(),formations=new Set<string>();
 for(const s of roster){
  const name=upgradeName2026(army,s);
  const binding=army.faction==='Necrons'&&army.detachments2026?.includes('Pantheon of Woe')&&PANTHEON_BINDINGS[s.unit];
  if(!name)continue;
  if(binding)return 'A C’tan with a mandatory Necrodermal Binding cannot take another enhancement';
  if(!eligibleUpgrades2026(army,s.unit).some(x=>x.name===name)||!Object.prototype.hasOwnProperty.call(NECRON_ENHANCEMENT_POINTS,name))return 'Enhancement unavailable for this unit or detachment';
  const formation=s.attachedTo??s.id;
  if(formations.has(formation))return 'Only one enhancement or Upgrade is allowed per attached formation';
  formations.add(formation);
  const count=(counts.get(name)??0)+1;
  if(count>(REPEATABLE_NECRON_UPGRADES.has(name)?3:1))return name+' exceeds its allowed number of copies';
  counts.set(name,count);
 }
 if(counts.size>(BATTLE_SIZES_2026[army.battleSize2026??'Strike Force']?.enhancements??0))return 'Battle-size enhancement limit exceeded';
 return null;
}
export function selectUpgrade2026(army:ArmySelection,key:string,name:string|null):ArmySelection{
 const instance=expandRoster(army).find(x=>x.id===key);
 if(!instance&&!(army.units[key]>0))throw Error('Select a unit before assigning an upgrade');
 const upgrades2026={...army.upgrades2026};
 // Preserve old single-unit name keys, but never leave a fallback that affects other instances.
 if(instance&&Object.prototype.hasOwnProperty.call(upgrades2026,instance.unit)){
  const previous=upgrades2026[instance.unit];
  delete upgrades2026[instance.unit];
  for(const s of expandRoster(army).filter(s=>s.unit===instance.unit))if(!(s.id in upgrades2026))upgrades2026[s.id]=previous;
 }
 delete upgrades2026[key];
 if(name)upgrades2026[key]=name;
 const next=reconcileInstanceAttachments({...army,upgrades2026});
 const error=upgradeError2026(next);
 if(error)throw Error(error);
 return next;
}
export function availableUpgrades2026(army:ArmySelection,instance:{id:string;unit:string}):Upgrade2026[]{
 return eligibleUpgrades2026(army,instance.unit).filter(u=>{
  if(upgradeName2026(army,instance)===u.name)return true;
  try{selectUpgrade2026(army,instance.id,u.name);return true;}catch{return false;}
 });
}
export function validateUpgrades2026(army:ArmySelection):boolean{
 return upgradeError2026(army)===null;
}
