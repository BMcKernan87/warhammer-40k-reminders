import { test, expect } from 'vitest';
import { getFaction, datasheetUrl } from '../src/catalog';
import { coverageFor, profileFor } from '../src/sources';
import { rules } from '../src/data/rules';
test('separates catalog links from rules and reports exact gaps and review dates', () => {
  const f = getFaction('necrons');
  expect(datasheetUrl(f, f.units.find((u) => u.id === 'immortals')!)).toBe(
    'https://wahapedia.ru/wh40k10ed/factions/necrons/Immortals',
  );
  const c = coverageFor('necrons', new Date('2026-11-22'));
  expect(c.missingUnits).toContain('Deathmarks');
  expect(c.missingProfiles).not.toContain('Immortals');
  expect(coverageFor('orks', new Date('2030-01-01')).reviewDue).toContain('orks-waaagh');
  const starter = getFaction('adepta-sororitas');
  expect(datasheetUrl(starter, starter.units[0])).toBeUndefined();
  expect(coverageFor(starter.id).missingDatasheetLinks.length).toBeGreaterThan(0);
  expect(rules.every((r) => r.trigger && r.source.url && r.source.section)).toBe(true);
});
test('exposes reviewed stats, options, weapon profiles and Leader restrictions', () => {
  const p = profileFor('necrons', 'canoptek-wraiths')!;
  expect(p.composition).toEqual({ min: 3, max: 6 });
  expect(p.characteristics).toMatchObject({ wounds: 4, invulnerable: '4+' });
  expect(p.weapons.some((w) => w.name === 'Vicious claws')).toBe(true);
  expect(profileFor('necrons', 'technomancer')?.leadersFor).toContain('canoptek-wraiths');
});
