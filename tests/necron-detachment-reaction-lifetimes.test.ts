import {describe, expect, it} from 'vitest';
import {addSelectionUnit, newSelection} from '../src/catalog';
import {expandRoster, individualArmy, setInstanceAttachment, setInstanceEquipment} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
import {remainingNecronReminders} from '../src/necron-remaining-detachments';
import {canoptekHypercryptReminders} from '../src/necron-canoptek-hypercrypt';
import {targetedNecronEnhancements} from '../src/necron-targeted-enhancements';
import {necronFormationRoots} from '../src/necron-retinues';

// Current source records, checked against the November 23 11e export:
// https://wahapedia.ru/wh40k11ed/factions/necrons/
// https://wahapedia.ru/wh40k11ed/factions/necrons/Deathmarks
// Publisher Necrons v1.3 pp5,10: selected Starshatter durations and Cold Fervour.
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf
// Core15.08–09: Overwatch uses snap shooting; Hit modifiers/re-rolls and Critical
// Hits do not apply. Critical Wounds are still possible. Hyperspace Hunters
// instead permits normal shooting in the opponent's Movement phase.
// https://wahapedia.ru/wh40k11ed/the-rules/core-rules/#SNAP-SHOOTING

const force = (detachment: string, ...units: string[]) => individualArmy({
  ...units.reduce((army, unit) => addSelectionUnit(army, unit), newSelection('Necrons')),
  detachments2026: [detachment]
});
const upgrade = (army: ReturnType<typeof force>, id: string, name: string) => ({
  ...army, upgrades2026: {...army.upgrades2026, [id]: name}
});
const movement = (army: ReturnType<typeof force>, name: string) =>
  generate11thReminders(army).filter(rule => rule.window === 'Movement' && rule.title.includes(name));

