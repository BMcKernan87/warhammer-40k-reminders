import { useState } from 'react';
import {
  gearLimit,
  newUnit,
  resizeUnit,
  enhancementOptions,
  setDetachment,
  type Army,
  type UnitEntry,
} from '../army';
import { getFaction, factions, datasheetUrl, type Unit } from '../catalog';
import { profileFor } from '../sources';
import { eligibleBodyguards, leadersOf, removeUnit, unitLabel } from '../attachments';
import { SearchSelect } from './SearchSelect';
import type { Profile } from '../data/schema';
const numbers = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => i + lo);
export function UnitOptions({
  entry,
  army,
  update,
}: {
  entry: UnitEntry;
  army: Army;
  update: (e: UnitEntry) => void;
}) {
  const f = getFaction(army.faction);
  const p = profileFor(f.family, entry.unit);
  if (!p) return <p className="note">Model count and equipment await datasheet review.</p>;
  const upgrades = enhancementOptions(army, entry);
  function changeGear(slot: string, index: number, value: string) {
    const values = entry.gear[slot].map((v, i) => (i === index ? value : v));
    update({ ...entry, gear: { ...entry.gear, [slot]: values } });
  }
  return (
    <div className="configuration">
      <div className="fields">
        <label>
          Models in this unit
          <select
            aria-label="Models in this unit"
            value={entry.models!}
            onChange={(e) => update(resizeUnit(entry, p, +e.target.value))}
          >
            {numbers(p.composition.min, p.composition.max).map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        {p.leadersFor.length > 0 && (
          <label>
            Bodyguard
            <select
              aria-label={'Bodyguard for ' + unitLabel(army, entry)}
              value={entry.bodyguard ?? ''}
              onChange={(e) => update({ ...entry, bodyguard: e.target.value || null })}
            >
              <option value="">Unattached</option>
              {eligibleBodyguards(army, entry).map((u) => (
                <option key={u.key} value={u.key}>
                  {unitLabel(army, u)}
                </option>
              ))}
            </select>
          </label>
        )}
        {(upgrades.length > 0 || entry.enhancement) && (
          <label>
            Enhancement
            <select
              value={entry.enhancement ?? ''}
              onChange={(e) => update({ ...entry, enhancement: e.target.value || null })}
            >
              <option value="">None</option>
              {upgrades.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {p.gear.map((g) => (
        <fieldset className="gear" key={g.id}>
          <legend>{g.label}</legend>
          {g.uniform || entry.models === 1 ? (
            <label className="simple-field">
              <span>Whole unit</span>
              <select
                aria-label={g.label}
                value={entry.gear[g.id][0]}
                onChange={(e) => changeGear(g.id, 0, e.target.value)}
              >
                {g.choices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="simple-field">
                <span>Equip all models</span>
                <select
                  aria-label={g.label + ' for all models'}
                  value={new Set(entry.gear[g.id]).size === 1 ? entry.gear[g.id][0] : ''}
                  onChange={(e) =>
                    update({
                      ...entry,
                      gear: { ...entry.gear, [g.id]: Array(entry.models! - g.offset).fill(e.target.value) },
                    })
                  }
                >
                  <option value="" disabled>
                    Mixed equipment
                  </option>
                  {g.choices
                    .filter((c) => !c.perTen && !c.every)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
              <details>
                <summary>Equip individual models</summary>
                <div className="model-grid">
                  {entry.gear[g.id].map((v, i) => (
                    <label key={i}>
                      Model {i + 1}
                      <select
                        aria-label={g.label + ' model ' + (i + 1)}
                        value={v}
                        onChange={(e) => changeGear(g.id, i, e.target.value)}
                      >
                        {g.choices.map((c) => (
                          <option
                            key={c.id}
                            value={c.id}
                            disabled={
                              c.id !== v &&
                              entry.gear[g.id].filter(
                                (x) =>
                                  x === c.id ||
                                  (!!c.pool && g.choices.find((other) => other.id === x)?.pool === c.pool),
                              ).length >= gearLimit(c, entry.models!)
                            }
                          >
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </details>
            </>
          )}
        </fieldset>
      ))}
      <Datasheet profile={p} army={army} />
    </div>
  );
}
function Datasheet({ profile: p, army }: { profile: Profile; army: Army }) {
  const c = p.characteristics;
  const bodyguards = getFaction(army.faction).units.filter((u) => p.leadersFor.includes(u.id));
  return (
    <details className="datasheet">
      <summary>Datasheet profile</summary>
      {p.profileNote && <p className="note">{p.profileNote}</p>}
      {c && (
        <dl className="characteristics">
          {Object.entries({
            M: c.move,
            T: c.toughness,
            Sv: c.save,
            W: c.wounds,
            Ld: c.leadership,
            OC: c.oc,
            ...(c.invulnerable && { Inv: c.invulnerable }),
          }).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {p.weapons.map((w) => (
        <div key={w.id} className="weapon">
          <strong>{w.name}</strong>{' '}
          <span>
            {w.range} · A {w.attacks} · {w.range === 'Melee' ? 'WS' : 'BS'} {w.skill} · S {w.strength} · AP{' '}
            {w.ap} · D {w.damage}
            {w.abilities.length ? ' · ' + w.abilities.join(', ') : ''}
          </span>
        </div>
      ))}
      <p className="note">{p.keywords.join(' · ')}</p>
      {bodyguards.length > 0 && <p className="note">Can lead {bodyguards.map((u) => u.name).join(', ')}.</p>}
      <a href={p.source.url} target="_blank" rel="noreferrer">
        Read the datasheet
      </a>
    </details>
  );
}
type Props = { army: Army; change: (a: Army) => void; switchFaction: (id: string) => void };
export function ArmyBuilder({ army, change, switchFaction }: Props) {
  const f = getFaction(army.faction);
  const [unit, setUnit] = useState(''),
    [count, setCount] = useState('1');
  const [expanded, setExpanded] = useState<string[]>([]);
  const chosen = f.units.find((u) => u.id === unit);
  const epic = !!chosen && !!profileFor(f.family, chosen.id)?.keywords.includes('Epic Hero');
  const exists = epic && army.units.some((u) => u.unit === unit);
  const lookup = (u: UnitEntry) => f.units.find((s) => s.id === u.unit)!;
  function pick(id: string) {
    setUnit(id);
    setCount('1');
  }
  function add() {
    if (!chosen || exists) return;
    const added = Array.from({ length: epic ? 1 : Number(count) }, () => newUnit(f.id, chosen.id));
    if (army.units.length + added.length > 1000) return;
    change({ ...army, units: [...army.units, ...added] });
    setUnit('');
    setCount('1');
    if (added.length === 1 && profileFor(f.family, unit)) setExpanded((old) => [...old, added[0].key]);
  }
  function setEntry(entry: UnitEntry) {
    change({ ...army, units: army.units.map((u) => (u.key === entry.key ? entry : u)) });
  }
  function source(u: Unit) {
    const url = datasheetUrl(f, u);
    return url ? (
      <a href={url} target="_blank" rel="noreferrer">
        Datasheet
      </a>
    ) : (
      <span>Catalog entry · review pending</span>
    );
  }
  return (
    <section className="panel builder" aria-labelledby="build-title">
      <h2 id="build-title">Army builder</h2>
      <div className="fields">
        <SearchSelect label="Faction" value={f.id} options={factions} onChange={switchFaction} />
        <SearchSelect
          label="Detachment"
          value={army.detachment}
          options={f.detachments}
          onChange={(id) => {
            if (
              id !== army.detachment &&
              army.units.some((u) => u.enhancement) &&
              !window.confirm('Changing detachment removes its assigned enhancements. Continue?')
            )
              return;
            change(setDetachment(army, id));
          }}
        />
      </div>
      <div className="roster-title">
        <h3>Units</h3>
        <span>
          {army.units.length} {army.units.length === 1 ? 'unit' : 'units'}
        </span>
      </div>
      <div className="add-row">
        <SearchSelect
          label="Datasheet"
          value={unit}
          options={f.units}
          onChange={pick}
          placeholder="Find a unit…"
        />
        <SearchSelect
          label="Unit copies"
          value={epic ? '1' : count}
          options={numbers(1, epic ? 1 : 6).map((n) => ({ id: String(n), name: String(n) }))}
          onChange={setCount}
        />
        <button
          className="primary"
          disabled={!chosen || exists || army.units.length + Number(count) > 1000}
          onClick={add}
        >
          Add unit
        </button>
      </div>
      {exists && <p className="note">This Epic Hero is already in your army.</p>}
      {!army.units.length && !army.unresolved.length && (
        <p className="empty-roster">Add a unit to see its abilities on the sheet.</p>
      )}
      {army.attachmentNotes.map((n, i) => (
        <div className="unresolved" key={n.leader + n.bodyguard}>
          <strong>
            {n.leader} → {n.bodyguard}
          </strong>
          <p>
            The previous army identified this pairing by name. Choose the intended squad under the Leader’s
            Bodyguard setting.
          </p>
          <button
            onClick={() =>
              change({ ...army, attachmentNotes: army.attachmentNotes.filter((_, j) => i !== j) })
            }
          >
            Dismiss pairing note
          </button>
        </div>
      ))}
      {army.unresolved.map((row, i) => (
        <div className="unresolved" key={i}>
          <strong>
            {row.quantity} × {row.name}
          </strong>
          <p>Previous selection needs review. Add the matching datasheet above, then remove this entry.</p>
          <button onClick={() => change({ ...army, unresolved: army.unresolved.filter((_, j) => j !== i) })}>
            Remove old entry
          </button>
        </div>
      ))}
      {army.units.map((entry, i) => {
        const u = lookup(entry),
          open = expanded.includes(entry.key);
        return (
          <article className="roster-row" key={entry.key}>
            <div className="row-head">
              <div>
                <strong>{unitLabel(army, entry)}</strong>
                {entry.bodyguard && (
                  <p className="attachment-label">
                    Leading {unitLabel(army, army.units.find((u) => u.key === entry.bodyguard)!)}
                  </p>
                )}
                {leadersOf(army, entry.key).length > 0 && (
                  <p className="attachment-label">
                    Led by{' '}
                    {leadersOf(army, entry.key)
                      .map((u) => unitLabel(army, u))
                      .join(' + ')}
                  </p>
                )}
                <div className="meta">
                  {entry.models ? entry.models + (entry.models === 1 ? ' model' : ' models') + ' · ' : ''}
                  {source(u)}
                </div>
              </div>
              <div className="inline-actions">
                <button
                  aria-label={'Configure ' + u.name + ' unit ' + (i + 1)}
                  aria-expanded={open}
                  onClick={() =>
                    setExpanded((prev) =>
                      open ? prev.filter((id) => id !== entry.key) : [...prev, entry.key],
                    )
                  }
                >
                  {open ? 'Close' : 'Configure'}
                </button>
                <button
                  aria-label={'Remove ' + u.name + ' unit ' + (i + 1)}
                  onClick={() => change(removeUnit(army, entry.key))}
                >
                  Remove
                </button>
              </div>
            </div>
            {open && <UnitOptions entry={entry} army={army} update={setEntry} />}
          </article>
        );
      })}
      <p className="source-line">
        <a href={f.source} target="_blank" rel="noreferrer">
          {f.name} rules on Wahapedia
        </a>
      </p>
    </section>
  );
}
