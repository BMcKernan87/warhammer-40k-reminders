import profilesJson from './data/profiles.json';
import { getFaction, factions, indexedOn, uniqueIds } from './catalog';
import { enhancements, rules } from './data/rules';
import { profileSchema, type Profile, type Rule, type Enhancement } from './data/schema';

const profiles = profileSchema.array().parse(profilesJson);
const profilesById = new Map(profiles.map((p) => [p.family + '/' + p.unit, p]));
export function profileFor(family: string, unit: string): Profile | undefined {
  return profilesById.get(family + '/' + unit);
}
export function validateRules(records: Rule[], upgrades: Enhancement[], sheets: Profile[]) {
  uniqueIds(records, 'rules');
  uniqueIds(upgrades, 'enhancements');
  uniqueIds(
    sheets.map((s) => ({ id: s.family + '/' + s.unit })),
    'profiles',
  );
  const contains = (family: string, kind: 'units' | 'detachments', id: string) =>
    factions.some((f) => f.family === family && f[kind].some((item) => item.id === id));
  for (const sheet of sheets) {
    if (!contains(sheet.family, 'units', sheet.unit)) throw Error('Unknown profile ' + sheet.unit);
    uniqueIds(sheet.weapons, 'weapons on ' + sheet.unit);
    uniqueIds(sheet.gear, 'wargear on ' + sheet.unit);
    for (const group of sheet.gear) uniqueIds(group.choices, 'choices in ' + group.id);
    for (const bodyguard of sheet.leadersFor)
      if (!contains(sheet.family, 'units', bodyguard)) throw Error('Unknown bodyguard ' + bodyguard);
  }
  for (const e of upgrades)
    if (!contains(e.family, 'detachments', e.detachment))
      throw Error('Unknown enhancement detachment ' + e.id);
  for (const rule of records) {
    const s = rule.scope;
    uniqueIds(
      rule.slots.map((t) => ({ id: [t.phase, t.timing, t.turn].join('/') })),
      'timings of ' + rule.id,
    );
    if ('family' in s && s.family) getFaction(s.family);
    if ('detachment' in s && s.detachment && (!s.family || !contains(s.family, 'detachments', s.detachment)))
      throw Error('Unknown detachment for ' + rule.id);
    if (s.kind === 'unit') {
      if (!contains(s.family, 'units', s.unit)) throw Error('Unknown unit for ' + rule.id);
      if (
        s.gear &&
        !sheets
          .find((p) => p.family === s.family && p.unit === s.unit)
          ?.gear.some((g) => g.choices.some((c) => c.id === s.gear || c.grants?.includes(s.gear!)))
      )
        throw Error('Unknown equipment for ' + rule.id);
    }
    for (const interaction of rule.interactions ?? []) {
      if (
        s.kind !== 'unit' ||
        !sheets
          .find((p) => p.family === s.family && p.unit === s.unit)
          ?.leadersFor.includes(interaction.bodyguard) ||
        !sheets
          .find((p) => p.family === s.family && p.unit === interaction.bodyguard)
          ?.gear.some((g) => g.choices.some((c) => c.id === interaction.gear))
      )
        throw Error('Invalid attached equipment for ' + rule.id);
    }
    if (
      s.kind === 'enhancement' &&
      !upgrades.some((e) => e.id === s.enhancement && e.family === s.family && e.detachment === s.detachment)
    )
      throw Error('Unknown enhancement for ' + rule.id);
  }
}
validateRules(rules, enhancements, profiles);
export function coverageFor(id: string, today = new Date(), reviewDays = 180) {
  const faction = getFaction(id);
  const rosterRules = rules.filter((r) => 'family' in r.scope && r.scope.family === faction.family);
  const missingUnits = faction.units
    .filter((u) => !rosterRules.some((r) => r.scope.kind === 'unit' && r.scope.unit === u.id))
    .map((u) => u.name);
  const missingDetachments = faction.detachments
    .filter((d) => !rosterRules.some((r) => r.scope.kind === 'detachment' && r.scope.detachment === d.id))
    .map((d) => d.name);
  const expired = (date: string) => today.getTime() - Date.parse(date) > reviewDays * 86400000;
  const applicable = rules.filter((r) => {
    const s = r.scope;
    if ('family' in s && s.family && s.family !== faction.family) return false;
    if (s.kind === 'unit') return faction.units.some((u) => u.id === s.unit);
    return !('detachment' in s && s.detachment) || faction.detachments.some((d) => d.id === s.detachment);
  });
  return {
    faction: faction.name,
    units: faction.units.length,
    detachments: faction.detachments.length,
    missingUnits,
    missingDetachments,
    missingProfiles: faction.units.filter((u) => !profileFor(faction.family, u.id)).map((u) => u.name),
    missingDatasheetLinks: faction.units.filter((u) => !u.path).map((u) => u.name),
    reviewDue: applicable
      .filter((r) => r.source.status !== 'checked' || expired(r.source.checkedOn))
      .map((r) => r.id),
    indexReviewDue: expired(indexedOn),
  };
}
