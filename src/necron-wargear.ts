import type {RosterInstance} from './roster-instances';

export interface GearSlot {
  choices: readonly string[];
  capacity: 'one' | 'models' | 'per-three';
}
export interface NecronLoadout {
  fixed: string;
  primary?: readonly string[];
  mixed?: boolean;
  slots?: readonly GearSlot[];
  wounds: number;
}

const one = (...choices: string[]): GearSlot => ({choices, capacity: 'one'});
const perModel = (...choices: string[]): GearSlot => ({choices, capacity: 'models'});
const plasmacytes: GearSlot = {choices: ['Plasmacyte'], capacity: 'per-three'};

// Fixed equipment stays on the models alongside their primary selection and optional slots.
// The first primary is the datasheet default. Optional equipment starts at zero.
export const NECRON_LOADOUTS: Readonly<Record<string, NecronLoadout>> = {
  'Illuminor Szeras': {wounds: 9, fixed: 'Eldritch lance and impaling legs'},
  'Imotekh the Stormlord': {wounds: 6, fixed: 'Gauntlet of Fire and Staff of the Destroyer'},
  'Nekrosor Ammentar': {wounds: 9, fixed: 'Enmitic disintegrators, Unmaker Gauntlet, blade tail and whip coils, nullstone field generator'},
  'Orikan the Diviner': {wounds: 4, fixed: 'Staff of Tomorrow'},
  'Trazyn the Infinite': {wounds: 6, fixed: 'Empathic Obliterator'},
  'C’tan Shard of the Deceiver': {wounds: 16, fixed: 'Cosmic insanity and golden fists'},
  'C’tan Shard of the Nightbringer': {wounds: 16, fixed: 'Gaze of death and scythe of the Nightbringer'},
  'C’tan Shard of the Void Dragon': {wounds: 16, fixed: 'Spear of the Void Dragon, voltaic storm and canoptek tail blades'},
  'The Silent King': {wounds: 16, fixed: 'Szarekh carries the Sceptre of Eternal Glory, Staff of Stars and Weapons of the Final Triarch. Both Menhirs have an annihilator beam and armoured bulk.'},
  Chronomancer: {wounds: 4, fixed: 'Chronomancer’s stave'},
  Geomancer: {wounds: 4, fixed: 'Tremorglaive'},
  'Hexmark Destroyer': {wounds: 5, fixed: 'Enmitic disintegrator pistols and close combat weapon'},
  Overlord: {wounds: 6, fixed: '', primary: ['Tachyon arrow and Overlord’s blade', 'Staff of light', 'Voidscythe']},
  'Overlord with translocation shroud': {wounds: 6, fixed: 'Overlord’s blade and resurrection orb'},
  Plasmancer: {wounds: 4, fixed: 'Plasmic lance'},
  Psychomancer: {wounds: 4, fixed: 'Abyssal lance'},
  'Royal Warden': {wounds: 4, fixed: 'Relic gauss blaster and close combat weapon'},
  'Skorpekh Lord': {wounds: 7, fixed: 'Enmitic annihilator, flensing claw and hyperphase harvester'},
  Technomancer: {wounds: 4, fixed: 'Staff of light'},
  'Transcendent C’tan': {wounds: 16, fixed: 'Seismic assault and crackling tendrils'},
  'Lokhust Lord': {wounds: 6, fixed: '', primary: ['Staff of light', 'Lord’s blade'], slots: [one('Nanoscarab amulet', 'Resurrection orb')]},
  'Catacomb Command Barge': {wounds: 9, fixed: '', primary: ['Gauss cannon', 'Tesla cannon'], slots: [one('Overlord’s blade'), one('Resurrection orb')]},
  Immortals: {wounds: 1, fixed: 'Close combat weapon', primary: ['Gauss blaster', 'Tesla carbine']},
  'Necron Warriors': {wounds: 1, fixed: 'Close combat weapon', primary: ['Gauss flayer', 'Gauss reaper'], mixed: true},
  'Ghost Ark': {wounds: 14, fixed: 'Two gauss flayer arrays and armoured bulk'},
  'Doom Scythe': {wounds: 12, fixed: 'Heavy death ray, twin tesla destructor and armoured bulk'},
  'Canoptek Macrocytes': {wounds: 1, fixed: 'Claws', primary: ['Gauss scalpel', 'Tesla caster'], slots: [one('Atomiser beam and nanoscarab projector'), one('Accelerator mandible')]},
  'Canoptek Tomb Crawlers': {wounds: 3, fixed: 'Claws', primary: ['Two twin gauss reapers', 'One twin gauss reaper and one transdimensional isolator']},
  'Canoptek Wraiths': {wounds: 4, fixed: '', primary: ['Vicious claws', 'Whip coils'], mixed: true, slots: [perModel('Particle caster', 'Transdimensional beamer')]},
  Cryptothralls: {wounds: 3, fixed: 'Scouring eye and scythed limbs'},
  Deathmarks: {wounds: 1, fixed: 'Close combat weapon', primary: ['Synaptic disintegrator']},
  'Flayed Ones': {wounds: 1, fixed: 'Flayer claws'},
  Lychguard: {wounds: 2, fixed: '', primary: ['Warscythe', 'Hyperphase sword and dispersion shield']},
  'Ophydian Destroyers': {wounds: 3, fixed: '', primary: ['Ophydian hyperphase weapons'], slots: [plasmacytes]},
  'Skorpekh Destroyers': {wounds: 3, fixed: '', primary: ['Skorpekh hyperphase weapons'], slots: [plasmacytes]},
  'Triarch Praetorians': {wounds: 2, fixed: '', primary: ['Rod of covenant', 'Voidblade and particle caster']},
  'Lokhust Destroyers': {wounds: 3, fixed: 'Close combat weapon', primary: ['Gauss cannon']},
  'Lokhust Heavy Destroyers': {wounds: 4, fixed: 'Close combat weapon', primary: ['Gauss destructor', 'Enmitic exterminator'], mixed: true},
  'Tomb Blades': {wounds: 2, fixed: 'Close combat weapon', primary: ['Twin gauss blaster', 'Twin tesla carbine', 'Particle beamer'], mixed: true, slots: [perModel('Shieldvanes'), perModel('Nebuloscope', 'Shadowloom')]},
  'Canoptek Scarab Swarms': {wounds: 4, fixed: 'Feeder mandibles'},
  Monolith: {wounds: 22, fixed: 'Particle whip and portal of exile', primary: ['Four gauss flux arcs', 'Four death rays']},
  Obelisk: {wounds: 24, fixed: 'Four tesla spheres and armoured bulk'},
  'Tesseract Vault': {wounds: 24, fixed: 'Four tesla spheres and armoured bulk'},
  'Seraptek Heavy Construct': {wounds: 24, fixed: 'Titanic forelimbs', primary: ['Two singularity generators', 'Two synaptic obliterators and two transdimensional projectors']},
  'Night Scythe': {wounds: 12, fixed: 'Twin tesla destructor and armoured bulk'},
  'Annihilation Barge': {wounds: 9, fixed: 'Twin tesla destructor and armoured bulk', primary: ['Gauss cannon', 'Tesla cannon']},
  'Canoptek Spyders': {wounds: 6, fixed: 'Automaton claws', slots: [perModel('Pair of particle beamers'), perModel('Fabricator claw array'), perModel('Gloom prism')]},
  'Doomsday Ark': {wounds: 14, fixed: 'Two gauss flayer arrays and armoured bulk', primary: ['Doomsday cannon']},
  'Canoptek Doomstalker': {wounds: 12, fixed: 'Doomsday blaster, twin gauss flayer and Doomstalker limbs'},
  'Canoptek Reanimator': {wounds: 6, fixed: 'Two atomiser beams and Reanimator’s claws'},
  'Triarch Stalker': {wounds: 12, fixed: 'Stalker’s forelimbs', primary: ['Heat ray', 'Particle shredder', 'Heavy gauss cannon array']},
  'Convergence Of Dominion': {wounds: 7, fixed: 'Transdimensional abductor'},
};