describe('persistent Necron detachment effects during legal Movement attacks', () => {
  it('applies Casket only to its original leading formation, including incoming Overwatch', () => {
    const army = upgrade(setInstanceAttachment(force('Awakened Dynasty', 'Immortals', 'Immortals', 'Overlord'),
      'Overlord#1', 'Immortals#2'), 'Overlord#1', 'Nether-realm Casket');
    expect(movement(army, 'Nether-realm Casket')).toMatchObject([
      {units: ['Overlord#1', 'Immortals#2'], summary: expect.stringMatching(/Fire Overwatch.*Stealth.*Benefit of Cover/)}
    ]);
    const surviving = expandRoster(army).filter(model => model.unit !== 'Overlord');
    expect(remainingNecronReminders(army, surviving).some(rule => rule.title.includes('Nether-realm Casket'))).toBe(false);
    expect(movement(setInstanceAttachment(army, 'Overlord#1', null), 'Nether-realm Casket')).toEqual([]);
  });

  it('retains a living Fulcrum source after its original Bodyguard dies and never gives it to another squad', () => {
    const army = upgrade(setInstanceAttachment(force('Canoptek Court', 'Immortals', 'Immortals', 'Plasmancer'),
      'Plasmancer#1', 'Immortals#2'), 'Plasmancer#1', 'Hyperphasic Fulcrum');
    expect(movement(army, 'Hyperphasic Fulcrum')).toMatchObject([{units: ['Plasmancer#1', 'Immortals#2']}]);
    const live = expandRoster(army).filter(model => model.unit === 'Plasmancer');
    expect(canoptekHypercryptReminders(army, live).find(rule => rule.window === 'Movement' && rule.title.includes('Hyperphasic Fulcrum')))
      .toMatchObject({units: ['Plasmancer#1'], summary: expect.stringMatching(/Fire Overwatch.*wholly inside the matrix.*Wound/)});
  });

  it('keeps Annihilation ranged AP for armed Destroyer Cult formations, not unrelated or melee-only units', () => {
    const army = force('Annihilation Legion', 'Lokhust Heavy Destroyers', 'Skorpekh Destroyers', 'Immortals', 'Flayed Ones');
    expect(movement(army, 'Annihilation Protocol')).toMatchObject([
      {units: ['Lokhust Heavy Destroyers#1'], summary: expect.stringContaining('closest eligible target')}
    ]);
  });

  it('preserves Critical Wound benefits during snap shots and drops them when the formation has no gun', () => {
    const army = upgrade(setInstanceEquipment(setInstanceAttachment(force('Annihilation Legion', 'Lychguard', 'Overlord'),
      'Overlord#1', 'Lychguard#1'), 'Overlord#1', 'Staff of light'), 'Overlord#1', 'Ingrained Superiority');
    expect(movement(army, 'Ingrained Superiority')).toMatchObject([
      {units: ['Overlord#1', 'Lychguard#1'], summary: expect.stringMatching(/Critical Wounds.*cannot score Critical Hits.*still score Critical Wounds/)}
    ]);
    const melee = upgrade(setInstanceAttachment(force('Annihilation Legion', 'Lychguard', 'Overlord with translocation shroud'),
      'Overlord with translocation shroud#1', 'Lychguard#1'), 'Overlord with translocation shroud#1', 'Ingrained Superiority');
    expect(movement(melee, 'Ingrained Superiority')).toEqual([]);
  });

  it('retains a previously selected Worthy Foe for actual ranged attackers and states its expiry', () => {
    const army = force('Obeisance Phalanx', 'Triarch Stalker', 'Lychguard', 'Deathmarks');
    expect(movement(army, 'Worthy Foes')).toMatchObject([
      {units: ['Triarch Stalker#1'], summary: expect.stringMatching(/marked in your Command phase.*\+1 to Wound.*expires at the start of your next Command/)}
    ]);
  });

  it('includes a permitted Movement kill in Honourable Combatant', () => {
    const army = upgrade(setInstanceEquipment(force('Obeisance Phalanx', 'Overlord'), 'Overlord#1', 'Staff of light'),
      'Overlord#1', 'Honourable Combatant');
    expect(movement(army, 'Honourable Combatant')).toMatchObject([
      {units: ['Overlord#1'], summary: expect.stringMatching(/destroys an enemy Character unit.*Movement-phase shooting.*loses 1 CP/)}
    ]);
  });

  it('gives Cold Fervour to inherent Destroyer Cult Monsters while preserving the other models’ exclusions', () => {
    const army = force('Cursed Legion', 'Nekrosor Ammentar', 'Lokhust Heavy Destroyers', 'Immortals', 'Canoptek Wraiths', 'Monolith', 'C’tan Shard of the Nightbringer');
    const rows = generate11thReminders(army).filter(rule => rule.title === 'Cursed Legion · Cold Fervour');
    for (const window of ['Movement', 'Shooting']) expect(rows.find(rule => rule.window === window)?.units)
      .toEqual(['Nekrosor Ammentar#1', 'Lokhust Heavy Destroyers#1', 'Immortals#1']);
    expect(rows.find(rule => rule.window === 'Fight')?.units)
      .toEqual(['Nekrosor Ammentar#1', 'Lokhust Heavy Destroyers#1', 'Immortals#1', 'Canoptek Wraiths#1']);
    expect(rows.find(rule => rule.window === 'Movement')?.summary).toMatch(/first Destroyer Cult unit this turn.*until turn end/);
  });

  it('does not manufacture Destroyer Cult through an ineligible imported enhancement', () => {
    const army = upgrade(force('Cursed Legion', 'Immortals'), 'Immortals#1', 'Murdermind');
    expect(generate11thReminders(army).some(rule => /Cold Fervour|Image of Death/.test(rule.title))).toBe(false);
  });
});

describe('normal Deathmark reactions stay distinct from snap shooting', () => {
  it('offers a Phasal Subjugator Hit modifier only to the Deathmarks reaction in Movement', () => {
    const army = upgrade(force('Awakened Dynasty', 'Overlord', 'Deathmarks', 'Immortals', 'Lychguard'), 'Overlord#1', 'Phasal Subjugator');
    expect(movement(army, 'Phasal Subjugator')).toMatchObject([
      {units: ['Deathmarks#1'], summary: expect.stringMatching(/normal Hyperspace Hunters.*living bearer.*does not change.*snap shooting/)}
    ]);
    expect(generate11thReminders(army).find(rule => rule.window === 'Shooting' && rule.title.includes('Phasal Subjugator'))?.units)
      .toEqual(['Deathmarks#1', 'Immortals#1']);
  });

  it('offers Starshatter’s Hit modifier during normal Hunters fire, not ordinary Overwatch-only units', () => {
    const army = force('Starshatter Arsenal', 'Deathmarks', 'Lokhust Heavy Destroyers', 'Immortals');
    expect(movement(army, 'Relentless Onslaught')).toMatchObject([
      {turn: 'opponent', units: ['Deathmarks#1'], summary: expect.stringMatching(/normal Hyperspace Hunters.*objective marker.*snap shooting/)}
    ]);
    expect(movement(force('Starshatter Arsenal', 'Lokhust Heavy Destroyers'), 'Relentless Onslaught')).toEqual([]);
  });

  it('separates Dread Majesty’s Wound re-rolls from the Hit re-rolls forbidden in snap shooting', () => {
    const army = upgrade(force('Starshatter Arsenal', 'Overlord', 'Deathmarks', 'Lokhust Heavy Destroyers', 'Monolith', 'C’tan Shard of the Nightbringer'),
      'Overlord#1', 'Dread Majesty');
    const row = movement(army, 'Dread Majesty')[0];
    expect(row.units).toEqual(expect.arrayContaining(['Deathmarks#1', 'Lokhust Heavy Destroyers#1']));
    expect(row.units).not.toEqual(expect.arrayContaining(['Monolith#1']));
    expect(row.units).not.toEqual(expect.arrayContaining(['C’tan Shard of the Nightbringer#1']));
    expect(row.summary).toMatch(/re-roll Wound rolls of 1.*Normal reaction shots.*Hit rolls of 1.*snap shooting cannot re-roll Hit rolls/);
  });
});

