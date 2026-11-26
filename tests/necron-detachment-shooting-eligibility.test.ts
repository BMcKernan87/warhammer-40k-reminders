import {describe, expect, it} from 'vitest';
import {addSelectionUnit, newSelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {expandRoster, individualArmy, setInstanceAttachment, setInstanceEquipment, setInstanceWargear} from '../src/roster-instances';

// Necrons v1.3, p10 Methodical Murder and p12 Entrophasic Aura Targeting:
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf
// Core 04.01.01 requires a ranged weapon to make a ranged attack:
// https://wahapedia.ru/wh40k11ed/the-rules/core-rules/
// A melee-only unit remains eligible to shoot, but these offensive buffs have
// no ranged attack to affect. Its Fight and defensive reminders must remain.
const force = (detachment: string, ...units: string[]) => individualArmy({
  ...units.reduce((army, unit) => addSelectionUnit(army, unit), newSelection('Necrons')),
  detachments2026: [detachment]
});
const cue = (army: ReturnType<typeof force>, id: string) =>
  generate11thReminders(army).find(rule => rule.id === '11e-necron-' + id);

describe.each([
  {detachment: 'Cursed Legion', rule: 'cursed-methodical'},
  {detachment: 'Pantheon of Woe', rule: 'pantheon-entropy'}
])('$detachment offensive Shooting targets', ({detachment, rule}) => {
  it('omits melee-only Shooting buffs while retaining every eligible Fight target', () => {
    const army = force(detachment, 'Lychguard', 'Flayed Ones', 'Skorpekh Destroyers');
    expect(cue(army, rule + '-shooting')).toBeUndefined();
    expect(cue(army, rule + '-fight')?.units).toEqual([
      'Lychguard#1', 'Flayed Ones#1', 'Skorpekh Destroyers#1'
    ]);
  });

  it('uses an attached Character’s actual weapon without duplicating its bodyguard or including an unarmed copy', () => {
    let army = force(detachment, 'Lychguard', 'Lychguard', 'Overlord', 'Immortals');
    army = setInstanceAttachment(army, 'Overlord#1', 'Lychguard#2');
    army = setInstanceEquipment(army, 'Overlord#1', 'Staff of light');
    expect(cue(army, rule + '-shooting')?.units).toEqual(['Lychguard#2', 'Immortals#1']);
    expect(cue(army, rule + '-shooting')?.summary).toContain('Your Shooting phase.');

    const melee = setInstanceEquipment(army, 'Overlord#1', 'Voidscythe');
    expect(cue(melee, rule + '-shooting')?.units).toEqual(['Immortals#1']);
    expect(cue(melee, rule + '-fight')?.units).toEqual(['Lychguard#1', 'Lychguard#2', 'Immortals#1']);
  });

  it('requires a selected optional Wraith gun and removes the Shooting reminder when it is removed', () => {
    const army = force(detachment, 'Canoptek Wraiths');
    expect(cue(army, rule + '-shooting')).toBeUndefined();
    const armed = setInstanceWargear(army, 'Canoptek Wraiths#1', 'Transdimensional beamer', 1);
    expect(cue(armed, rule + '-shooting')?.units).toEqual(['Canoptek Wraiths#1']);
    const unarmed = setInstanceWargear(armed, 'Canoptek Wraiths#1', 'Transdimensional beamer', 0);
    expect(cue(unarmed, rule + '-shooting')).toBeUndefined();
    expect(cue(unarmed, rule + '-fight')?.units).toEqual(['Canoptek Wraiths#1']);
  });

  it('does not borrow the weapon of an unattached or absent Character', () => {
    const army = setInstanceAttachment(
      force(detachment, 'Skorpekh Destroyers', 'Skorpekh Lord'),
      'Skorpekh Lord#1', 'Skorpekh Destroyers#1'
    );
    expect(cue(army, rule + '-shooting')?.units).toEqual(['Skorpekh Destroyers#1']);
    const detached = setInstanceAttachment(army, 'Skorpekh Lord#1', null);
    expect(cue(detached, rule + '-shooting')?.units).toEqual(['Skorpekh Lord#1']);
    const remaining = {...army, instances: expandRoster(army).filter(squad => squad.unit !== 'Skorpekh Lord')};
    expect(cue(remaining, rule + '-shooting')).toBeUndefined();
    expect(cue(remaining, rule + '-fight')?.units).toEqual(['Skorpekh Destroyers#1']);
  });
});

describe('the printed target exclusions and defensive reactions', () => {
  it('keeps armed Vehicles and Monsters out of Methodical Murder', () => {
    const army = force('Cursed Legion', 'Doomsday Ark', 'Monolith', 'C’tan Shard of the Nightbringer');
    expect(cue(army, 'cursed-methodical-shooting')).toBeUndefined();
    expect(cue(army, 'cursed-methodical-fight')).toBeUndefined();
  });

  it('permits armed Vehicles, including Titanic units, for Entrophasic Aura Targeting but excludes Monsters', () => {
    const army = force('Pantheon of Woe', 'Doomsday Ark', 'Monolith', 'C’tan Shard of the Nightbringer');
    for (const phase of ['shooting', 'fight']) {
      expect(cue(army, 'pantheon-entropy-' + phase)?.units).toEqual(['Doomsday Ark#1', 'Monolith#1']);
    }
  });

  it('retains Image of Death and Chronodistortion for melee-only targets', () => {
    const cursed = force('Cursed Legion', 'Skorpekh Destroyers');
    expect(cue(cursed, 'cursed-image-shooting')?.units).toEqual(['Skorpekh Destroyers#1']);
    const pantheon = force('Pantheon of Woe', 'Lychguard');
    expect(cue(pantheon, 'pantheon-chrono')?.units).toEqual(['Lychguard#1']);
  });
});
