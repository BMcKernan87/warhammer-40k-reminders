export type Faction='Necrons'|'Space Marines'|'Orks'|'Tyranids'|'Adepta Sororitas'|'Adeptus Custodes'|'Adeptus Mechanicus'|'Aeldari'|'Astra Militarum'|'Black Templars'|'Blood Angels'|'Chaos Daemons'|'Chaos Knights'|'Chaos Space Marines'|'Dark Angels'|'Death Guard'|'Drukhari'|'Emperor’s Children'|'Genestealer Cults'|'Grey Knights'|'Imperial Agents'|'Imperial Knights'|'Leagues of Votann'|'Space Wolves'|'T’au Empire'|'Thousand Sons'|'World Eaters';
export const CATALOG:Record<Faction,{detachments:readonly string[];units:readonly string[];enhancements:readonly string[]}> = {
 'Necrons':{
  detachments:['Awakened Dynasty','Canoptek Court','Hypercrypt Legion','Annihilation Legion','Obeisance Phalanx'],
  units:['C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon','Imotekh the Stormlord','Orikan the Diviner','Technomancer','Plasmancer','Chronomancer','Overlord','Skorpekh Lord','Hexmark Destroyer','Necron Warriors','Immortals','Canoptek Wraiths','Canoptek Scarab Swarms','Lokhust Heavy Destroyers','Skorpekh Destroyers','Lychguard','Deathmarks','Doomsday Ark','Monolith','Canoptek Doomstalker'],
  enhancements:[]
 },
 'Orks':{detachments:['War Horde','Da Big Hunt','Bully Boyz','Green Tide','Dread Mob','Kult of Speed'],units:['Warboss','Warboss in Mega Armour','Big Mek','Big Mek in Mega Armour','Painboy','Weirdboy','Ghazghkull Thraka','Boyz','Beast Snagga Boyz','Nobz','Meganobz','Gretchin','Kommandos','Stormboyz','Squighog Boyz','Deffkoptas','Deff Dread','Killa Kans','Gorkanaut','Morkanaut','Shokkjump Dragsta','Megatrakk Scrapjet','Battlewagon','Trukk','Lootas','Flash Gitz'],enhancements:[]},
 'Tyranids':{detachments:['Invasion Fleet','Synaptic Nexus','Unending Swarm','Assimilation Swarm','Vanguard Onslaught','Crusher Stampede'],units:['Hive Tyrant','The Swarmlord','Winged Hive Tyrant','Neurotyrant','Tervigon','Broodlord','Old One Eye','Deathleaper','Termagants','Hormagaunts','Gargoyles','Genestealers','Tyranid Warriors','Von Ryan’s Leapers','Lictor','Neurolictor','Zoanthropes','Venomthropes','Raveners','Ripper Swarms','Biovore','Pyrovore','Carnifexes','Exocrine','Haruspex','Maleceptor','Tyrannofex','Norn Emissary','Norn Assimilator','Screamer-Killer','Psychophage','Barbgaunts','Neurogaunts'],enhancements:[]},
 'Adepta Sororitas':{detachments:['Select detachment (unverified)'],units:["Battle Sisters Squad","Canoness","Morvenn Vahl","Paragon Warsuits"],enhancements:[]},
 'Adeptus Custodes':{detachments:['Select detachment (unverified)'],units:["Custodian Guard","Shield-Captain","Allarus Custodians","Vertus Praetors"],enhancements:[]},
 'Adeptus Mechanicus':{detachments:['Select detachment (unverified)'],units:["Skitarii Rangers","Skitarii Vanguard","Tech-Priest Dominus","Kataphron Breachers"],enhancements:[]},
 'Aeldari':{detachments:['Select detachment (unverified)'],units:["Farseer","Guardian Defenders","Dire Avengers","Wraithguard"],enhancements:[]},
 'Astra Militarum':{detachments:['Select detachment (unverified)'],units:["Cadian Shock Troops","Leman Russ Battle Tank","Rogal Dorn Battle Tank","Commissar"],enhancements:[]},
 'Black Templars':{detachments:['Select detachment (unverified)'],units:["High Marshal Helbrecht","Primaris Crusader Squad","Sword Brethren"],enhancements:[]},
 'Blood Angels':{detachments:['Select detachment (unverified)'],units:["Commander Dante","Death Company Marines","Sanguinary Guard"],enhancements:[]},
 'Chaos Daemons':{detachments:['Select detachment (unverified)'],units:["Bloodletters","Plaguebearers","Daemonettes","Pink Horrors"],enhancements:[]},
 'Chaos Knights':{detachments:['Select detachment (unverified)'],units:["Knight Rampager","Knight Despoiler","War Dog Brigand"],enhancements:[]},
 'Chaos Space Marines':{detachments:['Select detachment (unverified)'],units:["Legionaries","Chosen","Chaos Terminator Squad","Abaddon the Despoiler"],enhancements:[]},
 'Dark Angels':{detachments:['Select detachment (unverified)'],units:["Azrael","Deathwing Knights","Inner Circle Companions"],enhancements:[]},
 'Death Guard':{detachments:['Select detachment (unverified)'],units:["Plague Marines","Deathshroud Terminators","Mortarion"],enhancements:[]},
 'Drukhari':{detachments:['Select detachment (unverified)'],units:["Kabalite Warriors","Wyches","Incubi","Archon"],enhancements:[]},
 'Emperor’s Children':{detachments:['Select detachment (unverified)'],units:["Noise Marines","Fulgrim","Lucius the Eternal"],enhancements:[]},
 'Genestealer Cults':{detachments:['Select detachment (unverified)'],units:["Neophyte Hybrids","Acolyte Hybrids","Aberrants","Patriarch"],enhancements:[]},
 'Grey Knights':{detachments:['Select detachment (unverified)'],units:["Strike Squad","Brotherhood Terminator Squad","Nemesis Dreadknight"],enhancements:[]},
 'Imperial Agents':{detachments:['Select detachment (unverified)'],units:["Inquisitor","Imperial Navy Breachers","Arbites"],enhancements:[]},
 'Imperial Knights':{detachments:['Select detachment (unverified)'],units:["Knight Paladin","Knight Crusader","Armiger Warglaive"],enhancements:[]},
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
export interface ArmySelection {faction:Faction;detachment:string;units:Record<string,number>}
export function newSelection(faction:Faction='Necrons'):ArmySelection{return {faction,detachment:CATALOG[faction].detachments[0],units:{}}}
export function addSelectionUnit(s:ArmySelection,name:string,count=1):ArmySelection{
 if(!CATALOG[s.faction].units.includes(name)||!Number.isInteger(count)||count<1)throw Error('Invalid unit selection');
 return {...s,units:{...s.units,[name]:(s.units[name]||0)+count}};
}
export function removeSelectionUnit(s:ArmySelection,name:string):ArmySelection{
 const units={...s.units};delete units[name];return {...s,units};
}
export function validateSelection(x:unknown):x is ArmySelection{
 if(!x||typeof x!=='object')return false;
 const s=x as Partial<ArmySelection>;
 return (typeof s.faction==='string'&&Object.prototype.hasOwnProperty.call(CATALOG,s.faction))&&CATALOG[s.faction].detachments.includes(s.detachment||'')&&!!s.units&&typeof s.units==='object'&&!Array.isArray(s.units)&&Object.entries(s.units).every(([name,count])=>CATALOG[s.faction!].units.includes(name)&&Number.isInteger(count)&&count>0&&count<=30);
}
