import {NECRON_LOADOUTS} from './necron-wargear';
import type {RosterInstance} from './roster-instances';

// These datasheets combine independent per-model weapon or equipment choices.
export const modelLoadoutUnits = new Set(['Canoptek Wraiths', 'Tomb Blades', 'Canoptek Spyders']);
export interface ModelLoadout {
  primary?: string;
  gear: string[];
}

function tally(choices: readonly string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const choice of choices) result[choice] = (result[choice] ?? 0) + 1;
  return result;
}

// Preserve every still-available choice on its current bearer, then assign only the balance.
function distribute(previous: (string | undefined)[], counts: Record<string, number>): (string | undefined)[] {
  const remaining = {...counts};
  const result = previous.map(choice => {
    if (choice && remaining[choice] > 0) {
      remaining[choice]--;
      return choice;
    }
    return undefined;
  });
  const unassigned = Object.entries(remaining).flatMap(([choice, n]) => Array<string>(n).fill(choice));
  let next = 0;
  return result.map(choice => choice ?? unassigned[next++]);
}

export function modelLoadoutRows(squad: RosterInstance, models: number): ModelLoadout[] {
  const sheet = NECRON_LOADOUTS[squad.unit];
  const old = Array.from({length:models}, (_, i) => squad.modelLoadouts?.[i]);
  const weapon = squad.equipment ?? sheet.primary?.[0];
  const primary = distribute(old.map(row => row?.primary), squad.weaponCounts ?? (weapon ? {[weapon]:models} : {}));
  const rows = primary.map(primary => ({primary, gear:[] as string[]}));
  for (const slot of sheet.slots ?? []) {
    const counts = Object.fromEntries(slot.choices.map(choice => [choice, squad.wargear?.[choice] ?? 0]));
    const assigned = distribute(old.map(row => row?.gear.find(item => slot.choices.includes(item))), counts);
    assigned.forEach((choice, i) => { if (choice) rows[i].gear.push(choice); });
  }
  return rows;
}

export function applyModelLoadouts(squad: RosterInstance, models: number, rows: ModelLoadout[]): RosterInstance {
  const sheet = NECRON_LOADOUTS[squad.unit];
  if (!modelLoadoutUnits.has(squad.unit) || !Array.isArray(rows) || rows.length !== models) {
    throw Error('Expected one loadout per model on a supported datasheet');
  }
  for (const row of rows) {
    if (!row || typeof row !== 'object' || !Array.isArray(row.gear) ||
        (sheet.primary ? !sheet.primary.includes(row.primary ?? '') : row.primary !== undefined) ||
        row.gear.some(choice => !sheet.slots?.some(slot => slot.choices.includes(choice))) ||
        sheet.slots?.some(slot => row.gear.filter(choice => slot.choices.includes(choice)).length > 1)) {
      throw Error('Invalid equipment combination on a model');
    }
  }
  const weapons = tally(rows.flatMap(row => row.primary ? [row.primary] : []));
  const choices = Object.keys(weapons);
  return {...squad, models, modelLoadouts:rows.map(row => ({...row, gear:[...row.gear]})),
    equipment:choices.length === 1 ? choices[0] : undefined,
    weaponCounts:choices.length > 1 ? weapons : undefined,
    wargear:tally(rows.flatMap(row => row.gear))};
}

function sameCounts(a: Record<string, number> = {}, b: Record<string, number> = {}): boolean {
  return [...Object.keys(a), ...Object.keys(b)].every(key => (a[key] ?? 0) === (b[key] ?? 0));
}

export function validModelLoadouts(squad: RosterInstance, models: number, inheritedEquipment?: string): boolean {
  if (squad.modelLoadouts === undefined) return true;
  try {
    const derived = applyModelLoadouts(squad, models, squad.modelLoadouts);
    // Match expandRoster's saved-equipment precedence. A legacy unit-wide choice
    // still applies to instances without their own primary or distribution.
    const primary = squad.equipment ?? inheritedEquipment ?? NECRON_LOADOUTS[squad.unit].primary?.[0];
    const expected = squad.weaponCounts ?? (primary ? {[primary]:models} : {});
    const actual = derived.weaponCounts ?? (derived.equipment ? {[derived.equipment]:models} : {});
    return sameCounts(expected, actual) && sameCounts(squad.wargear, derived.wargear);
  } catch {
    return false;
  }
}
