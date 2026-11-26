// Complete acceptance forces use the October 14 MFM v1.6 and the current
// November 23 chapter cards. Every row includes its paid weapons and upgrade.
// https://mfm.warhammer-community.com/en/blood-angels
// https://mfm.warhammer-community.com/en/dark-angels
// https://mfm.warhammer-community.com/en/black-templars
// https://mfm.warhammer-community.com/en/space-wolves
import type {SpaceMarineAcceptanceArmy,SpaceMarineAcceptanceGear} from './space-marines-armies';

export interface ChapterAcceptanceArmy extends SpaceMarineAcceptanceArmy {
 faction:'Blood Angels'|'Dark Angels'|'Black Templars'|'Space Wolves';
}
const gear=(unit:string,owner:string,items:string[],copy=1):SpaceMarineAcceptanceGear=>({unit,owner,items,copy});
const choice=(unit:string,owner:string,value:string,copy=1):SpaceMarineAcceptanceGear=>({unit,owner,choice:value,copy});

export const BA_SPEARTIP_ARMY:ChapterAcceptanceArmy={
 name:'Blood Angels Golden Host and Death Company',faction:'Blood Angels',chapter:'BLOOD ANGELS',battleSize:'Incursion',detachments:['Encarmine Speartip','Wrath of the Doomed'],points:1000,dp:2,warlord:'Captain With Jump Pack#1',
 units:[
  {unit:'Captain With Jump Pack',points:105},{unit:'Death Company Captain with Jump Pack',points:95},{unit:'Sanguinary Guard',points:135},
  {unit:'Death Company Marines With Jump Packs',points:130},{unit:'Death Company Dreadnought',points:165},{unit:'Chaplain',points:60},
  {unit:'Death Company Marines',points:90},{unit:'Baal Predator',points:135},{unit:'Intercessor Squad',points:85},
 ],
 attachments:[['Captain With Jump Pack#1','Sanguinary Guard#1'],['Death Company Captain with Jump Pack#1','Death Company Marines With Jump Packs#1'],['Chaplain#1','Death Company Marines#1']],
 upgrades:[['Captain With Jump Pack#1','Shadow of Abomination'],['Death Company Captain with Jump Pack#1','Instinctive Interception']],
 gear:[
  gear('Death Company Captain with Jump Pack','Chainsword',['Relic shield','Thunder hammer']),
  gear('Sanguinary Guard','Sanguinary Guard 1 ·',['Encarmine Weapon','Inferno pistol']),
  gear('Death Company Marines With Jump Packs','Death Company Marines with Jump Packs 1 · Chainsword',['Eviscerator']),
  gear('Death Company Marines With Jump Packs','Death Company Marines with Jump Packs 2 · Chainsword',['Power fist']),
  gear('Death Company Marines With Jump Packs','Death Company Marines with Jump Packs 3 · Heavy bolt pistol',['Inferno pistol']),
  gear('Death Company Marines With Jump Packs','Death Company Marines with Jump Packs 4 · Heavy bolt pistol',['Plasma pistol']),
  gear('Death Company Marines With Jump Packs','Death Company Marines with Jump Packs 5 · Heavy bolt pistol',['Hand flamer']),
  gear('Death Company Dreadnought','Blood fist',['Blood talons']),gear('Death Company Dreadnought','Twin heavy bolter',['Twin multi-melta']),
  gear('Death Company Marines','Death Company Marines 1 · Chainsword',['Bolt Rifle','Combat blade','Grenade Launcher']),
  gear('Death Company Marines','Death Company Marines 2 · Chainsword',['Thunder hammer']),
  gear('Death Company Marines','Death Company Marines 3 · Heavy bolt pistol',['Inferno pistol']),
  gear('Baal Predator','Additional weapons',['Heavy flamer','Heavy flamer']),gear('Baal Predator','Twin assault',['Baal flamestorm cannon']),
  gear('Baal Predator','Hunter-killer missile',['Hunter-killer missile']),gear('Baal Predator','Storm Bolter',['Storm Bolter']),
 ],
};

