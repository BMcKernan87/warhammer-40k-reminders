import { factions, getFaction, datasheetUrl } from '../catalog';
import type { Rule, Slot, Provenance, Enhancement } from './schema';
import { ruleSchema, enhancementSchema } from './schema';

let reviewDate = '2026-11-21';
const core = 'https://wahapedia.ru/wh40k10ed/the-rules/core-rules/';
export function reviewed(url: string, section: string, revision = '10th-edition reference'): Provenance {
  return { status: 'checked', url, section, revision, checkedOn: reviewDate };
}
const your = (phase: Slot['phase'], timing: Slot['timing'] = 'during'): Slot => ({
  phase,
  timing,
  turn: 'your',
});
const either = (phase: Slot['phase'], timing: Slot['timing'] = 'during'): Slot => ({
  phase,
  timing,
  turn: 'either',
});
const enemy = (phase: Slot['phase'], timing: Slot['timing'] = 'during'): Slot => ({
  phase,
  timing,
  turn: 'opponent',
});
const neutral = (phase: Slot['phase']): Slot => ({ phase, timing: 'start', turn: 'neutral' });
const attacks = [your('Shooting'), either('Fight')] as const;
const coreScope = { kind: 'core' } as const;
const faction = (family: string) => ({ kind: 'army', family }) as const;
const det = (family: string, detachment: string) => ({ kind: 'detachment', family, detachment }) as const;
const sheet = (family: string, unit: string, gear?: string) =>
  ({ kind: 'unit', family, unit, gear }) as const;
const strat = (cp: number, family?: string, detachment?: string) =>
  ({ kind: 'stratagem', cp, family, detachment }) as const;
const awake = det('necrons', 'awakened-dynasty');
const rules: Rule[] = [];

function add(
  id: string,
  title: string,
  scope: Rule['scope'],
  slots: readonly Slot[],
  trigger: string,
  effect: string,
  conditions: string[] = [],
  extra: Partial<
    Pick<
      Rule,
      'limit' | 'firstRound' | 'appliesTo' | 'armyLimit' | 'leaderKeyword' | 'interactions' | 'perItem'
    >
  > = {},
) {
  const family = 'family' in scope && scope.family ? getFaction(scope.family) : undefined;
  let url = family?.source || core;
  if (scope.kind === 'unit') {
    const entry = factions
      .filter((f) => f.family === scope.family)
      .flatMap((f) => f.units)
      .find((u) => u.id === scope.unit);
    if (!family || !entry || !datasheetUrl(family, entry)) throw Error('Missing datasheet source for ' + id);
    url = datasheetUrl(family, entry)!;
  }
  rules.push(
    ruleSchema.parse({
      id,
      title,
      scope,
      slots,
      trigger,
      conditions,
      effect,
      source: reviewed(url, title),
      ...extra,
    }),
  );
}

