import {describe, expect, it} from 'vitest';
import {newSelection, type ArmySelection} from '../src/catalog';
import {PHASES} from '../src/engine';
import {expandRoster, type RosterInstance} from '../src/roster-instances';
import {necronBattleFormations} from '../src/necron-battle-units';
import {canoptekHypercryptReminders} from '../src/necron-canoptek-hypercrypt';
import {remainingNecronReminders} from '../src/necron-remaining-detachments';
import {targetedNecronEnhancements} from '../src/necron-targeted-enhancements';
import {generate11thReminders} from '../src/reminders-11th';

const model = (id: string, unit: string, rest: Partial<RosterInstance> = {}): RosterInstance => ({id, unit, ...rest});
const force = (detachment: string, ...instances: RosterInstance[]): ArmySelection => ({
  ...newSelection('Necrons'), detachments2026: [detachment], instances
});
const optimiser = (army: ArmySelection, survivors = expandRoster(army)) =>
  targetedNecronEnhancements(army, necronBattleFormations(army, survivors))
    .filter(rule => rule.title.includes('Prelocational Optimiser'));
const corridor = (army: ArmySelection, survivors = expandRoster(army)) =>
  canoptekHypercryptReminders(army, survivors).filter(rule => rule.id === '11e-necron-hypercrypt-corridor');

