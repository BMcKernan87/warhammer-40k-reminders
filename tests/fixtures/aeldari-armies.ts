// Acceptance rosters independently reconciled to MFM v1.6 (14 October 2026)
// and the Aeldari faction pack v1.4. Points include selected upgrades/weapons.
// https://mfm.warhammer-community.com/en/aeldari
// https://assets.warhammer-community.com/eng_14-10_wh40k_-faction_pack_aeldari-seqmcs1mu0-g8gzewikcm.pdf
export interface AeldariAcceptanceUnit {unit:string;models?:number;points:number}
export interface AeldariAcceptanceGear {unit:string;owner:string;items?:string[];choice?:string;copy?:number}
export interface AeldariAcceptanceArmy {
 battleSize:'Incursion'|'Strike Force';detachment:string;points:number;dp:number;
 units:AeldariAcceptanceUnit[];warlord:string;attachments:[string,string][];
 artillery?:[string,string][];upgrades:[string,string][];gear:AeldariAcceptanceGear[];
}
const gear=(unit:string,owner:string,items:string[],copy=1):AeldariAcceptanceGear=>({unit,owner,items,copy});
const specialist=(owner:string,choice:string):AeldariAcceptanceGear=>({unit:'Corsair Voidscarred',owner,choice});
const token=(unit:string,count=1,copy=1)=>gear(unit,'Aspect Shrine tokens',Array<string>(count).fill('Aspect Shrine token'),copy);
const serpent=(copy=1)=>[gear('Wave Serpent','Twin shuriken cannon',['Twin bright lance'],copy),gear('Wave Serpent','Twin shuriken catapult',['Shuriken cannon'],copy)];

export const AELDARI_WARHOST_ARMY:AeldariAcceptanceArmy={
 battleSize:'Incursion',detachment:'Warhost',points:1000,dp:2,warlord:'Autarch#1',
 units:[
  {unit:'Autarch',points:85},{unit:'Guardian Defenders',points:90},{unit:'Warlock',points:40},{unit:'D-cannon Platform',points:110},
  {unit:'Clanblade',points:70},{unit:'Dragon Knights',points:85},{unit:'Stonesinger',points:55},{unit:'Leystalker',points:75},
  {unit:'Dire Avengers',points:70},{unit:'Wave Serpent',points:115},{unit:'War Walkers',points:80},{unit:'Wraithlord',points:125},
 ],
 attachments:[['Autarch#1','Guardian Defenders#1'],['Warlock#1','Guardian Defenders#1'],['Clanblade#1','Dragon Knights#1'],['Stonesinger#1','Dragon Knights#1']],
 artillery:[['D-cannon Platform#1','Guardian Defenders#1']],upgrades:[['Autarch#1','Gift of Foresight']],
 gear:[
  gear('Autarch','Star glaive',['Banshee blade']),gear('Autarch','Shuriken pistol',['Dragon fusion gun']),
  gear('Guardian Defenders','Heavy Weapon Platform ·',['Bright lance']),gear('Warlock','Witchblade',['Singing Spear']),
  gear('Dragon Knights','Drakolithe',['Drakolithe','Drakolithe']),
  gear('Dire Avengers','Dire Avenger Exarch ·',['Close combat weapon','Diresword','Shimmershield']),token('Dire Avengers'),
  ...serpent(),gear('War Walkers','War Walker 1 · Arm weapons',['Bright lance','Starcannon']),
  gear('Wraithlord','Ghostglaive',['Ghostglaive']),gear('Wraithlord','Shoulder weapons',['Bright lance','Bright lance']),gear('Wraithlord','Wrist weapons',['Flamer','Flamer']),
 ],
};

