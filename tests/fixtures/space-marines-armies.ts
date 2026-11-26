// Full acceptance forces reconciled to the October 14 MFM v1.6 and current
// Space Marines/Deathwatch cards, including paid equipment and enhancements.
// https://mfm.warhammer-community.com/en/space-marines
// https://mfm.warhammer-community.com/en/deathwatch
export interface SpaceMarineAcceptanceUnit {unit:string;models?:number;points:number}
export interface SpaceMarineAcceptanceGear {unit:string;owner:string;items?:string[];choice?:string;copy?:number}
export interface SpaceMarineAcceptanceArmy {
 name:string;chapter:string;battleSize:'Incursion'|'Strike Force';detachments:string[];points:number;dp:number;
 units:SpaceMarineAcceptanceUnit[];warlord:string;attachments:[string,string][];upgrades:[string,string][];gear:SpaceMarineAcceptanceGear[];
}
const gear=(unit:string,owner:string,items:string[],copy=1):SpaceMarineAcceptanceGear=>({unit,owner,items,copy});
const choice=(unit:string,owner:string,value:string,copy=1):SpaceMarineAcceptanceGear=>({unit,owner,choice:value,copy});
const reiver=()=>[choice('Reiver Squad','Grav-chutes','Grav-chutes'),choice('Reiver Squad','Grapnel Launchers','Grapnel Launchers')];

export const SM_ULTRAMARINES_ARMY:SpaceMarineAcceptanceArmy={
 name:'Ultramarines Honour Guard',chapter:'ULTRAMARINES',battleSize:'Strike Force',detachments:['Blade of Ultramar'],points:2000,dp:3,warlord:'Marneus Calgar#1',
 units:[
  {unit:'Marneus Calgar',points:180},{unit:'Cato Sicarius',points:115},{unit:'Victrix Honour Guard',models:6,points:265},
  {unit:'Captain',points:110},{unit:'Company Heroes',points:140},{unit:'Wardens of Ultramar',points:115},{unit:'Intercessor Squad',models:7,points:170},
  {unit:'Desolation Squad',points:145},{unit:'Impulsor',points:80},{unit:'Redemptor Dreadnought',points:180},
  {unit:'Inceptor Squad',points:130},{unit:'Inceptor Squad',points:130},{unit:'Inceptor Squad',points:150},{unit:'Aggressor Squad',points:90},
 ],
 attachments:[['Marneus Calgar#1','Victrix Honour Guard#1'],['Cato Sicarius#1','Victrix Honour Guard#1'],['Captain#1','Intercessor Squad#1'],['Wardens of Ultramar#1','Intercessor Squad#1']],
 upgrades:[['Captain#1','Student of the Codex'],['Company Heroes#1','Armour of Antoninus']],
 gear:[
  choice('Victrix Honour Guard','Victrix Honour Guard 1 · Model','Chapter Ancient'),choice('Victrix Honour Guard','Victrix Honour Guard 2 · Model','Chapter Champion'),
  gear('Captain','Heavy Bolt Pistol',['Plasma Pistol','Power fist']),
  gear('Intercessor Squad','Intercessor Sergeant ·',['Plasma pistol','Thunder hammer']),gear('Intercessor Squad','Intercessor 1 ·',['Bolt Rifle','Grenade Launcher']),
  choice('Desolation Squad','Unit weapons','Superkrak Rocket Launcher'),gear('Desolation Squad','Desolation Sergeant ·',['Vengor Launcher']),
  gear('Impulsor','Bellicatus',['Orbital Comms Array']),gear('Impulsor','Ironhail Heavy Stubber',['Ironhail Heavy Stubber']),
  gear('Redemptor Dreadnought','Heavy onslaught',['Macro plasma incinerator']),gear('Redemptor Dreadnought','Icarus rocket pod',['Icarus rocket pod']),
  choice('Inceptor Squad','Unit weapons','Plasma Exterminators'),choice('Aggressor Squad','Unit weapons','Auto Boltstorm Gauntlets + Fragstorm Grenade Launcher'),
 ],
};

export const SM_IRON_HANDS_ARMY:SpaceMarineAcceptanceArmy={
 name:'Iron Hands Armoured Spearhead',chapter:'IRON HANDS',battleSize:'Incursion',detachments:["Medusa's Wrath"],points:1000,dp:2,warlord:'Iron Father Feirros#1',
 units:[
  {unit:'Iron Father Feirros',points:85},{unit:'Techmarine',points:85},{unit:'Heavy Intercessor Squad',points:115},{unit:'Intercessor Squad',points:85},
  {unit:'Redemptor Dreadnought',points:180},{unit:'Repulsor Executioner',points:270},{unit:'Invader ATVs',models:2,points:140},{unit:'Ancient',points:40},
 ],
 attachments:[['Iron Father Feirros#1','Heavy Intercessor Squad#1'],['Ancient#1','Intercessor Squad#1']],upgrades:[['Techmarine#1','Target Augury Web']],
 gear:[gear('Heavy Intercessor Squad','Heavy Intercessor 1 ·',['Heavy bolter']),gear('Redemptor Dreadnought','Heavy onslaught',['Macro plasma incinerator']),gear('Redemptor Dreadnought','Heavy Flamer',['Onslaught gatling cannon']),gear('Invader ATVs','Invader ATV 1 ·',['Multi-melta']),gear('Invader ATVs','Invader ATV 2 ·',['Multi-melta'])],
};