export const BA_INHERITORS_ARMY:ChapterAcceptanceArmy={
 name:'Blood Angels Angelic Inheritors',faction:'Blood Angels',chapter:'BLOOD ANGELS',battleSize:'Strike Force',detachments:['Angelic Inheritors'],points:2000,dp:3,warlord:'Commander Dante#1',
 units:[
  {unit:'Commander Dante',points:140},{unit:'Sanguinary Guard',points:135},{unit:'Sanguinary Guard',points:135},{unit:'Sanguinary Guard',points:150},
  {unit:'Blood Angels Captain',points:115},{unit:'Sanguinary Priest',points:60},{unit:'Assault Intercessor Squad',points:85},
  {unit:'Chief Librarian Mephiston',points:175},{unit:'Astorath',points:90},{unit:'Death Company Marines With Jump Packs',models:10,points:260},
  {unit:'Death Company Captain',points:95},{unit:'Death Company Marines',models:10,points:170},{unit:'The Sanguinor',points:120},
  {unit:'Impulsor',points:70},{unit:'Baal Predator',points:135},{unit:'Scout Squad',points:65},
 ],
 attachments:[['Commander Dante#1','Sanguinary Guard#1'],['Blood Angels Captain#1','Assault Intercessor Squad#1'],['Sanguinary Priest#1','Assault Intercessor Squad#1'],['Astorath#1','Death Company Marines With Jump Packs#1'],['Death Company Captain#1','Death Company Marines#1']],
 upgrades:[['Blood Angels Captain#1','Prescient Flash'],['Death Company Captain#1','Unto Death']],
 gear:[
  gear('Blood Angels Captain','Heavy Bolt Pistol',['Inferno pistol']),gear('Blood Angels Captain','Master‐crafted chainsword',['Power fist']),
  gear('Assault Intercessor Squad','Assault Intercessor Sergeant · Heavy Bolt Pistol',['Plasma pistol']),gear('Assault Intercessor Squad','Assault Intercessor Sergeant · Chainsword',['Thunder hammer']),
  gear('Sanguinary Guard','Sanguinary Guard 1 ·',['Encarmine Weapon','Inferno pistol']),
  gear('Sanguinary Guard','Sanguinary Guard 1 ·',['Encarmine Weapon','Inferno pistol'],3),
  ...[1,2].map(n=>gear('Death Company Marines With Jump Packs','Death Company Marines with Jump Packs '+n+' · Chainsword',['Eviscerator'])),
  ...[3,4].map(n=>gear('Death Company Marines With Jump Packs','Death Company Marines with Jump Packs '+n+' · Chainsword',['Power fist'])),
  ...[5,6].map(n=>gear('Death Company Marines With Jump Packs','Death Company Marines with Jump Packs '+n+' · Heavy bolt pistol',['Inferno pistol'])),
  ...[7,8].map(n=>gear('Death Company Marines With Jump Packs','Death Company Marines with Jump Packs '+n+' · Heavy bolt pistol',['Plasma pistol'])),
  gear('Death Company Captain','Heavy Bolt Pistol',['Inferno pistol']),gear('Death Company Captain','Master‐crafted chainsword',['Relic weapon']),
  gear('Death Company Marines','Death Company Marines 1 · Chainsword',['Bolt Rifle','Combat blade','Grenade Launcher']),
  gear('Death Company Marines','Death Company Marines 2 · Chainsword',['Eviscerator']),gear('Death Company Marines','Death Company Marines 3 · Chainsword',['Power fist']),
  gear('Death Company Marines','Death Company Marines 4 · Heavy bolt pistol',['Plasma pistol']),
  gear('Impulsor','Bellicatus',['Shield Dome']),gear('Baal Predator','Additional weapons',['Heavy bolter','Heavy bolter']),gear('Baal Predator','Twin assault',['Baal flamestorm cannon']),
  gear('Scout Squad','Scout 1 ·',['Missile launcher']),gear('Scout Squad','Scout 2 ·',['Sniper Rifle']),
 ],
};

