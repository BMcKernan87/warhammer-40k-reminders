import type {ArmySelection} from './catalog';
import {CHAOS_KNIGHT_SHEETS} from './chaos-knights-data.generated';
import type {RosterInstance} from './roster-instances';
import {alliedTitanAndKnightNames,WARHOUND_SHEETS} from './titan-support-data';
import {WORLD_EATERS_SHEETS} from './world-eaters-data.generated';

export {WORLD_EATERS_SHEETS};
const native=new Map(WORLD_EATERS_SHEETS.map(s=>[s.unit,s]));
const dreadblades=CHAOS_KNIGHT_SHEETS.filter(s=>s.keywords?.includes('CHAOS KNIGHTS')&&(s.keywords.includes('TITANIC')||s.keywords.includes('WAR DOG')))
 .map(s=>({...s,faction:'World Eaters' as const}));
const dreadNames=new Set(dreadblades.map(s=>s.unit));
export const WORLD_EATERS_ARMY_SHEETS=[...WORLD_EATERS_SHEETS,...dreadblades];
export const WORLD_EATERS_UNITS=WORLD_EATERS_ARMY_SHEETS.map(s=>s.unit);
const sheets=new Map([...WORLD_EATERS_ARMY_SHEETS,...WARHOUND_SHEETS.filter(s=>s.faction==='World Eaters')].map(s=>[s.unit,s]));
export const isWorldEatersDreadblade=(unit:string)=>dreadNames.has(unit);
export function worldEatersMusterUnits(army:ArmySelection):string[]{
 if(army.faction!=='World Eaters')return [];
 const daemonkin=army.detachments2026?.includes('Khorne Daemonkin');
 return [...WORLD_EATERS_ARMY_SHEETS.filter(s=>daemonkin||!s.keywords?.includes('BLOOD LEGIONS')).map(s=>s.unit),...alliedTitanAndKnightNames(army)];
}
function upgrade(army:ArmySelection,squad:RosterInstance):string|undefined{
 return army.upgrades2026?.[squad.id]??army.upgrades2026?.[squad.unit]??squad.enhancement;
}
export function worldEatersKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string>{
 const sheet=sheets.get(squad.unit);
 if(!sheet)return new Set();
 const byModel=sheet.modelKeywords??{};
 const tags=new Set([...sheet.keywords??[],...(model?byModel[model]??[]:[sheet.unit.toUpperCase(),...Object.values(byModel).flat()])]);
 if(army.detachments2026?.some(d=>d.toLowerCase()==='cult of blood')&&['Jakhals','Goremongers'].includes(squad.unit))tags.add('BATTLELINE');
 if(army.detachments2026?.includes('Brazen Engines')&&tags.has('VEHICLE')&&tags.has('WORLD EATERS')&&upgrade(army,squad)==='Murder-Forged Entity')tags.add('DAEMON');
 if(squad.unit==='Lord on Juggernaut'&&army.detachments2026?.includes('Khorne Daemonkin')&&upgrade(army,squad)==='Disciple of Khorne'){
  tags.delete('WORLD EATERS');
  tags.add('BLOOD LEGIONS');
 }
 return tags;
}
export function worldEatersAdditionalBodyguards(army:ArmySelection,leader:RosterInstance):readonly string[]{
 const choice=upgrade(army,leader),sheet=native.get(leader.unit);
 if(!sheet||sheet.keywords?.includes('EPIC HERO'))return [];
 if(choice==='Disciple of Khorne'&&army.detachments2026?.includes('Khorne Daemonkin')&&leader.unit==='Lord on Juggernaut')return ['Bloodcrushers','Flesh Hounds'];
 if(choice==='Butcher Lord'&&army.detachments2026?.some(d=>d.toLowerCase()==='cult of blood')&&sheet.keywords?.includes('INFANTRY')&&sheet.keywords.includes('CHARACTER')&&sheet.keywords.includes('WORLD EATERS'))return ['Jakhals','Goremongers'];
 return [];
}
