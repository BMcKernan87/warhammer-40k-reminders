import { test, expect } from 'vitest';
import { generateReminders, filterCards } from '../src/generated-reminders';
import { removeUnit } from '../src/attachments';
import { setDetachment, newArmy } from '../src/army';
import { rules } from '../src/data/rules';
import { roster, turn } from './fixtures';
test('changes phase, timing, owner and Stratagems when switching detachments', () => {
  const a = newArmy(),
    awake = generateReminders(a),
    hyper = generateReminders(setDetachment(a, 'hypercrypt-legion'));
  expect(awake.filter((c) => c.rule.id === 'necron-reanimation').map((c) => c.slot)).toEqual([
    { phase: 'Command', timing: 'end', turn: 'your' },
  ]);
  expect(
    new Set(
      awake
        .filter((c) => c.rule.scope.kind === 'stratagem' && c.rule.scope.detachment === 'awakened-dynasty')
        .map((c) => c.rule.id),
    ).size,
  ).toBe(6);
  expect(hyper.some((c) => c.rule.id === 'hungry-void')).toBe(false);
  expect(filterCards(hyper, { phase: 'Turn end', turn: 'opponent' }, turn).map((c) => c.rule.id)).toContain(
    'hypercrypt-hyperphasing',
  );
  expect(filterCards(hyper, { phase: 'Turn end', turn: 'your' }, turn)).toEqual([]);
  expect(
    filterCards(hyper, { phase: 'current', turn: 'both' }, { ...turn, turn: 'opponent' }).some(
      (c) => c.rule.id === 'necron-reanimation',
    ),
  ).toBe(false);
  expect(hyper.some((c) => c.rule.id === 'marine-oath')).toBe(false);
  expect(generateReminders(newArmy('ultramarines')).some((c) => c.rule.id === 'marine-oath')).toBe(true);
});
test('adding and removing a unit controls its sourced abilities', () => {
  const army = roster('necrons', 'hexmark-destroyer');
  expect(
    generateReminders(army)
      .filter((c) => c.rule.id === 'hexmark-retaliation')
      .map((c) => c.slot.turn),
  ).toEqual(['opponent']);
  expect(
    generateReminders(removeUnit(army, army.units[0].key)).some((c) => c.rule.id === 'hexmark-retaliation'),
  ).toBe(false);
});
test('all twenty priority Necron datasheets have a real ability rule', () => {
  const ids =
    'imotekh-the-stormlord orikan-the-diviner technomancer plasmancer chronomancer overlord skorpekh-lord hexmark-destroyer immortals necron-warriors canoptek-wraiths canoptek-scarab-swarms lokhust-heavy-destroyers skorpekh-destroyers lychguard ctan-shard-of-the-nightbringer ctan-shard-of-the-void-dragon doomsday-ark monolith canoptek-doomstalker'.split(
      ' ',
    );
  for (const id of ids)
    expect(
      rules.some((r) => r.scope.kind === 'unit' && r.scope.unit === id && r.source.status === 'checked'),
      id,
    ).toBe(true);
});
