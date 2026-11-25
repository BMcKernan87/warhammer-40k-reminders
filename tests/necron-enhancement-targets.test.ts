import {describe, expect, it} from 'vitest';
import {addSelectionUnit, newSelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {expandRoster, individualArmy, setInstanceAttachment} from '../src/roster-instances';
import {selectUpgrade2026} from '../src/upgrades-2026';

const army = (detachment: string, ...units: string[]) => individualArmy({
  ...units.reduce((a, unit) => addSelectionUnit(a, unit), newSelection('Necrons')), detachments2026: [detachment]
});
const id = (a: ReturnType<typeof army>, unit: string) => expandRoster(a).find(s => s.unit === unit)!.id;
const named = (a: ReturnType<typeof army>, name: string) => generate11thReminders(a).filter(r => r.title.includes(name));

describe('Enhancements requiring a separately eligible unit or a Monolith', () => {
  it.each(['Demanding Leader', 'Chrono-impedance Fields'])('targets the eligible formations for %s', name => {
    const a = army('Starshatter Arsenal', 'Overlord', 'Immortals', 'Monolith', 'Lokhust Heavy Destroyers', 'Triarch Stalker');
    const b = selectUpgrade2026(a, id(a, 'Overlord'), name);
    const rows = named(b, name);
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.every(r => r.units?.join() === [id(a,'Lokhust Heavy Destroyers'),id(a,'Triarch Stalker')].join())).toBe(true);
    expect(rows.every(r => r.title.includes(id(a,'Overlord')))).toBe(true);
    const unsupported = army('Starshatter Arsenal', 'Overlord', 'Monolith', 'Immortals');
    expect(named(selectUpgrade2026(unsupported, id(unsupported,'Overlord'), name), name)).toEqual([]);
  });

  it('includes the bearer’s own non-Titanic Vehicle and excludes Monsters and Titanic aura recipients', () => {
    const a = army('Starshatter Arsenal','Catacomb Command Barge','C’tan Shard of the Nightbringer','Monolith','Immortals');
    const barge = id(a,'Catacomb Command Barge');
    expect(named(selectUpgrade2026(a, barge, 'Dread Majesty'), 'Dread Majesty')[0].units).toEqual([barge,id(a,'Immortals')]);
    expect(named(selectUpgrade2026(a, barge, 'Demanding Leader'), 'Demanding Leader')[0].units).toEqual([barge]);
  });

  it('only prints the Optimiser for an Infantry formation with a Monolith in the army', () => {
    const detachment = "The Phaeron's Armoury";
    for (const units of [['Overlord'], ['Catacomb Command Barge', 'Monolith']]) {
      const a = army(detachment, ...units);
      expect(named(selectUpgrade2026(a, id(a,units[0]), 'Prelocational Optimiser'), 'Prelocational Optimiser')).toEqual([]);
    }
    let a = army(detachment, 'Overlord','Immortals','Monolith');
    const bearer = id(a,'Overlord'), body = id(a,'Immortals');
    a = setInstanceAttachment(a, bearer, body);
    const row = named(selectUpgrade2026(a,bearer,'Prelocational Optimiser'),'Prelocational Optimiser')[0];
    expect(row.units).toEqual([body]);
    expect(row.title).toContain(bearer);
  });

  it('excludes the Phasal Subjugator’s own unit and handles a different led Bodyguard losing its Character', () => {
    let a = army('Awakened Dynasty','Overlord','Royal Warden','Immortals','Necron Warriors','Deathmarks');
    const bearer = id(a,'Overlord'), other = id(a,'Necron Warriors');
    a = setInstanceAttachment(a,bearer,id(a,'Immortals'));
    a = setInstanceAttachment(a,id(a,'Royal Warden'),other);
    const rows = named(selectUpgrade2026(a,bearer,'Phasal Subjugator'),'Phasal Subjugator');
    expect(rows).toHaveLength(2);
    expect(rows[0].units).toEqual([other,id(a,'Deathmarks')]);
    expect(rows[0].summary).toContain(other+' can qualify only after losing all attached Characters.');
    const lone = army('Awakened Dynasty','Overlord');
    expect(named(selectUpgrade2026(lone,id(lone,'Overlord'),'Phasal Subjugator'),'Phasal Subjugator')).toEqual([]);
  });
});
