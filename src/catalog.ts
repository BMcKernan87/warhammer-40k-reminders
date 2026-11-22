import { z } from 'zod';
import snapshot from './data/catalog.json';

export const identifier = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const sourceUrl = z
  .string()
  .url()
  .refine(
    (url) => url.startsWith('https://wahapedia.ru/wh40k10ed/'),
    'Expected a 10th-edition Wahapedia source',
  );
export const checkedDate = z.string().date();
const named = z.object({ id: identifier, name: z.string().trim().min(1) });
const unitSchema = named.extend({
  path: z
    .string()
    .regex(/^[\w.%’'()-]+$/u)
    .optional(),
  chapter: identifier.optional(),
  exceptChapters: z.array(identifier).optional(),
});
const detachmentSchema = named.extend({ sourceId: z.string().min(1), chapter: identifier.optional() });
const familySchema = named.extend({
  source: sourceUrl,
  sourceId: z.string().min(1),
  units: z.array(unitSchema).nonempty(),
  detachments: z.array(detachmentSchema).nonempty(),
});
export type Unit = z.infer<typeof unitSchema>;
export type Detachment = z.infer<typeof detachmentSchema>;
export type Faction = {
  id: string;
  name: string;
  family: string;
  source: string;
  units: Unit[];
  detachments: Detachment[];
};
export function uniqueIds(items: { id: string }[], label: string) {
  if (new Set(items.map((item) => item.id)).size !== items.length) throw Error('Duplicate ID in ' + label);
}
const index = z
  .object({
    edition: z.literal('10e'),
    indexedOn: checkedDate,
    families: z.array(familySchema),
    chapters: z.array(named),
  })
  .parse(snapshot);
export const indexedOn = index.indexedOn;
const chapters = new Set(index.chapters.map((chapter) => chapter.id));
export const factions: Faction[] = [];
for (const family of index.families) {
  uniqueIds(family.units, family.name + ' datasheets');
  uniqueIds(family.detachments, family.name + ' detachments');
  for (const entry of [...family.units, ...family.detachments]) {
    if (entry.chapter && (family.id !== 'space-marines' || !chapters.has(entry.chapter)))
      throw Error('Unknown chapter on ' + entry.id);
  }
  const options = family.id === 'space-marines' ? [family, ...index.chapters] : [family];
  for (const option of options) {
    factions.push({
      id: option.id,
      name: option.name,
      family: family.id,
      source: family.source,
      units: family.units.filter(
        (u) => (!u.chapter || u.chapter === option.id) && !u.exceptChapters?.includes(option.id),
      ),
      detachments: family.detachments.filter((d) => !d.chapter || d.chapter === option.id),
    });
  }
}
uniqueIds(factions, 'factions');
factions.sort((a, b) => a.name.localeCompare(b.name));
export const factionsById = new Map(factions.map((f) => [f.id, f]));
export function getFaction(id: string): Faction {
  const faction = factionsById.get(id);
  if (!faction) throw Error('Unknown faction ' + id);
  return faction;
}
export function datasheetUrl(faction: Faction, unit: Unit) {
  return unit.path ? faction.source + unit.path : undefined;
}
export function normalizedName(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
