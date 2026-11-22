import { test, expect } from 'vitest';
import { generateReminders, completionKey, filterCards } from '../src/generated-reminders';
import { attachLeader } from '../src/attachments';
import { roster, turn } from './fixtures';
test('tracks global, per model, per turn and per phase completion independently', () => {
  const army = roster('necrons', 'overlord', 'overlord', 'immortals', 'technomancer');
  const [a, b, guard, tech] = army.units;
  const cards = generateReminders(attachLeader(attachLeader(army, a.key, guard.key), tech.key, guard.key));
  const pick = (id: string, key?: string) =>
    cards.find((c) => c.rule.id === id && (!key || c.instances.includes(key)))!;
  const cp = pick('core-cp');
  expect(completionKey('a', cp, 1, 'your')).not.toBe(completionKey('a', cp, 1, 'opponent'));
  expect(completionKey('a', cp, 1, 'your')).not.toBe(completionKey('b', cp, 1, 'your'));
  expect(completionKey('a', pick('overlord-my-will', a.key), 1, 'your')).toBe(
    completionKey('a', pick('overlord-my-will', b.key), 1, 'opponent'),
  );
  expect(completionKey('a', pick('overlord-my-will', a.key), 1, 'your')).not.toBe(
    completionKey('a', pick('overlord-my-will', a.key), 2, 'your'),
  );
  const arrow = pick('tachyon-arrow', a.key);
  expect(completionKey('a', arrow, 1, 'your')).toBe(completionKey('a', arrow, 3, 'opponent'));
  expect(completionKey('a', arrow, 1, 'your')).not.toBe(
    completionKey('a', pick('tachyon-arrow', b.key), 1, 'your'),
  );
  const fnp = pick('rites-of-reanimation');
  expect(completionKey('a', fnp, 1, 'your', 'Shooting')).not.toBe(
    completionKey('a', fnp, 1, 'your', 'Fight'),
  );
  expect(filterCards(cards, { phase: 'Deployment', turn: 'both' }, turn).map((c) => c.rule.id)).not.toContain(
    'rites-of-reanimation',
  );
});
test('reassigning a bodyguard cannot reset an orb that has been used', () => {
  const army = roster('necrons', 'overlord', 'immortals', 'lychguard');
  const [lord, a, b] = army.units;
  lord.gear.loadout = ['staff-of-light-and-resurrection-orb'];
  const card = (body: string) =>
    generateReminders(attachLeader(army, lord.key, body)).find((c) => c.rule.id === 'resurrection-orb')!;
  expect(card(a.key).subject).not.toBe(card(b.key).subject);
  expect(completionKey('army', card(a.key), 1, 'your')).toBe(
    completionKey('army', card(b.key), 4, 'opponent'),
  );
});
