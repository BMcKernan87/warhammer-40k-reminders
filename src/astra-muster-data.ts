import type {ArmySelection} from './catalog';
import {ASTRA_UNITS} from './astra-militarum-data';
import {BATTLELINE_INQUISITORS} from './assigned-agent-data';
import {alliedTitanAndKnightNames,isWarhound} from './titan-support-data';
import {expandRoster,type RosterInstance} from './roster-instances';
import {astraMilitarumWeaponCount} from './astra-militarum-loadouts';

export {ASTRA_ARMY_SHEETS,ASTRA_ARMY_UNITS,astraAgentName,astraSheets,loyalProtectors} from './astra-army-data';
import {ASTRA_ARMY_UNITS,astraSheets,loyalProtectors} from './astra-army-data';
const faction='Astra Militarum';
export function astraMusterUnits(army:ArmySelection){
 return army.faction!==faction?[]:ASTRA_ARMY_UNITS.filter(unit=>!isWarhound(unit)||alliedTitanAndKnightNames(army).includes(unit));
}
function printed(unit:string,model?:string){
 const s=astraSheets.get(unit);
 const extra=s?.modelKeywords??{};
 return new Set([...(s?.keywords??[]),...(model?extra[model]??[]:Object.values(extra).flat())]);
}
export function astraCanPromote(army:ArmySelection,s:RosterInstance):boolean{
 const tags=printed(s.unit);
 return army.faction===faction&&!!army.detachments2026?.includes('Steel Hammer')&&tags.has('ASTRA MILITARUM')&&tags.has('TITANIC');
}
export function astraWarlordCandidates(army:ArmySelection){
 if(army.faction!==faction)return [];
 const roster=expandRoster(army);
 const mandatory=roster.filter(s=>s.unit==='Lord Solar Leontus');
 if(mandatory.length)return mandatory;
 return roster.filter(s=>ASTRA_UNITS.includes(s.unit)&&!loyalProtectors.has(s.unit)&&s.unit!=='Sly Marbo'&&
  (printed(s.unit).has('CHARACTER')||s.characterPromotion&&astraCanPromote(army,s)));
}
export function resolvedAstraWarlord(army:ArmySelection){
 const candidates=astraWarlordCandidates(army);
 return candidates.length===1?candidates[0]:candidates.find(s=>s.id===army.warlordId);
}
export function astraMilitarumKeywords(army:ArmySelection,s:RosterInstance,model?:string):Set<string>{
 const tags=printed(s.unit,model),ds=army.detachments2026??[];
 if(!tags.has('ASTRA MILITARUM')||army.faction!==faction)return tags;
 const upgrade=army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit];
 if(s.characterPromotion&&astraCanPromote(army,s)){
  tags.add('CHARACTER');
  if(upgrade==='Battalion Commander')tags.add('OFFICER');
 }
 if(ds.includes('Abhuman Auxiliaries')&&['Bullgryn Squad','Ogryn Squad','Ratlings'].includes(s.unit))tags.add('ABHUMAN');
 if(ds.includes('Armoured Infantry')&&tags.has('SQUADRON')&&!tags.has('ARTILLERY')){
  const sheet=astraSheets.get(s.unit);
  const profiles=sheet?.modelProfiles?Object.values(sheet.modelProfiles):sheet?.profile?[sheet.profile]:[];
  if(profiles.length&&profiles.every(p=>p.wounds<13))tags.add('ARMOURED SKIRMISHER');
 }
 if(s.unit==='Tempestus Scions'&&ds.includes('Bridgehead Strike')){
  const warlord=resolvedAstraWarlord(army);
  if(warlord&&printed(warlord.unit).has('MILITARUM TEMPESTUS')&&printed(warlord.unit).has('OFFICER'))tags.add('BATTLELINE');
 }
 if(s.unit==='Ratlings'&&astraMilitarumWeaponCount(s,'Demolition gear')>0)tags.add('GRENADES');
 return tags;
}
export function astraAdditionalBodyguards(army:ArmySelection,leader:{id:string;unit:string}):string[]{
 if(BATTLELINE_INQUISITORS.has(leader.unit))return ASTRA_UNITS.filter(unit=>{
  const tags=astraMilitarumKeywords(army,{unit,id:''});
  return ['IMPERIUM','BATTLELINE','INFANTRY'].every(key=>tags.has(key));
 });
 const upgrade=army.upgrades2026?.[leader.id]??army.upgrades2026?.[leader.unit];
 if(leader.unit==='Commissar'&&((upgrade==='Abhuman Detail'&&army.detachments2026?.includes('Grizzled Company'))||
  (upgrade==='Exemplar of Duty'&&army.detachments2026?.includes('Abhuman Auxiliaries'))))return ['Ogryn Squad','Bullgryn Squad'];
 return [];
}
const twoLeaders=new Set(['Cadian Shock Troops','Death Korps Of Krieg','Catachan Jungle Fighters','Tempestus Scions']);
export function usesAstraAttachmentSlots(army:ArmySelection,body:RosterInstance):boolean{
 return army.faction==='Astra Militarum'||army.faction==='Genestealer Cults'&&twoLeaders.has(body.unit);
}
export function astraAttachmentSlots(body:RosterInstance,members:readonly RosterInstance[]):boolean{
 const leaders=members.filter(s=>astraSheets.get(s.unit)?.attachmentRole==='leader');
 const support=members.filter(s=>astraSheets.get(s.unit)?.attachmentRole==='support');
 return members.length===leaders.length+support.length&&support.length<=1&&leaders.length<=(twoLeaders.has(body.unit)?2:1)&&
  leaders.filter(s=>printed(s.unit).has('COMMAND SQUAD')).length<=1;
}
