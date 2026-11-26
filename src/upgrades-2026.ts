import {currentNecronDetachment} from './necron-detachment-names';
import {eligibleChapterUpgrades} from './space-marine-chapters-upgrades';
import {isSpaceMarineFaction} from './space-marines-factions';
import {eligibleSpaceMarineUpgrades} from './space-marines-upgrades';
import {eligibleAeldariUpgrades,aeldariUpgradeBaseName} from './aeldari-upgrades';
import {eligibleDrukhariUpgrades} from './drukhari-upgrades';
import {eligibleCsmUpgrades} from './csm-detachment-data';
import {eligibleTyranidUpgrades} from './tyranid-detachment-data';
import {eligibleTauUpgrades} from './tau-detachment-data';
import {eligibleMechanicusUpgrades} from './mechanicus-detachment-data';
import {eligibleSororitasUpgrades} from './sororitas-detachment-data';
import {eligibleGreyKnightsUpgrades} from './grey-knights-detachment-data';
import {eligibleDeathGuardUpgrades} from './death-guard-detachment-data';
import {eligibleThousandSonsUpgrades} from './thousand-sons-detachment-data';
import {eligibleEmperorsChildrenUpgrades} from './emperors-children-detachment-data';
import {eligibleAstraMilitarumUpgrades} from './astra-militarum-detachment-data';
import {eligibleGscUpgrades} from './gsc-detachment-data';
import {eligibleWorldEatersUpgrades} from './world-eaters-detachment-data';
import {eligibleAgentUpgrades} from './imperial-agent-detachments';
import {eligibleDaemonUpgrades} from './chaos-daemon-detachments';
import {eligibleOrkUpgrades} from './ork-detachments';
import {eligibleVotannUpgrades} from './votann-detachment-data';
import {eligibleCustodesUpgrades} from './custodes-detachments';
import {eligibleChaosKnightUpgrades} from './chaos-knight-detachments';
import {eligibleKnightUpgrades} from './imperial-knight-detachments';
import type {ArmySelection} from './catalog';
import {BATTLE_SIZES_2026} from './edition-2026';
import {NECRON_ENHANCEMENT_POINTS,REPEATABLE_NECRON_UPGRADES,PANTHEON_BINDINGS} from './necron-enhancement-points';
import {NECRON_CHARACTER_BEARERS,DESTROYER_BEARERS,OVERLORD_BEARERS,REMAINING_NECRON_SOURCE} from './necron-remaining-detachments';
import {COURT_BEARERS,HYPERCRYPT_BEARERS,COURT_HYPERCRYPT_SOURCE} from './necron-canoptek-hypercrypt';
import {expandRoster,reconcileInstanceAttachments} from './roster-instances';
export interface Upgrade2026 {name:string;faction:ArmySelection['faction'];detachment:string;unit:string;source:string;points?:number;repeatable?:boolean;countsTowardLimit?:boolean}
const NECRON_SOURCE='https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf';
export const UPGRADES_2026:readonly Upgrade2026[]=[
 {name:'Enlivened Sentinels',faction:'Necrons',detachment:'Hand of the Dynasty',unit:'Necron Warriors',source:NECRON_SOURCE},
 {name:'Tools of Dominion',faction:'Necrons',detachment:'Hand of the Dynasty',unit:'Immortals',source:NECRON_SOURCE},
 {name:'Recursive Reanimation',faction:'Necrons',detachment:'Skyshroud Spearhead',unit:'Tomb Blades',source:NECRON_SOURCE},
 {name:'Deepening Madness',faction:'Necrons',detachment:'Skyshroud Spearhead',unit:'Lokhust Destroyers',source:NECRON_SOURCE},
 {name:'Deepening Madness',faction:'Necrons',detachment:'Skyshroud Spearhead',unit:'Lokhust Heavy Destroyers',source:NECRON_SOURCE},
 {name:'Deepening Madness',faction:'Necrons',detachment:'Skyshroud Spearhead',unit:'Lokhust Lord',source:NECRON_SOURCE},
 {name:'Mortality Shroud',faction:'Necrons',detachment:"The Phaeron's Armoury",unit:'Obelisk',source:NECRON_SOURCE},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Technomancer","source":NECRON_SOURCE},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Plasmancer","source":NECRON_SOURCE},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Chronomancer","source":NECRON_SOURCE},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Overlord","source":NECRON_SOURCE},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Overlord with translocation shroud","source":NECRON_SOURCE},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Skorpekh Lord","source":NECRON_SOURCE},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Hexmark Destroyer","source":NECRON_SOURCE},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Catacomb Command Barge","source":NECRON_SOURCE},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Royal Warden","source":NECRON_SOURCE},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Psychomancer","source":NECRON_SOURCE},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Geomancer","source":NECRON_SOURCE},
{"name":"Prelocational Optimiser","faction":"Necrons","detachment":"The Phaeron's Armoury","unit":"Lokhust Lord","source":NECRON_SOURCE},
{"name":"Dread Majesty","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord","source":NECRON_SOURCE},
{"name":"Dread Majesty","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Catacomb Command Barge","source":NECRON_SOURCE},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Technomancer","source":NECRON_SOURCE},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Plasmancer","source":NECRON_SOURCE},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Chronomancer","source":NECRON_SOURCE},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord","source":NECRON_SOURCE},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord with translocation shroud","source":NECRON_SOURCE},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Skorpekh Lord","source":NECRON_SOURCE},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Hexmark Destroyer","source":NECRON_SOURCE},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Catacomb Command Barge","source":NECRON_SOURCE},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Royal Warden","source":NECRON_SOURCE},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Psychomancer","source":NECRON_SOURCE},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Geomancer","source":NECRON_SOURCE},
{"name":"Miniaturised Nebuloscope","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Lokhust Lord","source":NECRON_SOURCE},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Technomancer","source":NECRON_SOURCE},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Plasmancer","source":NECRON_SOURCE},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Chronomancer","source":NECRON_SOURCE},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord","source":NECRON_SOURCE},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord with translocation shroud","source":NECRON_SOURCE},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Skorpekh Lord","source":NECRON_SOURCE},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Hexmark Destroyer","source":NECRON_SOURCE},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Catacomb Command Barge","source":NECRON_SOURCE},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Royal Warden","source":NECRON_SOURCE},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Psychomancer","source":NECRON_SOURCE},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Geomancer","source":NECRON_SOURCE},
{"name":"Demanding Leader","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Lokhust Lord","source":NECRON_SOURCE},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Technomancer","source":NECRON_SOURCE},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Plasmancer","source":NECRON_SOURCE},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Chronomancer","source":NECRON_SOURCE},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord","source":NECRON_SOURCE},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Overlord with translocation shroud","source":NECRON_SOURCE},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Skorpekh Lord","source":NECRON_SOURCE},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Hexmark Destroyer","source":NECRON_SOURCE},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Catacomb Command Barge","source":NECRON_SOURCE},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Royal Warden","source":NECRON_SOURCE},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Psychomancer","source":NECRON_SOURCE},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Geomancer","source":NECRON_SOURCE},
{"name":"Chrono-impedance Fields","faction":"Necrons","detachment":"Starshatter Arsenal","unit":"Lokhust Lord","source":NECRON_SOURCE},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Chronomancer","source":NECRON_SOURCE},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Geomancer","source":NECRON_SOURCE},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Plasmancer","source":NECRON_SOURCE},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Psychomancer","source":NECRON_SOURCE},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Technomancer","source":NECRON_SOURCE},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Overlord","source":NECRON_SOURCE},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Overlord with translocation shroud","source":NECRON_SOURCE},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Royal Warden","source":NECRON_SOURCE},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Hexmark Destroyer","source":NECRON_SOURCE},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Skorpekh Lord","source":NECRON_SOURCE},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Lokhust Lord","source":NECRON_SOURCE},
{"name":"Quantum Abacus","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Catacomb Command Barge","source":NECRON_SOURCE},
{"name":"Atomic Disintegrators","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Chronomancer","source":NECRON_SOURCE},
{"name":"Atomic Disintegrators","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Geomancer","source":NECRON_SOURCE},
{"name":"Atomic Disintegrators","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Plasmancer","source":NECRON_SOURCE},
{"name":"Atomic Disintegrators","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Psychomancer","source":NECRON_SOURCE},
{"name":"Atomic Disintegrators","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Technomancer","source":NECRON_SOURCE},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Chronomancer","source":NECRON_SOURCE},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Geomancer","source":NECRON_SOURCE},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Plasmancer","source":NECRON_SOURCE},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Psychomancer","source":NECRON_SOURCE},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Technomancer","source":NECRON_SOURCE},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Overlord","source":NECRON_SOURCE},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Overlord with translocation shroud","source":NECRON_SOURCE},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Royal Warden","source":NECRON_SOURCE},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Hexmark Destroyer","source":NECRON_SOURCE},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Skorpekh Lord","source":NECRON_SOURCE},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Lokhust Lord","source":NECRON_SOURCE},
{"name":"Gauntlet of Compression","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Catacomb Command Barge","source":NECRON_SOURCE},
{"name":"Gravitic Bolas","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Chronomancer","source":NECRON_SOURCE},
{"name":"Gravitic Bolas","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Geomancer","source":NECRON_SOURCE},
{"name":"Gravitic Bolas","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Plasmancer","source":NECRON_SOURCE},
{"name":"Gravitic Bolas","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Psychomancer","source":NECRON_SOURCE},
{"name":"Gravitic Bolas","faction":"Necrons","detachment":"Cryptek Conclave","unit":"Technomancer","source":NECRON_SOURCE},
{"name":"Destroyer Ankh","faction":"Necrons","detachment":"Cursed Legion","unit":"Catacomb Command Barge","source":NECRON_SOURCE},
{"name":"Destroyer Ankh","faction":"Necrons","detachment":"Cursed Legion","unit":"Overlord","source":NECRON_SOURCE},
{"name":"Destroyer Ankh","faction":"Necrons","detachment":"Cursed Legion","unit":"Overlord with translocation shroud","source":NECRON_SOURCE},
{"name":"Murdermind","faction":"Necrons","detachment":"Cursed Legion","unit":"Chronomancer","source":NECRON_SOURCE},
{"name":"Murdermind","faction":"Necrons","detachment":"Cursed Legion","unit":"Geomancer","source":NECRON_SOURCE},
{"name":"Murdermind","faction":"Necrons","detachment":"Cursed Legion","unit":"Plasmancer","source":NECRON_SOURCE},
{"name":"Murdermind","faction":"Necrons","detachment":"Cursed Legion","unit":"Psychomancer","source":NECRON_SOURCE},
{"name":"Murdermind","faction":"Necrons","detachment":"Cursed Legion","unit":"Technomancer","source":NECRON_SOURCE},
{"name":"Mark of the Nekrosor","faction":"Necrons","detachment":"Cursed Legion","unit":"Hexmark Destroyer","source":NECRON_SOURCE},
{"name":"Mark of the Nekrosor","faction":"Necrons","detachment":"Cursed Legion","unit":"Lokhust Lord","source":NECRON_SOURCE},
{"name":"Mark of the Nekrosor","faction":"Necrons","detachment":"Cursed Legion","unit":"Skorpekh Lord","source":NECRON_SOURCE},
{"name":"Cursed Circlet","faction":"Necrons","detachment":"Cursed Legion","unit":"Hexmark Destroyer","source":NECRON_SOURCE},
{"name":"Cursed Circlet","faction":"Necrons","detachment":"Cursed Legion","unit":"Lokhust Lord","source":NECRON_SOURCE},
{"name":"Cursed Circlet","faction":"Necrons","detachment":"Cursed Legion","unit":"Skorpekh Lord","source":NECRON_SOURCE},

 ...COURT_BEARERS.flatMap(unit=>['Dimensional Sanctum','Hyperphasic Fulcrum','Autodivinator','Metalodermal Tesla Weave'].map(name=>({name,faction:'Necrons' as const,detachment:'Canoptek Court',unit,source:COURT_HYPERCRYPT_SOURCE}))),
 ...HYPERCRYPT_BEARERS.flatMap(unit=>['Dimensional Overseer','Arisen Tyrant','Hyperspatial Transfer Node','Osteoclave Fulcrum'].map(name=>({name,faction:'Necrons' as const,detachment:'Hypercrypt Legion',unit,source:COURT_HYPERCRYPT_SOURCE}))),
 ...NECRON_CHARACTER_BEARERS.flatMap(unit=>['Veil of Darkness','Nether-realm Casket','Phasal Subjugator','Enaegic Dermal Bond'].map(name=>({name,faction:'Necrons' as const,detachment:'Awakened Dynasty',unit,source:REMAINING_NECRON_SOURCE}))),
 ...NECRON_CHARACTER_BEARERS.flatMap(unit=>['Eternal Madness','Ingrained Superiority'].map(name=>({name,faction:'Necrons' as const,detachment:'Annihilation Legion',unit,source:REMAINING_NECRON_SOURCE}))),
 ...DESTROYER_BEARERS.flatMap(unit=>['Soulless Reaper','Eldritch Nightmare'].map(name=>({name,faction:'Necrons' as const,detachment:'Annihilation Legion',unit,source:REMAINING_NECRON_SOURCE}))),
 ...OVERLORD_BEARERS.flatMap(unit=>['Honourable Combatant','Unflinching Will','Warrior Noble','Eternal Conqueror'].map(name=>({name,faction:'Necrons' as const,detachment:'Obeisance Phalanx',unit,source:REMAINING_NECRON_SOURCE}))),
 {name:'Dread Majesty',faction:'Necrons',detachment:'Starshatter Arsenal',unit:'Overlord with translocation shroud',source:REMAINING_NECRON_SOURCE}
];
export function eligibleUpgrades2026(army:ArmySelection,unit:string,id?:string):Upgrade2026[]{
 if(isSpaceMarineFaction(army.faction))return [...eligibleSpaceMarineUpgrades(army,unit,id),...eligibleChapterUpgrades(army,unit,id)].filter((u,i,all)=>all.findIndex(v=>v.name===u.name)===i).map(u=>({...u,unit,faction:army.faction,source:'https://wahapedia.ru/wh40k11ed/factions/space-marines/'}));
 if(army.faction==='Aeldari')return eligibleAeldariUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Aeldari',source:'https://wahapedia.ru/wh40k11ed/factions/aeldari/'}));
 if(army.faction==='Drukhari')return eligibleDrukhariUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Drukhari',source:'https://wahapedia.ru/wh40k11ed/factions/drukhari/'}));
 if(army.faction==='Chaos Space Marines')return eligibleCsmUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Chaos Space Marines',source:'https://wahapedia.ru/wh40k11ed/factions/chaos-space-marines/'}));
 if(army.faction==='Tyranids')return eligibleTyranidUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Tyranids',source:'https://wahapedia.ru/wh40k11ed/factions/tyranids/'}));
 if(army.faction==='T’au Empire')return eligibleTauUpgrades(army,unit,id).map(u=>({...u,unit,faction:'T’au Empire',source:'https://wahapedia.ru/wh40k11ed/factions/t-au-empire/'}));
 if(army.faction==='Adeptus Mechanicus')return eligibleMechanicusUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Adeptus Mechanicus',source:'https://wahapedia.ru/wh40k11ed/factions/adeptus-mechanicus/'}));
 if(army.faction==='Adepta Sororitas')return eligibleSororitasUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Adepta Sororitas',source:'https://wahapedia.ru/wh40k11ed/factions/adepta-sororitas/'}));
 if(army.faction==='Grey Knights')return eligibleGreyKnightsUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Grey Knights',source:'https://wahapedia.ru/wh40k11ed/factions/grey-knights/'}));
 if(army.faction==='Death Guard')return eligibleDeathGuardUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Death Guard',source:'https://wahapedia.ru/wh40k11ed/factions/death-guard/'}));
 if(army.faction==='Thousand Sons')return eligibleThousandSonsUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Thousand Sons',source:'https://wahapedia.ru/wh40k11ed/factions/thousand-sons/'}));
 if(army.faction==='Emperor’s Children')return eligibleEmperorsChildrenUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Emperor’s Children',source:'https://wahapedia.ru/wh40k11ed/factions/emperor-s-children/'}));
 if(army.faction==='Astra Militarum')return eligibleAstraMilitarumUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Astra Militarum',source:'https://wahapedia.ru/wh40k11ed/factions/astra-militarum/'}));
 if(army.faction==='Imperial Agents')return eligibleAgentUpgrades(army,unit).map(u=>({...u,unit,faction:'Imperial Agents',source:'https://wahapedia.ru/wh40k11ed/factions/imperial-agents/'}));
 if(army.faction==='Chaos Daemons')return eligibleDaemonUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Chaos Daemons',source:'https://wahapedia.ru/wh40k11ed/factions/chaos-daemons/'}));
 if(army.faction==='Orks')return eligibleOrkUpgrades(army,unit).map(u=>({...u,unit,faction:'Orks',source:'https://wahapedia.ru/wh40k11ed/factions/orks/'}));
 if(army.faction==='Genestealer Cults')return eligibleGscUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Genestealer Cults',source:'https://wahapedia.ru/wh40k11ed/factions/genestealer-cults/'}));
 if(army.faction==='World Eaters')return eligibleWorldEatersUpgrades(army,unit,id).map(u=>({...u,unit,faction:'World Eaters',source:'https://wahapedia.ru/wh40k11ed/factions/world-eaters/'}));
 if(army.faction==='Leagues of Votann')return eligibleVotannUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Leagues of Votann',source:'https://wahapedia.ru/wh40k11ed/factions/leagues-of-votann/'}));
 if(army.faction==='Adeptus Custodes')return eligibleCustodesUpgrades(army,unit).map(u=>({...u,unit,faction:'Adeptus Custodes',source:'https://wahapedia.ru/wh40k11ed/factions/adeptus-custodes/'}));
 if(army.faction==='Chaos Knights')return eligibleChaosKnightUpgrades(army,unit,id).map(u=>({...u,unit,faction:'Chaos Knights',source:'https://wahapedia.ru/wh40k11ed/factions/chaos-knights/'}));
 if(army.faction==='Imperial Knights')return eligibleKnightUpgrades(army,unit).map(u=>({...u,unit,faction:'Imperial Knights',source:'https://wahapedia.ru/wh40k11ed/factions/imperial-knights/'}));
 if(army.faction==='Necrons'&&army.detachments2026?.includes('Pantheon of Woe')&&PANTHEON_BINDINGS[unit])return [];
 const selected=army.faction==='Necrons'?(army.detachments2026??[]).map(currentNecronDetachment):army.detachments2026??[];
 return UPGRADES_2026.filter(u=>u.faction===army.faction&&u.unit===unit&&selected.includes(u.detachment));
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
 const counts=new Map<string,number>(),formations=new Set<string>(),limited=new Set<string>();
 for(const s of roster){
  const name=upgradeName2026(army,s);
  const binding=army.faction==='Necrons'&&army.detachments2026?.includes('Pantheon of Woe')&&PANTHEON_BINDINGS[s.unit];
  if(!name)continue;
  if(binding)return 'A C’tan with a mandatory Necrodermal Binding cannot take another enhancement';
  if(s.unit==='Transcendent C’tan')return 'Transcendent C’tan cannot take ordinary enhancements';
  const option=eligibleUpgrades2026(army,s.unit,s.id).find(x=>x.name===name);
  if(!option||(army.faction==='Necrons'&&!Object.prototype.hasOwnProperty.call(NECRON_ENHANCEMENT_POINTS,name)))return 'Enhancement unavailable for this unit or detachment';
  const formation=s.attachedTo??s.id;
  if(formations.has(formation))return 'Only one enhancement or Upgrade is allowed per attached formation';
  formations.add(formation);
  const uniqueName=army.faction==='Aeldari'?aeldariUpgradeBaseName(name):name;
  const count=(counts.get(uniqueName)??0)+1;
  if(count>((option.repeatable??REPEATABLE_NECRON_UPGRADES.has(name))?3:1))return name+' exceeds its allowed number of copies';
  counts.set(uniqueName,count);
  if(option.countsTowardLimit!==false)limited.add(uniqueName);
 }
 if(limited.size>(BATTLE_SIZES_2026[army.battleSize2026??'Strike Force']?.enhancements??0))return 'Battle-size enhancement limit exceeded';
 return null;
}
export function selectUpgrade2026(army:ArmySelection,key:string,name:string|null):ArmySelection{
 const instance=expandRoster(army).find(x=>x.id===key);
 if(!instance&&!(army.units[key]>0))throw Error('Select a unit before assigning an upgrade');
 // Do not erase a chosen Khorne allegiance to make a Psyker enhancement eligible.
 if(name&&army.faction==='Chaos Space Marines'&&!eligibleUpgrades2026(army,instance?.unit??key,instance?.id).some(u=>u.name===name))throw Error('Enhancement unavailable for this unit or detachment');
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
 return eligibleUpgrades2026(army,instance.unit,instance.id).filter(u=>{
  if(upgradeName2026(army,instance)===u.name)return true;
  try{selectUpgrade2026(army,instance.id,u.name);return true;}catch{return false;}
 });
}
export function validateUpgrades2026(army:ArmySelection):boolean{
 return upgradeError2026(army)===null;
}
