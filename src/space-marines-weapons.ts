import {chapterBattleFormations,chapterFormationKeywords,type ChapterSplitPart} from './space-marine-chapters-splits';
import {spaceMarineCards,spaceMarinePhysicalWeapons} from './space-marines-card-data';
import {isSpaceMarineFaction} from './space-marines-factions';
import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {SM_ENHANCEMENT_WEAPONS,type SpaceMarineWeapon} from './space-marines-card-profiles.generated';
import {spaceMarineModelLoadouts,spaceMarineWeaponCount} from './space-marines-loadouts';
import {spaceMarineMusterUnits} from './space-marines-muster-data';
import {spaceMarineKeywords,spaceMarinePhysicalModels} from './space-marines-keywords';
import {selectedSpaceMarineUpgrade,spaceMarineSelectedDetachments} from './space-marines-upgrades';
import {spaceMarineCargoFormations} from './space-marines-transports';
import {weaponAbilityText} from './weapon-abilities-11th';
import {expandRoster,type RosterInstance} from './roster-instances';

const key=(s:string)=>s.split(/\s+[–—-]\s+/)[0].normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
type PhysicalModel={model:string;items:readonly string[]};
function countFor(army:ArmySelection,squad:RosterInstance,model?:string|PhysicalModel){
 if(model===undefined)return (name:string)=>spaceMarineWeaponCount(squad,name,army.faction);
 const physical=typeof model==='string'?spaceMarineModelLoadouts(squad,army.faction).filter(m=>m.model===model):[model];
 return (name:string)=>physical.flatMap(m=>m.items).filter(item=>key(item)===key(name)).length;
}

/** Only actual equipped weapons; no passenger or temporary ability is merged
 * into printed profiles. An enhancement's extra weapon belongs to its bearer. */
export function spaceMarineFullWeaponProfiles(army:ArmySelection,squad:RosterInstance,model?:string|PhysicalModel):(SpaceMarineWeapon&{count:number})[]{
 if(!isSpaceMarineFaction(army.faction)||!spaceMarineMusterUnits(army).includes(squad.unit))return [];
 const count=countFor(army,squad,model),profiles=(spaceMarineCards(army.faction)[squad.unit]?.weapons??[]).filter(w=>count(w.name)>0).map(w=>({...w,count:count(w.name)}));
 const upgrade=selectedSpaceMarineUpgrade(army,squad),extra=upgrade&&SM_ENHANCEMENT_WEAPONS[upgrade.id==='000011204002'?'Imperium’s Sword':upgrade.id==='000008522002'?'The Thief of Secrets':''];
 const physical=model===undefined?spaceMarineModelLoadouts(squad,army.faction):typeof model==='string'?spaceMarineModelLoadouts(squad,army.faction).filter(m=>m.model===model):[model];
 if(extra&&physical.some(m=>upgrade.bearerModels.includes(m.model)))profiles.push({...extra,count:1});
 return profiles;
}

function abilityText(value:string,snap:boolean):string{
 const title=value.split(/( |[-])/).map(s=>/^d\d/i.test(s)?s.toUpperCase():s.charAt(0).toUpperCase()+s.slice(1).toLowerCase()).join('');
 const condition=value.match(/^(lethal hits|sustained hits (\d+)|devastating wounds): non-monster\/vehicle$/i);
 if(condition){
  if(snap&&!value.startsWith('devastating'))return '';
  const target='against targets with neither Monster nor Vehicle';
  if(value.startsWith('lethal'))return 'Lethal Hits ('+target+', a Critical Hit may wound automatically without a Wound roll)';
  if(value.startsWith('sustained'))return 'Sustained Hits '+condition[2]+' ('+target+', each Critical Hit scores '+condition[2]+' additional hit'+(condition[2]==='1'?'':'s')+')';
  return 'Devastating Wounds ('+target+', a Critical Wound inflicts this weapon’s Damage as mortal wounds on one model after normal damage)';
 }
 if(value==='devastating wounds: infantry')return 'Devastating Wounds (against Infantry targets, a Critical Wound inflicts this weapon’s Damage as mortal wounds on one model after normal damage)';
 const anti=value.match(/^anti-non-monster\/vehicle (\d+)\+$/i);
 if(anti)return 'Anti: non-Monster/Vehicle '+anti[1]+'+ (against targets with neither keyword, an unmodified Wound roll of '+anti[1]+'+ is critical)';
 const text=weaponAbilityText(title,snap);
 return text??'';
}

function formattedWeapons(profiles:(SpaceMarineWeapon&{count:number})[],phase:'Shooting'|'Fight',snap:boolean):string{
 return profiles.filter(w=>w.phase===phase).map(w=>{
  const stats=[...(phase==='Shooting'?['Range '+w.range+'″']:[]),'A '+w.attacks,...(snap?[]:[(phase==='Shooting'?'BS ':'WS ')+w.skill+(w.skill==='-'?'':'+')]),'S '+w.strength,'AP '+w.ap,'D '+w.damage];
  const modes=w.mode?' (choose one profile per weapon)':w.abilities.includes('extra attacks')?' (additional Extra Attacks profile)':'';
  const targets=w.targets?.length?' Hunter: this profile can target only '+w.targets.join(' or ')+' units.':'';
  return w.count+' × '+w.name+modes+' — '+[...stats,...w.abilities.map(a=>abilityText(a,snap)).filter(Boolean)].join('; ')+'.'+targets;
 }).join(' ');
}

