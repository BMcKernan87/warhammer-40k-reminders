import { useState } from 'react';
import {
  advancePhase,
  gainCommandCp,
  addUnit,
  createBattle,
  recordEvent,
  setWounds,
  spendCp,
  validateBattleState,
  type BattleState,
  type Player,
} from '../engine';
import { assess, type Trigger } from '../stratagems';
import { migrateMarks, downloadJson, type SavedArmy } from '../workspace';

export function BattleTracker({
  record,
  update,
}: {
  record: SavedArmy;
  update: (patch: Partial<SavedArmy>) => void;
}) {
  const b = record.battle;
  const [history, setHistory] = useState<BattleState[]>([]),
    [error, setError] = useState('');
  const [name, setName] = useState(''),
    [owner, setOwner] = useState<Player>('A'),
    [wounds, setStarting] = useState(1),
    [note, setNote] = useState('');
  const [text, setText] = useState(''),
    [actor, setActor] = useState<Player>('A'),
    [trigger, setTrigger] = useState<Trigger>('roll'),
    [facts, setFacts] = useState(false);
  const act = (fn: (prev: BattleState) => BattleState) => {
    try {
      const next = fn(b);
      setHistory((prev) => [...prev.slice(-49), b]);
      update({ battle: next });
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const playerOptions = (
    <>
      <option value="A">Player A</option>
      <option value="B">Player B</option>
    </>
  );
  const results = assess(
    b,
    {
      kind: trigger,
      actor,
      facts: facts
        ? { 'eligible-roll': true, 'enemy-just-fought': true, 'friendly-unit-can-fight': true }
        : {},
    },
    [],
  );
  function backup() {
    downloadJson(
      'warhammer-40k-battle.json',
      JSON.stringify({
        format: 'w40k-reminders-battle-v2',
        battle: b,
        completed: record.completed,
        hidden: record.hidden,
        armyId: record.id,
      }),
    );
  }
  function restore() {
    try {
      const x = JSON.parse(text);
      if (
        !['w40k-reminders-backup-v1', 'w40k-reminders-battle-v2'].includes(x.format) ||
        !validateBattleState(x.battle) ||
        !Array.isArray(x.completed) ||
        !x.completed.every((k: unknown) => typeof k === 'string')
      )
        throw Error('Invalid battle backup.');
      const isNew = x.format === 'w40k-reminders-battle-v2';
      if (
        isNew &&
        (x.armyId !== record.id ||
          !Array.isArray(x.hidden) ||
          !x.hidden.every((k: unknown) => typeof k === 'string'))
      )
        throw Error('Choose a backup for this saved army.');
      if (!window.confirm('Replace the current battle with this backup?')) return;
      update({
        battle: x.battle,
        completed: isNew ? x.completed : migrateMarks(record, x.completed),
        hidden: isNew ? x.hidden : record.hidden,
      });
      setText('');
      setHistory([]);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <details className="panel tracker screen">
      <summary>
        Battle tracker{' '}
        <small>
          Round {b.round} · Player {b.player} · {b.phase}
        </small>
      </summary>
      <div className="tracker-body">
        <div className="fields">
          <label>
            Your side
            <select
              value={record.settings.side}
              onChange={(e) => update({ settings: { ...record.settings, side: e.target.value as Player } })}
            >
              {playerOptions}
            </select>
          </label>
        </div>
        <div className="inline-actions">
          <button className="primary" onClick={() => act(advancePhase)}>
            Next phase
          </button>
          <button
            disabled={!history.length}
            onClick={() => {
              update({ battle: history.at(-1)! });
              setHistory((h) => h.slice(0, -1));
            }}
          >
            Undo
          </button>
          <button
            onClick={() => {
              if (window.confirm('Start a new battle for this army and clear completed reminders?')) {
                update({ battle: createBattle(), completed: [] });
                setHistory([]);
                setError('');
              }
            }}
          >
            New battle
          </button>
        </div>
        <h3>Command points</h3>
        <div className="fields">
          {(['A', 'B'] as Player[]).map((p) => (
            <div className="cp" key={p}>
              <span>Player {p}</span>
              <button
                disabled={!b.cp[p]}
                aria-label={'Spend CP player ' + p}
                onClick={() => act((prev) => spendCp(prev, p, 1))}
              >
                −
              </button>
              <strong>{b.cp[p]}</strong>
              <button
                aria-label={'Add CP player ' + p}
                onClick={() => act((prev) => ({ ...prev, cp: { ...prev.cp, [p]: prev.cp[p] + 1 } }))}
              >
                +
              </button>
            </div>
          ))}
        </div>
        {b.phase === 'Command' && (
          <button
            disabled={b.notes.includes('CP gained R' + b.round + ' ' + b.player)}
            onClick={() => act(gainCommandCp)}
          >
            Gain command CP for both players
          </button>
        )}
        <details>
          <summary>Reactive Stratagem checks</summary>
          <p className="note">Advisory checks. Confirm eligibility against the rule before spending CP.</p>
          <div className="fields">
            <label>
              Trigger
              <select value={trigger} onChange={(e) => setTrigger(e.target.value as Trigger)}>
                <option value="roll">Eligible roll</option>
                <option value="after-enemy-fights">Enemy just fought</option>
                <option value="unit-destroyed">Unit destroyed</option>
                <option value="attack-targeted">Unit targeted</option>
              </select>
            </label>
            <label>
              Acting player
              <select value={actor} onChange={(e) => setActor(e.target.value as Player)}>
                {playerOptions}
              </select>
            </label>
          </div>
          <label>
            <input type="checkbox" checked={facts} onChange={(e) => setFacts(e.target.checked)} /> Confirm
            target and trigger facts
          </label>
          {results.map((a) => (
            <p key={a.key}>
              <strong>
                {a.rule.name} · {a.rule.cost} CP · Player {a.owner}
              </strong>
              <br />
              {a.status} · {a.reasons.join('. ')}
            </p>
          ))}
          {!results.length && <p>No check for this event.</p>}
        </details>
        <details>
          <summary>Wound tracker</summary>
          <form
            className="fields"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim() || !Number.isSafeInteger(wounds) || wounds < 1) return;
              act((prev) =>
                addUnit(prev, {
                  id: crypto.randomUUID(),
                  name: name.trim(),
                  owner,
                  wounds,
                  maxWounds: wounds,
                  battleShocked: false,
                  destroyed: false,
                }),
              );
              setName('');
            }}
          >
            <label>
              Unit name
              <input required value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Owner
              <select value={owner} onChange={(e) => setOwner(e.target.value as Player)}>
                {playerOptions}
              </select>
            </label>
            <label>
              Starting wounds
              <input
                type="number"
                min="1"
                required
                value={wounds || ''}
                onChange={(e) => setStarting(e.target.valueAsNumber)}
              />
            </label>
            <button>Add tracked unit</button>
          </form>
          {b.units.map((u) => (
            <div className="row-head" key={u.id}>
              <strong>
                {u.name} · Player {u.owner} · {u.wounds}/{u.maxWounds}
              </strong>
              <div className="inline-actions">
                <button
                  aria-label={'Damage ' + u.name}
                  disabled={u.destroyed}
                  onClick={() => act((p) => setWounds(p, u.id, u.wounds - 1))}
                >
                  −
                </button>
                <button
                  aria-label={'Heal ' + u.name}
                  disabled={u.wounds === u.maxWounds}
                  onClick={() => act((p) => setWounds(p, u.id, u.wounds + 1))}
                >
                  +
                </button>
                <button
                  disabled={u.destroyed}
                  onClick={() =>
                    act((p) => ({
                      ...p,
                      units: p.units.map((a) =>
                        a.id === u.id ? { ...a, battleShocked: !a.battleShocked } : a,
                      ),
                    }))
                  }
                >
                  {u.destroyed ? 'Destroyed' : u.battleShocked ? 'Clear shock' : 'Battle-shock'}
                </button>
              </div>
            </div>
          ))}
        </details>
        <details>
          <summary>Battle log</summary>
          <form
            className="fields"
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              act((prev) =>
                recordEvent(prev, {
                  id: crypto.randomUUID(),
                  round: b.round,
                  phase: b.phase,
                  player: b.player,
                  kind: 'note',
                  description: note.trim(),
                }),
              );
              setNote('');
            }}
          >
            <label>
              Battle event
              <input required value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <button>Record</button>
          </form>
          <ul>
            {b.events
              .slice(-12)
              .reverse()
              .map((e) => (
                <li key={e.id}>
                  R{e.round} · {e.player} · {e.phase} · {e.description}
                </li>
              ))}
          </ul>
        </details>
        <details>
          <summary>Battle backup</summary>
          <button onClick={backup}>Export battle JSON</button>
          <label>
            Import battle JSON
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          </label>
          <button onClick={restore}>Import backup</button>
        </details>
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}
