import type {ArmySelection} from './catalog';
import {expandRoster,type RosterInstance} from './roster-instances';
import {csmFormations} from './csm-formations';
import {csmKeywords} from './csm-keywords';
import {CSM_ARMY_CARDS as CSM_CARDS,csmArmyModelLoadouts as csmModelLoadouts} from './csm-army-loadouts';
import {CSM_SHEETS} from './csm-data';
import {CSM_DETACHMENTS,CSM_UPGRADES} from './csm-detachments.generated';
export {CSM_DETACHMENTS,CSM_UPGRADES} from './csm-detachments.generated';

const normalize=(name:string)=>name.trim().toLowerCase().replace(/[’']/g,'’');
export function currentCsmDetachment(name:string):string{
 return CSM_DETACHMENTS.find(d=>normalize(d.name)===normalize(name))?.name??name;
}
export function csmSelectedDetachments(army:ArmySelection):string[]{
 return army.faction==='Chaos Space Marines'?[...new Set((army.detachments2026??[]).map(currentCsmDetachment))]:[];
}
export function csmHasDeepStrike(army:ArmySelection,squad:RosterInstance):boolean{
 return army.faction==='Chaos Space Marines'&&!!CSM_CARDS[squad.unit]?.core?.includes('Deep Strike');
}
export function eligibleCsmUpgrades(army:ArmySelection,unit:string,id?:string){
 if(army.faction!=='Chaos Space Marines')return [];
 const detachments=csmSelectedDetachments(army),found=expandRoster(army).find(s=>s.unit===unit&&(!id||s.id===id));
 if(id&&!found)return [];
 const bearer=found??{id:unit,unit};
 const tags=csmKeywords(army,bearer);
 if(!tags.has('CHARACTER')||tags.has('EPIC HERO'))return [];
 return CSM_UPGRADES.filter(u=>{
  if(!detachments.includes(u.detachment)||!u.units.some(n=>n===unit))return false;
  const mark=({'Eye of Tzeentch':'TZEENTCH','Intoxicating Elixir':'SLAANESH','Orbs of Unlife':'NURGLE','Talisman of Burning Blood':'KHORNE'} as Record<string,string>)[u.name];
  if(mark&&!tags.has(mark))return false;
  if(['Touched by the Warp','Conduit of Chaos'].includes(u.name)&&tags.has('KHORNE'))return false;
  if(u.name==='Conduit of Chaos'&&!tags.has('DAEMON'))return false;
  if(['Eye of the Warp','Akshur’s Binding Runes','Tzagulla'].includes(u.name)&&!csmHasDeepStrike(army,bearer))return false;
  return true;
 });
}
function chosen(army:ArmySelection,squad:RosterInstance){
 const choice=army.upgrades2026?.[squad.id]??army.upgrades2026?.[squad.unit]??squad.enhancement;
 return choice&&eligibleCsmUpgrades(army,squad.unit,squad.id).some(u=>u.name===choice)?choice:undefined;
}
/** Only selected enhancements grant whole-formation Scout; Deceptors is a
 * separate optional declaration, not a blanket permanent Infiltrators grant. */
export function csmScoutRange(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):number{
 const native=Number(CSM_CARDS[squad.unit]?.core?.find(c=>/^Scouts \d+/.test(c))?.match(/\d+/)?.[0]??0);
 if(army.faction!=='Chaos Space Marines')return 0;
 const current={...army,instances:[...roster]},formation=csmFormations(army,roster).find(f=>f.members.some(s=>s.id===squad.id));
 const root=formation?.root??squad,members=formation?.members??[squad];
 if(members.some(s=>['Mark of the Hound','Sorrowscent Vulture'].includes(chosen(current,s)??'')))return Math.max(native,6);
 if(members.some(s=>chosen(current,s)==='Warped Foresight'&&s.id!==root.id)&&CSM_CARDS[root.unit]?.core?.some(c=>/^Scouts 6/.test(c)))return Math.max(native,6);
 return native;
}
export function csmHasInfiltrators(army:ArmySelection,squad:RosterInstance):boolean{
 if(army.faction!=='Chaos Space Marines')return false;
 if(CSM_CARDS[squad.unit]?.core?.includes('Infiltrators'))return true;
 // Eager for Bloodshed is personal. Disciples, an Ogryn or other members of
 // a multi-model Character unit do not gain it from their Character bearer.
 const models=csmModelLoadouts(squad);
 return chosen(army,squad)==='Eager for Bloodshed'&&models.length>0&&models.every(m=>csmKeywords(army,squad,m.model).has('CHARACTER'));
}

/** Soul Link chooses another actual model from the original army; its source
 * may be embarked or in Reserves, and it need not be a surviving table unit. */
export function csmSoulLinkSources(army:ArmySelection,bearer:RosterInstance):RosterInstance[]{
 if(army.faction!=='Chaos Space Marines')return [];
 const native=new Set(CSM_SHEETS.map(s=>s.unit));
 return expandRoster(army).filter(s=>s.id!==bearer.id&&native.has(s.unit)&&csmModelLoadouts(s).some(m=>{
  const tags=csmKeywords(army,s,m.model);
  return ['HERETIC ASTARTES','INFANTRY','CHARACTER'].every(k=>tags.has(k))&&!tags.has('EPIC HERO');
 }));
}