export function necronSource(unit: string): string {
  const name = unit === 'Imotekh the Stormlord' ? 'Imotekh The Stormlord' : unit.replace('Of Dominion', 'of Dominion');
  return 'https://wahapedia.ru/wh40k11ed/factions/necrons/' + name.replaceAll('’', '-').replaceAll(' ', '-');
}

export function slotLimit(slot: GearSlot, models: number): number {
  if (slot.capacity === 'one') return 1;
  return slot.capacity === 'per-three' ? Math.floor(models / 3) : models;
}

export function availableGearCount(slot: GearSlot, squad: RosterInstance, choice: string, models: number): number {
  return slotLimit(slot, models) - slot.choices.reduce((used, item) =>
    used + (item === choice ? 0 : squad.wargear?.[item] ?? 0), 0);
}

export function validOptionalGear(squad: RosterInstance, models: number): boolean {
  if (squad.wargear === undefined) return true;
  if (!squad.wargear || typeof squad.wargear !== 'object' || Array.isArray(squad.wargear)) return false;
  const slots = NECRON_LOADOUTS[squad.unit]?.slots ?? [];
  return Object.entries(squad.wargear).every(([choice, count]) => {
    const slot = slots.find(s => s.choices.includes(choice));
    return !!slot && Number.isInteger(count) && count >= 0 && count <= availableGearCount(slot, squad, choice, models);
  });
}

