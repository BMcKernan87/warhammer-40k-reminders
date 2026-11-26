import {z} from 'zod';
import type {Phase} from './engine';

export const ACTIONS = {
  normal: 'Finished a Normal move',
  crossed: 'Finished a Normal move over an enemy',
  advance: 'Selected to Advance',
  fallback: 'Fell Back',
  stationary: 'Remained Stationary',
  shoot: 'Selected to shoot',
  shot: 'Finished shooting',
  shotHit: 'Finished shooting and hit an enemy',
  deathRay: 'Targeted an enemy with the heavy death ray',
  tesla: 'Targeted an enemy with the twin tesla destructor',
  chargeRoll: 'Making a Charge roll',
  charged: 'Finished a Charge move',
  fight: 'Selected to fight',
  targeted: 'Targeted by an enemy attack',
  allocated: 'Allocating an enemy attack',
  enemyAttacks: 'Enemy unit is making attacks',
  enemyAttacked: 'Enemy finished attacking this squad',
  enemyWounded: 'Enemy finished attacking and this squad lost wounds',
  meleeCasualty: 'A model died to melee before it fought',
  killed: 'Destroyed an enemy unit',
  meleeKill: 'Destroyed an enemy model in this Fight phase',
  reanimate: 'Reanimation Protocols activated',
  overwatch: 'Targeted with Fire Overwatch',
  stratagem: 'Targeted with a Stratagem',
  arrival: 'Enemy arrived from reserves in the Reinforcements step',
} as const;
export type Action = keyof typeof ACTIONS;
export type Signal = Action | 'phaseStart' | 'phaseEnd';
const enumKeys = Object.keys(ACTIONS) as [Action,...Action[]];
export const observationSchema = z.object({
  action: z.enum(enumKeys),
  squadId: z.string().min(1).optional(),
  range: z.number().finite().nonnegative().optional(),
  target: z.enum(['other','monster','vehicle']).optional(),
  onObjective: z.boolean().optional(),
  enemyObjective: z.boolean().optional(),
  belowHalf: z.boolean().optional(),
  closest: z.boolean().optional(),
  unengaged: z.boolean().optional(),
  strength: z.number().int().positive().optional(),
  crossedEnemy: z.boolean().optional(),
  toughness: z.number().int().positive().optional(),
  damage: z.number().int().nonnegative().optional(),
  psychicOrMortal: z.boolean().optional(),
  measurements: z.record(z.object({distance: z.number().finite().nonnegative().optional(), blocksSight: z.boolean().optional(), controlledObjective: z.boolean().optional(), visible: z.boolean().optional()}).strict()).optional(),
}).strict().refine(o => isEnemyAction(o.action) ? o.squadId === undefined : !!o.squadId);
export type Observation = z.infer<typeof observationSchema>;

export function isEnemyAction(action: Action): boolean { return action === 'arrival' || action === 'enemyAttacks'; }

const ownActions: Partial<Record<Action,Phase>> = {
  normal:'Movement',crossed:'Movement',advance:'Movement',fallback:'Movement',stationary:'Movement',
  shoot:'Shooting',shot:'Shooting',shotHit:'Shooting',deathRay:'Shooting',tesla:'Shooting',
  chargeRoll:'Charge',charged:'Charge',
};
export function actionAvailable(action: Action, phase: Phase, ownTurn: boolean): boolean {
  if (ownActions[action]) return ownTurn && phase === ownActions[action];
  if (action === 'arrival') return !ownTurn && phase === 'Movement';
  // Core 15.08: Fire Overwatch is an end-of-opponent-Movement reaction.
  if (action === 'overwatch') return !ownTurn && phase === 'Movement';
  if (['fight','meleeCasualty','meleeKill'].includes(action)) return phase === 'Fight';
  return true;
}
export const abilityUseSchema = z.object({
  eventId: z.string().min(1).optional(), rule: z.string().min(1), squadId: z.string().min(1), subjectId: z.string().min(1).optional(),
}).strict();
export type AbilityUse = z.infer<typeof abilityUseSchema>;
export const tablePositions = ['battlefield','reserves','embarked','destroyed'] as const;
export type TablePosition = typeof tablePositions[number];