export const SM_DEATHWATCH_ARMY:SpaceMarineAcceptanceArmy={
 name:'Deathwatch Black Spear',chapter:'DEATHWATCH',battleSize:'Strike Force',detachments:['Black Spear Task Force'],points:2000,dp:3,warlord:'Watch Master#1',
 units:[
  {unit:'Watch Master',points:130},{unit:'Fortis Kill Team',points:210},{unit:'Watch Captain Artemis',points:75},{unit:'Deathwatch Veterans',models:10,points:220},
  {unit:'Librarian In Terminator Armour',points:80},{unit:'Deathwatch Terminator Squad',points:225},{unit:'Decimus Kill Team',models:10,points:210},
  {unit:'Indomitor Kill Team',points:280},{unit:'Corvus Blackstar',points:180},{unit:'Rhino',points:70},{unit:'Captain',points:100},{unit:'Deathwatch Veterans',points:115},{unit:'Land Speeder',points:105},
 ],
 attachments:[['Watch Master#1','Fortis Kill Team#1'],['Watch Captain Artemis#1','Deathwatch Veterans#1'],['Librarian In Terminator Armour#1','Deathwatch Terminator Squad#1'],['Captain#1','Decimus Kill Team#1']],
 upgrades:[['Watch Master#1','Beacon Angelis'],['Captain#1','The Thief of Secrets']],
 gear:[
  gear('Fortis Kill Team','Kill Team Sergeant ·',['Bolt pistol','Deathwatch bolt rifle','Grenade Launcher','Power fist']),
  gear('Fortis Kill Team','Kill Team Intercessor with Castellan Launcher',['Castellan launcher','Knives and Fists','Vengor launcher']),
  gear('Deathwatch Veterans','Deathwatch Veteran 1 ·',['Black Shield blades']),gear('Deathwatch Veterans','Deathwatch Veteran 2 ·',['Frag cannon','Knives and Fists']),gear('Deathwatch Veterans','Deathwatch Veteran 3 ·',['Frag cannon','Knives and Fists']),
  gear('Deathwatch Veterans','Watch Sergeant ·',['Combi-weapon','Xenophase blade']),
  gear('Deathwatch Terminator Squad','Deathwatch Terminator Sergeant ·',['Storm shield','Thunder hammer']),
  ...[1,2,3].map(n=>gear('Deathwatch Terminator Squad','Deathwatch Terminator '+n+' ·',['Cyclone missile launcher','Power fist','Storm Bolter'])),
  gear('Corvus Blackstar','Blackstar rocket launcher',['Stormstrike missile launcher','Stormstrike missile launcher']),gear('Corvus Blackstar','Twin assault',['Twin lascannon']),gear('Corvus Blackstar','Hurricane bolter',['Hurricane bolter']),
  gear('Land Speeder','Onslaught',['Pyrecannon']),
 ],
};

export const SM_DEATHWATCH_SUPPORT_ARMY:SpaceMarineAcceptanceArmy={
 name:'Salamanders with Deathwatch Support',chapter:'SALAMANDERS',battleSize:'Incursion',detachments:['Tacticus Firestorm Force','Deathwatch Support'],points:1000,dp:2,warlord:'Vulkan He’stan#1',
 units:[
  {unit:'Vulkan He’stan',points:105},{unit:'Infernus Squad',points:95},{unit:'Captain',points:115},{unit:'Fortis Kill Team',points:210},
  {unit:'Watch Master (Assigned Agent)',points:105},{unit:'Deathwatch Kill Team',points:115},{unit:'Rhino',points:70},{unit:'Reiver Squad',points:85},{unit:'Eradicator Squad with Heavy Bolters',points:100},
 ],
 attachments:[['Vulkan He’stan#1','Infernus Squad#1'],['Captain#1','Fortis Kill Team#1'],['Watch Master (Assigned Agent)#1','Deathwatch Kill Team#1']],upgrades:[['Captain#1','Beacon Angelis']],
 gear:[...reiver(),gear('Captain','Heavy Bolt Pistol',['Heavy Bolt Pistol','Master-crafted power weapon','Relic shield']),gear('Fortis Kill Team','Kill Team Intercessor with Castellan Launcher',['Castellan launcher','Knives and Fists','Superkrak rocket launcher'])],
};

