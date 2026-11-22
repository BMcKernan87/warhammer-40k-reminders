import { useRef, useState } from 'react';
import {
  exportArmy,
  shareUrl,
  importArmy,
  makeRecord,
  downloadJson,
  type SavedArmy,
  type Workspace,
} from '../workspace';
import { newArmy } from '../army';
import { getFaction } from '../catalog';

type Props = {
  workspace: Workspace;
  record: SavedArmy;
  select: (id: string) => void;
  add: (record: SavedArmy) => void;
  rename: (name: string) => void;
  remove: () => void;
};
export function ArmyManager({ workspace, record, select, add, rename, remove }: Props) {
  const [action, setAction] = useState<'rename' | 'share' | 'delete' | null>(null),
    [name, setName] = useState(record.name);
  const [message, setMessage] = useState(''),
    [link, setLink] = useState('');
  const file = useRef<HTMLInputElement>(null);
  function startRename() {
    setName(record.name);
    setAction('rename');
  }
  async function share() {
    const url = shareUrl(record, window.location.href);
    setLink(url);
    setAction('share');
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Army link copied.');
    } catch {
      setMessage('Select and copy the army link.');
    }
  }
  return (
    <details className="panel manager screen">
      <summary>
        Saved armies <small>{workspace.armies.length} on this device</small>
      </summary>
      <div className="manager-content">
        <label>
          Load army
          <select value={record.id} onChange={(e) => select(e.target.value)}>
            {workspace.armies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <p className="note">
          Changes save automatically on this device. Imported and shared armies open as new copies.
        </p>
        <div className="inline-actions">
          <button onClick={() => add(makeRecord(newArmy(record.army.faction)))}>New army</button>
          <button onClick={startRename}>Rename</button>
          <button
            onClick={() => add(makeRecord(structuredClone(record.army), record.name.slice(0, 95) + ' copy'))}
          >
            Duplicate
          </button>
          <button onClick={() => downloadJson('40k-army.json', exportArmy(record))}>Export army</button>
          <button onClick={() => file.current?.click()}>Import army</button>
          <button onClick={share}>Share army</button>
          <button onClick={() => setAction('delete')}>Delete army</button>
        </div>
        <input
          ref={file}
          className="visually-hidden"
          type="file"
          aria-label="Army JSON file"
          accept=".json,application/json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              if (f.size > 1000000) throw Error('Army file exceeds 1 MB.');
              const imported = importArmy(await f.text());
              add(imported);
            } catch (err) {
              setMessage((err as Error).message);
            }
          }}
        />
        {action === 'rename' && (
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              const clean = name.trim();
              if (!clean) return;
              if (
                workspace.armies.some(
                  (a) => a.id !== record.id && a.name.toLowerCase() === clean.toLowerCase(),
                )
              ) {
                setMessage('Choose a different army name.');
                return;
              }
              rename(clean);
              setAction(null);
              setMessage('Army renamed.');
            }}
          >
            <label>
              Army name
              <input
                autoFocus
                maxLength={100}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button>Save name</button>
            <button type="button" onClick={() => setAction(null)}>
              Cancel
            </button>
          </form>
        )}
        {action === 'delete' && (
          <div className="confirm" role="group" aria-label="Confirm army deletion">
            <p>Delete {record.name} and its saved battle on this device?</p>
            <button onClick={remove}>Confirm delete</button>{' '}
            <button onClick={() => setAction(null)}>Cancel</button>
          </div>
        )}
        {action === 'share' && (
          <label>
            Army link
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
          </label>
        )}
        {message && <p role="status">{message}</p>}
      </div>
    </details>
  );
}
export function SharedArmy({
  record,
  accept,
  dismiss,
}: {
  record: SavedArmy;
  accept: () => void;
  dismiss: () => void;
}) {
  return (
    <div className="panel incoming screen">
      <h2>Shared army</h2>
      <p>
        {record.name} · {getFaction(record.army.faction).name} · {record.army.units.length} units
      </p>
      <button className="primary" onClick={accept}>
        Save shared army
      </button>{' '}
      <button onClick={dismiss}>Dismiss</button>
    </div>
  );
}
