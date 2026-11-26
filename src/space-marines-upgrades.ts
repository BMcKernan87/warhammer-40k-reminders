import type {ArmySelection} from './catalog';
import {expandRoster,type RosterInstance} from './roster-instances';
import {spaceMarineKeywords} from './space-marines-keywords';
import {spaceMarineFormations} from './space-marines-formations';
import {SM_CARDS,spaceMarineModelLoadouts} from './space-marines-loadouts';
import {SM_DETACHMENTS,SM_UPGRADES} from './space-marines-detachments.generated';
export {SM_DETACHMENTS,SM_UPGRADES} from './space-marines-detachments.generated';

type Upgrade=typeof SM_UPGRADES[number];
const normalize=(name:string)=>name.trim().toLowerCase().replace(/[’']/g,'’');
export function currentSpaceMarineDetachment(name:string):string{
 return SM_DETACHMENTS.find(d=>normalize(d.name)===normalize(name))?.name??name;
}
export function spaceMarineSelectedDetachments(army:ArmySelection):string[]{
 return army.faction==='Space Marines'?[...new Set((army.detachments2026??[]).map(currentSpaceMarineDetachment))]:[];
}
const astartes=(tags:Set<string>)=>tags.has('ADEPTUS ASTARTES');
function permission(u:Upgrade,tags:Set<string>,unit:string):boolean{
 if(!astartes(tags))return false;
 switch(u.id){
  case '000008353002':return tags.has('ANCIENT');
  case '000008353004':case '000010633002':case '000011220003':case '000011184003':return tags.has('CAPTAIN')||unit==='Captain';
  case '000008478002':case '000008478003':return tags.has('VEHICLE')&&!['DEDICATED TRANSPORT','FLY','WALKER'].some(k=>tags.has(k));
  case '000008486002':return tags.has('MOUNTED');
  case '000008486003':return tags.has('SPEEDER');
  case '000008522002':case '000008522004':return tags.has('CAPTAIN')||unit==='Captain'||unit==='Watch Master';
  case '000008522005':return tags.has('TECHMARINE')||unit==='Techmarine'||unit==='Watch Master';
  case '000010466002':case '000010466003':case '000011184002':return tags.has('INFANTRY');
  case '000010466005':case '000011188002':case '000011188003':case '000011196002':case '000011196003':return tags.has('PHOBOS');
  case '000010629003':return tags.has('MOUNTED')||tags.has('SPEEDER');
  case '000010759002':case '000011208002':case '000011208003':case '000011216002':return tags.has('GRAVIS');
  case '000011180002':case '000011180003':return tags.has('TECHMARINE')||unit==='Techmarine';
  case '000011192002':case '000011192003':case '000011228002':case '000011228003':return tags.has('TACTICUS');
  case '000011200002':case '000011200003':return tags.has('TERMINATOR');
  case '000011204003':return tags.has('INFANTRY');
  case '000011212002':return tags.has('INFANTRY')||tags.has('MOUNTED');
  case '000011216003':return unit==='Apothecary Biologis';
  case '000011224002':case '000011224003':return tags.has('DREADNOUGHT');
  default:return true;
 }
}
export function eligibleSpaceMarineUpgrades(army:ArmySelection,unit:string,id?:string){
 if(army.faction!=='Space Marines'||!SM_CARDS[unit])return [];
 const selected=spaceMarineSelectedDetachments(army),roster=expandRoster(army),found=roster.find(s=>s.unit===unit&&(!id||s.id===id));
 if(id&&!found)return [];
 const squad=found??{id:unit,unit},tags=spaceMarineKeywords(army,squad),physical=spaceMarineModelLoadouts(squad);
 const form=spaceMarineFormations(army,roster).find(f=>f.members.some(s=>s.id===squad.id));
 const supportKillTeam=selected.includes('Deathwatch Support')&&(form?.members??[squad]).some(s=>spaceMarineKeywords(army,s).has('KILL TEAM'));
 const result=SM_UPGRADES.filter(u=>{
  if(!selected.includes(u.detachment)||supportKillTeam&&u.detachment!=='Deathwatch Support')return false;
  if(u.repeatable)return physical.some(m=>!spaceMarineKeywords(army,squad,m.model).has('EPIC HERO'))&&permission(u,tags,unit);
  return physical.some(m=>{const k=spaceMarineKeywords(army,squad,m.model);return k.has('CHARACTER')&&!k.has('EPIC HERO')&&permission(u,k,unit);});
 }).map(u=>({...u,bearerModels:u.repeatable?[]:[...new Set(physical.filter(m=>{const k=spaceMarineKeywords(army,squad,m.model);return k.has('CHARACTER')&&!k.has('EPIC HERO')&&permission(u,k,unit);}).map(m=>m.model))]}));
 // Beacon Angelis and Venator Omni-auspex have identical prices and effects
 // in their two detachments. Keep one stable saved name if both are supplied.
 return result.filter((u,i)=>result.findIndex(v=>v.name===u.name)===i);
}
export function selectedSpaceMarineUpgrade(army:ArmySelection,squad:RosterInstance){
 const selected=army.upgrades2026?.[squad.id]??army.upgrades2026?.[squad.unit]??squad.enhancement;
 return eligibleSpaceMarineUpgrades(army,squad.unit,squad.id).find(u=>u.name===selected);
}
export function spaceMarineHasUpgrade(army:ArmySelection,squad:RosterInstance,name:string):boolean{
 return selectedSpaceMarineUpgrade(army,squad)?.name===name;
}
function formationBearers(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]){
 return spaceMarineFormations(army,roster).find(f=>f.members.some(m=>m.id===squad.id))?.members??[squad];
}
export function spaceMarineHasDeepStrike(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 if(army.faction!=='Space Marines')return false;
 const bearers=formationBearers(army,squad,roster),current={...army,instances:[...roster]};
 return !!SM_CARDS[squad.unit]?.core?.includes('Deep Strike')||bearers.some(s=>spaceMarineKeywords(army,s,undefined,roster).has('KILL TEAM'))&&bearers.some(s=>spaceMarineHasUpgrade(current,s,'Beacon Angelis'));
}
export function spaceMarineHasInfiltrators(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):boolean{
 if(army.faction!=='Space Marines')return false;
 const current={...army,instances:[...roster]};
 return !!SM_CARDS[squad.unit]?.core?.includes('Infiltrators')||formationBearers(army,squad,roster).some(s=>spaceMarineHasUpgrade(current,s,'Blackwing Shroud'));
}
export function spaceMarineScoutRange(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):number{
 if(army.faction!=='Space Marines')return 0;
 const native=Number(SM_CARDS[squad.unit]?.core?.find(c=>/^Scouts\s+\d+/.test(c))?.match(/\d+/)?.[0]??0),current={...army,instances:[...roster]},bearers=formationBearers(army,squad,roster);
 return Math.max(native,bearers.some(s=>spaceMarineHasUpgrade(current,s,'Spearpoint War Leader'))?6:0,bearers.some(s=>spaceMarineHasUpgrade(current,s,'Relentless Advance'))?5:0);
}