// Publisher Necrons v1.3 page 4: Optimiser checks earlier Eternity Gate use.
// Dimensional Corridor checks that the original transporting Monolith began
// the turn on the battlefield, not that it remains alive in the Charge phase.
// Core 01.02.02 and 19.01/19.04 retain the effect and original attached unit.
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf
// https://wahapedia.ru/wh40k11ed/factions/necrons/#Dimensional-Corridor
describe('earlier Eternity Gate use remains available to detachment follow-ups', () => {
  const army = () => ({...force("The Phaeron's Armoury",
    model('gate', 'Monolith'), model('first', 'Immortals'), model('second', 'Immortals'),
    model('lord', 'Overlord', {equipment: 'Staff of light', attachedTo: 'second'})),
    upgrades2026: {lord: 'Prelocational Optimiser'}});

  it('keeps Optimiser on its bearer’s exact formation after the Monolith is destroyed', () => {
    const a = army();
    const rows = optimiser(a, expandRoster(a).filter(s => s.id !== 'gate'));
    expect(rows).toMatchObject([{id: '11e-necron-enh-prelocational', window: 'Shooting', units: ['second']}]);
    expect(rows[0].summary).toMatch(/only if it used a Monolith’s Eternity Gate this turn.*Lethal Hits or Sustained Hits 1.*Monolith need not still be alive/);
    expect(rows[0].summary).toContain('enhancement bearer must still be in this original formation');
  });

  it('keeps the living Optimiser bearer after its Bodyguard dies, without granting the upgrade to a duplicate', () => {
    const a = army();
    const rows = optimiser(a, expandRoster(a).filter(s => s.id === 'lord' || s.id === 'first'));
    expect(rows).toMatchObject([{units: ['lord']}]);
    expect(rows.every(rule => !rule.units?.includes('first'))).toBe(true);
    expect(optimiser(a, expandRoster(a).filter(s => s.id !== 'lord'))).toEqual([]);
  });

  it('rejects a reused Monolith ID and newly supplied gate identities', () => {
    const a = army();
    expect(optimiser(a, expandRoster(a).map(s => s.id === 'gate' ? {...s, unit: 'Doomsday Ark'} : s))).toEqual([]);
    const noGate = {...a, instances: a.instances!.filter(s => s.id !== 'gate')};
    expect(optimiser(noGate, [...expandRoster(noGate), model('new-gate', 'Monolith')])).toEqual([]);
  });

  it('does not transfer Optimiser when the bearer’s identity or original join is changed', () => {
    const a = army();
    for (const change of [{unit: 'Royal Warden'}, {attachedTo: 'first'}, {attachedTo: undefined}]) {
      expect(optimiser(a, expandRoster(a).map(s => s.id === 'lord' ? {...s, ...change} : s))).toEqual([]);
    }
    // A replaced Bodyguard cannot inherit the effect; the unchanged surviving
    // bearer still belongs to the original formation and keeps its own rule.
    expect(optimiser(a, expandRoster(a).map(s => s.id === 'second' ? {...s, unit: 'Necron Warriors'} : s)))
      .toMatchObject([{units: ['lord']}]);
  });

  it('retains Corridor after both the Monolith and the original Infantry source are lost', () => {
    const a = force('Hypercrypt Legion', model('gate', 'Monolith'), model('body', 'Canoptek Wraiths'),
      model('tech', 'Technomancer', {attachedTo: 'body'}), model('other', 'Canoptek Wraiths'));
    const rows = corridor(a, expandRoster(a).filter(s => s.id !== 'gate' && s.id !== 'tech'));
    expect(rows).toMatchObject([{units: ['body'], window: 'Charge'}]);
    expect(rows[0].summary).toMatch(/only the original formation.*only if that Monolith began the turn on the battlefield.*subsequently destroyed.*lost its Infantry keyword/);
    expect(rows[0].summary).toContain('does not grant another ingress move');
  });

  it('follows a surviving original retinue after both its Bodyguard and Support are destroyed', () => {
    const a = force('Hypercrypt Legion', model('gate', 'Monolith'), model('body', 'Canoptek Wraiths'),
      model('tech', 'Technomancer', {attachedTo: 'body'}), model('retinue', 'Canoptek Tomb Crawlers', {retinueTo: 'body'}));
    expect(corridor(a, expandRoster(a).filter(s => s.id === 'retinue'))).toMatchObject([{units: ['retinue']}]);
  });

  it('does not invent a previous eligible formation from illegal or changed joins', () => {
    const illegal = force('Hypercrypt Legion', model('gate', 'Monolith'), model('body', 'Canoptek Wraiths'),
      model('wrong', 'Chronomancer', {attachedTo: 'body'}));
    expect(corridor(illegal, [model('body', 'Canoptek Wraiths')])).toEqual([]);
    const a = force('Hypercrypt Legion', model('gate', 'Monolith'), model('body', 'Immortals'),
      model('lord', 'Overlord', {attachedTo: 'body'}));
    for (const survivors of [[model('body', 'Necron Warriors')], [model('new', 'Immortals')],
      [model('lord', 'Overlord', {attachedTo: 'elsewhere'})]]) expect(corridor(a, survivors)).toEqual([]);
  });

  it('requires a current surviving Warlord for the separate Reanimation Crypts activation', () => {
    const a = {...force('Hypercrypt Legion', model('lord', 'Overlord'), model('body', 'Immortals')), warlordId: 'lord'};
    const crypts = (survivors: RosterInstance[]) => canoptekHypercryptReminders(a, survivors).filter(rule => rule.title.includes('Reanimation Crypts'));
    expect(crypts(expandRoster(a))).toMatchObject([{units: ['lord']}]);
    expect(crypts([model('body', 'Immortals')])).toEqual([]);
    expect(crypts([model('lord', 'Royal Warden'), model('body', 'Immortals')])).toEqual([]);
  });
});

