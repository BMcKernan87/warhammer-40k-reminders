import type {ArmySelection} from './catalog';
import {expandRoster,type RosterInstance} from './roster-instances';
import {drukhariKeywords} from './drukhari-keywords';
import {drukhariFormations} from './drukhari-formations';
import {DRUKHARI_CARDS} from './drukhari-loadouts';
import {DRUKHARI_DETACHMENTS,DRUKHARI_UPGRADES} from './drukhari-detachments.generated';
export {DRUKHARI_DETACHMENTS,DRUKHARI_UPGRADES} from './drukhari-detachments.generated';

const normalize=(name:string)=>name.trim().toLowerCase().replace(/[’']/g,'’');
export function currentDrukhariDetachment(name:string):string{
 return DRUKHARI_DETACHMENTS.find(d=>normalize(d.name)===normalize(name))?.name??name;
}
export function drukhariSelectedDetachments(army:ArmySelection):string[]{
 return army.faction==='Drukhari'?[...new Set((army.detachments2026??[]).map(currentDrukhariDetachment))]:[];
}
export function eligibleDrukhariUpgrades(army:ArmySelection,unit:string,id?:string){
 if(army.faction!=='Drukhari')return [];
 const detachments=drukhariSelectedDetachments(army),found=expandRoster(army).find(s=>s.unit===unit&&(!id||s.id===id));
 if(id&&!found)return [];
 const bearer=found??{id:unit,unit},tags=drukhariKeywords(army,bearer);
 return DRUKHARI_UPGRADES.filter(u=>{
  if(!detachments.includes(u.detachment)||!u.units.some(n=>n===unit))return false;
  if(u.repeatable)return true;
  if(!tags.has('CHARACTER')||tags.has('EPIC HERO'))return false;
  // Normal Corsairs and Travelling Players cannot receive enhancements.
  // Reaper's Wager replaces that rule and expressly permits these Harlequins.
  if(!tags.has('DRUKHARI')&&!(u.detachment==='Reaper’s Wager'&&tags.has('HARLEQUINS')))return false;
  return true;
 });
}
export function drukhariHasUpgrade(army:ArmySelection,squad:RosterInstance,name:string,detachment?:string):boolean{
 const choice=army.upgrades2026?.[squad.id]??army.upgrades2026?.[squad.unit]??squad.enhancement;
 return choice===name&&eligibleDrukhariUpgrades(army,squad.unit,squad.id).some(u=>u.name===name&&(!detachment||u.detachment===detachment));
}
function formationBearers(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]){
 return drukhariFormations(army,roster).find(f=>f.members.some(m=>m.id===squad.id))?.members??[squad];
}
export function drukhariHasDeepStrike(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 if(army.faction!=='Drukhari')return false;
 const current={...army,instances:[...roster]};
 return !!DRUKHARI_CARDS[squad.unit]?.core?.includes('Deep Strike')||formationBearers(army,squad,roster).some(s=>drukhariHasUpgrade(current,s,'Webway Walker')||drukhariHasUpgrade(current,s,'Webway Awl'));
}
export function drukhariHasInfiltrators(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 if(army.faction!=='Drukhari')return false;
 const current={...army,instances:[...roster]};
 return !!DRUKHARI_CARDS[squad.unit]?.core?.includes('Infiltrators')||formationBearers(army,squad,roster).some(s=>drukhariHasUpgrade(current,s,'Reaper’s Cowl'));
}
export function drukhariScoutRange(army:ArmySelection,squad:RosterInstance,_roster:readonly RosterInstance[]=expandRoster(army)):number{
 if(army.faction!=='Drukhari')return 0;
 // Archraider is a conditional starting-passenger declaration, not an
 // unconditional Scout grant to every possible Dedicated Transport.
 return Number(DRUKHARI_CARDS[squad.unit]?.core?.find(c=>/^Scouts\s+\d+/.test(c))?.match(/\d+/)?.[0]??0);
}
