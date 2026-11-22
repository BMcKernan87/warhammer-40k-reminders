import { test, expect, beforeEach } from 'vitest';
import { newArmy, newUnit, armySchema, resizeUnit, enhancementOptions, setDetachment } from '../src/army';
import { profileFor } from '../src/sources';
import { attachLeader } from '../src/attachments';
import { generateReminders } from '../src/generated-reminders';
import {
  makeRecord,
  loadWorkspace,
  addRecord,
  removeRecord,
  importArmy,
  exportArmy,
  readShare,
  shareUrl,
  storageKey,
} from '../src/workspace';
import { createBattle } from '../src/engine';
import { roster } from './fixtures';
beforeEach(() => localStorage.clear());
test('tracks unit copies and model counts separately, and rejects invalid gear', () => {
  const army = roster('necrons', 'lokhust-heavy-destroyers', 'lokhust-heavy-destroyers');
  const a = resizeUnit(army.units[0], profileFor('necrons', 'lokhust-heavy-destroyers')!, 3);
  const group = Object.keys(a.gear)[0];
  a.gear[group][0] = 'enmitic-exterminator';
  army.units[0] = a;
  expect(armySchema.safeParse(army).success).toBe(true);
  expect(generateReminders(army).filter((c) => c.rule.id === 'lokhust-enmitic')).toHaveLength(1);
  expect(generateReminders(army).filter((c) => c.rule.id === 'lokhust-gauss')).toHaveLength(2);
  a.gear[group][2] = 'fake';
  expect(armySchema.safeParse(army).success).toBe(false);
});
test('enforces individual and shared specialist limits and revalidates on resize', () => {
  const a = roster('orks', 'boyz');
  const b = a.units[0];
  b.gear.boy[0] = 'rokkit-launcha';
  b.gear.boy[1] = 'big-shoota';
  expect(armySchema.safeParse(a).success).toBe(false);
  a.units[0] = resizeUnit(b, profileFor('orks', 'boyz')!, 20);
  expect(armySchema.safeParse(a).success).toBe(true);
  a.units[0] = resizeUnit(a.units[0], profileFor('orks', 'boyz')!, 10);
  expect(armySchema.safeParse(a).success).toBe(true);
});
test('validates enhancement eligibility, detachment, uniqueness and the three-enhancement limit', () => {
  const a = roster(
    'necrons',
    'technomancer',
    'overlord',
    'plasmancer',
    'chronomancer',
    'imotekh-the-stormlord',
    'immortals',
  );
  expect(enhancementOptions(a, a.units[4])).toEqual([]);
  expect(enhancementOptions(a, a.units[5])).toEqual([]);
  a.units[0].enhancement = 'veil-of-darkness';
  expect(generateReminders(a).some((c) => c.rule.id === 'veil-depart')).toBe(true);
  expect(enhancementOptions(a, a.units[1]).some((e) => e.id === 'veil-of-darkness')).toBe(false);
  a.units[1].enhancement = 'phasal-subjugator';
  a.units[2].enhancement = 'nether-realm-casket';
  expect(enhancementOptions(a, a.units[3])).toEqual([]);
  expect(armySchema.safeParse(a).success).toBe(true);
  a.units[3].enhancement = 'enaegic-dermal-bond';
  expect(armySchema.safeParse(a).success).toBe(false);
  const h = setDetachment(a, 'hypercrypt-legion');
  expect(h.units.every((u) => u.enhancement === null)).toBe(true);
  expect(generateReminders(h).some((c) => c.rule.id === 'veil-depart')).toBe(false);
});
test('exports, shares, duplicates and deletes without replacing another army or battle', () => {
  const a = roster('necrons', 'technomancer', 'canoptek-wraiths');
  const w = loadWorkspace(localStorage);
  const saved = makeRecord(attachLeader(a, a.units[0].key, a.units[1].key), 'Wraith wing');
  saved.completed = ['old'];
  saved.battle.cp.A = 3;
  const ws = addRecord(w, saved);
  const copy = importArmy(exportArmy(saved));
  const doubled = addRecord(ws, copy);
  expect(copy.army).toEqual(saved.army);
  expect(copy.id).not.toEqual(saved.id);
  expect(copy.completed).toEqual([]);
  expect(copy.battle.cp.A).toBe(0);
  expect(doubled.armies.at(-1)?.name).toBe('Wraith wing (2)');
  expect(readShare(new URL(shareUrl(saved, 'https://example.org/reminders/')).hash)?.army).toEqual(
    saved.army,
  );
  localStorage.setItem(storageKey, JSON.stringify(doubled));
  expect(loadWorkspace(localStorage)).toEqual(doubled);
  expect(removeRecord(doubled, copy.id).armies).toContainEqual(saved);
});
test('rejects bad imports and preserves broken prior storage', () => {
  const a = makeRecord(roster('necrons', 'immortals'));
  for (const invalid of [
    { ...a.army, faction: 'missing' },
    { ...a.army, units: [{ ...a.army.units[0], bodyguard: 'gone' }] },
    { ...a.army, units: [{ ...a.army.units[0], models: 500 }] },
    { ...a.army, units: [{ ...a.army.units[0], gear: { ranged: ['invented'] } }] },
  ])
    expect(() =>
      importArmy(JSON.stringify({ format: 'w40k-army', version: 2, name: 'Imported', army: invalid })),
    ).toThrow();
  localStorage.setItem(storageKey, 'broken');
  expect(() => loadWorkspace(localStorage)).toThrow();
  expect(localStorage.getItem(storageKey)).toBe('broken');
});
test('migrates all deployed profiles, active identity, battle, gear and unambiguous pairings', () => {
  const battle = createBattle();
  battle.cp.B = 4;
  const old = {
    faction: 'Necrons',
    detachment: 'Awakened Dynasty',
    units: { Plasmancer: 1, Immortals: 1 },
    equipment: { Immortals: 'Tesla carbine' },
    attachments: { Plasmancer: 'Immortals' },
  };
  const saved = {
    id: 'default',
    name: 'Dynasty',
    army: old,
    battle,
    completed: ['1:A:Command:necron-reanimation'],
  };
  const orks = {
    id: 'second',
    name: 'Klan',
    army: { faction: 'Orks', detachment: 'War Horde', units: { Boyz: 1 }, equipment: { Boyz: 'Shoota' } },
    battle: createBattle(),
    completed: [],
  };
  const raw = JSON.stringify({ activeId: 'second', profiles: [saved, orks] });
  localStorage.setItem('w40k-reminders-profiles-v1', raw);
  const ws = loadWorkspace(localStorage),
    [first, second] = ws.armies;
  expect(ws.active).toBe('second');
  expect(first.battle.cp.B).toBe(4);
  expect(first.completed[0]).toContain('default:necron-reanimation:');
  expect(first.army.units[0].bodyguard).toBe(first.army.units[1].key);
  expect(first.army.units[1].gear.ranged).toEqual(['tesla-carbine']);
  expect(second.army.units[0].gear.boy).toEqual(Array(9).fill('shoota'));
  expect(localStorage.getItem('w40k-reminders-profiles-v1')).toBe(raw);
});
test('migrates single army saves with ambiguous links and unresolved old datasheets', () => {
  localStorage.setItem(
    'w40k-reminders-army-v1',
    JSON.stringify({
      faction: 'Necrons',
      detachment: 'Awakened Dynasty',
      units: { Technomancer: 1, Immortals: 2 },
      attachments: { Technomancer: 'Immortals' },
    }),
  );
  const a = loadWorkspace(localStorage).armies[0].army;
  expect(a.units).toHaveLength(3);
  expect(a.units[0].bodyguard).toBeNull();
  expect(a.attachmentNotes).toEqual([{ leader: 'Technomancer', bodyguard: 'Immortals' }]);
  const old = { faction: 'Tyranids', detachment: 'Invasion Fleet', units: { 'Tyranid Warriors': 1 } };
  const b = importArmy(JSON.stringify({ format: 'w40k-army', version: 1, name: 'Hive', army: old }));
  expect(b.army.unresolved).toContainEqual({ name: 'Tyranid Warriors', quantity: 1 });
});