export const AELDARI_CORSAIR_ARMY:AeldariAcceptanceArmy={
 battleSize:'Incursion',detachment:'Corsair Coterie',points:1000,dp:2,warlord:'Prince Yriel#1',
 units:[
  {unit:'Prince Yriel',points:130},{unit:'Kharseth',points:80},{unit:'Corsair Voidscarred',models:8,points:165},{unit:'Corsair Voidreavers',models:10,points:110},
  {unit:'Corsair Skyreavers',models:10,points:140},{unit:'Starfangs',models:2,points:140},{unit:'Falcon',points:130},{unit:'Solitaire',points:105},
 ],
 attachments:[['Kharseth#1','Corsair Voidscarred#1']],upgrades:[['Prince Yriel#1','Archraider'],['Corsair Voidscarred#1','Webway Pathstone']],
 gear:[
  gear('Corsair Voidscarred','Voidscarred Felarch ·',['Mistshield']),
  gear('Corsair Voidscarred','Voidscarred Felarch ·',['Close combat weapon','Neuro disruptor','Power sword']),
  gear('Corsair Voidscarred','Corsair Voidscarred 1 ·',['Close combat weapon','Faolchú','Power sword','Shuriken pistol']),
  gear('Corsair Voidscarred','Corsair Voidscarred 2 ·',['Blaster','Close combat weapon']),
  specialist('Corsair Voidscarred 5 ·','Shade Runner'),specialist('Corsair Voidscarred 6 ·','Soul Weaver'),specialist('Corsair Voidscarred 7 ·','Way Seeker'),
  gear('Corsair Skyreavers','Skyreaver Felarch ·',['Blast pistol','Corsair blade']),
  gear('Corsair Skyreavers','Skyreaver 1 ·',['Blaster','Close combat weapon']),gear('Corsair Skyreavers','Skyreaver 2 ·',['Blaster','Close combat weapon']),
 ],
};

export const AELDARI_ASPECT_ARMY:AeldariAcceptanceArmy={
 battleSize:'Strike Force',detachment:'Aspect Host',points:2000,dp:3,warlord:'Autarch#1',
 units:[
  {unit:'Autarch',points:80},{unit:'Asurmen',points:135},{unit:'Dire Avengers',models:10,points:140},
  {unit:'Fuegan',points:130},{unit:'Fire Dragons',points:110},{unit:'Fire Dragons',points:110},{unit:'Fire Dragons',points:120},
  {unit:'Jain Zar',points:105},{unit:'Howling Banshees',models:10,points:165},{unit:'Maugan Ra',points:100},{unit:'Dark Reapers',models:10,points:200},
  {unit:'Baharroth',points:125},{unit:'Swooping Hawks',points:95},{unit:'Warp Spiders',points:105},{unit:'Striking Scorpions',points:75},{unit:'Striking Scorpions',points:75},{unit:'Falcon',points:130},
 ],
 attachments:[['Autarch#1','Fire Dragons#2'],['Asurmen#1','Dire Avengers#1'],['Fuegan#1','Fire Dragons#1'],['Jain Zar#1','Howling Banshees#1'],['Maugan Ra#1','Dark Reapers#1'],['Baharroth#1','Swooping Hawks#1']],
 upgrades:[['Autarch#1','Strategic Savant']],
 gear:[
  gear('Autarch','Shuriken pistol',['Dragon fusion pistol']),
  gear('Dire Avengers','Dire Avenger Exarch ·',['Avenger shuriken catapult','Avenger shuriken catapult','Close combat weapon']),token('Dire Avengers',2),
  gear('Fire Dragons','Fire Dragon Exarch ·',['Firepike']),token('Fire Dragons'),
  gear('Fire Dragons','Fire Dragon Exarch ·',['Dragon axe','Dragon fusion pistol'],2),token('Fire Dragons',1,2),
  gear('Fire Dragons','Fire Dragon Exarch ·',['Dragon’s breath flamer'],3),token('Fire Dragons',1,3),
  token('Howling Banshees',2),token('Dark Reapers',2),token('Swooping Hawks'),token('Warp Spiders'),token('Striking Scorpions'),token('Striking Scorpions',1,2),
  gear('Dark Reapers','Dark Reaper Exarch ·',['Close combat weapon','Tempest launcher']),gear('Swooping Hawks','Swooping Hawk Exarch ·',['Power sword','Sunpistol']),
  gear('Warp Spiders','Warp Spider Exarch ·',['Close combat weapon','Death weavers','Spinneret rifle']),
  gear('Striking Scorpions','Striking Scorpion Exarch ·',['Chainsabres']),gear('Striking Scorpions','Striking Scorpion Exarch ·',['Biting blade','Shuriken pistol'],2),
 ],
};

