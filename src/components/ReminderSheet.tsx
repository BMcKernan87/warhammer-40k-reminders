import { useMemo } from 'react';
import type { SavedArmy, Settings } from '../workspace';
import { getFaction } from '../catalog';
import { generateReminders, filterCards, completionKey, turnLabels, type Card } from '../generated-reminders';
import { timings, windows } from '../data/schema';
import { enhancements, rules } from '../data/rules';
import { unitLabel } from '../attachments';
import { PHASES } from '../engine';
import { profileFor } from '../sources';

type Props = {
  record: SavedArmy;
  update: (patch: Partial<SavedArmy>) => void;
  settings: (patch: Partial<Settings>) => void;
};
const toggle = (items: string[], id: string) =>
  items.includes(id) ? items.filter((v) => v !== id) : [...items, id];
const timingNames = { start: 'Start', during: 'During', end: 'End' };
function Body({ card }: { card: Card }) {
  const { rule } = card;
  return (
    <>
      <p className="trigger">{rule.trigger}</p>
      <p>{rule.effect}</p>
      {card.interaction && (
        <p className="formation-effect">
          {card.interaction.effect}{' '}
          <a href={card.interaction.url} target="_blank" rel="noreferrer">
            Weapon profile
          </a>
        </p>
      )}
      {rule.conditions.length > 0 && <p className="conditions">{rule.conditions.join(' ')}</p>}
      <div className="rule-meta">
        <span>{turnLabels[card.slot.turn]}</span>
        {rule.limit && <span>Once per {rule.limit}</span>}
        <a href={rule.source.url} target="_blank" rel="noreferrer" title={rule.source.section}>
          {rule.source.status === 'checked'
            ? 'Source checked ' + rule.source.checkedOn
            : 'Provisional · ' + rule.source.reason}
        </a>
      </div>
    </>
  );
}
function RosterSummary({ record }: { record: SavedArmy }) {
  const { army } = record,
    f = getFaction(army.faction);
  const summary = new Map<string, number>();
  for (const u of army.units) {
    const name = unitLabel(army, u),
      body = army.units.find((x) => x.key === u.bodyguard);
    const upgrade = enhancements.find((e) => e.id === u.enhancement);
    const p = profileFor(f.family, u.unit);
    const options = (p?.gear || []).flatMap((g) => {
      const choices = u.gear[g.id];
      const counts = new Map<string, number>();
      for (const id of choices) counts.set(id, (counts.get(id) ?? 0) + 1);
      return g.choices
        .filter((c) => counts.has(c.id) && c.id !== 'none' && c.id !== 'standard-weapon')
        .map((c) => (!g.uniform && counts.size > 1 ? counts.get(c.id) + '× ' : '') + c.name);
    });
    const label = [
      name + (u.models ? ' (' + u.models + ')' : ''),
      body && 'leads ' + unitLabel(army, body),
      ...options,
      upgrade?.name,
    ]
      .filter(Boolean)
      .join(' · ');
    summary.set(label, (summary.get(label) ?? 0) + 1);
  }
  return (
    <ul className="roster-summary">
      {Array.from(summary, ([name, count]) => (
        <li key={name}>
          {count > 1 ? count + ' × ' : ''}
          {name}
        </li>
      ))}
    </ul>
  );
}
export function ReminderSheet({ record, update, settings }: Props) {
  const { army, settings: prefs, battle } = record;
  const f = getFaction(army.faction),
    det = f.detachments.find((d) => d.id === army.detachment)!;
  const cards = useMemo(() => generateReminders(army), [army]);
  const current = {
    phase: battle.phase,
    turn: battle.player === prefs.side ? ('your' as const) : ('opponent' as const),
    round: battle.round,
  };
  const perspective = prefs.turn === 'both' ? current.turn : prefs.turn;
  const key = (card: Card) =>
    completionKey(
      record.id,
      card,
      battle.round,
      perspective,
      PHASES.find((p) => p === prefs.phase) ?? battle.phase,
    );
  const applicable = filterCards(cards, prefs, current);
  const visible = applicable.filter(
    (c) =>
      (prefs.showHidden || !record.hidden.includes(c.id)) &&
      (prefs.showCompleted || !record.completed.includes(key(c))),
  );
  const printCards = cards.filter((c) => !record.hidden.includes(c.id));
  const missing = [...new Set(army.units.map((u) => u.unit))]
    .filter(
      (unit) =>
        !rules.some((r) => r.scope.kind === 'unit' && r.scope.family === f.family && r.scope.unit === unit),
    )
    .map((id) => f.units.find((u) => u.id === id)!.name);
  const hasDet = rules.some(
    (r) => r.scope.kind === 'detachment' && r.scope.family === f.family && r.scope.detachment === det.id,
  );
  const hasFaction = rules.some((r) => r.scope.kind === 'army' && r.scope.family === f.family);
  const gaps = (
    <>
      <span>Coverage is partial.</span>
      {!hasFaction && <> Faction ability pending.</>}
      {!hasDet && <> Detachment rule pending for {det.name}.</>}
      {missing.length > 0 && <> No unit abilities entered for {missing.join(', ')}.</>}
      {army.attachmentNotes.length > 0 && <> Confirm previous Leader pairings in the builder.</>}
      {army.unresolved.length > 0 && <> {army.unresolved.length} previous roster selection(s) need review.</>}
    </>
  );
  const fold = (id: string) => settings({ collapsed: toggle(prefs.collapsed, id) });
  const phaseIds = windows.filter((w) => visible.some((c) => c.slot.phase === w));
  const allFolded = phaseIds.length > 0 && phaseIds.every((id) => prefs.collapsed.includes(id));
  return (
    <>
      <section className="panel sheet screen" aria-labelledby="sheet-title" id="sheet">
        <div className="section-head">
          <div>
            <h2 id="sheet-title">Reminder sheet</h2>
            <p className="subtitle">
              {f.name} · {det.name}
            </p>
          </div>
          <button onClick={() => window.print()}>Print sheet</button>
        </div>
        <div className="sheet-controls">
          <label>
            Phase
            <select
              value={prefs.phase}
              onChange={(e) => settings({ phase: e.target.value as Settings['phase'] })}
            >
              <option value="all">All phases</option>
              <option value="current">Tracker phase · {battle.phase}</option>
              {windows.map((w) => (
                <option key={w}>{w}</option>
              ))}
            </select>
          </label>
          <label>
            Turn
            <select
              value={prefs.turn}
              onChange={(e) => settings({ turn: e.target.value as Settings['turn'] })}
            >
              <option value="both">Both turns</option>
              <option value="your">Your turn</option>
              <option value="opponent">Opponent’s turn</option>
            </select>
          </label>
        </div>
        <div className="sheet-tools">
          <label>
            <input
              type="checkbox"
              checked={prefs.showCompleted}
              onChange={(e) => settings({ showCompleted: e.target.checked })}
            />{' '}
            Show completed
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.showHidden}
              onChange={(e) => settings({ showHidden: e.target.checked })}
            />{' '}
            Show hidden
          </label>
          {!!phaseIds.length && (
            <button
              className="text-button"
              onClick={() =>
                settings({ collapsed: allFolded ? [] : [...new Set([...prefs.collapsed, ...phaseIds])] })
              }
            >
              {allFolded ? 'Expand all' : 'Collapse all'}
            </button>
          )}
        </div>
        <p className="coverage-note">{gaps}</p>
        {!visible.length && <p className="empty-roster">No reminders match these settings.</p>}
        {phaseIds.map((phase) => {
          const group = visible.filter((c) => c.slot.phase === phase),
            open = !prefs.collapsed.includes(phase);
          return (
            <section className="phase-group" key={phase} aria-label={phase + ' reminders'}>
              <h3>
                <button aria-expanded={open} onClick={() => fold(phase)}>
                  <span>{phase}</span>
                  <span className="group-count">
                    {group.length} <i aria-hidden="true">{open ? '−' : '+'}</i>
                  </span>
                </button>
              </h3>
              {open &&
                timings.map((timing) => {
                  const list = group.filter((c) => c.slot.timing === timing);
                  if (!list.length) return null;
                  const id = phase + '/' + timing,
                    shown = !prefs.collapsed.includes(id);
                  return (
                    <div className="timing-group" key={id}>
                      <h4>
                        <button aria-expanded={shown} onClick={() => fold(id)}>
                          {timingNames[timing]}
                          <span aria-hidden="true">{shown ? '−' : '+'}</span>
                        </button>
                      </h4>
                      {shown &&
                        list.map((c) => {
                          const checked = record.completed.includes(key(c)),
                            hidden = record.hidden.includes(c.id);
                          return (
                            <article
                              className={
                                'rule' + (checked ? ' completed' : '') + (hidden ? ' hidden-card' : '')
                              }
                              key={c.id}
                            >
                              <div className="rule-head">
                                <label className="check-title">
                                  <input
                                    type="checkbox"
                                    aria-label={'Complete ' + c.rule.title}
                                    checked={checked}
                                    onChange={() => update({ completed: toggle(record.completed, key(c)) })}
                                  />
                                  <span>{c.rule.title}</span>
                                </label>
                                <button
                                  className="text-button"
                                  aria-label={(hidden ? 'Restore ' : 'Hide ') + c.rule.title}
                                  onClick={() => update({ hidden: toggle(record.hidden, c.id) })}
                                >
                                  {hidden ? 'Restore' : 'Hide'}
                                </button>
                              </div>
                              <div className="rule-content">
                                <div className="subject">{c.subject}</div>
                                <Body card={c} />
                              </div>
                            </article>
                          );
                        })}
                    </div>
                  );
                })}
            </section>
          );
        })}
      </section>
      <section className="print-sheet" aria-label="Printable reminder sheet">
        <h1>{record.name}</h1>
        <p>
          {f.name} · {det.name} · Warhammer 40,000, 10th edition
        </p>
        <RosterSummary record={record} />
        <p className="coverage-note">{gaps}</p>
        {windows.map((phase) => {
          const list = printCards.filter((c) => c.slot.phase === phase);
          return (
            (list.length > 0 || PHASES.some((p) => p === phase) || phase === 'Turn end') && (
              <section key={phase}>
                <h2>{phase}</h2>
                {!list.length && <p className="no-rules">No roster reminders for this window.</p>}
                {list.map((c) => (
                  <article key={c.id}>
                    <h3>{c.rule.title}</h3>
                    <small>
                      {timingNames[c.slot.timing]} · {c.subject}
                    </small>
                    <Body card={c} />
                  </article>
                ))}
              </section>
            )
          );
        })}
      </section>
    </>
  );
}