add(
  'core-cp',
  'Command point gain',
  coreScope,
  [either('Command', 'start')],
  'Before resolving Command abilities.',
  'Each player gains 1 CP. The usual limit for additional CP from other sources is one per player per battle round.',
);
add(
  'core-shock',
  'Battle-shock tests',
  coreScope,
  [your('Command')],
  'In the Battle-shock step.',
  'Roll 2D6 for each affected unit. A result below its best Leadership leaves it Battle-shocked until your next Command phase starts.',
  ['Test your units on the battlefield that are below half-strength, plus any required by a specific rule.'],
);
add(
  'core-reserves',
  'Set up Reinforcements',
  coreScope,
  [your('Movement', 'end')],
  'After moving units, in the Reinforcements step.',
  'Set up arriving units using their arrival rule and the mission’s round and placement restrictions. They count as having made a Normal move.',
);
add(
  'core-shooting',
  'Select a unit to shoot',
  coreScope,
  [your('Shooting')],
  'Before choosing weapons and targets.',
  'Select an eligible unit that has yet to shoot this phase. Resolve any Advance, Fall Back and Engagement Range exceptions, then declare all targets before resolving attacks.',
);
add(
  'core-fight',
  'Select units to fight',
  coreScope,
  [either('Fight', 'start')],
  'Begin each of the two Fight steps.',
  'Resolve Fights First, then Remaining Combats. In each step the player whose turn is not taking place selects the first eligible unit, then alternate.',
);
add(
  'insane-bravery',
  'Insane Bravery',
  strat(1),
  [your('Command')],
  'Immediately before a Battle-shock test in your Battle-shock step.',
  'The targeted unit automatically passes this test.',
  ['Choose the unit about to test.'],
  { limit: 'battle' },
);
add(
  'counter-offensive',
  'Counter-offensive',
  strat(2),
  [either('Fight')],
  'Immediately after an enemy unit fights.',
  'Your chosen unit fights next.',
  ['It must be in Engagement Range of an enemy and must still be waiting to fight this phase.'],
);
add(
  'necron-reanimation',
  'Reanimation Protocols',
  faction('necrons'),
  [your('Command', 'end')],
  'When your Command phase ends.',
  'Reanimate D3 wounds per eligible unit. Heal a wounded model first. If all survivors are at full wounds and the unit is below its starting strength, return a destroyed model with one wound.',
  ['The unit is on the battlefield and has Reanimation Protocols.'],
);
add(
  'awakened-command-protocols',
  'Command Protocols',
  awake,
  attacks,
  'When a model in the led unit attacks.',
  'Add 1 to its Hit roll.',
  ['A Necrons Character is leading the attacking unit.'],
  { appliesTo: 'formations' },
);
add(
  'hypercrypt-hyperphasing',
  'Hyperphasing',
  det('necrons', 'hypercrypt-legion'),
  [enemy('Turn end', 'end')],
  'After your opponent finishes their turn.',
  'Move up to 1 / 2 / 3 Necrons units into Strategic Reserves at Incursion / Strike Force / Onslaught respectively.',
  ['Each selected unit is outside Engagement Range.'],
);
add(
  'canoptek-power-matrix',
  'Power Matrix',
  det('necrons', 'canoptek-court'),
  [either('Any phase', 'start')],
  'Determine the matrix at the beginning of each phase.',
  'Your zone is always in the matrix. Add No Man’s Land or the enemy zone for this phase if you control at least half its markers. Cryptek and Canoptek units re-roll hit rolls of 1, or any hit roll if wholly inside.',
);
add(
  'hungry-void',
  'Protocol of the Hungry Void',
  strat(1, 'necrons', 'awakened-dynasty'),
  [either('Fight')],
  'Before your Necrons unit is selected to fight.',
  'Its melee weapons gain 1 Strength this phase. A leading Necrons Character also improves their AP by 1. The AP improvement does not stack with other AP improvements.',
);
add(
  'orks-waaagh',
  'Waaagh!',
  faction('orks'),
  [your('Command', 'start')],
  'Declare at the start of your Command phase.',
  'Until your next Command phase, eligible units may charge after advancing. Models with Waaagh! gain a 5+ invulnerable save and +1 Strength and Attacks on melee weapons.',
  [],
  { limit: 'battle' },
);
add(
  'get-stuck-in',
  'Get Stuck In',
  det('orks', 'war-horde'),
  [either('Fight')],
  'When an Orks model attacks with a melee weapon.',
  'Its melee weapons have Sustained Hits 1.',
);
add(
  'tyranids-shadow',
  'Shadow in the Warp',
  faction('tyranids'),
  [either('Command')],
  'Choose either player’s Command phase.',
  'Every enemy unit on the battlefield tests for Battle-shock. Subtract 1 from a test when that enemy unit is within 6″ of one or more friendly Synapse units.',
  ['At least one of your units with this ability is on the battlefield.'],
  { limit: 'battle' },
);
add(
  'hyper-adaptations',
  'Hyper-adaptations',
  det('tyranids', 'invasion-fleet'),
  [neutral('Battle round')],
  'Choose one adaptation when the first battle round starts.',
  'For the battle, choose Sustained Hits 1 against Infantry/Swarm, Lethal Hits against Monster/Vehicle, or Precision on critical hits against Character units.',
  [],
  { limit: 'battle', firstRound: true },
);
add(
  'marine-oath',
  'Oath of Moment',
  faction('space-marines'),
  [your('Command', 'start')],
  'Select one enemy unit at the start of your Command phase.',
  'Until your next Command phase, attackers with Oath may re-roll hits against that unit. Also add 1 to wound if using a Codex: Space Marines detachment with no Black Templars, Blood Angels, Dark Angels, Deathwatch or Space Wolves units.',
);
add(
  'gladius-doctrines',
  'Combat Doctrines',
  det('space-marines', 'gladius-task-force'),
  [your('Command', 'start')],
  'Choose an unused doctrine for your Adeptus Astartes units.',
  'Until your next Command phase, Devastator permits shooting after an Advance, Tactical permits shooting and charging after Fall Back, and Assault permits charging after an Advance. Each doctrine can be chosen once per battle.',
);
const nec = (id: string, gear?: string) => sheet('necrons', id, gear);
add(
  'technomancer-heal',
  'Technomancer repair',
  nec('technomancer'),
  [your('Movement', 'end')],
  'Choose a friendly Necrons model within 6″.',
  'Restore up to D3 lost wounds. Each target can receive this ability only once this turn.',
);
add(
  'rites-of-reanimation',
  'Rites of Reanimation',
  nec('technomancer'),
  [either('Any phase')],
  'When a model in the Technomancer’s led unit would lose a wound.',
  'Apply Feel No Pain 5+.',
  ['The Technomancer is leading the unit.'],
  { appliesTo: 'led' },
);
add(
  'wraith-form',
  'Wraith Form',
  nec('canoptek-wraiths'),
  [your('Movement')],
  'After this unit ends a Normal move over an enemy unit.',
  'Choose one unit crossed. Roll a D6 per model in the moving unit. Each 4+ inflicts one mortal wound.',
  [],
  { appliesTo: 'unit' },
);
add(
  'immortals-eradication',
  'Implacable Eradication',
  nec('immortals'),
  attacks,
  'When a model in this unit attacks.',
  'Re-roll wound rolls of 1. Against a unit within range of an objective marker, you may re-roll any wound roll.',
  [],
  { appliesTo: 'unit' },
);
add(
  'tesla-carbines',
  'Tesla carbines',
  nec('immortals', 'tesla-carbine'),
  [your('Shooting')],
  'When firing this squad’s tesla carbines.',
  'Assault permits shooting after an Advance. Each critical hit generates two additional hits.',
);
add(
  'warriors-legion',
  'Their Number is Legion',
  nec('necron-warriors'),
  [either('Any phase')],
  'Whenever the Warriors activate Reanimation Protocols.',
  'You may re-roll the dice that determine how many wounds they reanimate.',
  [],
  { appliesTo: 'unit' },
);
add(
  'imotekh-cp',
  'Grand Strategist',
  nec('imotekh-the-stormlord'),
  [your('Command', 'start')],
  'At the beginning of your Command phase.',
  'Gain 1 CP if Imotekh is on the battlefield.',
);
add(
  'imotekh-storm',
  'Lord of the Storm',
  nec('imotekh-the-stormlord'),
  [your('Command', 'end')],
  'Choose whether Imotekh unleashes the storm.',
  'Roll separately for every enemy unit within 12″. A 2–5 inflicts D3 mortal wounds and a 6 inflicts D3+3.',
  [],
  { limit: 'battle' },
);
export const enhancements: Enhancement[] = [
  ['veil-of-darkness', 'Veil of Darkness'],
  ['nether-realm-casket', 'Nether-realm Casket'],
  ['phasal-subjugator', 'Phasal Subjugator'],
  ['enaegic-dermal-bond', 'Enaegic Dermal Bond'],
].map(([id, name]) =>
  enhancementSchema.parse({
    id,
    name,
    family: 'necrons',
    detachment: 'awakened-dynasty',
    requiredKeywords: ['Character'],
    source: reviewed(getFaction('necrons').source, name),
  }),
);
const enhancement = (id: string) =>
  ({ kind: 'enhancement', family: 'necrons', detachment: 'awakened-dynasty', enhancement: id }) as const;