export const AELDARI_YNNARI_ARMY:AeldariAcceptanceArmy={
 battleSize:'Strike Force',detachment:'Devoted of Ynnead',points:2000,dp:2,warlord:'Yvraine#1',
 units:[
  {unit:'Yvraine',points:90},{unit:'The Visarch',points:80},{unit:'The Yncarne',points:230},
  {unit:'Ynnari Archon',points:85},{unit:'Ynnari Kabalite Warriors',points:110},{unit:'Ynnari Raider',points:70},{unit:'Ynnari Venom',points:65},{unit:'Ynnari Venom',points:65},
  {unit:'Ynnari Succubus',points:60},{unit:'Ynnari Wyches',points:90},{unit:'Ynnari Raider',points:70},{unit:'Ynnari Incubi',models:10,points:160},{unit:'Ynnari Reavers',points:65},
  {unit:'Farseer',points:60},{unit:'Guardian Defenders',points:90},{unit:'Wave Serpent',points:115},{unit:'Wraithguard',points:145},{unit:'Wraithblades',points:140},{unit:'Fire Prism',points:150},{unit:'Rangers',points:60},
 ],
 attachments:[['Yvraine#1','Ynnari Kabalite Warriors#1'],['The Visarch#1','Ynnari Kabalite Warriors#1'],['Ynnari Archon#1','Ynnari Incubi#1'],['Ynnari Succubus#1','Ynnari Wyches#1'],['Farseer#1','Guardian Defenders#1']],
 upgrades:[['Ynnari Succubus#1','Morbid Might']],
 gear:[
  gear('Ynnari Archon','Huskblade',['Blast pistol','Huskblade','Shadow Field']),
  gear('Ynnari Kabalite Warriors','Sybarite · Phantasm',['Phantasm grenade launcher']),
  gear('Ynnari Kabalite Warriors','Sybarite · Splinter rifle',['Blast pistol']),gear('Ynnari Kabalite Warriors','Sybarite · Close combat weapon',['Sybarite weapon']),
  gear('Ynnari Kabalite Warriors','Kabalite Warrior 1 ·',['Blaster']),gear('Ynnari Kabalite Warriors','Kabalite Warrior 2 ·',['Dark lance']),
  gear('Ynnari Kabalite Warriors','Kabalite Warrior 3 ·',['Shredder']),gear('Ynnari Kabalite Warriors','Kabalite Warrior 4 ·',['Splinter cannon']),
  gear('Ynnari Venom','Bladevanes',['Bladevanes','Splinter cannon','Splinter cannon']),
  gear('Ynnari Succubus','Blast pistol',['Blast pistol']),gear('Ynnari Wyches','Hekatrix ·',['Blast pistol']),gear('Ynnari Incubi','Klaivex ·',['Demiklaives']),
  gear('Ynnari Reavers','Arena Champion ·',['Heat lance']),gear('Ynnari Reavers','Arena Champion ·',['Grav-talon']),gear('Ynnari Reavers','Arena Champion ·',['Agoniser']),
  gear('Farseer','Witchblade',['Singing spear']),gear('Guardian Defenders','Heavy Weapon Platform ·',['Bright lance']),...serpent(),
  {unit:'Wraithguard',owner:'Unit weapons',choice:'D-scythe'},{unit:'Wraithblades',owner:'Unit weapons',choice:'Forceshield + Ghostaxe'},
 ],
};

export const AELDARI_HARLEQUIN_ARMY:AeldariAcceptanceArmy={
 battleSize:'Incursion',detachment:'Ghosts of the Webway',points:1000,dp:2,warlord:'Troupe Master#1',
 units:[
  {unit:'Troupe Master',points:75},{unit:'Shadowseer',points:65},{unit:'Death Jester',points:85},
  {unit:'Troupe',points:85},{unit:'Troupe',points:85},{unit:'Troupe',points:85},
  {unit:'Starweaver',points:70},{unit:'Starweaver',points:70},{unit:'Starweaver',points:70},
  {unit:'Skyweavers',points:90},{unit:'Voidweaver',points:115},{unit:'Solitaire',points:105},
 ],
 attachments:[['Troupe Master#1','Troupe#1'],['Shadowseer#1','Troupe#2']],upgrades:[['Shadowseer#1','Mistweave (Ghosts of the Webway)'],['Death Jester#1','Murder’s Jest']],
 gear:[
  gear('Troupe Master','Shuriken pistol',['Fusion pistol']),gear('Troupe Master','Troupe Master’s blade',['Harlequin’s special weapon']),
  gear('Shadowseer','Shuriken pistol',['Neuro disruptor']),
  gear('Troupe','Lead Player ·',['Fusion pistol']),gear('Troupe','Lead Player ·',['Power sword']),
  gear('Troupe','Player 1 ·',['Fusion pistol']),gear('Troupe','Player 1 ·',['Harlequin’s special weapon']),
  gear('Troupe','Player 2 ·',['Neuro disruptor']),gear('Troupe','Player 3 ·',['Neuro disruptor']),
  gear('Troupe','Lead Player ·',['Neuro disruptor'],2),gear('Troupe','Lead Player ·',['Power sword'],2),
  gear('Skyweavers','Skyweaver 1 ·',['Skyweaver haywire cannon']),gear('Skyweavers','Skyweaver 1 ·',['Zephyrglaive']),
  gear('Voidweaver','Voidweaver haywire cannon',['Prismatic cannon']),
 ],
};

