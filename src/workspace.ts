import { z } from 'zod';
import { armySchema, newArmy, newUnit, type Army } from './army';
import { factions, getFaction, normalizedName } from './catalog';
import { createBattle, validateBattleState, type BattleState } from './engine';
import { attachLeader } from './attachments';
import { windowSchema } from './data/schema';
import { generateReminders, completionKey } from './generated-reminders';

export const storageKey = 'w40k-armies-v2';
const oldArmy = 'w40k-reminders-army-v1',
  oldBattle = 'w40k-reminders-v2',
  oldMarks = 'w40k-reminders-completed-v1';
const nameSchema = z.string().trim().min(1).max(100);
const labels = z.array(z.string().max(10000)).max(25000);
const settingsSchema = z.object({
  mode: z.enum(['edit', 'play']),
  phase: z.union([z.enum(['all', 'current']), windowSchema]),
  turn: z.enum(['both', 'your', 'opponent']),
  showCompleted: z.boolean(),
  showHidden: z.boolean(),
  collapsed: labels,
  side: z.enum(['A', 'B']),
});
export const preferences = (): Settings => ({
  mode: 'edit',
  phase: 'all',
  turn: 'both',
  showCompleted: false,
  showHidden: false,
  collapsed: [],
  side: 'A',
});
export type Settings = z.infer<typeof settingsSchema>;
const recordSchema = z.object({
  id: z.string().min(1).max(100),
  name: nameSchema,
  army: armySchema,
  settings: settingsSchema,
  completed: labels,
  hidden: labels,
  battle: z.custom<BattleState>(validateBattleState),
});
export type SavedArmy = z.infer<typeof recordSchema>;
export type Workspace = { version: 2; active: string; armies: SavedArmy[] };
const workspaceSchema = z
  .object({ version: z.literal(2), active: z.string(), armies: z.array(recordSchema).nonempty() })
  .refine(
    (w) =>
      w.armies.some((a) => a.id === w.active) && new Set(w.armies.map((a) => a.id)).size === w.armies.length,
  );
export function makeRecord(army = newArmy(), name = getFaction(army.faction).name + ' army'): SavedArmy {
  return {
    id: crypto.randomUUID(),
    name: nameSchema.parse(name),
    army,
    settings: preferences(),
    completed: [],
    hidden: [],
    battle: createBattle(),
  };
}
export function addRecord(w: Workspace, record: SavedArmy): Workspace {
  const names = new Set(w.armies.map((a) => a.name.toLowerCase()));
  let name = record.name;
  for (let n = 2; names.has(name.toLowerCase()); n++)
    name = record.name.slice(0, 100 - String(n).length - 3) + ' (' + n + ')';
  return { ...w, active: record.id, armies: [...w.armies, { ...record, name }] };
}
export function removeRecord(w: Workspace, id: string): Workspace {
  const rest = w.armies.filter((a) => a.id !== id);
  if (!rest.length) rest.push(makeRecord());
  return { ...w, active: w.active === id ? rest[0].id : w.active, armies: rest };
}
const oldProfiles = 'w40k-reminders-profiles-v1';
const legacySchema = z
  .object({
    faction: z.string(),
    detachment: z.string(),
    units: z.record(z.number().int().min(1).max(30)),
    equipment: z.record(z.string()).optional(),
    attachments: z.record(z.string()).optional(),
  })
  .strict();
