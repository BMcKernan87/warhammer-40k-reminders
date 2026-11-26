import type {ArmySelection} from './catalog';
import type {GeneratedReminder, ReminderWindow} from './generated-reminders';
import type {necronFormationRoots} from './necron-retinues';
import {hasNecronRangedWeapon, necronKeywords} from './necron-wargear';
import {eligibleUpgrades2026, upgradeName2026} from './upgrades-2026';
import {expandRoster} from './roster-instances';

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
  const armed = new Set(formations.filter(f => f.members.some(hasNecronRangedWeapon)).map(f => f.id));
  const hasMonolith = formations.some(formation => formation.body.unit === 'Monolith');

  const liveById = new Map(formations.flatMap(formation => formation.members.map(model => [model.id, model] as const)));
  for (const original of expandRoster(army)) {
      const live = liveById.get(original.id);
      // A changed identity cannot inherit an earlier source's selected effect.
      if (live && live.unit !== original.unit) continue;
      const bearer = live ?? original;
      const formation = formations.find(group => group.members.some(model => model.id === bearer.id && model.unit === bearer.unit));
      const name = upgradeName2026(army, bearer);
      if (!name || !eligibleUpgrades2026(army, bearer.unit).some(option => option.name === name)) continue;
      const add = (id: string, title: string, window: ReminderWindow, summary: string, targets: string[]) => {
        if (!targets.length) return;
        rows.push({id: '11e-necron-enh-' + id, title: bearer.id + ' · ' + title, window, timing: 'during',
          summary, source, origin: 'detachment', units: targets});
      };
      switch (name) {
        case 'Prelocational Optimiser':
          if (formation && hasMonolith && hasKeyword(formation, 'INFANTRY') && armed.has(formation.id)) {
            add('prelocational', name, 'Shooting',
              'When this formation is selected to shoot in the turn it arrived via a Monolith’s Eternity Gate, choose Lethal Hits or Sustained Hits 1 for its ranged attacks.',
              [formation.id]);
          }
          break;
        case 'Dread Majesty':
          if (!formation) break;
          for (const window of ['Movement', 'Shooting', 'Fight'] as const) {
            add(window === 'Shooting' ? 'dread-shoot' : window === 'Fight' ? 'dread-fight' : 'dread-movement', name, window,
              window === 'Movement'
                ? 'During permitted Movement-phase shooting, friendly non-Monster, non-Titanic units within 6″ of the living bearer re-roll Wound rolls of 1. Normal reaction shots can also re-roll Hit rolls of 1; snap shooting cannot re-roll Hit rolls or score Critical Hits.'
                : 'Friendly non-Monster, non-Titanic units within 6″ of the living bearer re-roll Hit rolls of 1 and Wound rolls of 1.' + (window === 'Shooting' ? ' Snap shooting cannot re-roll Hit rolls.' : ''),
              window === 'Fight' ? auraRecipients : auraRecipients.filter(id => armed.has(id)));
          }
          break;
        case 'Demanding Leader':
          if (formation) add('demanding', name, 'Command',
            'In your Command phase, choose one eligible Vehicle or Mounted unit within 6″ of the bearer. Until your next Command phase it may shoot after Falling Back.',
            vehiclesOrMounted.filter(id => armed.has(id)));
          for (const window of ['Movement', 'Shooting'] as const) add(window === 'Shooting' ? 'demanding-shoot' : 'demanding-movement', name, window,
            'Only if this unit was chosen within 6″ of the bearer in your Command phase: it can shoot after Falling Back until the start of your next Command phase. That selected effect continues if the bearer is destroyed or the unit moves out of range.', vehiclesOrMounted.filter(id => armed.has(id)));
          break;
        case 'Chrono-impedance Fields':
          if (formation) add('impedance', name, 'Command',
            'In your Command phase, choose one eligible Vehicle or Mounted unit within 6″ of the bearer. Until the start of your next Command phase, subtract 1 from the Damage of attacks allocated to its models.',
            vehiclesOrMounted);
          for (const window of ['Movement', 'Shooting', 'Fight'] as const) {
            add('impedance-' + window.toLowerCase(), name, window,
              'Only if this unit was chosen within 6″ of the bearer in your Command phase: subtract 1 from the Damage of each attack allocated to its models, including permitted Movement-phase attacks. The effect lasts until the start of your next Command phase, even if the bearer is destroyed or the unit moves out of range.', vehiclesOrMounted);
          }
          break;
      }
  }
  return rows;
}
