// Manually reconciled acceptance rosters: MFM v1.6 (14 October 2026),
// Drukhari faction pack v1.2 and Aeldari faction pack v1.4.
// https://assets.warhammer-community.com/eng_wh40k_faction_pack_drukhari-p7mpvgnmnn-clii96hzh6.pdf
// https://assets.warhammer-community.com/eng_14-10_wh40k_-faction_pack_aeldari-seqmcs1mu0-g8gzewikcm.pdf
// Expected prices are independent fixture values, including paid weapons and upgrades.
export interface DrukhariAcceptanceUnit {unit:string;models?:number;points:number}
export interface DrukhariAcceptanceGear {unit:string;owner:string;items?:string[];choice?:string;copy?:number}
export interface DrukhariAcceptanceArmy {
 battleSize:'Incursion'|'Strike Force';detachment:string;points:number;alliedPoints:number;
 units:DrukhariAcceptanceUnit[];warlord:string;attachments:[string,string][];
 upgrades:[string,string][];gear:DrukhariAcceptanceGear[];
}

const gear=(unit:string,owner:string,items:string[],copy=1):DrukhariAcceptanceGear=>({unit,owner,items,copy});
const specialist=(owner:string,choice:string):DrukhariAcceptanceGear=>({unit:'Corsair Voidscarred',owner,choice});
const disintegrators=gear('Ravager','Dark lance',['Disintegrator cannon','Disintegrator cannon','Disintegrator cannon']);
const incubi=[gear('Incubi','Klaivex ·',['Demiklaives']),gear('Incubi','Incubi Shrine tokens',['Incubi Shrine token'])];

export const DRUKHARI_SKYSPLINTER_ARMY:DrukhariAcceptanceArmy={
 battleSize:'Incursion',detachment:'Skysplinter Assault',points:1000,alliedPoints:140,warlord:'Archon#1',
 units:[
  {unit:'Archon',points:90},{unit:'Kabalite Warriors',points:110},
  {unit:'Venom',points:65},{unit:'Venom',points:65},
  {unit:'Corsair Voidscarred',models:8,points:140},{unit:'Incubi',points:90},
  {unit:'Raider',points:75},{unit:'Ravager',points:110},{unit:'Talos',points:75},
  {unit:'Scourges with Heavy Weapons',points:125},{unit:'Cronos',points:55},
 ],
 attachments:[['Archon#1','Kabalite Warriors#1']],upgrades:[['Archon#1','Spiteful Raider']],
 gear:[
  gear('Archon','Splinter pistol',['Soul trap']),
  gear('Kabalite Warriors','Sybarite ·',['Kabalite icon']),
  gear('Kabalite Warriors','Sybarite ·',['Power weapon']),
  gear('Kabalite Warriors','Kabalite Warrior 1 ·',['Blaster']),
  gear('Kabalite Warriors','Kabalite Warrior 2 ·',['Dark lance']),
  gear('Kabalite Warriors','Kabalite Warrior 3 ·',['Shredder']),
  gear('Kabalite Warriors','Kabalite Warrior 4 ·',['Splinter cannon']),
  gear('Venom','Bladevanes',['Bladevanes','Splinter cannon','Splinter cannon']),
  gear('Corsair Voidscarred','Voidscarred Felarch ·',['Mistshield']),
  gear('Corsair Voidscarred','Voidscarred Felarch ·',['Close combat weapon','Neuro disruptor','Power sword']),
  gear('Corsair Voidscarred','Corsair Voidscarred 1 ·',['Close combat weapon','Faolchú','Power sword','Shuriken pistol']),
  gear('Corsair Voidscarred','Corsair Voidscarred 2 ·',['Blaster','Close combat weapon']),
  specialist('Corsair Voidscarred 5 ·','Shade Runner'),
  specialist('Corsair Voidscarred 6 ·','Soul Weaver'),
  specialist('Corsair Voidscarred 7 ·','Way Seeker'),
  ...incubi,disintegrators,
  gear('Talos','Talos 1 · Twin splinter cannon',['Twin haywire blaster']),
  gear('Scourges with Heavy Weapons','Scourge 1 ·',['Dark lance']),
  gear('Scourges with Heavy Weapons','Scourge 2 ·',['Haywire blaster']),
  gear('Scourges with Heavy Weapons','Scourge 3 ·',['Dark lance']),
  gear('Scourges with Heavy Weapons','Scourge 4 ·',['Heat lance']),
  gear('Cronos','Cronos 1 · Spirit vortex',['Spirit vortex']),
 ],
};

