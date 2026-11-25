import {nativeNameKey} from './import-native-muster.mjs';

export function applyModelComposition(sheets,units,compositions,slug,revision) {
  const groups = new Map(compositions.map(row => [row.unit_id, row]));
  for (const sheet of sheets) {
    const matches = units.filter(row => nativeNameKey(row.name) === nativeNameKey(sheet.unit) &&
      row.external_refs?.some(ref => ref.namespace === 'mfm'));
    if (matches.length !== 1) throw Error('Unresolved MFM identity for '+sheet.unit);
    const group = groups.get(matches[0].id);
    if (group?.faction_id !== slug || group.game_version.edition !== '11th' ||
      group.game_version.dataslate !== revision) throw Error('Unverified model composition for '+sheet.unit);
    // A fixed formation may be represented as one explicit set of models.
    const tiers = group.tiers ?? [{models:group.models}];
    if (!group.tiers && group.models.some(m => m.min !== m.max)) throw Error('Unresolved model alternatives for '+sheet.unit);
    const sizes = {};
    for (const tier of tiers) {
      let alternatives = [{}];
      for (const {name,min,max} of tier.models) {
        if (!name || !Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < min) {
          throw Error('Invalid model role for '+sheet.unit);
        }
        alternatives = alternatives.flatMap(group => Array.from({length:max-min+1}, (_,i) => ({...group,[name]:min+i})));
      }
      for (const models of alternatives) {
        const n = Object.values(models).reduce((total,count) => total+count, 0);
        if (sizes[n]) throw Error('Ambiguous squad of '+n+' in '+sheet.unit);
        sizes[n] = models;
      }
    }
    const legal = Object.keys(sizes).map(Number).sort((a,b) => a-b);
    if (legal[0] !== sheet.sizes[0] || legal.at(-1) !== sheet.sizes.at(-1) || sheet.sizes.some(n => !sizes[n])) {
      throw Error('MFM strength and point bands disagree for '+sheet.unit);
    }
    sheet.compositionBySize = sizes;
  }
}
