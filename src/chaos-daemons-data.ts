import type {ArmySelection} from './catalog';
import {dreadbladesFor} from './dreadblade-allies';
import {DAEMONIC_PACT_SHEETS} from './daemonic-pact-data.generated';
import {SHADOW_LEGION_SHEETS} from './shadow-legion-data.generated';
import {daemonicPactAllegiance} from './daemonic-pact';
import type {RosterInstance} from './roster-instances';

const native=DAEMONIC_PACT_SHEETS.map(s=>({...s,faction:'Chaos Daemons' as const}));
const dreadblades=dreadbladesFor('Chaos Daemons');
export const DAEMON_SHEETS=[...native,...SHADOW_LEGION_SHEETS,...dreadblades];
export const DAEMON_UNITS=DAEMON_SHEETS.map(s=>s.unit);
const sheets=new Map(DAEMON_SHEETS.map(s=>[s.unit,s]));
const princes=new Set(['Daemon Prince of Chaos','Daemon Prince Of Chaos With Wings']);
export function shadowLegionBans(unit:string):boolean {
 return princes.has(unit)||(unit!=='Be’lakor'&&(sheets.get(unit)?.keywords?.includes('EPIC HERO')??false));
}
const ordinaryArmy=[...native,...dreadblades].map(s=>s.unit);
const shadowArmy=DAEMON_UNITS.filter(unit=>!shadowLegionBans(unit));
export function daemonMusterUnits(army:ArmySelection):readonly string[] {
 return army.detachments2026?.includes('Shadow Legion')?shadowArmy:ordinaryArmy;
}
export function daemonKeywords(army:ArmySelection,squad:RosterInstance,model?:string):Set<string> {
 const sheet=sheets.get(squad.unit);
 const modelKeys=sheet?.modelKeywords??{};
 const keywords=new Set([...sheet?.keywords??[],...(model?modelKeys[model]??[]:Object.values(modelKeys).flat())]);
 const god=daemonicPactAllegiance(squad);
 if(god)keywords.add(god.toUpperCase());
 if(army.faction==='Chaos Daemons'&&army.detachments2026?.includes('Shadow Legion')){
  if(keywords.has('HERETIC ASTARTES')||squad.unit==='Be’lakor'){
   keywords.add('UNDIVIDED');
   keywords.add('SHADOW LEGION');
  }else if(keywords.has('LEGIONES DAEMONICA'))keywords.add('SHADOW LEGION');
 }
 return keywords;
}