export function spaceMarineWeaponText(army:ArmySelection,squad:RosterInstance,phase:'Shooting'|'Fight',snap=false,model?:string|PhysicalModel):string{
 if(spaceMarineCards(army.faction)[squad.unit])return formattedWeapons(spaceMarineFullWeaponProfiles(army,squad,model),phase,snap);
 const physical=model===undefined?spaceMarinePhysicalModels(squad,army.faction):typeof model==='string'?spaceMarinePhysicalModels(squad,army.faction).filter(m=>m.model===model):[model];
 return physical.flatMap(m=>spaceMarinePhysicalWeapons(squad.unit,army.faction,m.items).filter(w=>w.phase===phase).map(w=>w.name+(w.abilities.length?' — '+w.abilities.map(a=>abilityText(a,snap)).filter(Boolean).join('; '):'')+'.')).join(' ');
}
export function spaceMarinePartWeaponProfiles(army:ArmySelection,part:ChapterSplitPart):(SpaceMarineWeapon&{count:number})[]{
 const profiles=new Map<string,SpaceMarineWeapon&{count:number}>();
 for(const m of part.physical)for(const w of spaceMarineFullWeaponProfiles(army,m.squad,{model:m.model,items:m.items})){
  const {count,...printed}=w,key=JSON.stringify(printed),prior=profiles.get(key);
  profiles.set(key,{...printed,count:(prior?.count??0)+count});
 }
 return [...profiles.values()];
}

export function spaceMarineWeaponReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(!isSpaceMarineFaction(army.faction))return [];
 const legal=new Set(spaceMarineMusterUnits(army)),result:GeneratedReminder[]=[],parts=chapterBattleFormations(army,roster).filter(g=>g.part);
 const splitIds=new Set(parts.flatMap(g=>g.members.map(s=>s.id)));
 const targets=[...roster.filter(s=>!splitIds.has(s.id)).map(s=>({squad:s,part:undefined as ChapterSplitPart|undefined})),...parts.map(g=>({squad:g.root,part:g.part}))];
 const detachments=spaceMarineSelectedDetachments(army),hasDet=(name:string)=>detachments.some(d=>key(d)===key(name));
 const burning=hasDet('Forgefather’s Seekers')?new Set(roster.flatMap(carrier=>spaceMarineCargoFormations(army,carrier,roster).flatMap(g=>g.members.map(s=>s.id)))):new Set<string>();
 for(const {squad,part} of targets){
  const card=spaceMarineCards(army.faction)[squad.unit];if(!card||!legal.has(squad.unit))continue;
  const tags=part?chapterFormationKeywords(army,{...part,part},roster):spaceMarineKeywords(army,squad,undefined,roster);
  const text=(phase:'Shooting'|'Fight',snap:boolean)=>part?[formattedWeapons(spaceMarinePartWeaponProfiles(army,part),phase,snap),...part.physical.filter(m=>!spaceMarineCards(army.faction)[m.squad.unit]).map(m=>spaceMarineWeaponText(army,m.squad,phase,snap,m))].filter(Boolean).join(' '):spaceMarineWeaponText(army,squad,phase,snap);
  const units=part?part.members.map(s=>s.id):[squad.id];
  for(const [window,turn,phase,snap] of [['Shooting','own','Shooting',false],['Movement','opponent','Shooting',true],['Fight','either','Fight',false]] as const){
   if(snap&&tags.has('TITANIC'))continue;
   const summary=text(phase,snap);if(!summary)continue;
   result.push({id:['11e-space-marines-weapons',squad.id,window,turn].join(':'),title:squad.id+' · '+(phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles'),window,turn,timing:snap?'end':'during',summary:(snap?'Only when firing permitted Overwatch: use snap shooting’s fixed Hit rolls, without Hit re-rolls, Hit modifiers or Critical Hits. ':phase==='Fight'?'Each model selects one melee weapon, plus its Extra Attacks weapons. ':'')+summary,source:card.source,origin:'unit',units});
  }
  const machineSpirit=hasDet('Medusa’s Wrath')&&tags.has('VEHICLE')&&tags.has('ADEPTUS ASTARTES');
  const normalCauses=[...(squad.unit==='Land Speeder Vengeance'?['Storm of Vengeance, once per turn after enemy shooting destroys a friendly Dark Angels unit within 6″']:[]),...(hasDet('Devastator Brethren')&&tags.has('ADEPTUS ASTARTES')?['Hail of Vengeance, after enemy shooting destroys a model in this formation']:[]),...(burning.has(squad.id)?['Burning Vengeance, only after this formation actually disembarks from the attacked transport']:[]),...(machineSpirit?['Power of the Machine Spirit, only while this Vehicle formation is unengaged and at or below half Starting Strength']:[])];
  for(const reactiveSnap of [false,true]){
   if(reactiveSnap?!machineSpirit:!normalCauses.length)continue;
   const summary=text('Shooting',reactiveSnap);if(!summary)continue;
   result.push({id:['11e-space-marines-reactive-weapons',squad.id,reactiveSnap?'snap':'normal'].join(':'),title:squad.id+' · '+(reactiveSnap?'Reactive snap-shot profiles':'Reactive ranged weapon profiles'),window:'Shooting',turn:'opponent',timing:'during',summary:(reactiveSnap?'Only after Power of the Machine Spirit targets this unengaged Vehicle formation above half Starting Strength: shoot at the attacking enemy using snap shooting. Fixed Hit rolls cannot be re-rolled or modified and cannot score Critical Hits. ':'Only after an eligible reactive ability or Stratagem permits this unit to shoot: '+normalCauses.join('; ')+'. Use normal shooting at only the attacking enemy. ')+'Rules restricted to your Shooting phase do not trigger in the opponent’s phase. '+summary,source:card.source,origin:'unit',units});
  }
 }
 return result;
}