describe('selected effects and living-source requirements', () => {
  it.each(['Demanding Leader', 'Chrono-impedance Fields'])('retains %s only as a conditional carryover after its source dies', name => {
    const army = upgrade(force('Starshatter Arsenal', 'Overlord', 'Tomb Blades', 'Monolith', 'Immortals'), 'Overlord#1', name);
    const live = expandRoster(army).filter(model => model.unit !== 'Overlord');
    const rows = targetedNecronEnhancements(army, necronFormationRoots(army, live)).filter(rule => rule.title.includes(name));
    expect(rows.some(rule => rule.window === 'Command')).toBe(false);
    expect(rows.find(rule => rule.window === 'Movement')).toMatchObject({
      units: ['Tomb Blades#1'], summary: expect.stringMatching(/Only if this unit was chosen.*until the start of your next Command phase.*bearer is destroyed/)
    });
    expect(rows.every(rule => rule.units?.join() === 'Tomb Blades#1')).toBe(true);
  });

  it('keeps Chrono-impedance’s Movement defence on eligible Vehicle/Mounted targets only', () => {
    const army = upgrade(force('Starshatter Arsenal', 'Overlord', 'Tomb Blades', 'Doomsday Ark', 'Monolith', 'Immortals'), 'Overlord#1', 'Chrono-impedance Fields');
    expect(movement(army, 'Chrono-impedance Fields')).toMatchObject([
      {units: ['Tomb Blades#1', 'Doomsday Ark#1'], summary: expect.stringContaining('subtract 1 from the Damage')}
    ]);
  });

  it('ends an aura with its bearer instead of extending it as a selected effect', () => {
    const army = upgrade(force('Starshatter Arsenal', 'Overlord', 'Deathmarks'), 'Overlord#1', 'Dread Majesty');
    const live = expandRoster(army).filter(model => model.unit !== 'Overlord');
    expect(targetedNecronEnhancements(army, necronFormationRoots(army, live)).some(rule => rule.title.includes('Dread Majesty'))).toBe(false);
  });

  it('rejects a reused bearer ID with a different identity', () => {
    const army = upgrade(force('Starshatter Arsenal', 'Overlord', 'Tomb Blades'), 'Overlord#1', 'Chrono-impedance Fields');
    const live = expandRoster(army).map(model => model.unit === 'Overlord' ? {...model, unit: 'Immortals'} : model);
    expect(targetedNecronEnhancements(army, necronFormationRoots(army, live)).some(rule => rule.title.includes('Chrono-impedance Fields'))).toBe(false);
  });

  it('requires the original surviving Warlord for Your Time Is Nigh', () => {
    const army = {...force('Obeisance Phalanx', 'Overlord', 'Immortals'), warlordId: 'Overlord#1'};
    const rows = (live: ReturnType<typeof expandRoster>) => remainingNecronReminders(army, live).filter(rule => rule.title.includes('Your Time Is Nigh'));
    expect(rows(expandRoster(army))).toHaveLength(5);
    expect(rows(expandRoster(army).filter(model => model.unit !== 'Overlord'))).toEqual([]);
    expect(rows(expandRoster(army).map(model => model.unit === 'Overlord' ? {...model, unit: 'Royal Warden'} : model))).toEqual([]);
  });
});