add(
  'veil-depart',
  'Veil of Darkness',
  enhancement('veil-of-darkness'),
  [enemy('Turn end', 'end')],
  'At the end of the opposing turn.',
  'Remove the bearer’s unit. Return it in your next Reinforcements step, more than 9″ horizontally from every enemy model.',
  ['The bearer’s unit is outside Engagement Range.'],
  { appliesTo: 'unit', limit: 'battle' },
);
add(
  'veil-return',
  'Return from the Veil',
  enhancement('veil-of-darkness'),
  [your('Movement', 'end')],
  'In the Reinforcements step following use of the Veil.',
  'Set up the removed unit more than 9″ horizontally from every enemy model.',
  [],
  { appliesTo: 'unit' },
);
add(
  'dermal-bond',
  'Enaegic Dermal Bond',
  enhancement('enaegic-dermal-bond'),
  [either('Any phase')],
  'When the bearer would lose a wound.',
  'Apply Feel No Pain 4+ to the bearer.',
);
add(
  'nether-casket',
  'Nether-realm Casket',
  enhancement('nether-realm-casket'),
  [either('Any phase')],
  'When a ranged attack targets the bearer’s led unit.',
  'Models in the unit have Stealth while the bearer leads them.',
  [],
  { appliesTo: 'led' },
);
add(
  'phasal-aura',
  'Phasal Subjugator',
  enhancement('phasal-subjugator'),
  attacks,
  'When a friendly non-Character Necrons unit within 6″ of the bearer attacks.',
  'Add 1 to the Hit roll.',
);