export const DRUKHARI_REAPERS_ARMY:DrukhariAcceptanceArmy={
 battleSize:'Strike Force',detachment:'Reaper’s Wager',points:2000,alliedPoints:745,warlord:'Archon#1',
 units:[
  {unit:'Archon',points:100},{unit:'Hand of the Archon',points:115},{unit:'Raider',points:75},
  {unit:'Lelith Hesperax',points:80},{unit:'Wyches',points:90},{unit:'Raider',points:75},
  {unit:'Troupe Master',points:90},{unit:'Troupe',points:85},{unit:'Starweaver',points:70},
  {unit:'Shadowseer',points:75},{unit:'Troupe',points:85},{unit:'Starweaver',points:70},
  {unit:'Death Jester',points:65},{unit:'Skyweavers',points:90},{unit:'Voidweaver',points:115},
  {unit:'Drazhar',points:85},{unit:'Incubi',points:90},{unit:'Venom',points:65},
  {unit:'Wracks',models:8,points:90},{unit:'Cronos',points:55},{unit:'Talos',models:2,points:150},
  {unit:'Reavers',points:75},{unit:'Ravager',points:110},
 ],
 attachments:[
  ['Archon#1','Hand of the Archon#1'],['Lelith Hesperax#1','Wyches#1'],
  ['Troupe Master#1','Troupe#1'],['Shadowseer#1','Troupe#2'],['Drazhar#1','Incubi#1'],
 ],
 upgrades:[['Archon#1','Conductor of Torment'],['Troupe Master#1','Archraider'],['Shadowseer#1','Reaper’s Cowl']],
 gear:[
  gear('Archon','Splinter pistol',['Blast pistol']),
  gear('Hand of the Archon','Kabalite Archsybarite ·',['Kabalite icon']),
  gear('Hand of the Archon','Kabalite Archsybarite ·',['Power weapon']),
  gear('Hand of the Archon','Kabalite Agents 1 ·',['Blaster']),
  gear('Hand of the Archon','Kabalite Agents 2 ·',['Splinter cannon']),
  gear('Hand of the Archon','Kabalite Agents 3 ·',['Razorflail','Splinter pistol']),
  gear('Hand of the Archon','Kabalite Agents 4 ·',['Splinter rifle','Stimm-needler']),
  gear('Hand of the Archon','Kabalite Agents 5 ·',['Stinger pistol']),
  gear('Hand of the Archon','Kabalite Agents 6 ·',['Shardcarbine']),
  gear('Hand of the Archon','Kabalite Agents 7 ·',['Pain sculptors']),
  gear('Wyches','Hekatrix ·',['Blast pistol']),gear('Wyches','Hekatrix ·',['Power weapon']),
  gear('Wyches','Wych 1 ·',['Gladiatorial weapons']),gear('Wyches','Wych 2 ·',['Gladiatorial weapons']),gear('Wyches','Wych 3 ·',['Gladiatorial weapons']),
  gear('Troupe Master','Shuriken pistol',['Fusion pistol']),gear('Troupe Master','Troupe Master’s blade',['Harlequin’s special weapon']),
  gear('Troupe','Lead Player ·',['Fusion pistol']),gear('Troupe','Lead Player ·',['Power sword']),
  gear('Troupe','Player 1 ·',['Fusion pistol']),gear('Troupe','Player 1 ·',['Harlequin’s special weapon']),
  gear('Troupe','Player 2 ·',['Neuro disruptor']),gear('Troupe','Player 2 ·',['Harlequin’s special weapon']),
  gear('Troupe','Player 3 ·',['Neuro disruptor']),gear('Troupe','Player 3 ·',['Harlequin’s special weapon']),
  gear('Shadowseer','Shuriken pistol',['Neuro disruptor']),
  gear('Troupe','Lead Player ·',['Neuro disruptor'],2),gear('Troupe','Lead Player ·',['Power sword'],2),
  gear('Troupe','Player 1 ·',['Fusion pistol'],2),gear('Troupe','Player 1 ·',['Harlequin’s special weapon'],2),
  gear('Troupe','Player 2 ·',['Fusion pistol'],2),gear('Troupe','Player 2 ·',['Harlequin’s special weapon'],2),
  gear('Skyweavers','Skyweaver 1 ·',['Skyweaver haywire cannon']),gear('Skyweavers','Skyweaver 1 ·',['Zephyrglaive']),
  gear('Voidweaver','Voidweaver haywire cannon',['Prismatic cannon']),
  ...incubi,
  gear('Wracks','Acothyst ·',['Hexrifle','Power weapon']),
  gear('Wracks','Wrack 1 ·',['Liquifier gun','Torturer’s tools']),
  gear('Wracks','Wrack 2 ·',['Ossefactor','Torturer’s tools']),
  gear('Wracks','Wrack 3 ·',['Stinger pistol','Torturer’s tools']),
  gear('Cronos','Cronos 1 · Spirit vortex',['Spirit vortex']),
  gear('Talos','Talos 1 · Twin splinter cannon',['Twin haywire blaster']),
  gear('Talos','Talos 2 · Twin splinter cannon',['Twin haywire blaster']),
  gear('Talos','Talos 2 · Macro-scalpel',['Talos gauntlet','Twin liquifier gun']),
  gear('Reavers','Arena Champion ·',['Grav-talon']),gear('Reavers','Arena Champion ·',['Heat lance']),
  disintegrators,
 ],
};