export const SM_RAVEN_GUARD_ARMY:SpaceMarineAcceptanceArmy={
 name:'Raven Guard Shadowmark',chapter:'RAVEN GUARD',battleSize:'Incursion',detachments:['Shadowmark Talon'],points:1000,dp:2,warlord:'Kayvaan Shrike#1',
 units:[
  {unit:'Kayvaan Shrike',points:95},{unit:'Vanguard Veteran Squad With Jump Packs',points:110},{unit:'Captain In Phobos Armour',points:100},{unit:'Reiver Squad',models:10,points:165},
  {unit:'Infiltrator Squad',points:85},{unit:'Eliminator Squad',points:85},{unit:'Inceptor Squad',points:130},{unit:'Storm Speeder Hailstrike',points:110},{unit:'Scout Squad',models:10,points:120},
 ],
 attachments:[['Kayvaan Shrike#1','Vanguard Veteran Squad With Jump Packs#1'],['Captain In Phobos Armour#1','Reiver Squad#1']],upgrades:[['Captain In Phobos Armour#1','Blackwing Shroud']],
 gear:[...reiver(),choice('Vanguard Veteran Squad With Jump Packs','Unit weapons','Combat Shield'),gear('Vanguard Veteran Squad With Jump Packs','Vanguard Veteran Sergeant',['Thunder Hammer']),choice('Eliminator Squad','Eliminator weapons','Las Fusil'),gear('Eliminator Squad','Eliminator Sergeant ·',['Instigator Bolt Carbine']),choice('Inceptor Squad','Unit weapons','Plasma Exterminators'),gear('Scout Squad','Scout 1 ·',['Missile launcher']),gear('Scout Squad','Scout 2 ·',['Heavy bolter']),gear('Scout Squad','Scout 3 ·',['Sniper Rifle']),gear('Scout Squad','Scout 4 ·',['Sniper Rifle'])],
};

export const SM_IMPERIAL_FISTS_ARMY:SpaceMarineAcceptanceArmy={
 name:'Imperial Fists Ceramite Sentinels',chapter:'IMPERIAL FISTS',battleSize:'Incursion',detachments:['Ceramite Sentinels'],points:1000,dp:2,warlord:'Tor Garadon#1',
 units:[
  {unit:'Tor Garadon',points:90},{unit:'Heavy Intercessor Squad',models:10,points:230},{unit:'Ancient In Terminator Armour',points:85},{unit:'Terminator Squad',points:200},
  {unit:'Librarian In Terminator Armour',points:80},{unit:'Intercessor Squad',points:85},{unit:'Gladiator Reaper',points:165},{unit:'Scout Squad',points:65},
 ],
 attachments:[['Tor Garadon#1','Heavy Intercessor Squad#1'],['Ancient In Terminator Armour#1','Terminator Squad#1'],['Librarian In Terminator Armour#1','Terminator Squad#1']],upgrades:[['Ancient In Terminator Armour#1','Castellum Omnivox']],
 gear:[gear('Heavy Intercessor Squad','Heavy Intercessor 1 ·',['Heavy bolter']),gear('Heavy Intercessor Squad','Heavy Intercessor 2 ·',['Heavy bolter']),gear('Terminator Squad','Terminator 1 · Storm Bolter',['Cyclone Missile Launcher','Storm Bolter']),gear('Terminator Squad','Terminator Sergeant ·',['Power Weapon'])],
};

export const SM_WHITE_SCARS_ARMY:SpaceMarineAcceptanceArmy={
 name:'White Scars Spearpoint',chapter:'WHITE SCARS',battleSize:'Incursion',detachments:['Spearpoint Task Force'],points:1000,dp:2,warlord:'Suboden Khan#1',
 units:[
  {unit:'Suboden Khan',points:105},{unit:'Outrider Squad',models:6,points:160},{unit:'Chaplain On Bike',points:100},{unit:'Outrider Squad',points:80},
  {unit:'Invader ATVs',models:2,points:155},{unit:'Land Speeder',points:125},{unit:'Intercessor Squad',points:85},{unit:'Assault Intercessors With Jump Packs',points:95},{unit:'Assault Intercessors With Jump Packs',points:95},
 ],
 attachments:[['Suboden Khan#1','Outrider Squad#1'],['Chaplain On Bike#1','Outrider Squad#2']],upgrades:[['Chaplain On Bike#1','Spearpoint Paragon'],['Invader ATVs#1','Chogorian Huntmaster'],['Land Speeder#1','Chogorian Huntmaster']],
 gear:[gear('Invader ATVs','Invader ATV 1 ·',['Multi-melta']),gear('Land Speeder','Onslaught',['Pyrecannon']),gear('Assault Intercessors With Jump Packs','Assault Intercessor Sergeant with Jump Pack · Heavy Bolt Pistol',['Plasma pistol']),gear('Assault Intercessors With Jump Packs','Assault Intercessor Sergeant with Jump Pack · Chainsword',['Power Fist']),gear('Assault Intercessors With Jump Packs','Assault Intercessor with Jump Pack 1 ·',['Chainsword','Plasma pistol'])],
};

export const SM_ACCEPTANCE_ARMIES=[SM_ULTRAMARINES_ARMY,SM_IRON_HANDS_ARMY,SM_DEATHWATCH_ARMY,SM_DEATHWATCH_SUPPORT_ARMY,SM_RAVEN_GUARD_ARMY,SM_IMPERIAL_FISTS_ARMY,SM_WHITE_SCARS_ARMY];