export function carriesOrb(squad: RosterInstance): boolean {
  return squad.unit === 'Overlord with translocation shroud' || !!squad.resurrectionOrb || !!squad.wargear?.['Resurrection orb'];
}

// The earlier editor saved this datasheet option under its old display name.
export function currentEquipmentName(unit: string, choice: string): string {
  if(unit==='Skorpekh Destroyers'&&choice==='Hyperphase weapons')return 'Skorpekh hyperphase weapons';
  return unit === 'Triarch Stalker' && choice === 'Twin heavy gauss cannon' ? 'Heavy gauss cannon array' : choice;
}

export const necronKeywords = {
  'INFANTRY': new Set<string>(["Chronomancer", "Cryptothralls", "Deathmarks", "Flayed Ones", "Geomancer", "Hexmark Destroyer", "Illuminor Szeras", "Immortals", "Imotekh the Stormlord", "Lychguard", "Necron Warriors", "Nekrosor Ammentar", "Ophydian Destroyers", "Orikan the Diviner", "Overlord", "Overlord with translocation shroud", "Plasmancer", "Psychomancer", "Royal Warden", "Skorpekh Destroyers", "Skorpekh Lord", "Technomancer", "Trazyn the Infinite", "Triarch Praetorians"]),
  'VEHICLE': new Set<string>(["Annihilation Barge", "Canoptek Doomstalker", "Canoptek Reanimator", "Canoptek Spyders", "Catacomb Command Barge", "Convergence Of Dominion", "Doom Scythe", "Doomsday Ark", "Ghost Ark", "Monolith", "Night Scythe", "Obelisk", "Seraptek Heavy Construct", "Tesseract Vault", "Triarch Stalker", "The Silent King"]),
  'MONSTER': new Set<string>(["C’tan Shard of the Deceiver", "C’tan Shard of the Nightbringer", "C’tan Shard of the Void Dragon", "Transcendent C’tan"]),
  'TITANIC': new Set<string>(["Monolith", "Obelisk", "Seraptek Heavy Construct", "Tesseract Vault"]),
  'DESTROYER CULT': new Set<string>(["Hexmark Destroyer", "Lokhust Destroyers", "Lokhust Heavy Destroyers", "Lokhust Lord", "Nekrosor Ammentar", "Ophydian Destroyers", "Skorpekh Destroyers", "Skorpekh Lord"]),
  'CRYPTEK': new Set<string>(["Chronomancer", "Geomancer", "Illuminor Szeras", "Orikan the Diviner", "Plasmancer", "Psychomancer", "Technomancer"]),
  'MOUNTED': new Set<string>(["Lokhust Destroyers", "Lokhust Heavy Destroyers", "Lokhust Lord", "Tomb Blades"]),
};