export const DA_ROCK_ARMY:ChapterAcceptanceArmy={
 name:'Dark Angels Wrath of the Rock',faction:'Dark Angels',chapter:'DARK ANGELS',battleSize:'Incursion',detachments:['Wrath of the Rock'],points:1000,dp:2,warlord:'Belial#1',
 units:[
  {unit:'Belial',points:100},{unit:'Deathwing Knights',points:255},{unit:'Captain In Terminator Armour',points:105},{unit:'Deathwing Terminator Squad',points:200},
  {unit:'Ravenwing Command Squad',points:130},{unit:'Ravenwing Black Knights',points:85},{unit:'Intercessor Squad',points:85},{unit:'Ancient',points:40},
 ],
 attachments:[['Belial#1','Deathwing Knights#1'],['Captain In Terminator Armour#1','Deathwing Terminator Squad#1'],['Ravenwing Command Squad#1','Ravenwing Black Knights#1'],['Ancient#1','Intercessor Squad#1']],
 upgrades:[['Captain In Terminator Armour#1','Deathwing Assault'],['Ravenwing Command Squad#1','Lord of the Ravenwing']],
 gear:[
  choice('Deathwing Knights','Deathwing Knight weapons','Power weapon'),gear('Deathwing Knights','Knight Master ·',['Relic weapon']),choice('Deathwing Knights','Watcher in the Dark','Watcher in the Dark'),
  gear('Deathwing Terminator Squad','Deathwing Terminators 1 · Storm Bolter',['Cyclone missile launcher','Storm Bolter']),
  gear('Deathwing Terminator Squad','Deathwing Terminators 2 · Power fist',['Chainfist']),gear('Deathwing Terminator Squad','Deathwing Sergeant ·',['Power weapon']),
  choice('Deathwing Terminator Squad','Watcher in the Dark','Watcher in the Dark'),
  gear('Ravenwing Command Squad','Ravenwing Ancient ·',['Grenade Launcher']),gear('Ravenwing Black Knights','Ravenwing Huntmaster ·',['Grenade Launcher']),
  gear('Captain In Terminator Armour','Storm bolter',['Combi-weapon']),gear('Captain In Terminator Armour','Relic Weapon',['Relic fist']),
 ],
};

export const DA_PURSUIT_ARMY:ChapterAcceptanceArmy={
 name:'Dark Angels Inner Circle and Darkflight',faction:'Dark Angels',chapter:'DARK ANGELS',battleSize:'Strike Force',detachments:['Inner Circle Task Force','Darkflight Pursuit','Deathwatch Support'],points:2000,dp:3,warlord:'Lion El’jonson#1',
 units:[
  {unit:'Lion El’jonson',points:415},{unit:'Azrael',points:150},{unit:'Inner Circle Companions',models:6,points:180},
  {unit:'Sammael',points:120},{unit:'Ravenwing Black Knights',models:6,points:170},{unit:'Ravenwing Command Squad',points:115},
  {unit:'Land Speeder Vengeance',points:160},{unit:'Ravenwing Darkshroud',points:95},{unit:'Captain',points:115},{unit:'Fortis Kill Team',points:210},
  {unit:'Rhino',points:70},{unit:'Nephilim Jetfighter',points:200},
 ],
 attachments:[['Azrael#1','Inner Circle Companions#1'],['Sammael#1','Ravenwing Black Knights#1'],['Ravenwing Command Squad#1','Ravenwing Black Knights#1'],['Captain#1','Fortis Kill Team#1']],
 upgrades:[['Land Speeder Vengeance#1','Nightforged Battery'],['Ravenwing Darkshroud#1','Thundercowl Turbines'],['Captain#1','Beacon Angelis']],
 gear:[
  gear('Ravenwing Black Knights','Ravenwing Black Knight 1 ·',['Grenade Launcher']),gear('Ravenwing Black Knights','Ravenwing Huntmaster ·',['Grenade Launcher']),
  gear('Ravenwing Command Squad','Ravenwing Apothecary ·',['Grenade Launcher']),gear('Land Speeder Vengeance','Heavy bolter',['Assault Cannon']),
  gear('Ravenwing Darkshroud','Armoured hull',['Armoured hull','Assault Cannon']),gear('Nephilim Jetfighter','Twin heavy bolter',['Nephilim lascannons']),
  gear('Captain','Heavy Bolt Pistol',['Heavy Bolt Pistol','Master-crafted power weapon','Relic shield']),
  gear('Fortis Kill Team','Kill Team Sergeant ·',['Bolt pistol','Deathwatch bolt rifle','Grenade Launcher','Power fist']),
  gear('Fortis Kill Team','Kill Team Intercessor with Castellan Launcher',['Castellan launcher','Knives and Fists','Vengor launcher']),
 ],
};

