import { newArmy, newUnit } from '../src/army';
export function roster(faction: string, ...units: string[]) {
  return { ...newArmy(faction), units: units.map((unit) => newUnit(faction, unit)) };
}
export const turn = { phase: 'Command' as const, turn: 'your' as const, round: 1 };
