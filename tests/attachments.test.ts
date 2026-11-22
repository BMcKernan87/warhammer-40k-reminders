import { it, expect } from 'vitest';
import { attachLeader, eligibleBodyguards, removeUnit } from '../src/attachments';
import { armySchema, resizeUnit } from '../src/army';
import { profileFor } from '../src/sources';
import { generateReminders } from '../src/generated-reminders';
import { roster } from './fixtures';

it('assigns Feel No Pain only to the chosen Wraith squad and includes its Leader in Wraith Form', () => {
  const army = roster('necrons', 'technomancer', 'canoptek-wraiths', 'canoptek-wraiths', 'lychguard');
  const [leader, a, b] = army.units;
  expect(eligibleBodyguards(army, leader)).toEqual([a, b]);
  expect(generateReminders(army).some((c) => c.rule.id === 'rites-of-reanimation')).toBe(false);
  const linked = attachLeader(army, leader.key, b.key),
    cards = generateReminders(linked);
  const fnp = cards.filter((c) => c.rule.id === 'rites-of-reanimation');
  expect(fnp).toHaveLength(1);
  expect(fnp[0].subject).toBe('Canoptek Wraiths #2 + Technomancer');
  expect(fnp[0].rule.effect).toMatch(/Feel No Pain 5/);
  expect(cards.filter((c) => c.rule.id === 'wraith-form').map((c) => c.subject)).toEqual([
    'Canoptek Wraiths #1',
    'Canoptek Wraiths #2 + Technomancer',
  ]);
  expect(generateReminders(removeUnit(linked, b.key)).some((c) => c.rule.id === 'rites-of-reanimation')).toBe(
    false,
  );
  expect(armySchema.parse(removeUnit(linked, b.key)).units[0].bodyguard).toBeNull();
});
it('resolves weapons, Bodyguard abilities, enhancement and detachment for one of two Immortal squads', () => {
  const army = roster('necrons', 'immortals', 'immortals', 'overlord', 'plasmancer');
  const [first, second, noble, cryptek] = army.units;
  second.gear.ranged = ['tesla-carbine'];
  cryptek.enhancement = 'nether-realm-casket';
  const linked = attachLeader(attachLeader(army, cryptek.key, second.key), noble.key, second.key);
  const cards = generateReminders(armySchema.parse(linked));
  const formation = 'Immortals #2 + Overlord + Plasmancer';
  for (const id of ['plasmancer-critical', 'nether-casket', 'awakened-command-protocols'])
    expect(cards.filter((c) => c.rule.id === id).every((c) => c.subject === formation)).toBe(true);
  expect(cards.find((c) => c.rule.id === 'plasmancer-critical')?.interaction?.effect).toContain('two hits');
  expect(
    cards
      .filter((c) => c.rule.id === 'immortals-eradication' && c.slot.phase === 'Fight')
      .map((c) => c.subject),
  ).toEqual(['Immortals #1', formation]);
  expect(cards.find((c) => c.rule.id === 'overlord-resilience')?.subject).toBe('Overlord');
  expect(cards.filter((c) => c.rule.id === 'immortals-gauss').map((c) => c.instances)).toEqual([[first.key]]);
  const moved = attachLeader(linked, cryptek.key, first.key);
  expect(
    generateReminders(moved).find((c) => c.rule.id === 'plasmancer-critical')?.interaction?.effect,
  ).toContain('automatically wound');
  expect(
    generateReminders(attachLeader(moved, cryptek.key, null)).some((c) =>
      ['nether-casket', 'plasmancer-critical'].includes(c.rule.id),
    ),
  ).toBe(false);
});
it('rejects dangling links, invalid sheets, self links, two Crypteks and third Leaders in both directions', () => {
  const army = roster('necrons', 'immortals', 'overlord', 'plasmancer', 'technomancer', 'lychguard');
  const [body, noble, cryptek, tech, lych] = army.units;
  expect(() => attachLeader(army, tech.key, lych.key)).toThrow();
  expect(() => attachLeader(army, tech.key, 'missing')).toThrow();
  expect(() => attachLeader(army, tech.key, tech.key)).toThrow();
  const led = attachLeader(army, cryptek.key, body.key);
  expect(() => attachLeader(led, tech.key, body.key)).toThrow();
  const full = attachLeader(led, noble.key, body.key);
  expect(() => attachLeader(full, tech.key, body.key)).toThrow();
  expect(
    armySchema.safeParse({
      ...full,
      units: full.units.map((u) => (u.key === tech.key ? { ...u, bodyguard: body.key } : u)),
    }).success,
  ).toBe(false);
  const reverse = attachLeader(attachLeader(army, noble.key, body.key), cryptek.key, body.key);
  expect(armySchema.safeParse(reverse).success).toBe(true);
});
it('requires a Noble in the Lychguard formation for Guardian Protocols', () => {
  const army = roster('necrons', 'lychguard', 'overlord', 'immortals');
  const [lych, noble, other] = army.units;
  const has = (a: typeof army) => generateReminders(a).some((c) => c.rule.id === 'lychguard-protocols');
  expect(has(attachLeader(army, noble.key, other.key))).toBe(false);
  expect(has(attachLeader(army, noble.key, lych.key))).toBe(true);
});
it('applies the Boyz two-Leader exception only to a twenty-model mob', () => {
  const army = roster('orks', 'boyz', 'warboss', 'warboss');
  const [mob, a, b] = army.units;
  expect(() => attachLeader(attachLeader(army, a.key, mob.key), b.key, mob.key)).toThrow();
  army.units[0] = resizeUnit(mob, profileFor('orks', 'boyz')!, 20);
  const linked = attachLeader(attachLeader(army, a.key, mob.key), b.key, mob.key);
  expect(armySchema.safeParse(linked).success).toBe(true);
  const cards = generateReminders(linked);
  expect(cards.filter((c) => c.rule.id === 'warboss-might')).toHaveLength(1);
  expect(new Set(cards.map((c) => c.id)).size).toEqual(cards.length);
});
