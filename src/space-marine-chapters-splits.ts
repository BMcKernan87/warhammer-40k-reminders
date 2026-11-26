import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {spaceMarineModelIdentities,spaceMarineSplitSelection} from './space-marines-loadouts';
import {spaceMarineFormations,type SpaceMarineFormation} from './space-marines-formations';
import {spaceMarineAttachmentRole} from './space-marines-attachments';
import {spaceMarineKeywords,spaceMarinePhysicalModels} from './space-marines-keywords';
import {spaceMarinePhysicalWeapons} from './space-marines-card-data';
import {expandRoster,type RosterInstance} from './roster-instances';

export interface ChapterSplitModel {id:string;model:string;items:string[];squad:RosterInstance}
export interface ChapterSplitPart {key:'1'|'2';root:RosterInstance;members:RosterInstance[];physical:ChapterSplitModel[];models:number;originalRootId:string}
export interface ChapterSplitPlan {rule:string;source:string;rootId:string;valid:boolean;issue?:string;parts:ChapterSplitPart[]}
export type ChapterBattleFormation=SpaceMarineFormation&{part?:ChapterSplitPart};
/** A battle-part context excludes the other part's attached ability sources.
 * Physical-model queries should use part.physical, not the original card size. */
export function chapterPartRoster(part:ChapterSplitPart,roster:readonly RosterInstance[]):RosterInstance[]{
 const ids=new Set(part.members.map(s=>s.id));return roster.filter(s=>ids.has(s.id)||s.id!==part.originalRootId&&s.attachedTo!==part.originalRootId);
}
function identities(army:ArmySelection,squad:RosterInstance){
 const native=spaceMarineModelIdentities(squad,army.faction);if(native.length)return native;
 const counts=new Map<string,number>();
 return spaceMarinePhysicalModels(squad,army.faction).map(m=>{const n=(counts.get(m.model)??0)+1;counts.set(m.model,n);return {...m,id:squad.id+'::'+m.model+'#'+n};});
}

/** The plan uses original physical identities so casualties never reassign a
 * surviving model or Character to the other part of a pre-battle split. */
export function chapterSplitPlan(army:ArmySelection,group:SpaceMarineFormation,roster:readonly RosterInstance[]=expandRoster(army)):ChapterSplitPlan|undefined{
 if(army.faction!=='Space Wolves')return;
 const originalRoster=expandRoster(army),member=originalRoster.find(s=>s.id===group.root.id);
 // Inspect the original member and Bodyguard before resolving formations. An
 // attached survivor still belongs to its declared part after that Bodyguard dies.
 if(!member||!originalRoster.some(s=>(s.id===member.id||s.id===member.attachedTo)&&s.knightGear?.['Battle formation']==='Split unit'))return;
 const original=spaceMarineFormations(army,originalRoster).find(g=>g.root.id===group.root.id||g.members.some(s=>s.id===group.root.id));
 if(!original)return;
 const selection=spaceMarineSplitSelection(original.root,army.faction);if(!selection)return;
 const allocations=new Map(selection.groups.flatMap(g=>g.modelIds.map(id=>[id,g.key] as const)));
 const originalModels=original.members.flatMap(s=>identities(army,s).map(m=>({...m,squad:s})));
 const attachments=original.members.filter(s=>s.id!==original.root.id);
 const chosen=new Map<string,'1'|'2'>();
 const choices=attachments.map(s=>{
  const preference=spaceMarineAttachmentRole(s.unit,army)==='leader'?selection.leaderGroup:selection.supportGroup;
  return selection.kind==='roles'?['1'] as const:preference==='Group 1'?['1'] as const:preference==='Group 2'?['2'] as const:['1','2'] as const;
 });
 let best:Map<string,'1'|'2'>|undefined,bestDifference=Infinity;
 function assign(index:number){
  if(index<attachments.length){for(const key of choices[index]){chosen.set(attachments[index].id,key);assign(index+1);}return;}
  const counts={1:0,2:0};for(const m of originalModels){const key=allocations.get(m.id)??chosen.get(m.squad.id);if(key)counts[key]++;}
  const difference=Math.abs(counts[1]-counts[2]);if(difference<bestDifference){bestDifference=difference;best=new Map(chosen);}
 }
 assign(0);
 for(const m of originalModels)if(m.squad.id!==original.root.id)allocations.set(m.id,best?.get(m.squad.id)??'1');
 const live=new Map(roster.map(s=>[s.id,s])),liveIds=new Set(roster.flatMap(s=>identities(army,s).map(m=>m.id)));
 const parts:ChapterSplitPart[]=(['1','2'] as const).map(key=>{
  const physical=originalModels.filter(m=>allocations.get(m.id)===key&&liveIds.has(m.id)).map(m=>({...m,squad:live.get(m.squad.id)!}));
  const members=[...new Map(physical.map(m=>[m.squad.id,m.squad])).values()];
  return {key,root:{...original.root,id:original.root.id+' · Group '+key,models:physical.length},members,physical,models:physical.length,originalRootId:original.root.id};
 });
 const counts=(['1','2'] as const).map(key=>originalModels.filter(m=>allocations.get(m.id)===key).length);
 const valid=counts.every(n=>n>0)&&(selection.kind==='roles'||bestDifference<=1);
 return {rule:selection.rule,source:selection.source,rootId:original.root.id,valid,...(!valid?{issue:original.root.id+' must split its complete attached formation as evenly as possible. Current groups contain '+counts.join(' and ')+' models, including all Leaders and Supports.'}:{}),parts};
}