const legacyGear: Record<string, { slot: string; values: Record<string, string> }> = {
  immortals: {
    slot: 'ranged',
    values: { 'Gauss blaster': 'gauss-blaster', 'Tesla carbine': 'tesla-carbine' },
  },
  boyz: { slot: 'boy', values: { 'Slugga and choppa': 'slugga-and-choppa', Shoota: 'shoota' } },
  termagants: {
    slot: 'ranged',
    values: { Fleshborer: 'fleshborer', Devourer: 'termagant-devourer', Spinefists: 'termagant-spinefists' },
  },
};
export function migrateArmy(value: unknown): Army {
  const old = legacySchema.parse(value);
  const faction = factions.find((f) => f.name === old.faction);
  if (!faction) throw Error('Unrecognized legacy faction.');
  const marineHero = Object.keys(old.units).some((n) => ['Marneus Calgar', 'Roboute Guilliman'].includes(n));
  const chosen = faction.id === 'space-marines' && marineHero ? getFaction('ultramarines') : faction;
  let army = newArmy(chosen.id);
  if (Object.keys(old.equipment ?? {}).some((n) => !old.units[n])) throw Error('Equipment without a unit.');
  const det = chosen.detachments.find((d) => normalizedName(d.name) === normalizedName(old.detachment));
  if (det) army.detachment = det.id;
  else if (old.detachment !== 'Select detachment (unverified)')
    throw Error('Unrecognized legacy detachment.');
  for (const [name, quantity] of Object.entries(old.units)) {
    const unit = chosen.units.find((u) => u.id === normalizedName(name));
    if (!unit) {
      army.unresolved.push({ name, quantity });
      continue;
    }
    for (let i = 0; i < quantity; i++) {
      const entry = newUnit(chosen.id, unit.id);
      const choice = old.equipment?.[name];
      if (choice !== undefined) {
        const slot = legacyGear[unit.id],
          id = slot?.values[choice];
        if (!slot || !id) throw Error('Invalid legacy equipment selection.');
        entry.gear[slot.slot] = entry.gear[slot.slot].map(() => id);
      }
      const candidate = { ...army, units: [...army.units, entry] };
      if (!armySchema.safeParse(candidate).success) {
        army.unresolved.push({ name, quantity: quantity - i });
        break;
      }
      army.units.push(entry);
    }
  }
  for (const [leader, bodyguard] of Object.entries(old.attachments ?? {})) {
    if (!old.units[leader] || !old.units[bodyguard])
      throw Error('A saved attachment references a missing unit.');
    const leaders = army.units.filter((u) => u.unit === normalizedName(leader)),
      bodies = army.units.filter((u) => u.unit === normalizedName(bodyguard));
    if (leaders.length === 1 && bodies.length === 1) {
      try {
        army = attachLeader(army, leaders[0].key, bodies[0].key);
        continue;
      } catch {
        /* Preserve a pairing that needs review. */
      }
    }
    army.attachmentNotes.push({ leader, bodyguard });
  }
  return armySchema.parse(army);
}
export function decodeWorkspace(raw: string): Workspace {
  return workspaceSchema.parse(JSON.parse(raw));
}
function readLegacy(storage: Storage, key: string): unknown {
  const value = storage.getItem(key);
  return value === null ? null : JSON.parse(value);
}
const legacyRuleIds: Record<string, string> = {
  'equipment-Immortals-Gauss blaster': 'immortals-gauss',
  'equipment-Immortals-Tesla carbine': 'tesla-carbines',
  'equipment-Boyz-Shoota': 'boyz-shoota',
  'equipment-Boyz-Slugga and choppa': 'boyz-slugga',
  'equipment-Termagants-Fleshborer': 'gant-fleshborer',
  'equipment-Termagants-Devourer': 'gant-devourer',
  'equipment-Termagants-Spinefists': 'gant-spinefists',
};
export function migrateMarks(record: SavedArmy, marks: unknown[]): string[] {
  const cards = generateReminders(record.army),
    result = new Set<string>();
  for (const key of marks) {
    if (typeof key !== 'string') continue;
    const [round, player, oldWindow, oldId] = key.split(':');
    const turn = player === 'A' ? 'your' : 'opponent';
    if (!oldId || !['A', 'B'].includes(player) || !Number.isSafeInteger(+round) || +round < 1) continue;
    let id = legacyRuleIds[oldId] ?? oldId;
    let guard: string | undefined;
    for (const [suffix, target] of [
      ['technomancer-fnp', 'rites-of-reanimation'],
      ['plasmancer-critical', 'plasmancer-critical'],
      ['chronomancer-mantle', 'chronomancer-mantle'],
    ]) {
      if (oldId.startsWith('attached-') && oldId.endsWith('-' + suffix)) {
        id = target;
        guard = normalizedName(
          oldId
            .slice(9, -suffix.length - 1)
            .split('-')
            .slice(1)
            .join('-'),
        );
      }
    }
    const candidates = cards.filter(
      (c) =>
        c.rule.id === id &&
        (!guard || record.army.units.some((u) => u.unit === guard && c.instances.includes(u.key))) &&
        (c.slot.phase === oldWindow ||
          c.slot.phase === 'Any phase' ||
          (c.slot.phase === 'Turn end' && oldWindow === 'End of opponent turn')) &&
        (c.slot.turn === turn || c.slot.turn === 'neutral' || c.slot.turn === 'either'),
    );
    if (candidates.length === 1)
      result.add(
        completionKey(record.id, candidates[0], +round, turn, windowSchema.safeParse(oldWindow).data),
      );
    else result.add('legacy/' + key);
  }
  return [...result];
}
export function loadWorkspace(storage: Storage): Workspace {
  const stored = storage.getItem(storageKey);
  if (stored !== null) return decodeWorkspace(stored);
  const old = readLegacy(storage, oldProfiles);
  if (old !== null) {
    const parsed = z
      .object({
        activeId: z.string(),
        profiles: z
          .array(
            z.object({
              id: z.string().min(1),
              name: nameSchema,
              army: legacySchema,
              battle: z.custom<BattleState>(validateBattleState),
              completed: labels,
            }),
          )
          .nonempty(),
      })
      .parse(old);
    const armies = parsed.profiles.map((p) => {
      const a = { ...makeRecord(migrateArmy(p.army), p.name), id: p.id, battle: p.battle };
      a.completed = migrateMarks(a, p.completed);
      return a;
    });
    return workspaceSchema.parse({ version: 2, active: parsed.activeId, armies });
  }
  const raw = readLegacy(storage, oldArmy);
  const record = makeRecord(raw ? migrateArmy(raw) : newArmy());
  const battle = readLegacy(storage, oldBattle);
  if (validateBattleState(battle)) record.battle = battle;
  const marks = readLegacy(storage, oldMarks);
  if (Array.isArray(marks)) record.completed = migrateMarks(record, marks);
  return { version: 2, active: record.id, armies: [record] };
}
const exportSchema = z
  .object({ format: z.literal('w40k-army'), version: z.literal(2), name: nameSchema, army: armySchema })
  .strict();
export function exportArmy(a: SavedArmy) {
  return JSON.stringify({ format: 'w40k-army', version: 2, name: a.name, army: a.army });
}
export function importArmy(text: string): SavedArmy {
  if (text.length > 1000000) throw Error('Army file exceeds 1 MB.');
  const value = JSON.parse(text);
  if (value?.format === 'w40k-army' && value.version === 1)
    return makeRecord(migrateArmy(value.army), nameSchema.parse(value.name));
  const result = exportSchema.safeParse(value);
  if (!result.success) throw Error('Invalid army file. Check the version, faction and unit options.');
  return makeRecord(result.data.army, result.data.name);
}
export function shareUrl(a: SavedArmy, location: string) {
  const url = new URL(location);
  url.hash = 'army=' + encodeURIComponent(exportArmy(a));
  return url.href;
}
export function readShare(hash: string) {
  return hash.startsWith('#army=') ? importArmy(decodeURIComponent(hash.slice(6))) : null;
}
export function downloadJson(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