export const BT_HOUSEHOLD_ARMY:ChapterAcceptanceArmy={
 name:'Black Templars Marshal’s Household',faction:'Black Templars',chapter:'BLACK TEMPLARS',battleSize:'Incursion',detachments:['Marshal’s Household','Fist of the God-Emperor'],points:1000,dp:2,warlord:'Execrator#1',
 units:[
  {unit:'Execrator',points:65},{unit:'Crusade Ancient',points:45},{unit:'Crusader Squad',points:175},{unit:'Castellan',points:75},
  {unit:'Sword Brethren Squad',models:4,points:130},{unit:'Rhino',points:70},{unit:'Impulsor',points:90},{unit:'Gladiator Lancer',points:175},{unit:'Gladiator Valiant',points:175},
 ],
 attachments:[['Execrator#1','Crusader Squad#1'],['Crusade Ancient#1','Crusader Squad#1'],['Castellan#1','Sword Brethren Squad#1']],
 upgrades:[['Crusader Squad#1','Righteous Fervour'],['Sword Brethren Squad#1','Inheritors of Sigismund']],
 gear:[
  gear('Execrator','Absolvor bolt pistol',['Absolvor bolt pistol','Crozius arcanum','Master-crafted power weapon']),gear('Castellan','Combi-weapon',['Heavy Bolt Pistol']),
  gear('Crusader Squad','Initiate 1 ·',['Bolt pistol','Close combat weapon','Heavy bolt pistol','Power fist']),
  gear('Crusader Squad','Initiate 2 ·',['Bolt pistol','Close combat weapon','Pyreblaster']),gear('Crusader Squad','Neophyte 1 ·',['Combat knife','Shotgun']),gear('Crusader Squad','Sword Brother ·',['Hand flamer']),
  gear('Sword Brethren Squad','Sword Brother 1 ·',['Hand flamer','Thunder hammer']),gear('Sword Brethren Squad','Sword Brother 2 ·',['Master-crafted power weapon','Plasma pistol']),
  gear('Sword Brethren Squad','Sword Brother 3 ·',['Twin lightning claws']),gear('Sword Brethren Squad','Sword Brother 4 ·',['Hand flamer','Master-crafted power weapon']),
  gear('Impulsor','Ironhail Heavy Stubber',['Multi-melta']),gear('Impulsor','Bellicatus',['Orbital Comms Array']),
  gear('Gladiator Lancer','Multi-melta',['Multi-melta']),
  gear('Gladiator Valiant','Hull and sponson weapons',['Armoured Hull','Defensive Array','Multi-melta','Multi-melta','Multi-melta','Twin las-talon']),
 ],
};

