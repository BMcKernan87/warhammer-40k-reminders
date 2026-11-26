import type {ArmySelection} from './catalog';
import {expandRoster,type RosterInstance} from './roster-instances';
import {aeldariKeywords} from './aeldari-keywords';
import {aeldariFormations} from './aeldari-formations';
import {AELDARI_CARDS} from './aeldari-loadouts';
import {knightJoinedBodyguard} from './leader-eligibility';
import {AELDARI_DETACHMENTS,AELDARI_UPGRADES} from './aeldari-detachments.generated';
export {AELDARI_DETACHMENTS,AELDARI_UPGRADES} from './aeldari-detachments.generated';

const normalize=(name:string)=>name.trim().toLowerCase().replace(/[’']/g,'’');
const duplicateNames=new Set(AELDARI_UPGRADES.filter(u=>AELDARI_UPGRADES.filter(other=>other.name===u.name).length>1).map(u=>u.name));
export const aeldariUpgradeBaseName=(name:string)=>name.replace(/ \((?:Ghosts of the Webway|Fateful Performance)\)$/,'');
export function currentAeldariDetachment(name:string):string{
 return AELDARI_DETACHMENTS.find(d=>normalize(d.name)===normalize(name))?.name??name;
}
export function aeldariSelectedDetachments(army:ArmySelection):string[]{
 return army.faction==='Aeldari'?[...new Set((army.detachments2026??[]).map(currentAeldariDetachment))]:[];
}
export function eligibleAeldariUpgrades(army:ArmySelection,unit:string,id?:string){
 if(army.faction!=='Aeldari')return [];
 const detachments=aeldariSelectedDetachments(army),found=expandRoster(army).find(s=>s.unit===unit&&(!id||s.id===id));
 if(id&&!found)return [];
 const bearer=found??{id:unit,unit},tags=aeldariKeywords(army,bearer);
 return AELDARI_UPGRADES.filter(u=>{
  if(!detachments.includes(u.detachment)||!u.units.some(n=>n===unit))return false;
  if(u.repeatable)return true;
  // Veterans of the Void explicitly equips Anhrathe units, including Yriel
  // and Kharseth. Its unique Corsair enhancements are not Character-only.
  if(u.corsair)return tags.has('ANHRATHE');
  return tags.has('CHARACTER')&&!tags.has('EPIC HERO');
 }).map(u=>({...u,baseName:u.name,name:duplicateNames.has(u.name)?u.name+' ('+u.detachment+')':u.name}));
}
export function aeldariHasUpgrade(army:ArmySelection,squad:RosterInstance,name:string,detachment?:string):boolean{
 const choice=army.upgrades2026?.[squad.id]??army.upgrades2026?.[squad.unit]??squad.enhancement;
 return eligibleAeldariUpgrades(army,squad.unit,squad.id).some(u=>u.name===choice&&u.baseName===name&&(!detachment||u.detachment===detachment));
}
export function aeldariOriginallyLed(army:ArmySelection,bearer:RosterInstance,accept:(body:RosterInstance)=>boolean=()=>true):boolean{
 const start=expandRoster(army).find(s=>s.id===bearer.id);
 if(!bearer.attachedTo||start?.attachedTo!==bearer.attachedTo)return false;
 const body=knightJoinedBodyguard(army,start);
 return !!body&&accept(body);
}
function formationBearers(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]){
 return aeldariFormations(army,roster).find(f=>f.members.some(m=>m.id===squad.id))?.members??[squad];
}
export function aeldariHasDeepStrike(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 if(army.faction!=='Aeldari')return false;
 const current={...army,instances:[...roster]};
 return !!AELDARI_CARDS[squad.unit]?.core?.includes('Deep Strike')||formationBearers(army,squad,roster).some(s=>aeldariHasUpgrade(current,s,'Webway Pathstone'));
}
export function aeldariHasInfiltrators(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 if(army.faction!=='Aeldari')return false;
 const current={...army,instances:[...roster]};
 return !!AELDARI_CARDS[squad.unit]?.core?.includes('Infiltrators')||formationBearers(army,squad,roster).some(s=>aeldariHasUpgrade(current,s,'Mistweave','Fateful Performance')||aeldariHasUpgrade(current,s,'Mistweave','Ghosts of the Webway')&&aeldariOriginallyLed(army,s));
}
export function aeldariScoutRange(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):number{
 if(army.faction!=='Aeldari')return 0;
 const current={...army,instances:[...roster]},bearers=formationBearers(army,squad,roster);
 const native=Number(AELDARI_CARDS[squad.unit]?.core?.find(c=>/^Scouts\s+\d+/.test(c))?.match(/\d+/)?.[0]??0);
 return Math.max(native,bearers.some(s=>aeldariHasUpgrade(current,s,'Firstdrawn Blade'))?9:0,bearers.some(s=>aeldariHasUpgrade(current,s,'Key of Ghosts')||aeldariHasUpgrade(current,s,'Prelude Performer'))?6:0);
}