add(
  'declare-formations',
  'Declare battle formations',
  coreScope,
  [{ phase: 'Deployment', timing: 'start', turn: 'neutral' }],
  'At the mission’s Declare Battle Formations step.',
  'Record Leaders and their Bodyguards, embarked units and their Transports, and which units start in Reserves. Reveal choices as the mission directs.',
);
add(
  'skorpekh-charge',
  'Crimson Harvest',
  nec('skorpekh-lord'),
  [your('Charge')],
  'When the Lord finishes a Charge move.',
  'Choose an enemy unit in his Engagement Range and roll a D6. On 2–5 deal D3 mortal wounds. On 6 deal D3+3.',
);
add(
  'skorpekh-lethal',
  'United in Destruction',
  nec('skorpekh-lord'),
  [either('Fight')],
  'When models in the led unit attack in melee.',
  'Their melee weapons have Lethal Hits.',
  ['The Skorpekh Lord is leading this unit.'],
  { appliesTo: 'led' },
);
add(
  'orikan-stars',
  'The Stars Are Right',
  nec('orikan-the-diviner'),
  [either('Fight', 'start')],
  'Decide at the start of the Fight phase.',
  'Triple the Staff of Tomorrow’s Strength and Attacks this phase. Every successful wound roll by Orikan is a critical wound.',
  [],
  { limit: 'battle' },
);
add(
  'orikan-save',
  'Master Chronomancer',
  nec('orikan-the-diviner'),
  [either('Any phase')],
  'When allocating an attack to a model in Orikan’s led unit.',
  'Each model has a 4+ invulnerable save while he leads.',
  [],
  { appliesTo: 'led' },
);
add(
  'lokhust-gauss',
  'Optimised for Slaughter · gauss',
  nec('lokhust-heavy-destroyers', 'gauss-destructor'),
  [your('Shooting')],
  'Fire a gauss destructor at a Monster or Vehicle.',
  'Re-roll wound rolls of 1.',
);
add(
  'lokhust-enmitic',
  'Optimised for Slaughter · enmitic',
  nec('lokhust-heavy-destroyers', 'enmitic-exterminator'),
  [your('Shooting')],
  'Fire an enmitic exterminator at a target without the Monster or Vehicle keywords.',
  'Re-roll wound rolls of 1.',
);
add(
  'nightbringer-drain',
  'Drain Life',
  nec('ctan-shard-of-the-nightbringer'),
  [either('Fight', 'end')],
  'At the end of either Fight phase.',
  'Roll a D6 for each enemy unit within 6″ of the Nightbringer. On 4+ that unit takes D3 mortal wounds.',
);
add(
  'void-absorption',
  'Matter Absorption',
  nec('ctan-shard-of-the-void-dragon'),
  [your('Shooting', 'start')],
  'Choose an enemy Vehicle unit within 12″.',
  'On a D6 roll of 2+, it suffers D3 mortal wounds. The Void Dragon recovers up to the same number of lost wounds.',
);
for (const unit of ['ctan-shard-of-the-nightbringer', 'ctan-shard-of-the-void-dragon']) {
  add(
    unit + '-necrodermis',
    'Necrodermis',
    nec(unit),
    [either('Any phase')],
    'When an attack is allocated to this C’tan.',
    'Reduce the attack’s Damage characteristic by 1.',
  );
}
add(
  'judiciar-first',
  'Tempormortis',
  sheet('space-marines', 'judiciar'),
  [either('Fight', 'start')],
  'When selecting units for the Fights First step.',
  'The unit led by the Judiciar has Fights First.',
  [],
  { appliesTo: 'led' },
);
add(
  'judiciar-fury',
  'Silent Fury',
  sheet('space-marines', 'judiciar'),
  [either('Any phase')],
  'When the Judiciar destroys an enemy Character model.',
  'Increase the Attacks of his executioner relic blade by 1 for the rest of this battle.',
);
const calgar = sheet('space-marines', 'marneus-calgar-in-armour-of-antilochus');
add(
  'calgar-cp',
  'Master Tactician',
  calgar,
  [your('Command', 'start')],
  'If Calgar is your Warlord and on the battlefield.',
  'Gain 1 CP at the start of your Command phase.',
);
add(
  'calgar-inspire',
  'Inspiring Leader',
  calgar,
  [your('Shooting'), your('Charge')],
  'After Calgar’s unit Advances or Falls Back.',
  'It remains eligible to shoot and to declare a charge this turn.',
  [],
  { appliesTo: 'unit' },
);
add(
  'warboss-might',
  'Might is Right',
  sheet('orks', 'warboss'),
  [either('Fight')],
  'When a model in the Warboss’s led unit attacks in melee.',
  'Add 1 to its Hit roll.',
  [],
  { appliesTo: 'led' },
);
add(
  'warboss-waaagh',
  'Da Biggest and da Best',
  sheet('orks', 'warboss'),
  [either('Fight')],
  'While Waaagh! is active.',
  'Add 4 to the Attacks of the Warboss’s melee weapons.',
);
add(
  'skulking-horrors',
  'Skulking Horrors',
  sheet('tyranids', 'termagants'),
  [either('Any phase')],
  'An enemy finishes a Normal, Advance or Fall Back move within 9″.',
  'This Termagant unit may make a Normal move of up to D6″.',
  ['The Termagants are outside Engagement Range of all enemies.'],
  { limit: 'turn' },
);