export function chapterSplitPlans(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):ChapterSplitPlan[]{
 return spaceMarineFormations(army,roster).flatMap(g=>{const plan=chapterSplitPlan(army,g,roster);return plan?[plan]:[];});
}
export function chapterBattleFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):ChapterBattleFormation[]{
 return spaceMarineFormations(army,roster).flatMap<ChapterBattleFormation>(g=>{
  const plan=chapterSplitPlan(army,g,roster);
  return plan?.valid?plan.parts.filter(p=>p.models).map(part=>({...part,part})):[g];
 });
}
export function chapterFormationKeywords(army:ArmySelection,group:ChapterBattleFormation,roster:readonly RosterInstance[]):Set<string>{
 if(!group.part)return new Set(group.members.flatMap(s=>[...spaceMarineKeywords(army,s,undefined,roster)]));
 const context=chapterPartRoster(group.part,roster);
 return new Set(group.part.physical.flatMap(m=>[...spaceMarineKeywords(army,m.squad,m.model,context)]));
}
export function chapterPartWeapons(army:ArmySelection,part:ChapterSplitPart,phase:'Shooting'|'Fight'){
 return part.physical.flatMap(m=>spaceMarinePhysicalWeapons(m.squad.unit,army.faction,m.items).filter(w=>w.phase===phase));
}
export function chapterSplitReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 return chapterSplitPlans(army,roster).filter(p=>p.valid).flatMap(plan=>plan.parts.filter(p=>p.models).flatMap(part=>{
  const models=part.physical.map(m=>m.squad.id+' · '+m.id.slice(m.id.indexOf('::')+2)+' ('+m.items.join(', ')+')').join('; ');
  const summary=plan.rule+': this declared part contains '+part.models+' actual models: '+models+'. It is a separate unit with its own Starting Strength. Only the Characters, wargear and ability sources assigned to this part supply their rules; the other part’s models, weapons, keywords and Leader/Support abilities do not contribute. Neither part can be split again.';
  return (['Pre-battle','Shooting','Fight'] as const).map(window=>({id:'11e-chapter-split-'+plan.rootId+'-'+part.key+'-'+window,title:part.root.id+' · actual models',window,turn:window==='Shooting'?'own' as const:'either' as const,timing:'during' as const,summary,units:part.members.map(s=>s.id),source:plan.source,origin:'unit' as const}));
 }));
}
