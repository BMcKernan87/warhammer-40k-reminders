import {alliedRosterNames} from './titan-support-data';
import {ASSIGNED_AGENT_UNITS} from './assigned-agent-data';
import {DAEMON_UNITS} from './chaos-daemons-data';
import {ORK_UNITS} from './ork-data';
import {CUSTODES_UNITS} from './adeptus-custodes-data';
import {CHAOS_KNIGHT_UNITS} from './chaos-knights-data';
import {IMPERIAL_KNIGHT_UNITS} from './imperial-knights-data';
import {reconcileRetinues} from './necron-retinues';
import {reconcileWarlord} from './necron-muster-legality';
import {currentEquipmentName} from './necron-wargear';
import {BATTLE_SIZES_2026,detachmentBudget,type BattleSize2026} from './edition-2026';
import {expandRoster,appendRosterInstances,retiredSquadNumbers,validateRosterInstances,type RosterInstance} from './roster-instances';
import {validateUpgrades2026} from './upgrades-2026';
import {validateEnhancements} from './enhancements';
import {validateAttachments} from './attachments';
import {EQUIPMENT_OPTIONS} from './equipment';
export type Faction='Necrons'|'Space Marines'|'Orks'|'Tyranids'|'Adepta Sororitas'|'Adeptus Custodes'|'Adeptus Mechanicus'|'Aeldari'|'Astra Militarum'|'Black Templars'|'Blood Angels'|'Chaos Daemons'|'Chaos Knights'|'Chaos Space Marines'|'Dark Angels'|'Death Guard'|'Drukhari'|'Emperor’s Children'|'Genestealer Cults'|'Grey Knights'|'Imperial Agents'|'Imperial Knights'|'Leagues of Votann'|'Space Wolves'|'T’au Empire'|'Thousand Sons'|'World Eaters';
export const CATALOG:Record<Faction,{detachments:readonly string[];units:readonly string[];enhancements:readonly string[]}> = {
 'Necrons':{
  detachments:['Awakened Dynasty','Canoptek Court','Hypercrypt Legion','Annihilation Legion','Obeisance Phalanx'],
  units:["C’tan Shard of the Nightbringer","C’tan Shard of the Void Dragon","Imotekh the Stormlord","Orikan the Diviner","Technomancer","Plasmancer","Chronomancer","Overlord","Skorpekh Lord","Hexmark Destroyer","Necron Warriors","Immortals","Canoptek Wraiths","Canoptek Scarab Swarms","Lokhust Heavy Destroyers","Skorpekh Destroyers","Lychguard","Deathmarks","Doomsday Ark","Monolith","Canoptek Doomstalker","Canoptek Reanimator","Tomb Blades","Canoptek Tomb Crawlers","Canoptek Macrocytes","Geomancer","C’tan Shard of the Deceiver","Transcendent C’tan","Nekrosor Ammentar","Seraptek Heavy Construct","Illuminor Szeras","The Silent King","Ghost Ark","Doom Scythe","Cryptothralls","Flayed Ones","Annihilation Barge","Canoptek Spyders","Ophydian Destroyers","Lokhust Destroyers","Tesseract Vault","Catacomb Command Barge","Convergence Of Dominion","Lokhust Lord","Night Scythe","Obelisk","Overlord with translocation shroud","Psychomancer","Royal Warden","Triarch Praetorians","Triarch Stalker","Trazyn the Infinite"],
  enhancements:[]
 },
 'Orks':{detachments:['War Horde','Da Big Hunt','Bully Boyz','Green Tide','Dread Mob','Kult of Speed'],units:ORK_UNITS,enhancements:[]},
 'Tyranids':{detachments:['Invasion Fleet','Synaptic Nexus','Unending Swarm','Assimilation Swarm','Vanguard Onslaught','Crusher Stampede'],units:['Hive Tyrant','The Swarmlord','Winged Hive Tyrant','Neurotyrant','Tervigon','Broodlord','Old One Eye','Deathleaper','Termagants','Hormagaunts','Gargoyles','Genestealers','Tyranid Warriors','Von Ryan’s Leapers','Lictor','Neurolictor','Zoanthropes','Venomthropes','Raveners','Ripper Swarms','Biovore','Pyrovore','Carnifexes','Exocrine','Haruspex','Maleceptor','Tyrannofex','Norn Emissary','Norn Assimilator','Screamer-Killer','Psychophage','Barbgaunts','Neurogaunts'],enhancements:[]},
 'Adepta Sororitas':{detachments:['Select detachment (unverified)'],units:["Battle Sisters Squad","Canoness","Morvenn Vahl","Paragon Warsuits"],enhancements:[]},
 'Adeptus Custodes':{detachments:['Select detachment (unverified)'],units:CUSTODES_UNITS,enhancements:[]},
 'Adeptus Mechanicus':{detachments:['Select detachment (unverified)'],units:["Skitarii Rangers","Skitarii Vanguard","Tech-Priest Dominus","Kataphron Breachers"],enhancements:[]},
 'Aeldari':{detachments:['Select detachment (unverified)'],units:["Farseer","Guardian Defenders","Dire Avengers","Wraithguard"],enhancements:[]},
 'Astra Militarum':{detachments:['Select detachment (unverified)'],units:["Cadian Shock Troops","Leman Russ Battle Tank","Rogal Dorn Battle Tank","Commissar"],enhancements:[]},
 'Black Templars':{detachments:['Select detachment (unverified)'],units:["High Marshal Helbrecht","Primaris Crusader Squad","Sword Brethren"],enhancements:[]},
 'Blood Angels':{detachments:['Select detachment (unverified)'],units:["Commander Dante","Death Company Marines","Sanguinary Guard"],enhancements:[]},
 'Chaos Daemons':{detachments:['Select detachment (unverified)'],units:DAEMON_UNITS,enhancements:[]},
 'Chaos Knights':{detachments:['Select detachment (unverified)'],units:CHAOS_KNIGHT_UNITS,enhancements:[]},
 'Chaos Space Marines':{detachments:['Select detachment (unverified)'],units:["Legionaries","Chosen","Chaos Terminator Squad","Abaddon the Despoiler"],enhancements:[]},
 'Dark Angels':{detachments:['Select detachment (unverified)'],units:["Azrael","Deathwing Knights","Inner Circle Companions"],enhancements:[]},
 'Death Guard':{detachments:['Select detachment (unverified)'],units:["Plague Marines","Deathshroud Terminators","Mortarion"],enhancements:[]},
 'Drukhari':{detachments:['Select detachment (unverified)'],units:["Kabalite Warriors","Wyches","Incubi","Archon"],enhancements:[]},
 'Emperor’s Children':{detachments:['Select detachment (unverified)'],units:["Noise Marines","Fulgrim","Lucius the Eternal"],enhancements:[]},
 'Genestealer Cults':{detachments:['Select detachment (unverified)'],units:["Neophyte Hybrids","Acolyte Hybrids","Aberrants","Patriarch"],enhancements:[]},
 'Grey Knights':{detachments:['Select detachment (unverified)'],units:["Strike Squad","Brotherhood Terminator Squad","Nemesis Dreadknight"],enhancements:[]},
 'Imperial Agents':{detachments:['Select detachment (unverified)'],units:ASSIGNED_AGENT_UNITS,enhancements:[]},
 'Imperial Knights':{detachments:['Select detachment (unverified)'],units:IMPERIAL_KNIGHT_UNITS,enhancements:[]},
 'Leagues of Votann':{detachments:['Select detachment (unverified)'],units:["Hearthkyn Warriors","Hernkyn Pioneers","Einhyr Hearthguard"],enhancements:[]},
 'Space Wolves':{detachments:['Select detachment (unverified)'],units:["Thunderwolf Cavalry","Blood Claws","Logan Grimnar"],enhancements:[]},
 'T’au Empire':{detachments:['Select detachment (unverified)'],units:["Breacher Team","Strike Team","Crisis Battlesuits","Riptide Battlesuit"],enhancements:[]},
 'Thousand Sons':{detachments:['Select detachment (unverified)'],units:["Rubric Marines","Scarab Occult Terminators","Magnus the Red"],enhancements:[]},
 'World Eaters':{detachments:['Select detachment (unverified)'],units:["Khorne Berzerkers","Eightbound","Angron"],enhancements:[]},
 'Space Marines':{
  detachments:['Gladius Task Force','Firestorm Assault Force','Ironstorm Spearhead','Vanguard Spearhead','Anvil Siege Force','Stormlance Task Force','1st Company Task Force'],
  units:['Marneus Calgar','Roboute Guilliman','Captain','Lieutenant','Judiciar','Apothecary Biologis','Chaplain','Intercessor Squad','Assault Intercessor Squad','Heavy Intercessor Squad','Bladeguard Veteran Squad','Aggressor Squad','Eradicator Squad','Infernus Squad','Terminator Squad','Sternguard Veteran Squad','Inceptor Squad','Hellblaster Squad','Ballistus Dreadnought','Redemptor Dreadnought','Brutalis Dreadnought','Land Raider','Repulsor Executioner'],
  enhancements:[]
 }
};
for(const faction of ['Adeptus Custodes','Imperial Agents','Imperial Knights','Chaos Daemons','Chaos Knights'] as const){
 CATALOG[faction].units=[...new Set([...CATALOG[faction].units,...alliedRosterNames(faction)])];
}