reviewDate = '2026-11-22';
add(
  'plasmancer-critical',
  'Harbinger of Destruction',
  nec('plasmancer'),
  [either('Shooting'), enemy('Movement'), enemy('Charge')],
  'When a model in the attached unit makes a ranged attack.',
  'A successful unmodified hit roll of 5+ scores a Critical Hit. During Fire Overwatch its separate hit requirement still applies.',
  [],
  {
    appliesTo: 'led',
    interactions: [
      {
        bodyguard: 'immortals',
        gear: 'gauss-blaster',
        effect: 'With gauss blasters, those Critical Hits automatically wound the target (Lethal Hits).',
      },
      {
        bodyguard: 'immortals',
        gear: 'tesla-carbine',
        effect: 'With tesla carbines, each of those Critical Hits adds two hits (Sustained Hits 2).',
      },
    ],
  },
);
add(
  'plasmancer-lightning',
  'Living Lightning',
  nec('plasmancer'),
  [your('Shooting')],
  'Select a visible enemy unit within 18″ of this model.',
  'Roll four dice. Each 4+ deals one mortal wound.',
  ['An unattached Lone Operative must be within 12″.'],
);
add(
  'chronomancer-mantle',
  'Timesplinter Mantle',
  nec('chronomancer'),
  [either('Any phase')],
  'An attack targets the attached unit.',
  'Subtract 1 from the Hit roll.',
  [],
  { appliesTo: 'led' },
);
add(
  'chronomancer-chronometron',
  'Chronometron',
  nec('chronomancer'),
  [your('Shooting')],
  'Immediately after this unit has shot, while outside Engagement Range.',
  'It may make a Normal move of up to 5″. If it moves, it cannot declare a charge this turn.',
  [],
  { appliesTo: 'unit' },
);
add(
  'overlord-my-will',
  'My Will Be Done',
  nec('overlord'),
  [either('Any phase')],
  'A Stratagem targets this Overlord’s unit.',
  'One unit with this ability in your army can reduce the cost of that use by 1 CP.',
  [],
  { appliesTo: 'unit', limit: 'round', armyLimit: true },
);
add(
  'overlord-resilience',
  'Implacable Resilience',
  nec('overlord'),
  [either('Any phase')],
  'An attack is allocated to the Overlord himself.',
  'Reduce that attack’s Damage by 1.',
);
add(
  'resurrection-orb',
  'Resurrection orb',
  nec('overlord', 'resurrection-orb'),
  [either('Any phase', 'end')],
  'At phase end, while the bearer is leading a unit on the battlefield.',
  'Activate its Reanimation Protocols with D6 wounds. Only one unit in the army can be resurrected by an orb per turn.',
  [],
  { appliesTo: 'led', limit: 'battle' },
);
add(
  'tachyon-arrow',
  'Tachyon arrow',
  nec('overlord', 'tachyon-arrow-and-overlords-blade'),
  [your('Shooting')],
  'Before choosing this weapon to shoot.',
  'The arrow can fire once during the battle. Its single shot has 72″ range and D6+2 Damage.',
  [],
  { limit: 'battle' },
);
add(
  'warden-fallback',
  'Adaptive Strategy',
  nec('royal-warden'),
  [your('Shooting'), your('Charge')],
  'This unit Fell Back earlier in the turn.',
  'It may still shoot and declare a charge.',
  [],
  { appliesTo: 'unit' },
);
add(
  'warden-shock',
  'Engrammatic Logic',
  nec('royal-warden'),
  [either('Any phase', 'start')],
  'At phase start, select a friendly Battle-shocked Necrons unit within 12″.',
  'End Battle-shock for that unit.',
  [],
  { limit: 'battle' },
);
add(
  'hexmark-overwatch',
  'Inescapable Death',
  nec('hexmark-destroyer'),
  [enemy('Movement'), enemy('Charge')],
  'When targeting a Hexmark unit with Fire Overwatch.',
  'One such unit per turn can use it for 0 CP, including after another unit used it this phase. A Hexmark firing Overwatch hits on unmodified 2+.',
  [],
  { limit: 'turn', armyLimit: true },
);
add(
  'hexmark-retaliation',
  'Multi-threat Eliminator',
  nec('hexmark-destroyer'),
  [enemy('Shooting')],
  'An enemy shoots a friendly Necrons unit within 3″ of this model.',
  'After those attacks, one Hexmark within 3″ of the target can shoot the attacker, if eligible. Only that enemy may be targeted.',
  [],
  { limit: 'turn', armyLimit: true },
);
add(
  'immortals-gauss',
  'Gauss blasters',
  nec('immortals', 'gauss-blaster'),
  [your('Shooting')],
  'When resolving a gauss blaster hit.',
  'A Critical Hit automatically wounds the target (Lethal Hits).',
);
add(
  'scarabs-self-destruct',
  'Self-destruction',
  nec('canoptek-scarab-swarms'),
  [either('Fight', 'start')],
  'Choose a Scarab model in Engagement Range and destroy it.',
  'Choose one enemy unit in that model’s Engagement Range. Roll a D6, adding 1 against a Vehicle. On 2–5 inflict D3 mortal wounds. On 6+ inflict three.',
);
add(
  'scarabs-oc',
  'Chittering swarm',
  nec('canoptek-scarab-swarms'),
  [either('Any phase')],
  'When determining Objective Control.',
  'Scarabs within 6″ of a friendly Cryptek have OC 1. Enemy models in units engaged by the Scarabs lose 1 OC, to a minimum of 1.',
);
add(
  'skorpekh-onslaught',
  'Whirling Onslaught',
  nec('skorpekh-destroyers'),
  [either('Fight')],
  'When a model in this unit makes a melee attack.',
  'Re-roll hit rolls of 1. If the unit charged this turn, any hit roll may be re-rolled.',
  [],
  { appliesTo: 'unit' },
);
add(
  'skorpekh-token',
  'Plasmacyte',
  nec('skorpekh-destroyers', 'plasmacyte'),
  [either('Fight')],
  'When selecting this unit to fight, spend a remaining Plasmacyte token.',
  'Its models’ melee weapons gain Devastating Wounds for this phase.',
  [],
  { appliesTo: 'unit', limit: 'battle', perItem: true },
);
add(
  'lychguard-protocols',
  'Guardian Protocols',
  nec('lychguard'),
  [either('Any phase')],
  'An attack targets this Noble-led unit with Strength higher than the unit’s Toughness.',
  'Subtract 1 from the Wound roll.',
  [],
  { appliesTo: 'unit', leaderKeyword: 'Noble' },
);
add(
  'lychguard-shield',
  'Dispersion shield',
  nec('lychguard', 'hyperphase-sword-and-dispersion-shield'),
  [either('Any phase')],
  'When allocating an attack to a shield bearer.',
  'That Lychguard model has a 4+ invulnerable save.',
);
add(
  'doomsday-stationary',
  'Overwhelming Obliteration',
  nec('doomsday-ark'),
  [your('Movement'), your('Shooting')],
  'The Doomsday Ark Remains Stationary in your Movement phase.',
  'Its doomsday cannon gains Devastating Wounds through the end of this turn.',
);
add(
  'monolith-gate',
  'Eternity Gate',
  nec('monolith'),
  [your('Movement', 'end')],
  'In Reinforcements, choose friendly Necrons Infantry in Reserves or on the battlefield.',
  'Place an on-table target into Reserves first. Set the unit up wholly within 6″ of the Monolith, outside enemy Engagement Range. It cannot charge this turn.',
);
add(
  'doomstalker-overwatch',
  'Sentinel Construct',
  nec('canoptek-doomstalker'),
  [enemy('Movement'), enemy('Charge')],
  'When this Doomstalker fires Overwatch.',
  'It scores hits on unmodified rolls of 5+.',
);
const protocol = strat(1, 'necrons', 'awakened-dynasty');
add(
  'eternal-revenant',
  'Protocol of the Eternal Revenant',
  protocol,
  [either('Any phase')],
  'Immediately after a friendly Necrons Infantry Character model is destroyed.',
  'At phase end, return the model with half its starting wounds, as close as possible to where it fell and outside Engagement Range.',
  ['Each model can be targeted only once per battle.'],
);
add(
  'undying-legions',
  'Protocol of the Undying Legions',
  protocol,
  [enemy('Shooting'), either('Fight')],
  'An enemy finishes attacks that destroyed at least one model in your Necrons unit.',
  'Activate Reanimation Protocols for that unit. Reanimate D3 wounds, or D3+1 if a Necrons Character leads it.',
);
add(
  'sudden-storm',
  'Protocol of the Sudden Storm',
  protocol,
  [your('Movement')],
  'Choose a friendly Necrons unit during your Movement phase.',
  'Its ranged weapons gain Assault through turn end. If a Necrons Character leads it, it may also re-roll Advance rolls this phase.',
);
add(
  'conquering-tyrant',
  'Protocol of the Conquering Tyrant',
  protocol,
  [your('Shooting')],
  'Choose a Necrons unit that has yet to shoot this phase.',
  'Against targets within half weapon range this phase, re-roll hit rolls of 1. If a Necrons Character leads the unit, you may re-roll any hit roll for those attacks.',
);
add(
  'vengeful-stars',
  'Protocol of the Vengeful Stars',
  protocol,
  [enemy('Shooting')],
  'An attacker destroys a friendly Necrons unit within 6″ of your Necrons Character unit.',
  'Select that Character unit. After the attacker resolves its attacks, the Character unit may shoot the attacker if it is an eligible target.',
);
const boyz = (gear?: string) => sheet('orks', 'boyz', gear);
add(
  'boyz-objective',
  'Get Da Good Bitz',
  boyz(),
  [your('Command', 'end')],
  'Boyz finish your Command phase in range of an objective you control.',
  'You keep control after leaving until your opponent controls it at the start or end of a turn.',
);
add(
  'boyz-shoota',
  'Shoota',
  boyz('shoota'),
  [your('Shooting')],
  'When firing a shoota at a target within 9″.',
  'Rapid Fire 1 increases its two attacks to three.',
);
add(
  'boyz-slugga',
  'Slugga and choppa',
  boyz('slugga-and-choppa'),
  [your('Shooting')],
  'When selecting an equipped Boy to shoot.',
  'The 12″ slugga has Pistol. Apply the Pistol rules if the unit is engaged.',
);
const gant = (gear: string) => sheet('tyranids', 'termagants', gear);
add(
  'gant-fleshborer',
  'Fleshborer',
  gant('fleshborer'),
  [your('Shooting')],
  'After an Advance, when selecting eligible weapons.',
  'The fleshborer has Assault and can shoot at a target within 18″.',
);
add(
  'gant-devourer',
  'Termagant devourer',
  gant('termagant-devourer'),
  [your('Shooting')],
  'When counting shots from models equipped with devourers.',
  'Each devourer makes two ranged attacks at up to 18″.',
);
add(
  'gant-spinefists',
  'Termagant spinefists',
  gant('termagant-spinefists'),
  [your('Shooting')],
  'When firing the unit’s spinefists.',
  'Apply Assault and Pistol as appropriate. Twin-linked lets you re-roll Wound rolls.',
);
export { rules };
