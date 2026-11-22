import { z } from 'zod';
import { identifier, checkedDate, sourceUrl } from '../catalog';

export const windows = [
  'Deployment',
  'Battle start',
  'Battle round',
  'Turn start',
  'Command',
  'Movement',
  'Shooting',
  'Charge',
  'Fight',
  'Turn end',
  'Any phase',
] as const;
export const timings = ['start', 'during', 'end'] as const;
export const windowSchema = z.enum(windows);
export type Window = z.infer<typeof windowSchema>;
export const provenanceSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('checked'),
    url: sourceUrl,
    section: z.string().min(1),
    checkedOn: checkedDate,
    revision: z.string().min(1),
  }),
  z.object({
    status: z.literal('provisional'),
    url: sourceUrl,
    section: z.string().min(1),
    reason: z.string().min(1),
  }),
]);
export type Provenance = z.infer<typeof provenanceSchema>;
const timingSchema = z.object({
  phase: windowSchema,
  timing: z.enum(timings),
  turn: z.enum(['your', 'opponent', 'either', 'neutral']),
});
export type Slot = z.infer<typeof timingSchema>;
const scopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('core') }),
  z.object({ kind: z.literal('army'), family: identifier }),
  z.object({ kind: z.literal('detachment'), family: identifier, detachment: identifier }),
  z.object({ kind: z.literal('unit'), family: identifier, unit: identifier, gear: identifier.optional() }),
  z.object({
    kind: z.literal('enhancement'),
    family: identifier,
    detachment: identifier,
    enhancement: identifier,
  }),
  z.object({
    kind: z.literal('stratagem'),
    family: identifier.optional(),
    detachment: identifier.optional(),
    cp: z.number().int().nonnegative(),
  }),
]);
export const ruleSchema = z.object({
  id: identifier,
  title: z.string().min(1),
  scope: scopeSchema,
  slots: z.array(timingSchema).nonempty(),
  trigger: z.string().min(1),
  conditions: z.array(z.string().min(1)),
  effect: z.string().min(1),
  source: provenanceSchema,
  limit: z.enum(['battle', 'turn', 'round', 'phase']).optional(),
  firstRound: z.boolean().optional(),
  appliesTo: z.enum(['model', 'unit', 'led', 'formations']).default('model'),
  armyLimit: z.boolean().optional(),
  perItem: z.boolean().optional(),
  leaderKeyword: z.string().min(1).optional(),
  interactions: z
    .array(z.object({ bodyguard: identifier, gear: identifier, effect: z.string().min(1) }))
    .optional(),
});
export type Rule = z.infer<typeof ruleSchema>;
export const enhancementSchema = z.object({
  id: identifier,
  name: z.string().min(1),
  family: identifier,
  detachment: identifier,
  requiredKeywords: z.array(z.string()).nonempty(),
  source: provenanceSchema,
});
export type Enhancement = z.infer<typeof enhancementSchema>;
const stats = z.object({
  move: z.string(),
  toughness: z.number().int().positive(),
  save: z.string(),
  wounds: z.number().int().positive(),
  leadership: z.string(),
  oc: z.number().int().nonnegative(),
  invulnerable: z.string().optional(),
});
const weapon = z.object({
  id: identifier,
  name: z.string(),
  range: z.string(),
  attacks: z.string(),
  skill: z.string(),
  strength: z.number().int().positive(),
  ap: z.number().int().nonpositive(),
  damage: z.string(),
  abilities: z.array(z.string()),
});
export const profileSchema = z.object({
  family: identifier,
  unit: identifier,
  source: provenanceSchema,
  keywords: z.array(z.string()).nonempty(),
  composition: z
    .object({ min: z.number().int().positive(), max: z.number().int().positive() })
    .refine((x) => x.max >= x.min),
  characteristics: stats.optional(),
  profileNote: z.string().optional(),
  weapons: z.array(weapon),
  leadersFor: z.array(identifier),
  secondWith: z.array(z.string()).default([]),
  secondLeader: z.object({ models: z.number().int().positive(), keyword: z.string() }).optional(),
  gear: z.array(
    z.object({
      id: identifier,
      label: z.string(),
      uniform: z.boolean(),
      offset: z.number().int().nonnegative().default(0),
      choices: z
        .array(
          z.object({
            id: identifier,
            name: z.string(),
            perTen: z.number().int().positive().optional(),
            grants: z.array(identifier).optional(),
            every: z.number().int().positive().optional(),
            pool: identifier.optional(),
          }),
        )
        .nonempty(),
    }),
  ),
});
export type Profile = z.infer<typeof profileSchema>;
