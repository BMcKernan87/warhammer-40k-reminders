import { z } from 'zod';
import { getFaction, factionsById, identifier } from './catalog';
import { profileFor } from './sources';
import { enhancements } from './data/rules';
import { attachmentError } from './attachments';
import type { Profile } from './data/schema';

export const unitEntrySchema = z
  .object({
    key: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    unit: identifier,
    models: z.number().int().positive().nullable(),
    gear: z.record(z.array(identifier)),
    enhancement: identifier.nullable(),
    bodyguard: z.string().min(1).nullable().default(null),
  })
  .strict();
export type UnitEntry = z.infer<typeof unitEntrySchema>;
const shape = z
  .object({
    faction: identifier,
    detachment: identifier,
    units: z.array(unitEntrySchema).max(1000),
    attachmentNotes: z
      .array(z.object({ leader: z.string().min(1).max(120), bodyguard: z.string().min(1).max(120) }))
      .max(100)
      .default([]),
    unresolved: z
      .array(z.object({ name: z.string().min(1).max(120), quantity: z.number().int().positive().max(30) }))
      .max(100)
      .default([]),
  })
  .strict();
export type Army = z.infer<typeof shape>;
export function newArmy(faction = 'necrons'): Army {
  return {
    faction,
    detachment: getFaction(faction).detachments[0].id,
    units: [],
    unresolved: [],
    attachmentNotes: [],
  };
}
export function newUnit(faction: string, unit: string): UnitEntry {
  const f = getFaction(faction);
  if (!f.units.some((u) => u.id === unit)) throw Error('Choose a datasheet from this faction.');
  const p = profileFor(f.family, unit);
  const models = p?.composition.min ?? null;
  const gear = Object.fromEntries(
    (p?.gear || []).map((g) => [
      g.id,
      Array<string>(g.uniform ? 1 : models! - g.offset).fill(g.choices[0].id),
    ]),
  );
  return { key: crypto.randomUUID(), unit, models, gear, enhancement: null, bodyguard: null };
}
type Choice = Profile['gear'][number]['choices'][number];
export function gearLimit(c: Choice, models: number) {
  return c.every ? Math.floor(models / c.every) : c.perTen ? Math.floor(models / 10) * c.perTen : Infinity;
}
export function equipped(entry: UnitEntry, p: Profile | undefined, gear: string) {
  return !!p?.gear.some((group) =>
    entry.gear[group.id]?.some(
      (id) => id === gear || group.choices.find((c) => c.id === id)?.grants?.includes(gear),
    ),
  );
}
export function resizeUnit(entry: UnitEntry, p: Profile, models: number): UnitEntry {
  if (!Number.isInteger(models) || models < p.composition.min || models > p.composition.max)
    throw Error('Choose a listed unit size.');
  const gear = { ...entry.gear };
  for (const group of p.gear.filter((g) => !g.uniform)) {
    const previous = gear[group.id];
    const counts = new Map<string, number>();
    gear[group.id] = Array.from({ length: models - group.offset }, (_, i) => {
      const id = previous[i] ?? group.choices[0].id;
      const choice = group.choices.find((c) => c.id === id)!;
      const bucket = choice.pool ?? id,
        count = (counts.get(bucket) ?? 0) + 1;
      if (count > gearLimit(choice, models)) return group.choices[0].id;
      counts.set(bucket, count);
      return id;
    });
  }
  return { ...entry, models, gear };
}
export function enhancementOptions(army: Army, entry: UnitEntry) {
  const family = getFaction(army.faction).family;
  const p = profileFor(family, entry.unit);
  if (!p || p.keywords.includes('Epic Hero')) return [];
  const used = army.units.filter((u) => u.key !== entry.key && u.enhancement).map((u) => u.enhancement);
  return enhancements.filter(
    (e) =>
      e.family === family &&
      e.detachment === army.detachment &&
      e.requiredKeywords.every((k) => p.keywords.includes(k)) &&
      !used.includes(e.id) &&
      used.length < 3,
  );
}
export function setDetachment(army: Army, detachment: string): Army {
  if (!getFaction(army.faction).detachments.some((d) => d.id === detachment))
    throw Error('Unknown detachment.');
  if (army.detachment === detachment) return army;
  return { ...army, detachment, units: army.units.map((u) => ({ ...u, enhancement: null })) };
}
export const armySchema = shape.superRefine((army, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const faction = factionsById.get(army.faction);
  if (!faction || !faction.detachments.some((d) => d.id === army.detachment))
    return issue('Unknown faction or detachment.');
  const keys = new Set<string>();
  const epicHeroes = new Set<string>();
  for (const entry of army.units) {
    if (keys.has(entry.key)) issue('Each unit needs a unique identity.');
    keys.add(entry.key);
    if (!faction.units.some((u) => u.id === entry.unit)) {
      issue('Unit is unavailable to this faction.');
      continue;
    }
    const p = profileFor(faction.family, entry.unit);
    if (p?.keywords.includes('Epic Hero')) {
      if (epicHeroes.has(entry.unit)) issue('Only one copy of this Epic Hero can be included.');
      epicHeroes.add(entry.unit);
    }
    if (
      p
        ? entry.models === null || entry.models < p.composition.min || entry.models > p.composition.max
        : entry.models !== null
    )
      issue('Invalid model count.');
    if (Object.keys(entry.gear).length !== (p?.gear.length ?? 0)) issue('Invalid equipment groups.');
    for (const group of p?.gear || []) {
      const choices = entry.gear[group.id];
      if (
        !choices ||
        choices.length !== (group.uniform ? 1 : (entry.models ?? 0) - group.offset) ||
        choices.some((id) => !group.choices.some((c) => c.id === id))
      ) {
        issue('Invalid wargear.');
        continue;
      }
      if (
        group.choices.some(
          (c) =>
            choices.filter(
              (id) =>
                id === c.id ||
                (!!c.pool && group.choices.find((choice) => choice.id === id)?.pool === c.pool),
            ).length > gearLimit(c, entry.models ?? 0),
        )
      )
        issue('Too many specialist weapons.');
    }
    if (entry.bodyguard) {
      const body = army.units.find((u) => u.key === entry.bodyguard);
      const error = body ? attachmentError(army, entry, body) : 'Bodyguard is missing from this roster.';
      if (error) issue(error);
    }
    if (entry.enhancement && !enhancementOptions(army, entry).some((e) => e.id === entry.enhancement))
      issue('Ineligible, duplicated or excess enhancement.');
  }
});
