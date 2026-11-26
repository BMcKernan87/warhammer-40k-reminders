import type {ArmySelection} from './catalog';
import {necronFormationRoots, type NecronFormation} from './necron-retinues';
import {expandRoster, type RosterInstance} from './roster-instances';

export const CONVERGENCE_OF_DOMINION='Convergence Of Dominion';

// App Necrons v1.2, Deployment:
// https://wahapedia.ru/wh40k11ed/factions/necrons/Convergence-Of-Dominion
// The 1–3 model purchase becomes separate one-model units after initial setup.
// This projection is only for the reminder sheet: never save it or use it to
// count purchases, calculate points, or declare the original deployment.
export function necronBattleRoster(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):RosterInstance[]{
  if(army.faction!=='Necrons')return [...roster];
  const original=new Map(expandRoster(army).map(s=>[s.id,s]));
  return roster.flatMap(s=>{
    if(s.unit!==CONVERGENCE_OF_DOMINION)return [s];
    const models=s.models??1;
    if(!Number.isInteger(models)||models<1||models>3)return [s];
    const start=original.get(s.id);
    const startingModels=start?.unit===s.unit?(start.models??1):models;
    // Preserve the identity of an already individual purchase or projection.
    if(models===1&&startingModels===1)return [{...s,models:1}];
    // Ordinals identify the static sheet's models, not tracked casualties.
    return Array.from({length:models},(_,i)=>({...s,id:s.id+' · Starstele '+(i+1),models:1}));
  });
}

export function necronBattleFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):NecronFormation[]{
  // Synthetic Starstele IDs have their own one-model originalBody. Other
  // formations keep the existing validated attachment and retinue lifetimes.
  return necronFormationRoots(army,necronBattleRoster(army,roster));
}
