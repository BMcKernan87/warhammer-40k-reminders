import { useEffect, useRef, useState } from 'react';
import { armySchema, newArmy } from './army';
import { createBattle } from './engine';
import { getFaction } from './catalog';
import { ArmyBuilder } from './components/ArmyBuilder';
import { ArmyManager, SharedArmy } from './components/ArmyManager';
import { BattleTracker } from './components/BattleTracker';
import { ReminderSheet } from './components/ReminderSheet';
import {
  addRecord,
  decodeWorkspace,
  loadWorkspace,
  makeRecord,
  readShare,
  removeRecord,
  storageKey,
  type SavedArmy,
  type Workspace,
} from './workspace';

function start() {
  try {
    const saved = loadWorkspace(localStorage);
    const migrated =
      !localStorage.getItem(storageKey) &&
      !!(
        localStorage.getItem('w40k-reminders-profiles-v1') || localStorage.getItem('w40k-reminders-army-v1')
      );
    return { workspace: saved, problem: '', migrated };
  } catch {
    const a = makeRecord();
    return {
      workspace: { version: 2 as const, active: a.id, armies: [a] },
      problem: 'Saved armies could not be read. This session is temporary. Your existing save is preserved.',
      migrated: false,
    };
  }
}
export function App() {
  const [initial] = useState(start),
    [workspace, setWorkspace] = useState(initial.workspace);
  const [message, setMessage] = useState(
    initial.problem ||
      (initial.migrated
        ? 'Previous armies imported. Quantities became separate unit copies. You can adjust their models in Configure.'
        : ''),
  );
  const [incoming, setIncoming] = useState<SavedArmy | null>(null);
  const latest = useRef(workspace),
    savedRaw = useRef<string | null>(null),
    skipWrite = useRef(!!initial.problem);
  function show(w: Workspace) {
    latest.current = w;
    setWorkspace(w);
  }
  useEffect(() => {
    try {
      savedRaw.current = localStorage.getItem(storageKey);
      if (!skipWrite.current && savedRaw.current === null) {
        const raw = JSON.stringify(latest.current);
        localStorage.setItem(storageKey, raw);
        savedRaw.current = raw;
      }
    } catch {
      setMessage('Storage is unavailable. Export your army to keep this session.');
    }
    const readHash = () => {
      try {
        setIncoming(readShare(window.location.hash));
      } catch {
        setIncoming(null);
        setMessage('This shared army link is invalid.');
      }
    };
    const sync = (e: StorageEvent) => {
      if (e.key !== storageKey || e.newValue === savedRaw.current) return;
      if (!e.newValue) {
        skipWrite.current = true;
        setMessage('Storage was cleared in another tab. Reload to start a new workspace.');
        return;
      }
      try {
        const w = decodeWorkspace(e.newValue);
        savedRaw.current = e.newValue;
        show(w);
      } catch {
        skipWrite.current = true;
        setMessage('Another tab saved an unreadable workspace. Export this session to keep it.');
      }
    };
    readHash();
    window.addEventListener('hashchange', readHash);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('hashchange', readHash);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const record = workspace.armies.find((a) => a.id === workspace.active)!;
  function commit(fn: (w: Workspace) => Workspace) {
    try {
      const raw = skipWrite.current ? null : localStorage.getItem(storageKey);
      if (!skipWrite.current && raw !== savedRaw.current && raw !== null) {
        const other = decodeWorkspace(raw);
        show(other);
        savedRaw.current = raw;
        setMessage('Another tab changed this army. Review it and repeat your edit.');
        return;
      }
    } catch {
      /* Local export remains available when browser storage is full or disabled. */
    }
    let next: Workspace;
    try {
      next = fn(latest.current);
    } catch (e) {
      setMessage((e as Error).message);
      return;
    }
    if (!skipWrite.current)
      try {
        const raw = JSON.stringify(next);
        localStorage.setItem(storageKey, raw);
        savedRaw.current = raw;
      } catch {
        setMessage('Changes are in this session. Export your army before leaving.');
      }
    show(next);
  }
  function update(patch: Partial<SavedArmy>) {
    commit((w) => ({ ...w, armies: w.armies.map((a) => (a.id === record.id ? { ...a, ...patch } : a)) }));
  }
  const add = (a: SavedArmy) => commit((w) => addRecord(w, a));
  function switchFaction(id: string) {
    if (id === record.army.faction) return;
    const a = makeRecord(newArmy(id));
    if (
      record.army.units.length ||
      record.army.unresolved.length ||
      JSON.stringify(record.battle) !== JSON.stringify(createBattle()) ||
      record.completed.length ||
      record.hidden.length ||
      record.name !== getFaction(record.army.faction).name + ' army'
    ) {
      add(a);
      setMessage('Started a new army. ' + record.name + ' is in Saved armies.');
    } else {
      update({
        army: a.army,
        name: record.name === getFaction(record.army.faction).name + ' army' ? a.name : record.name,
        completed: [],
        hidden: [],
      });
    }
  }
  function closeShared() {
    setIncoming(null);
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  const edit = record.settings.mode === 'edit';
  return (
    <>
      <header className="masthead screen">
        <div className="mast-inner">
          <div className="brand-mark" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div>
            <p>Warhammer 40,000 · 10th edition</p>
            <h1>40K Reminders</h1>
          </div>
        </div>
      </header>
      <main>
        <a className="skip screen" href="#sheet">
          Skip to reminders
        </a>
        <div className="workspace-bar screen">
          <div>
            <span className="section-label">Current army</span>
            <h2>{record.name}</h2>
          </div>
          <nav aria-label="Army mode">
            <button
              aria-pressed={edit}
              onClick={() => update({ settings: { ...record.settings, mode: 'edit' } })}
            >
              Edit army
            </button>
            <button
              aria-pressed={!edit}
              onClick={() => update({ settings: { ...record.settings, mode: 'play' } })}
            >
              Play reminders
            </button>
          </nav>
        </div>
        {message && (
          <div role="status" className="notice screen">
            {message}{' '}
            <button className="text-button" onClick={() => setMessage('')}>
              Dismiss
            </button>
          </div>
        )}
        {incoming && (
          <SharedArmy
            record={incoming}
            accept={() => {
              add(incoming);
              closeShared();
            }}
            dismiss={closeShared}
          />
        )}
        <ArmyManager
          key={'manager-' + record.id}
          workspace={workspace}
          record={record}
          add={add}
          select={(id) => commit((w) => ({ ...w, active: id }))}
          rename={(name) => update({ name })}
          remove={() => commit((w) => removeRecord(w, record.id))}
        />
        <div className={edit ? 'work-area editing' : 'work-area playing'}>
          {edit && (
            <div className="editor-column screen">
              <ArmyBuilder
                key={record.id + record.army.faction}
                army={record.army}
                switchFaction={switchFaction}
                change={(army) => {
                  const parsed = armySchema.safeParse(army);
                  if (parsed.success) update({ army: parsed.data });
                  else setMessage(parsed.error.issues[0].message);
                }}
              />
            </div>
          )}
          <ReminderSheet
            record={record}
            update={update}
            settings={(patch) => update({ settings: { ...record.settings, ...patch } })}
          />
        </div>
        {!edit && <BattleTracker key={'tracker-' + record.id} record={record} update={update} />}
        <footer className="screen">
          Unofficial tabletop companion · 10th-edition rules are indexed from{' '}
          <a href="https://wahapedia.ru/wh40k10ed/the-rules/data-export/">Wahapedia</a>.
        </footer>
      </main>
    </>
  );
}