export const BT_CRUSADE_ARMY:ChapterAcceptanceArmy={
 name:'Black Templars Vow-sworn Armoured Crusade',faction:'Black Templars',chapter:'BLACK TEMPLARS',battleSize:'Strike Force',detachments:['Vow-sworn Crusaders','Assault Brethren'],points:2000,dp:3,warlord:'High Marshal Helbrecht#1',
 units:[
  {unit:'High Marshal Helbrecht',points:125},{unit:'Sword Brethren Squad',models:8,points:250},{unit:'Chaplain Grimaldus',points:120},{unit:'Crusader Squad',models:15,points:305},
  {unit:'Marshal',points:105},{unit:'Sword Brethren Squad',models:4,points:115},{unit:'Emperor’s Champion',points:100},{unit:'Sword Brethren Squad',models:4,points:135},
  {unit:'Gladiator Reaper',points:175},{unit:'Repulsor',points:200},{unit:'Repulsor Executioner',points:275},{unit:'Infernus Squad',points:95},
 ],
 attachments:[['High Marshal Helbrecht#1','Sword Brethren Squad#1'],['Chaplain Grimaldus#1','Crusader Squad#1'],['Marshal#1','Sword Brethren Squad#2'],['Emperor’s Champion#1','Sword Brethren Squad#3']],
 upgrades:[['Marshal#1','Zealous Vanguard']],
 gear:[
  choice('Crusader Squad','Unit composition','1 × Sword Brother + 6 × Initiate + 8 × Neophyte'),
  gear('Crusader Squad','Initiate 1 ·',['Bolt pistol','Close combat weapon','Heavy bolt pistol','Power fist']),gear('Crusader Squad','Initiate 2 ·',['Bolt pistol','Close combat weapon','Pyreblaster']),
  ...[1,8].map(n=>gear('Crusader Squad','Neophyte '+n+' ·',['Combat knife','Shotgun'])),
  ...[1,2].map(n=>gear('Sword Brethren Squad','Sword Brother '+n+' ·',['Hand flamer','Thunder hammer'])),
  ...[3,4].map(n=>gear('Sword Brethren Squad','Sword Brother '+n+' ·',['Master-crafted power weapon','Plasma pistol'])),
  ...[5,6].map(n=>gear('Sword Brethren Squad','Sword Brother '+n+' ·',['Twin lightning claws'])),
  ...[7,8].map(n=>gear('Sword Brethren Squad','Sword Brother '+n+' ·',['Hand flamer','Master-crafted power weapon'])),
  gear('Sword Brethren Squad','Sword Brother 1 ·',['Twin lightning claws'],3),
  gear('Gladiator Reaper','Multi-melta',['Multi-melta']),gear('Repulsor','Multi-melta',['Multi-melta']),gear('Repulsor','Heavy onslaught',['Las-talon']),gear('Repulsor','Twin Heavy Bolter',['Twin lascannon']),
  gear('Repulsor Executioner','Multi-melta',['Multi-melta']),
 ],
};

export const SW_GREAT_WOLF_ARMY:ChapterAcceptanceArmy={
 name:'Space Wolves Split Hunting Packs',faction:'Space Wolves',chapter:'SPACE WOLVES',battleSize:'Incursion',detachments:['Saga of the Great Wolf'],points:1000,dp:2,warlord:'Ragnar Blackmane#1',
 units:[
  {unit:'Wolf Priest',points:90},{unit:'Grey Hunters',points:180},{unit:'Ragnar Blackmane',points:100},{unit:'Wolf Guard Headtakers',models:6,points:115},
  {unit:'Rhino',points:70},{unit:'Rhino',points:70},{unit:'Rhino',points:70},{unit:'Wolf Scouts',points:95},{unit:'Wulfen with Storm Shields',points:125},{unit:'Intercessor Squad',points:85},
 ],
 attachments:[['Wolf Priest#1','Grey Hunters#1'],['Ragnar Blackmane#1','Wolf Guard Headtakers#1']],upgrades:[['Wolf Priest#1','Howlmaw']],
 gear:[
  gear('Grey Hunters','Grey Hunter Pack Leader · Bolt pistol',['Plasma pistol']),gear('Grey Hunters','Grey Hunter Pack Leader · Chainsword',['Power fist']),
  choice('Grey Hunters','Battle formation','Split unit'),choice('Grey Hunters','Leader group','Group 2'),
  choice('Grey Hunters','Grey Hunter Pack Leader · Split group','Group 1'),choice('Grey Hunters','Grey Hunter 1 · Split group','Group 2'),choice('Grey Hunters','Grey Hunter 5 · Split group','Group 1'),
  choice('Wolf Guard Headtakers','Unit composition','3 × Wolf Guard Headtaker + 3 × Hunting Wolf'),choice('Wolf Guard Headtakers','Battle formation','Split unit'),
  gear('Wolf Guard Headtakers','Wolf Guard Headtaker 1 ·',['Heavy bolt pistol','Master-crafted power weapon','Storm shield']),
  gear('Wolf Scouts','Wolf Scout Pack Leader ·',['Haywire Mine (Once per battle, per unit)','Plasma pistol','Power weapon']),
  gear('Wolf Scouts','Wolf Scout 1 ·',['Bolt pistol','Runic stave','Thunderclap']),gear('Wolf Scouts','Wolf Scout 2 ·',['Combat knife','Plasma gun']),
 ],
};

