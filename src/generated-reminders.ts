import { getFaction } from './catalog';
import { equipped, type Army, type UnitEntry } from './army';
import { formation, leadersOf, unitLabel } from './attachments';
import { rules } from './data/rules';
import { windows, timings, type Slot, type Rule, type Window } from './data/schema';
import { profileFor } from './sources';
import { PHASES } from './engine';

export type Card = {
  id: string;
  rule: Rule;
  slot: Slot;
  subject: string;
  instances: string[];
  usage: string[];
  interaction?: { effect: string; url: string };
};
export type TurnFilter = 'both' | 'your' | 'opponent';
export type SheetFilter = { phase: 'all' | 'current' | Window; turn: TurnFilter };
type Subject = Pick<Card, 'subject' | 'instances' | 'usage' | 'interaction'>;

function subjects(army: Army, rule: Rule): Subject[] {
  const f = getFaction(army.faction),
    s = rule.scope;
  const det = f.detachments.find((d) => d.id === army.detachment)!;
  const profile = (u: UnitEntry) => profileFor(f.family, u.unit);
  const label = (u: UnitEntry) => unitLabel(army, u);
  let owners: UnitEntry[];
  if (rule.appliesTo === 'formations') owners = army.units.filter((u) => leadersOf(army, u.key).length > 0);
  else if (s.kind === 'unit')
    owners = army.units.filter((u) => s.unit === u.unit && (!s.gear || equipped(u, profile(u), s.gear)));
  else if (s.kind === 'enhancement') owners = army.units.filter((u) => u.enhancement === s.enhancement);
  else {
    const subject =
      s.kind === 'core'
        ? 'Core rule'
        : s.kind === 'stratagem'
          ? (s.detachment ? det.name : 'Core Stratagem') + ' · ' + s.cp + ' CP'
          : s.kind === 'detachment'
            ? det.name
            : f.name;
    return [{ subject, instances: [], usage: [] }];
  }
  return owners.flatMap((owner) => {
    if (rule.appliesTo === 'led' && !owner.bodyguard) return [];
    const members = formation(army, owner),
      body = members[0];
    if (
      rule.leaderKeyword &&
      !members.slice(1).some((u) => profile(u)?.keywords.includes(rule.leaderKeyword!))
    )
      return [];
    const shared = rule.appliesTo !== 'model';
    const instances = (shared ? members : [owner]).map((u) => u.key).sort();
    const subject = shared ? members.map(label).join(' + ') : label(owner);
    const match = rule.interactions?.find(
      (i) => body.unit === i.bodyguard && equipped(body, profile(body), i.gear),
    );
    const interaction = match ? { effect: match.effect, url: profile(body)!.source.url } : undefined;
    const quantity =
      rule.perItem && s.kind === 'unit'
        ? Object.values(owner.gear)
            .flat()
            .filter((id) => id === s.gear).length
        : 1;
    return Array.from({ length: quantity }, (_, i) => {
      const token = rule.perItem ? ['token-' + (i + 1)] : [];
      return {
        subject: subject + (quantity > 1 ? ' · token ' + (i + 1) : ''),
        instances: [...instances, ...token],
        usage: rule.armyLimit ? [] : [owner.key, ...token],
        interaction,
      };
    });
  });
}
export function generateReminders(army: Army): Card[] {
  const family = getFaction(army.faction).family;
  const cards: Card[] = [],
    seen = new Set<string>();
  for (const rule of rules) {
    const s = rule.scope;
    if ('family' in s && s.family && s.family !== family) continue;
    if ('detachment' in s && s.detachment && s.detachment !== army.detachment) continue;
    for (const subject of subjects(army, rule))
      for (const slot of rule.slots) {
        const id = [
          rule.id,
          slot.phase,
          slot.timing,
          slot.turn,
          ...subject.instances,
          ...(rule.limit && !rule.armyLimit ? subject.usage : []),
        ].join('/');
        if (seen.has(id)) continue;
        seen.add(id);
        cards.push({ id, rule, slot, ...subject });
      }
  }
  return cards.sort(
    (a, b) =>
      windows.indexOf(a.slot.phase) - windows.indexOf(b.slot.phase) ||
      timings.indexOf(a.slot.timing) - timings.indexOf(b.slot.timing) ||
      a.rule.title.localeCompare(b.rule.title) ||
      a.subject.localeCompare(b.subject, undefined, { numeric: true }),
  );
}
export function filterCards(
  cards: Card[],
  filter: SheetFilter,
  current: { phase: Window; turn: 'your' | 'opponent'; round: number },
): Card[] {
  const phase = filter.phase === 'current' ? current.phase : filter.phase;
  const turn = filter.phase === 'current' && filter.turn === 'both' ? current.turn : filter.turn;
  return cards.filter(
    ({ slot, rule }) =>
      (phase === 'all' ||
        slot.phase === phase ||
        (slot.phase === 'Any phase' && PHASES.some((p) => p === phase))) &&
      (turn === 'both' || slot.turn === turn || slot.turn === 'either' || slot.turn === 'neutral') &&
      !(filter.phase === 'current' && rule.firstRound && current.round !== 1),
  );
}
export function completionKey(
  armyId: string,
  card: Card,
  round: number,
  perspective: 'your' | 'opponent',
  activePhase?: Window,
) {
  const { rule, slot } = card;
  const prefix = [armyId, rule.id, ...(rule.limit ? card.usage : card.instances)];
  if (rule.limit === 'battle') return [...prefix, 'battle'].join(':');
  if (rule.limit === 'round') return [...prefix, round].join(':');
  const turn = slot.turn === 'either' ? perspective : slot.turn;
  if (rule.limit === 'turn') return [...prefix, round, turn].join(':');
  return [
    ...prefix,
    round,
    turn,
    slot.phase === 'Any phase' ? (activePhase ?? slot.phase) : slot.phase,
    slot.timing,
  ].join(':');
}
export const turnLabels: Record<Slot['turn'], string> = {
  your: 'Your turn',
  opponent: 'Opponent’s turn',
  either: 'Either turn',
  neutral: 'Before either turn',
};
