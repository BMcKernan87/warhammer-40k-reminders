/** Points from the 11e Necrons faction page, MFM 1.4, checked 2026-11-24.
 * Keep the old internal Prelocational spelling until saved roster migration is implemented.
 */
export const NECRON_ENHANCEMENT_POINTS_SOURCE='https://wahapedia.ru/wh40k11ed/factions/necrons/';
export const NECRON_ENHANCEMENT_POINTS:Readonly<Record<string,number>>={
 'Enlivened Sentinels':20,'Tools of Dominion':15,'Recursive Reanimation':5,'Deepening Madness':20,
 'Mortality Shroud':10,'Prelocational Optimiser':25,'Dread Majesty':30,'Miniaturised Nebuloscope':15,
 'Demanding Leader':10,'Chrono-impedance Fields':25,'Quantum Abacus':15,'Atomic Disintegrators':10,
 'Gauntlet of Compression':20,'Gravitic Bolas':15,'Destroyer Ankh':20,'Murdermind':15,'Mark of the Nekrosor':20,'Cursed Circlet':25,
 'Dimensional Sanctum':20,'Hyperphasic Fulcrum':15,'Autodivinator':15,'Metalodermal Tesla Weave':10,
 'Dimensional Overseer':25,'Arisen Tyrant':25,'Hyperspatial Transfer Node':15,'Osteoclave Fulcrum':20,
 'Veil of Darkness':20,'Nether-realm Casket':20,'Phasal Subjugator':35,'Enaegic Dermal Bond':30,
 'Eternal Madness':20,'Ingrained Superiority':5,'Soulless Reaper':15,'Eldritch Nightmare':10,
 'Honourable Combatant':10,'Unflinching Will':20,'Warrior Noble':15,'Eternal Conqueror':25
};
export const REPEATABLE_NECRON_UPGRADES=new Set(['Enlivened Sentinels','Tools of Dominion','Recursive Reanimation','Deepening Madness','Mortality Shroud']);
export const PANTHEON_BINDINGS:Readonly<Record<string,{name:string;points:number}>>={
 'C’tan Shard of the Deceiver':{name:'Singularity Matrix',points:45},
 'C’tan Shard of the Nightbringer':{name:'Quantum Goad',points:45},
 'C’tan Shard of the Void Dragon':{name:'Animus Damper',points:35},
 'Transcendent C’tan':{name:'Reletavistic Tether',points:40}
};
