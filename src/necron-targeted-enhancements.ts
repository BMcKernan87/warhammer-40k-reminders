import type {ArmySelection} from './catalog';
import type {GeneratedReminder, ReminderWindow} from './generated-reminders';
import type {necronFormationRoots} from './necron-retinues';
import {necronKeywords} from './necron-wargear';
import {eligibleUpgrades2026, upgradeName2026} from './upgrades-2026';

type Formation = ReturnType<typeof necronFormationRoots>[number];
const source = 'https://wahapedia.ru/wh40k11ed/factions/necrons/';

export function targetedNecronEnhancements(army: ArmySelection, formations: Formation[]): GeneratedReminder[] {
  const rows: GeneratedReminder[] = [];
  const hasKeyword = (formation: Formation, keyword: keyof typeof necronKeywords) =>
    formation.members.some(model => necronKeywords[keyword].has(model.unit));
  const vehiclesOrMounted = formations.filter(formation => !hasKeyword(formation, 'TITANIC')
    && (hasKeyword(formation, 'MOUNTED') || hasKeyword(formation, 'VEHICLE'))).map(formation => formation.id);
  const auraRecipients = formations.filter(formation => !hasKeyword(formation, 'MONSTER')
    && !hasKeyword(formation, 'TITANIC')).map(formation => formation.id);
  const hasMonolith = formations.some(formation => formation.body.unit === 'Monolith');

  for (const formation of formations) {
    for (const bearer of formation.members) {
      const name = upgradeName2026(army, bearer);
      if (!name || !eligibleUpgrades2026(army, bearer.unit).some(option => option.name === name)) continue;
      const add = (id: string, title: string, window: ReminderWindow, summary: string, targets: string[]) => {
        if (!targets.length) return;
        rows.push({id: '11e-necron-enh-' + id, title: bearer.id + ' · ' + title, window, timing: 'during',
          summary, source, origin: 'detachment', units: targets});
      };
      switch (name) {
        case 'Prelocational Optimiser':
          if (hasMonolith && hasKeyword(formation, 'INFANTRY')) {
            add('prelocational', 'Relocational Optimiser', 'Shooting',
              'When this formation is selected to shoot in the turn it arrived via a Monolith’s Eternity Gate, choose Lethal Hits or Sustained Hits 1 for its ranged attacks.',
              [formation.id]);
          }
          break;
        case 'Dread Majesty':
          for (const window of ['Shooting', 'Fight'] as const) {
            add(window === 'Shooting' ? 'dread-shoot' : 'dread-fight', name, window,
              'Friendly non-Monster, non-Titanic units within 6″ of the bearer re-roll Hit rolls of 1 and Wound rolls of 1.',
              auraRecipients);
          }
          break;
        case 'Demanding Leader':
          add('demanding', name, 'Command',
            'In your Command phase, choose one eligible Vehicle or Mounted unit within 6″ of the bearer. Until your next Command phase it may shoot after Falling Back.',
            vehiclesOrMounted);
          add('demanding-shoot', name, 'Shooting',
            'The unit chosen in your Command phase can shoot after Falling Back until the start of your next Command phase.', vehiclesOrMounted);
          break;
        case 'Chrono-impedance Fields':
          add('impedance', name, 'Command',
            'In your Command phase, choose one eligible Vehicle or Mounted unit within 6″ of the bearer. Until the start of your next Command phase, subtract 1 from the Damage of attacks allocated to its models.',
            vehiclesOrMounted);
          for (const window of ['Shooting', 'Fight'] as const) {
            add('impedance-' + window.toLowerCase(), name, window,
              'While this Command-phase effect lasts, subtract 1 from the Damage of each attack allocated to a model in the selected unit.', vehiclesOrMounted);
          }
          break;
      }
    }
  }
  return rows;
}