export const SW_CHAMPIONS_ARMY:ChapterAcceptanceArmy={
 name:'Space Wolves Champions and Beastslayers',faction:'Space Wolves',chapter:'SPACE WOLVES',battleSize:'Strike Force',detachments:['Champions of Fenris','Saga of the Beastslayer','Ironclad Champions'],points:2000,dp:3,warlord:'Logan Grimnar#1',
 units:[
  {unit:'Logan Grimnar',points:150},{unit:'Wolf Guard Terminators',points:195},{unit:'Ancient In Terminator Armour',points:90},{unit:'Wolf Guard Battle Leader',points:95},
  {unit:'Wulfen with Storm Shields',points:125},{unit:'Bjorn The Fell-handed',points:160},{unit:'Murderfang',points:150},{unit:'Iron Priest',points:60},
  {unit:'Wolf Scouts',models:12,points:190},{unit:'Thunderwolf Cavalry',models:6,points:260},{unit:'Repulsor',points:190},{unit:'Blood Claws',points:150},
  {unit:'Ulrik The Slayer',points:90},{unit:'Wolf Priest',points:95},
 ],
 attachments:[['Logan Grimnar#1','Wolf Guard Terminators#1'],['Ancient In Terminator Armour#1','Wolf Guard Terminators#1'],['Wolf Guard Battle Leader#1','Wulfen with Storm Shields#1'],['Ulrik The Slayer#1','Blood Claws#1']],
 upgrades:[['Ancient In Terminator Armour#1','Preyslayer'],['Wolf Guard Battle Leader#1','Wolf-Touched'],['Wolf Priest#1',"Hunter's Guile"]],
 gear:[
  gear('Wolf Guard Terminators','Wolf Guard Terminator Pack Leader ·',['Master-crafted power weapon','Storm shield']),
  ...[1,2].map(n=>gear('Wolf Guard Terminators','Wolf Guard Terminator '+n+' ·',['Master-crafted power weapon','Storm shield'])),
  gear('Wolf Guard Terminators','Wolf Guard Terminator 3 ·',['Assault cannon','Power fist']),
  gear('Wolf Guard Battle Leader','Master‑crafted power weapon',['Thunder hammer']),gear('Wolf Guard Battle Leader','Plasma pistol',['Storm shield']),gear('Bjorn The Fell-handed','Assault cannon',['Helfrost cannon']),
  gear('Wolf Scouts','Wolf Scout Pack Leader ·',['Haywire Mine (Once per battle, per unit)','Plasma pistol','Power weapon']),
  gear('Wolf Scouts','Wolf Scout 1 ·',['Bolt pistol','Runic stave','Thunderclap']),gear('Wolf Scouts','Wolf Scout 2 ·',['Combat knife','Plasma gun']),gear('Wolf Scouts','Wolf Scout 3 ·',['Combat knife','Instigator bolt carbine']),
  gear('Thunderwolf Cavalry','Thunderwolf Cavalry Pack Leader ·',['Boltgun','Storm shield']),
  ...[1,2,3,4,5].map(n=>gear('Thunderwolf Cavalry','Thunderwolf Cavalry '+n+' ·',['Boltgun','Storm shield'])),
  gear('Repulsor','Heavy onslaught',['Las-talon']),gear('Repulsor','Twin Heavy Bolter',['Twin lascannon']),
 ],
};

export const CHAPTER_ACCEPTANCE_ARMIES=[BA_SPEARTIP_ARMY,BA_INHERITORS_ARMY,DA_ROCK_ARMY,DA_PURSUIT_ARMY,BT_HOUSEHOLD_ARMY,BT_CRUSADE_ARMY,SW_GREAT_WOLF_ARMY,SW_CHAMPIONS_ARMY];
