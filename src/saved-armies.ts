import {migrateOrkArmy} from './ork-saved-army';
import {migrateCustodesArmy} from './custodes-saved-army';
import {initialStore, validateStore, type ArmyProfile, type ProfileStore} from './profiles';

export interface SavedArmies {
  store: ProfileStore;
  retained: unknown[];
}

// Keep older rosters that fail current legality checks intact beside editable armies.
export function openSavedArmies(raw: unknown, fallback: () => ProfileStore = initialStore): SavedArmies {
  if (validateStore(raw) && raw.profiles.every(entry => migrateOrkArmy(entry.army) === entry.army)) return {store: raw, retained: []};
  if (!raw || typeof raw !== 'object' || !('profiles' in raw) || !Array.isArray(raw.profiles)) {
    return {store: fallback(), retained: []};
  }
  const activeId = 'activeId' in raw ? raw.activeId : undefined;
  const profiles: ArmyProfile[] = [];
  const retained: unknown[] = [];
  for (const entry of raw.profiles) {
    const army = migrateOrkArmy(migrateCustodesArmy(entry?.army));
    const single = {activeId: entry?.id, profiles: [army === entry?.army ? entry : {...entry,army}]};
    if (validateStore(single) && !profiles.some(profile => profile.id === entry.id)) {
      profiles.push(single.profiles[0]);
    } else {
      retained.push(entry);
    }
  }
  if (profiles.length === 0) {
    const draft = fallback().profiles[0];
    let id = draft.id;
    while (raw.profiles.some(entry => entry?.id === id)) id += '-recovered';
    profiles.push({...draft, id});
  }
  const active = profiles.find(profile => profile.id === activeId) ?? profiles[0];
  return {store: {activeId: active.id, profiles}, retained};
}

export function storeSavedArmies(store: ProfileStore, retained: unknown[]) {
  return JSON.stringify({...store, profiles: [...store.profiles, ...retained]});
}
