import type { Army, UnitEntry } from './army';
import { getFaction } from './catalog';
import { profileFor } from './sources';

export function unitLabel(army: Army, entry: UnitEntry) {
  const name = getFaction(army.faction).units.find((u) => u.id === entry.unit)?.name || entry.unit;
  const copies = army.units.filter((u) => u.unit === entry.unit);
  return copies.length > 1 ? name + ' #' + (copies.findIndex((u) => u.key === entry.key) + 1) : name;
}
export function leadersOf(army: Army, bodyguardKey: string) {
  return army.units.filter((u) => u.bodyguard === bodyguardKey);
}
export function formation(army: Army, entry: UnitEntry) {
  const body = army.units.find((u) => u.key === entry.bodyguard) ?? entry;
  return [body, ...leadersOf(army, body.key)];
}
export function attachmentError(army: Army, leader: UnitEntry, body: UnitEntry): string | null {
  const family = getFaction(army.faction).family,
    p = profileFor(family, leader.unit);
  if (leader.key === body.key || body.bodyguard || !p?.leadersFor.includes(body.unit))
    return 'This Leader cannot join that Bodyguard.';
  if (leadersOf(army, leader.key).length) return 'A Bodyguard cannot also be attached as a Leader.';
  const others = leadersOf(army, body.key).filter((u) => u.key !== leader.key);
  if (!others.length) return null;
  if (others.length !== 1) return 'An attached unit can have at most two Leaders.';
  const other = profileFor(family, others[0].unit);
  if (
    other &&
    (p.secondWith.some((k) => other.keywords.includes(k)) ||
      other.secondWith.some((k) => p.keywords.includes(k)))
  )
    return null;
  const exception = profileFor(family, body.unit)?.secondLeader;
  if (
    exception &&
    body.models === exception.models &&
    [p, other].some((leader) => leader?.keywords.includes(exception.keyword))
  )
    return null;
  return 'These Leaders cannot share this Bodyguard.';
}
export function eligibleBodyguards(army: Army, leader: UnitEntry) {
  return army.units.filter((u) => !attachmentError(army, leader, u));
}
export function attachLeader(army: Army, leaderKey: string, bodyKey: string | null): Army {
  const leader = army.units.find((u) => u.key === leaderKey);
  if (!leader) throw Error('Leader is missing from this roster.');
  if (bodyKey !== null) {
    const body = army.units.find((u) => u.key === bodyKey);
    if (!body) throw Error('Bodyguard is missing from this roster.');
    const error = attachmentError(army, leader, body);
    if (error) throw Error(error);
  }
  return { ...army, units: army.units.map((u) => (u.key === leaderKey ? { ...u, bodyguard: bodyKey } : u)) };
}
export function removeUnit(army: Army, key: string): Army {
  return {
    ...army,
    units: army.units
      .filter((u) => u.key !== key)
      .map((u) => (u.bodyguard === key ? { ...u, bodyguard: null } : u)),
  };
}
