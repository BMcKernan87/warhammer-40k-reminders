import { it, expect } from 'vitest';
import { factions, getFaction } from '../src/catalog';
import { newArmy, armySchema, newUnit } from '../src/army';
import { generateReminders } from '../src/generated-reminders';
import { roster } from './fixtures';

it.each(factions.map((f) => [f.name, f.id]))(
  '%s loads with valid detachments and selectable units',
  (_, id) => {
    const f = getFaction(id);
    expect(f.detachments.length).toBeGreaterThan(0);
    expect(f.units.length).toBeGreaterThan(0);
    for (const det of f.detachments) {
      expect(det.name).not.toMatch(/unverified|placeholder/i);
      const army = { ...newArmy(id), detachment: det.id, units: [newUnit(id, f.units[0].id)] };
      expect(armySchema.safeParse(army).success).toBe(true);
      const cards = generateReminders(army);
      expect(
        cards.every(
          (c) => !('family' in c.rule.scope) || !c.rule.scope.family || c.rule.scope.family === f.family,
        ),
      ).toBe(true);
      expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
    }
  },
);
it('limits chapter-specific sheets and detachments to their chapter', () => {
  const um = getFaction('ultramarines'),
    ba = getFaction('blood-angels');
  expect(um.units.some((u) => u.id === 'roboute-guilliman')).toBe(true);
  expect(ba.units.some((u) => u.id === 'roboute-guilliman')).toBe(false);
  expect(um.units.some((u) => u.id === 'commander-dante')).toBe(false);
  expect(um.units.some((u) => u.id === 'bladeguard-veteran-squad')).toBe(true);
  expect(() => newUnit('necrons', 'boyz')).toThrow();
});
it('rejects unknown IDs, duplicated Epic Heroes and repeated instance keys', () => {
  const a = roster('necrons', 'imotekh-the-stormlord', 'imotekh-the-stormlord');
  expect(armySchema.safeParse(a).success).toBe(false);
  expect(armySchema.safeParse({ ...a, detachment: 'war-horde' }).success).toBe(false);
  const b = roster('necrons', 'immortals', 'immortals');
  expect(b.units[0].key).not.toBe(b.units[1].key);
  b.units[1].key = b.units[0].key;
  expect(armySchema.safeParse(b).success).toBe(false);
});