// Territorial Obsession: current reproduced Codex rule; publisher v1.3 p29
// replaces the eligible target with Lychguard or Triarch. The effect lasts to
// the start of the next Command phase. Core 14.02/14.02.01 checks control at
// every phase/turn end before other such rules; numeric modifiers do not
// replace Battle-shock's OC '-'.
// https://wahapedia.ru/wh40k11ed/factions/necrons/#Territorial-Obsession
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
describe('selected Territorial Obsession remains visible for objective control', () => {
  const followups = (a: ArmySelection, survivors = expandRoster(a)) =>
    remainingNecronReminders(a, survivors).filter(rule => rule.id.startsWith('11e-necron-obeisance-control-'));

  it('prints the selected OC bonus at all seven control windows, separately from spending CP', () => {
    const a = force('Obeisance Phalanx', model('guard', 'Lychguard'), model('stalker', 'Triarch Stalker'),
      model('praetorians', 'Triarch Praetorians'), model('king', 'The Silent King'), model('other', 'Immortals'));
    const rows = followups(a);
    expect(rows.map(rule => rule.window)).toEqual([...PHASES, 'End of your turn', 'End of opponent turn']);
    expect(rows.every(rule => rule.timing === 'end' && rule.turn === 'either')).toBe(true);
    expect(rows.every(rule => rule.units?.join() === 'guard,stalker,praetorians,king')).toBe(true);
    expect(rows.every(rule => /Only the original unit selected.*\+1 OC.*\+3 OC.*until the start of your next Command phase/.test(rule.summary))).toBe(true);
    expect(rows.every(rule => rule.summary.includes('before other end-of-phase or end-of-turn rules') && rule.summary.includes('Battle-shocked models retain OC “–”'))).toBe(true);
    expect(generate11thReminders(a).find(rule => rule.id === '11e-necron-obeisance-territory')).toMatchObject({window: 'Command', turn: 'own', timing: 'during'});
    expect(rows.every(rule => !rule.title.includes('1CP'))).toBe(true);
  });

  it('retains only the original selected formation when its Lychguard Bodyguard dies', () => {
    const a = force('Obeisance Phalanx', model('body', 'Lychguard'), model('lord', 'Overlord', {attachedTo: 'body'}),
      model('other', 'Immortals'));
    const rows = followups(a, expandRoster(a).filter(s => s.id !== 'body'));
    expect(rows).toHaveLength(7);
    expect(rows.every(rule => rule.units?.join() === 'lord')).toBe(true);
    expect(remainingNecronReminders(a, expandRoster(a).filter(s => s.id !== 'body')).find(rule => rule.id === '11e-necron-obeisance-territory')).toBeUndefined();
  });

  it('rejects replacement names, new IDs and changes to a former member’s attachment', () => {
    const a = force('Obeisance Phalanx', model('body', 'Lychguard'), model('lord', 'Overlord', {attachedTo: 'body'}));
    for (const survivors of [[model('body', 'Immortals')], [model('new', 'Lychguard')],
      [model('lord', 'Overlord', {attachedTo: 'other'})]]) expect(followups(a, survivors)).toEqual([]);
  });

  it('does not manufacture selected OC bonuses for other units or without the detachment', () => {
    expect(followups(force('Obeisance Phalanx', model('body', 'Immortals'), model('lord', 'Overlord')))).toEqual([]);
    expect(followups(force('Hand of the Dynasty', model('guard', 'Lychguard')))).toEqual([]);
  });
});

