import {useMemo, useState} from 'react';
import type {ArmyProfile} from './profiles';
import {armySetup11th, grouped11thReminders} from './reminders-11th';
import type {GeneratedReminder, ReminderWindow} from './generated-reminders';
import {completionKey} from './rules';

interface Props {
  profile: ArmyProfile;
  onCompleted: (keys: string[]) => void;
}

// Some reminders name their bearer in the heading and list other affected squads separately.
function listedSquads(rule: GeneratedReminder) {
  return [...new Set(rule.units ?? [])].filter(unit => {
    const start = rule.title.indexOf(unit);
    return start < 0 || /[0-9]/.test(rule.title.charAt(start + unit.length));
  }).join(', ');
}
function timingLabel(rule: GeneratedReminder) {
  const turn = rule.turn && {own: 'Your turn', opponent: 'Opponent’s turn', either: 'Either turn'}[rule.turn];
  return turn ? turn + ' · ' + rule.timing : rule.timing;
}
function Subjects({rule}: {rule: GeneratedReminder}) {
  const names = listedSquads(rule);
  return names ? <small className="rule-subjects">Roster: {names}</small> : null;
}
export function ReminderSheet({profile, onCompleted}: Props) {
  const {army, battle, completed} = profile;
  const groups = useMemo(() => {
    const order = {start: 0, during: 1, end: 2};
    return grouped11thReminders(army).map(group => ({
      ...group, reminders: [...group.reminders].sort((a,b) => order[a.timing] - order[b.timing]),
    }));
  }, [army]);
  const setup = useMemo(() => armySetup11th(army), [army]);
  const [phase, setPhase] = useState<ReminderWindow | 'all'>('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const checked = new Set(completed);
  const armyLabel = [army.faction, ...(army.detachments2026 ?? []).map(name => name === 'Skysword Spearhead' ? 'Skyshroud Spearhead' : name)].join(' · ');

  // Recognize checkmarks made by the former turn tracker in the saved turn.
  const keysFor = (rule: GeneratedReminder) => {
    const sheetKey = (window: ReminderWindow, units: string[]) => 'sheet:' + JSON.stringify([window, rule.id, units]);
    const keys = [sheetKey(rule.window, rule.units ?? []), completionKey(rule.id, battle)];
    if (rule.previousSheetEntry) keys.push(sheetKey(rule.previousSheetEntry.window, rule.previousSheetEntry.units));
    return keys;
  };
  const isChecked = (rule: GeneratedReminder) => keysFor(rule).some(key => checked.has(key));
  function toggle(rule: GeneratedReminder, done: boolean) {
    const keys = keysFor(rule);
    onCompleted(done ? [...new Set([...completed, keys[0]])] : completed.filter(key => !keys.includes(key)));
  }
  function resetSheet() {
    const sheetKeys = new Set(groups.flatMap(group => group.reminders.flatMap(rule => keysFor(rule))));
    onCompleted(completed.filter(key => !sheetKeys.has(key)));
  }

  return <>
    <section className="print-sheet" aria-label="Printable army reminders">
      <h2>{profile.name}</h2><p>{armyLabel}</p>
      {groups.map(group => <section key={group.window}>
        <h3>{group.window}</h3>
        {group.reminders.length === 0 && <p>No reminders for this phase.</p>}
        {group.reminders.map(rule => <p key={rule.id}><strong>{rule.title}</strong> ({timingLabel(rule)}) — {rule.summary}<Subjects rule={rule}/></p>)}
      </section>)}
    </section>
    <section className="panel"><h2>11th-edition army setup</h2><p>{armyLabel}</p>
      {setup.filter(item => item.label !== 'Choose your 11th-edition detachments' || !army.detachments2026?.length).map(item =>
        <p key={item.label}><strong>{item.label}</strong> · {item.description}</p>)}
      <button className="secondary" onClick={() => window.print()}>Print reminders</button>
    </section>
    <section className="panel"><h2>Phase reminders</h2>
      <div className="unit-form"><label>Show phase <select value={phase} onChange={event => setPhase(event.target.value as typeof phase)}>
        <option value="all">All phases</option>
        {groups.map(group => <option key={group.window}>{group.window}</option>)}
      </select></label>
      <label><input type="checkbox" checked={showCompleted} onChange={event => setShowCompleted(event.target.checked)}/> Show completed reminders</label>
      {groups.some(group => group.reminders.some(rule => isChecked(rule))) && <button className="secondary" onClick={resetSheet}>Clear checkmarks</button>}
      </div>
      {groups.filter(group => phase === 'all' || group.window === phase).map(group => <section key={group.window}>
        <h3>{group.window}</h3>
        {group.reminders.length === 0 && <p>No reminders for this phase.</p>}
        {group.reminders.filter(rule => showCompleted || !isChecked(rule)).map(rule =>
          <div className="check" key={rule.id}>
            <input id={'check-' + rule.id} type="checkbox" checked={isChecked(rule)} onChange={event => toggle(rule, event.target.checked)}/>
            <span><label htmlFor={'check-' + rule.id}><strong>{rule.title}</strong> · {timingLabel(rule)}</label><br/>{rule.summary}<Subjects rule={rule}/><br/>
              <a href={rule.source} target="_blank" rel="noreferrer">Rule source</a></span>
          </div>)}
      </section>)}
    </section>
  </>;
}
