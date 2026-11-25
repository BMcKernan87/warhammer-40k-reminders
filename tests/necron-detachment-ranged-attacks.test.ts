import {describe, expect, it} from 'vitest';
import {newSelection, addSelectionUnit} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {individualArmy, setInstanceAttachment, setInstanceWargear} from '../src/roster-instances';

const force = (detachment: string, ...units: string[]) => individualArmy({
  ...units.reduce((a, unit) => addSelectionUnit(a,unit), newSelection('Necrons')), detachments2026: [detachment]
});
const phases = (a: ReturnType<typeof force>, title: string) =>
  generate11thReminders(a).filter(r => r.title.includes(title)).map(r => r.window);

describe('Detachment buffs for units or models with ranged weapons', () => {
  it('keeps defensive stratagems for melee-only Destroyers and omits their offensive shooting options', () => {
    const a = force('Annihilation Legion','Skorpekh Destroyers');
    expect(phases(a,'Annihilation Protocol')).toEqual(['Charge']);
    expect(phases(a,'The Spoor of Frailty')).toEqual(['Fight']);
    expect(phases(a,'Masks of Death')).toEqual(['Shooting','Fight']);
    expect(phases(a,'Insanity’s Ire')).toEqual(['Shooting']);
    const armed = setInstanceAttachment(force('Annihilation Legion','Skorpekh Lord','Skorpekh Destroyers'),'Skorpekh Lord#1','Skorpekh Destroyers#1');
    expect(phases(armed,'The Spoor of Frailty')).toEqual(['Shooting','Fight']);
  });
  it('enables shooting for the Wraith formation when a model actually takes a ranged weapon', () => {
    const a = force('Canoptek Court','Canoptek Wraiths');
    const weapon = 'Transdimensional beamer';
    expect(phases(a,'Canoptek Court · Power Matrix')).toEqual(['Fight']);
    expect(phases(a,'Cynosure of Eradication')).toEqual(['Fight']);
    const armed = setInstanceWargear(a,'Canoptek Wraiths#1',weapon,1);
    expect(phases(armed,'Cynosure of Eradication')).toEqual(['Shooting','Fight']);
  });
  it('distinguishes a unit-wide hit reroll from a Cryptek-model weapon buff for an attached Orikan', () => {
    const a = setInstanceAttachment(force('Canoptek Court','Orikan the Diviner','Immortals'),'Orikan the Diviner#1','Immortals#1');
    expect(phases(a,'Canoptek Court · Power Matrix')).toEqual(['Shooting','Fight']);
    expect(phases(a,'Cynosure of Eradication')).toEqual(['Fight']);
  });
  it('retains the Advance reroll on a led melee unit without granting a shooting option', () => {
    const a=setInstanceAttachment(force('Awakened Dynasty','Overlord with translocation shroud','Lychguard'),'Overlord with translocation shroud#1','Lychguard#1');
    expect(phases(a,'Sudden Storm')).toEqual(['Movement']);
    expect(phases(a,'Command Protocols')).toEqual(['Fight']);
    expect(phases(a,'Conquering Tyrant')).toEqual([]);
  });
  it('restricts an offensive Cryptek choice without discarding defensive triggers on a melee roster', () => {
    const a=force('Cryptek Conclave','Orikan the Diviner','Lychguard');
    expect(phases(a,'Molecular Targeting')).toEqual(['Fight']);
    expect(phases(a,'Animus Curse')).toEqual(['Shooting','Fight']);
    const b=setInstanceAttachment(force('Cryptek Conclave','Orikan the Diviner','Immortals'),'Orikan the Diviner#1','Immortals#1');
    expect(phases(b,'Molecular Targeting')).toEqual(['Shooting','Fight']);
    expect(phases(b,'Synergistic Empowerment · attached models')).toEqual(['Shooting']);
  });
  it('keeps Wraith Form off the Canoptek reaction for other constructs', () => {
    const a=force('Canoptek Court','Canoptek Doomstalker');
    const reaction=generate11thReminders(a).find(r=>r.title.includes('Reactive Subroutines'));
    expect(reaction?.units).toEqual(['Canoptek Doomstalker#1']);
    expect(reaction?.summary).not.toContain('Wraith Form');
  });
});