// The current reproduced Codex rules explicitly last until the end of battle.
// A conditional reminder does not assert that the CP was spent or infer the
// marked enemy. Curse affects Canoptek MODELS; Your Time affects enemy tests.
// https://wahapedia.ru/wh40k11ed/factions/necrons/#Curse-of-the-Cryptek
// https://wahapedia.ru/wh40k11ed/factions/necrons/#Your-Time-Is-Nigh
describe('battle-long detachment effects outlive their activation targets', () => {
  const marked = (a: ArmySelection, survivors = expandRoster(a)) =>
    canoptekHypercryptReminders(a, survivors).filter(rule => rule.id.startsWith('11e-necron-court-marked-attacker-'));

  it('retains Curse on actual Canoptek attackers after the Cryptek dies, without another activation', () => {
    const a = force('Canoptek Court', model('tech', 'Technomancer', {attachedTo: 'wraiths'}),
      model('wraiths', 'Canoptek Wraiths'), model('walker', 'Canoptek Doomstalker'), model('other', 'Immortals'));
    const survivors = expandRoster(a).filter(s => s.id !== 'tech');
    const rows = marked(a, survivors);
    expect(rows.map(rule => [rule.window, rule.units])).toEqual([
      ['Movement', ['walker']], ['Shooting', ['walker']], ['Fight', ['wraiths', 'walker']]
    ]);
    expect(rows.every(rule => rule.turn === 'either' && rule.summary.includes('Only if Curse of the Cryptek was previously used')
      && rule.summary.includes('for the rest of the battle') && rule.summary.includes('only Canoptek models'))).toBe(true);
    expect(rows.filter(rule => rule.window !== 'Fight').every(rule => rule.summary.includes('ignore the Hit modifier but retain the Wound modifier'))).toBe(true);
    expect(canoptekHypercryptReminders(a, survivors).some(rule => rule.id.startsWith('11e-necron-court-curse-'))).toBe(false);
  });

  it('does not borrow the attached Cryptek’s gun for unarmed Canoptek ranged bonuses', () => {
    const a = force('Canoptek Court', model('tech', 'Technomancer', {attachedTo: 'wraiths'}), model('wraiths', 'Canoptek Wraiths'));
    expect(marked(a).map(rule => rule.window)).toEqual(['Fight']);
    const armed = {...a, instances: a.instances!.map(s => s.id === 'wraiths' ? {...s, wargear: {'Particle caster': 1}} : s)};
    expect(marked(armed).map(rule => rule.window)).toEqual(['Movement', 'Shooting', 'Fight']);
    expect(marked(a, expandRoster(a).filter(s => s.id === 'tech'))).toEqual([]);
  });

  it('requires an original Cryptek source and excludes a reused source ID', () => {
    const a = force('Canoptek Court', model('tech', 'Technomancer'), model('walker', 'Canoptek Doomstalker'));
    expect(marked(a, [model('tech', 'Royal Warden'), model('walker', 'Canoptek Doomstalker')])).toEqual([]);
    expect(marked(force('Canoptek Court', model('walker', 'Canoptek Doomstalker')))).toEqual([]);
    expect(marked(force('Hypercrypt Legion', model('tech', 'Technomancer'), model('walker', 'Canoptek Doomstalker')))).toEqual([]);
  });

  it('keeps Your Time’s conditional enemy tests after the original Warlord dies', () => {
    const a = {...force('Obeisance Phalanx', model('lord', 'Overlord'), model('body', 'Immortals')), warlordId: 'lord'};
    const rows = remainingNecronReminders(a, [model('body', 'Immortals')]);
    const lasting = rows.filter(rule => rule.id.startsWith('11e-necron-obeisance-enemy-tests-'));
    expect(lasting.map(rule => rule.window)).toEqual(PHASES);
    expect(lasting.every(rule => rule.turn === 'either' && rule.units?.join() === 'lord'
      && /Only if Your Time Is Nigh was previously used.*every enemy Battle-shock or Leadership test.*rest of the battle/.test(rule.summary))).toBe(true);
    expect(rows.some(rule => rule.id.startsWith('11e-necron-obeisance-time-'))).toBe(false);
    expect(lasting.every(rule => rule.summary.includes('continues if your Warlord is later destroyed') && !rule.title.includes('1CP'))).toBe(true);
  });

  it('does not transfer Your Time’s prior activation to a replacement Warlord identity', () => {
    const a = {...force('Obeisance Phalanx', model('lord', 'Overlord'), model('body', 'Immortals')), warlordId: 'lord'};
    expect(remainingNecronReminders(a, [model('lord', 'Royal Warden'), model('body', 'Immortals')])
      .some(rule => rule.title.includes('Your Time Is Nigh'))).toBe(false);
  });

  it('keeps activation and persistent reminder identities distinct in the actual sheet', () => {
    const a = {...force('Obeisance Phalanx', model('lord', 'Overlord'), model('guard', 'Lychguard')), warlordId: 'lord'};
    const rows = generate11thReminders(a);
    const time = rows.filter(rule => rule.title.includes('Your Time Is Nigh'));
    expect(time.filter(rule => rule.title.includes('1CP'))).toHaveLength(5);
    expect(time.filter(rule => !rule.title.includes('1CP'))).toHaveLength(5);
    expect(new Set(rows.map(rule => rule.id)).size).toBe(rows.length);
    expect(time.every(rule => !rule.previousSheetEntry)).toBe(true);
  });
});
