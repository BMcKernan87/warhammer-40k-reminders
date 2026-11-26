import type {ArmySelection} from './catalog';
export interface RuleSource {name:string;url:string;edition:'10e';lastChecked:string;status:'reference'|'verified'}
const ROOT='https://wahapedia.ru/wh40k10ed/factions/';
export const SOURCE_REGISTRY:Partial<Record<ArmySelection['faction'],RuleSource>>={
 'Necrons':{name:'Wahapedia · Necrons faction rules',url:ROOT+'necrons/',edition:'10e',lastChecked:'2026-11-21',status:'reference'},
 'Space Marines':{name:'Wahapedia · Space Marines faction rules',url:ROOT+'space-marines/',edition:'10e',lastChecked:'2026-11-21',status:'reference'}
};
export interface DatasheetReference {unit:string;faction:ArmySelection['faction'];url:string;status:'reference'}
export function factionSource(army:ArmySelection):RuleSource{return SOURCE_REGISTRY[army.faction]||{name:'Wahapedia · '+army.faction,url:ROOT+army.faction.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-')+'/',edition:'10e',lastChecked:'',status:'reference'};}
export function datasheetReferences(army:ArmySelection):DatasheetReference[]{
 const path=army.faction.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-');
 return Object.keys(army.units).map(unit=>({unit,faction:army.faction,url:ROOT+path+'/datasheets.html',status:'reference'}));
}
export function detachmentSource(army:ArmySelection):RuleSource{return factionSource(army);}

/** Links used by the 11th-edition builder. The older registry belongs to legacy saved-rule readers. */
export function currentFactionUrl(army:ArmySelection):string {
 return factionSource(army).url.replace('/wh40k10ed/', '/wh40k11ed/');
}