export interface ArmySelection {faction:Faction;detachment:string;units:Record<string,number>;equipment?:Record<string,string>;attachments?:Record<string,string>;enhancements?:Record<string,string>;instances?:RosterInstance[];retiredSquadNumbers?:Record<string,number>;battleSize2026?:BattleSize2026;detachments2026?:string[];upgrades2026?:Record<string,string>;warlordId?:string;chaosWarDogCharacterIds?:string[]}
export function newSelection(faction:Faction='Necrons'):ArmySelection{return {faction,detachment:CATALOG[faction].detachments[0],units:{}}}
export function addSelectionUnit(s:ArmySelection,name:string,count=1):ArmySelection{
 if(!CATALOG[s.faction].units.includes(name)||!Number.isInteger(count)||count<1)throw Error('Invalid unit selection');
 const instances=s.instances?appendRosterInstances(s,name,count):undefined;
 return reconcileWarlord({...s,units:{...s.units,[name]:(s.units[name]||0)+count},...(instances?{instances}:{})});
}
export function removeSelectionUnit(s:ArmySelection,name:string):ArmySelection{
 const units={...s.units};delete units[name];const equipment={...s.equipment};delete equipment[name];const attachments=Object.fromEntries(Object.entries(s.attachments||{}).filter(([leader,bodyguard])=>leader!==name&&bodyguard!==name));const enhancements={...s.enhancements};delete enhancements[name];const removedIds=new Set(expandRoster(s).filter(x=>x.unit===name).map(x=>x.id));const instances=s.instances?.filter(x=>x.unit!==name).map(x=>x.attachedTo&&removedIds.has(x.attachedTo)?{...x,attachedTo:undefined}:x);const upgrades2026=Object.fromEntries(Object.entries(s.upgrades2026||{}).filter(([key])=>key!==name&&!removedIds.has(key)));return reconcileWarlord(reconcileRetinues({...s,units,equipment,attachments,enhancements,upgrades2026,...(instances?{instances,retiredSquadNumbers:retiredSquadNumbers(s,s.instances!.filter(x=>x.unit===name))}:{})}));
}
export function validateSelection(x:unknown):x is ArmySelection{
 if(!x||typeof x!=='object')return false;
 const s=x as Partial<ArmySelection>;
 const dogIds=s.chaosWarDogCharacterIds;
 if(dogIds!==undefined&&(s.faction!=='Chaos Knights'||!Array.isArray(dogIds)||dogIds.length>3||new Set(dogIds).size!==dogIds.length||dogIds.some(id=>typeof id!=='string')))return false;
 if(s.warlordId!==undefined&&typeof s.warlordId!=='string')return false;
 if(s.retiredSquadNumbers!==undefined&&(!s.retiredSquadNumbers||typeof s.retiredSquadNumbers!=='object'||Array.isArray(s.retiredSquadNumbers)||Object.values(s.retiredSquadNumbers).some(n=>!Number.isSafeInteger(n)||n<0||n>1000000000)))return false;
 return (typeof s.faction==='string'&&Object.prototype.hasOwnProperty.call(CATALOG,s.faction))&&CATALOG[s.faction].detachments.includes(s.detachment||'')&&!!s.units&&typeof s.units==='object'&&!Array.isArray(s.units)&&Object.entries(s.units).every(([name,count])=>(CATALOG[s.faction!].units.includes(name)||(s.faction==='Imperial Agents'&&name==='Arbites'))&&Number.isInteger(count)&&count>0&&count<=30)&&(!s.equipment||(typeof s.equipment==='object'&&!Array.isArray(s.equipment)&&Object.entries(s.equipment).every(([name,choice])=>typeof choice==='string'&&!!s.units?.[name]&&!!EQUIPMENT_OPTIONS[s.faction!]?.find(option=>option.unit===name&&option.choices.includes(currentEquipmentName(name,choice))))))&&(!s.battleSize2026||Object.prototype.hasOwnProperty.call(BATTLE_SIZES_2026,s.battleSize2026))&&(!s.detachments2026||(Array.isArray(s.detachments2026)&&s.detachments2026.every(d=>typeof d==='string')&&detachmentBudget(s.faction!,s.detachments2026,s.battleSize2026||'Strike Force').valid))&&validateUpgrades2026(s as ArmySelection)&&validateAttachments(s as ArmySelection)&&validateEnhancements(s as ArmySelection)&&validateRosterInstances(s as ArmySelection);
}
