import {isSpaceMarineFaction} from './space-marines-factions';
import type {ArmySelection} from './catalog';
import {spaceMarineSheet,isNativeSpaceMarine,spaceMarineAgentName} from './space-marines-data';
import {agentLoadout} from './assigned-agent-loadouts';
import {equippedItems} from './knight-gear-options';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
import type {Faction} from './catalog';
import {spaceMarineModelLoadouts} from './space-marines-loadouts';
import {expandRoster,type RosterInstance} from './roster-instances';

export function spaceMarinePhysicalModels(squad:RosterInstance,faction:Faction='Space Marines'):{model:string;items:string[]}[]{
 if(isNativeSpaceMarine(squad.unit,faction))return spaceMarineModelLoadouts(squad,faction);
 const sheet=spaceMarineSheet(squad.unit,faction);if(!sheet)return [];
 const size=squad.models??sheet.sizes[0],composition=sheet.compositionBySize?.[size]??(sheet.composition?.length===1?{[sheet.composition[0].model]:size}:Object.fromEntries((sheet.composition??[]).map(m=>[m.model,m.min])));
 const models=Object.entries(composition).flatMap(([model,count])=>Array.from({length:count},()=>({model,items:[] as string[]})));
 const agent=spaceMarineAgentName(squad.unit),kit=agent&&agentLoadout(agent,size);
 if(models.length===1&&kit)models[0].items=equippedItems(kit,squad.knightGear);
 else if(models.length===1&&agent)models[0].items=[...new Set(ASSIGNED_AGENT_DATA.find(row=>row.sheet.unit===agent)?.weapons.map(w=>w.name.split(/\s+[–—-]\s+/)[0])??[])];
 return models;
}
/** This direct printed-bearer test avoids a keyword/upgrade/attachment cycle. */
export function spaceMarineWolfTouched(army:ArmySelection,squad:Pick<RosterInstance,'unit'|'id'>):boolean{
 const sheet=spaceMarineSheet(squad.unit,army.faction),tags=sheet?.keywords??[],actual=army.instances?.find(s=>s.id===squad.id)??squad;
 return army.faction==='Space Wolves'&&!!army.detachments2026?.includes('Saga of the Beastslayer')&&(army.upgrades2026?.[squad.id]??army.upgrades2026?.[squad.unit])==='Wolf-Touched'&&tags.includes('ADEPTUS ASTARTES')&&spaceMarinePhysicalModels(actual,army.faction).some(m=>{
  const personal=new Set([...tags,...sheet?.modelKeywords?.[m.model]??[]]);return personal.has('CHARACTER')&&!personal.has('EPIC HERO');
 });
}
/** Resolve printed attachment permissions without calling keyword-dependent
 * upgrade/attachment APIs. This keeps explicit formation grants acyclic. */
function grantMembers(army:ArmySelection,squad:RosterInstance,roster:readonly RosterInstance[]):readonly RosterInstance[]{
 const attaches=(member:RosterInstance,body:RosterInstance)=>{
  const sheet=spaceMarineSheet(member.unit,army.faction);
  return member.attachedTo===body.id&&!!sheet?.attachmentRole&&(sheet.bodyguards?.includes(body.unit)||sheet.attachmentRole==='leader'&&spaceMarineWolfTouched(army,member)&&['Wulfen','Wulfen with Storm Shields'].includes(body.unit));
 };
 const body=squad.attachedTo&&roster.find(s=>s.id===squad.attachedTo),root=body&&attaches(squad,body)?body:squad;
 const members=[root],occupied=new Set<string>();
 for(const s of roster)if(s.id!==root.id&&attaches(s,root)){
  const role=spaceMarineSheet(s.unit,army.faction)!.attachmentRole!;if(occupied.has(role))continue;
  occupied.add(role);members.push(s);
 }
 return members.some(s=>s.id===squad.id)?members:[squad];
}
/** Each optional physical model keeps its own keywords; Chapter identity is never invented. */
export function spaceMarineKeywords(army:ArmySelection,squad:RosterInstance,model?:string,roster:readonly RosterInstance[]=expandRoster(army)):Set<string>{
 if(!isSpaceMarineFaction(army.faction))return new Set();
 const sheet=spaceMarineSheet(squad.unit,army.faction);if(!sheet)return new Set();
 const roles=model?[model]:spaceMarinePhysicalModels(squad,army.faction).map(m=>m.model);
 const tags=new Set([...sheet.keywords??[],...roles.flatMap(role=>sheet.modelKeywords?.[role]??[])]);
 // Core 02.01.01: the datasheet name is an additional keyword. A named
 // single-model card also identifies that actual Captain, Ancient or Techmarine.
 const nameKey=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
 if(!model||nameKey(model)===nameKey(sheet.unit))tags.add(sheet.unit.toUpperCase());
 // Core 01.02.07: explicit grants to a unit apply to every model, unlike
 // descriptors or a union of printed keywords. Chapter identity is not a grant.
 if(army.faction!=='Dark Angels'&&!(army.faction==='Space Wolves'&&Object.values(army.upgrades2026??{}).includes('Wolf-Touched')))return tags;
 const members=grantMembers(army,squad,roster),unitTags=new Set(members.flatMap(s=>{
  const row=spaceMarineSheet(s.unit,army.faction);return [...row?.keywords??[],...spaceMarinePhysicalModels(s,army.faction).flatMap(m=>row?.modelKeywords?.[m.model]??[])];
 }));
 if(unitTags.has('ADEPTUS ASTARTES')){
  if(army.faction==='Dark Angels'){
   if(unitTags.has('MOUNTED')||unitTags.has('VEHICLE')&&unitTags.has('FLY'))tags.add('RAVENWING');
   if(unitTags.has('TERMINATOR')||unitTags.has('DREADNOUGHT')||members.some(s=>['Bladeguard Ancient','Bladeguard Veteran Squad','Sternguard Veteran Squad','Vanguard Veteran Squad With Jump Packs','Land Raider','Land Raider Crusader','Land Raider Redeemer','Repulsor','Repulsor Executioner'].includes(s.unit)))tags.add('DEATHWING');
   if(members.some(s=>s.unit==='Outrider Squad')&&army.detachments2026?.includes('Darkflight Pursuit'))tags.add('BATTLELINE');
  }
  if(members.some(s=>spaceMarineWolfTouched(army,s)))tags.add('WULFEN');
 }
 return tags;
}