export const AELDARI_WRAITH_ARMY:AeldariAcceptanceArmy={
 battleSize:'Strike Force',detachment:'Spirit Conclave',points:2000,dp:2,warlord:'Spiritseer#1',
 units:[
  {unit:'Spiritseer',points:80},{unit:'Farseer',points:60},{unit:'Guardian Defenders',points:90},
  {unit:'Wraithguard',points:145},{unit:'Wraithguard',points:145},{unit:'Wraithblades',points:140},
  {unit:'Wraithknight',points:395},{unit:'Wraithknight with Ghostglaive',points:380},{unit:'Wraithlord',points:125},
  {unit:'Wave Serpent',points:115},{unit:'Wave Serpent',points:115},{unit:'Fire Prism',points:150},{unit:'Rangers',points:60},
 ],
 attachments:[['Farseer#1','Guardian Defenders#1']],upgrades:[['Spiritseer#1','Light of Clarity']],
 gear:[
  {unit:'Wraithguard',owner:'Unit weapons',choice:'D-scythe'},{unit:'Wraithblades',owner:'Unit weapons',choice:'Forceshield + Ghostaxe'},
  gear('Wraithknight','Scattershield',['Heavy wraithcannon','Scattershield']),gear('Wraithknight','Shoulder weapons',['Starcannon','Starcannon']),
  gear('Wraithknight with Ghostglaive','Scattershield',['Heavy wraithcannon']),gear('Wraithknight with Ghostglaive','Shoulder weapons',['Shuriken cannon','Starcannon']),
  gear('Wraithlord','Ghostglaive',['Ghostglaive']),gear('Wraithlord','Shoulder weapons',['Bright lance','Starcannon']),gear('Wraithlord','Wrist weapons',['Flamer','Shuriken catapult']),
  gear('Guardian Defenders','Heavy Weapon Platform ·',['Bright lance']),...serpent(),...serpent(2),
 ],
};

export const AELDARI_WINDRIDER_ARMY:AeldariAcceptanceArmy={
 battleSize:'Incursion',detachment:'Windrider Host',points:1000,dp:2,warlord:'Farseer Skyrunner#1',
 units:[
  {unit:'Farseer Skyrunner',points:80},{unit:'Warlock Skyrunners',points:45},{unit:'Windriders',models:6,points:170},{unit:'Windriders',points:80},
  {unit:'Shining Spears',points:100},{unit:'Shroud Runners',points:90},{unit:'Vypers',models:2,points:140},{unit:'War Walkers',points:80},
  {unit:'Dragon Knights',points:85},{unit:'Stonesinger',points:55},{unit:'Leystalker',points:75},
 ],
 attachments:[['Warlock Skyrunners#1','Windriders#1'],['Farseer Skyrunner#1','Warlock Skyrunners#1'],['Stonesinger#1','Dragon Knights#1']],upgrades:[['Farseer Skyrunner#1','Echoes of Ulthanesh']],
 gear:[
  gear('Farseer Skyrunner','Witchblade',['Singing spear']),gear('Warlock Skyrunners','Warlock Skyrunner 1 ·',['Singing Spear']),
  gear('Windriders','Windrider 1 ·',['Shuriken cannon']),gear('Windriders','Windrider 2 ·',['Scatter laser']),
  gear('Shining Spears','Shining Spear Exarch ·',['Shimmershield']),gear('Shining Spears','Shining Spear Exarch ·',['Star lance']),gear('Shining Spears','Shining Spear Exarch ·',['Shuriken cannon']),
  gear('Vypers','Vypers 1 · Bright lance',['Starcannon']),gear('Vypers','Vypers 1 · Shuriken cannon',['Missile launcher']),
  gear('Dragon Knights','Drakolithe',['Drakolithe','Drakolithe']),
 ],
};

export const AELDARI_ACCEPTANCE_ARMIES=[AELDARI_WARHOST_ARMY,AELDARI_CORSAIR_ARMY,AELDARI_ASPECT_ARMY,AELDARI_YNNARI_ARMY,AELDARI_HARLEQUIN_ARMY,AELDARI_WRAITH_ARMY,AELDARI_WINDRIDER_ARMY];
