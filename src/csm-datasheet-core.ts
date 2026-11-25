import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder} from './generated-reminders';
import {CSM_CARDS,CSM_CULT_WEAPONS} from './csm-card-profiles.generated';
import {CSM_ARMY_CARDS,csmArmyCard,csmArmyModelLoadouts,csmArmyWeaponCount} from './csm-army-loadouts';
import {csmMusterUnits} from './csm-army-data';
import {csmKeywords} from './csm-keywords';
import {csmSelectedUpgrade} from './csm-muster-data';
import {csmCargoFormations,csmFormations} from './csm-transports';
import {csmHasDeepStrike,csmHasInfiltrators,csmScoutRange,csmSoulLinkSources,eligibleCsmUpgrades} from './csm-detachment-data';
import {csmReactionShooting} from './csm-reactions';
import {csmCanDarkPact} from './csm-dark-pacts';
import {printCombatProfiles,printFiringDeck,printFormationDeployment,type ProfileStage} from './faction-card-profiles';
import {equippedWeaponText,type KnightCardStats} from './knight-card-rules';
import {expandRoster,type RosterInstance} from './roster-instances';

const key=(name:string)=>name.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
const profileCards:typeof CSM_ARMY_CARDS=Object.fromEntries(Object.entries(CSM_ARMY_CARDS).map(([unit,card])=>[unit,{...card,weapons:CSM_CARDS[unit]?.weapons??CSM_CULT_WEAPONS[unit]??card.weapons}]));
const core=(s:RosterInstance):readonly string[]=>csmArmyCard(s)?.core??[];
const defences:readonly ProfileStage[]=[['Shooting','opponent','during'],['Movement','own','end'],['Shooting','own','during'],['Fight','either','during']];
const selectedLink=(army:ArmySelection,squad:RosterInstance)=>csmSelectedUpgrade(army,squad)==='Soul Link'&&eligibleCsmUpgrades(army,squad.unit,squad.id).some(u=>u.name==='Soul Link');

function fullWeapons(squad:RosterInstance,card:KnightCardStats,phase:'Shooting'|'Fight',snap:boolean,count=csmArmyWeaponCount):string{
 const detailed=CSM_CARDS[squad.unit]?.weapons??CSM_CULT_WEAPONS[squad.unit];
 if(!detailed)return equippedWeaponText(squad,card,phase,snap,count);
 return detailed.filter(w=>w.phase===phase&&count(squad,w.name)>0).map(w=>{
  const stats=(phase==='Shooting'?w.range+'″; ':'')+'A '+w.attacks+'; '+(snap?'':(phase==='Shooting'?'BS ':'WS ')+w.skill+(w.skill==='-'?'':'+')+'; ')+'D '+w.damage;
  const text=equippedWeaponText(squad,{...card,weapons:[w]},phase,snap,count).replace(' — ',' — '+stats+'; ');
  return snap?text:text.replace('Psychic (these attacks are psychic attacks for rules that affect them)','Psychic (these are psychic attacks; you may ignore any or all modifiers to their Ballistic Skill or Weapon Skill and Hit roll)');
 }).join(' ');
}

export function csmFormationHasDeepStrike(army:ArmySelection,members:readonly RosterInstance[]):boolean{
 return members.length>0&&members.every(s=>csmHasDeepStrike(army,s));
}
export function csmFormationScoutRange(army:ArmySelection,members:readonly RosterInstance[],roster:readonly RosterInstance[]=expandRoster(army)):number{
 const ranges=members.map(s=>csmScoutRange(army,s,roster));
 return ranges.length&&ranges.every(Boolean)?Math.min(...ranges):0;
}
export function csmFormationHasInfiltrators(army:ArmySelection,members:readonly RosterInstance[]):boolean{
 return members.length>0&&members.every(s=>csmHasInfiltrators(army,s));
}

export function csmProfileReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Chaos Space Marines')return [];
 const legal=new Set(csmMusterUnits(army)),native=roster.filter(s=>csmArmyCard(s)&&legal.has(s.unit));
 const groups=csmFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit))),result:GeneratedReminder[]=[];
 for(const squad of native){
  const card=profileCards[squad.unit],formation=groups.find(g=>g.members.some(s=>s.id===squad.id));if(!formation)continue;
  const tags=csmKeywords(army,squad,undefined,roster),reactions=csmReactionShooting(army,squad,roster);
  const link=selectedLink(army,squad);
  function emit(title:string,[window,turn,timing]:ProfileStage,summary:string,units=[squad.id]){
   result.push({id:['11e-csm-profile',squad.id,title,window,turn,timing].join(':'),title:squad.id+' · '+title,window,turn,timing,summary,units,origin:'unit',source:card.source});
  }
  printCombatProfiles(squad,card,tags.has('TITANIC'),csmArmyWeaponCount,(title,stage,summary,units)=>{
   if(title==='Ranged weapon profiles'||title==='Melee weapon profiles')summary=(title==='Melee weapon profiles'?'Each model selects one melee weapon, plus any weapons with Extra Attacks. ':stage[0]==='Movement'?'When firing Overwatch, use snap shooting. ':'')+fullWeapons(squad,card,title==='Melee weapon profiles'?'Fight':'Shooting',stage[0]==='Movement');
   else if(link&&(title.startsWith('Feel No Pain ')||title.startsWith('Deadly Demise ')))summary='The Soul Link bearer uses this native ability only while it has not been replaced; other models retain their own native abilities. '+summary;
   emit(title,stage,summary,units);
  });
  if(card.save)emit('Invulnerable save',['Shooting','own','during'],'When permitted enemy return fire allocates an attack to a model from '+squad.id+', that model may use its '+card.save+'+ invulnerable save. An attached model from a different datasheet uses its own profile.');
  if(card.modelSaves){
   const roles=[...new Set(csmArmyModelLoadouts(squad).map(m=>m.model))];
   for(const role of roles){
    const value=card.modelSaves[role];if(!value)continue;
    for(const stage of defences)emit('Invulnerable save · '+role,stage,'Only an actual '+role+' model from '+squad.id+' has this '+value+'+ invulnerable save. Other models in this unit or attached formation do not gain it.');
   }
  }
  if(reactions.length&&card.weapons.some(w=>w.phase==='Shooting'&&csmArmyWeaponCount(squad,w.name)>0)){
   const ordinal=new Map<string,number>();
   const inventory=csmArmyModelLoadouts(squad).map(model=>{
    const n=(ordinal.get(model.model)??0)+1;ordinal.set(model.model,n);
    const count=(_s:RosterInstance,name:string)=>model.items.filter(item=>key(item)===key(name)).length;
    return model.model+' '+n+' — '+(fullWeapons(squad,card,'Shooting',false,count)||'no ranged weapons.');
   });
   emit('Reaction shooting · equipped models',['Shooting','opponent','during'],'Only through '+reactions.join('; or ')+'. Use only the actual surviving models’ equipment; casualties do not shoot. Per-model ranged inventory: '+inventory.join(' '));
   if(card.damage)emit('Damaged · reaction shooting',['Shooting','opponent','during'],'While making permitted normal reaction shots, if this model has 1–'+card.damage.threshold+' wounds remaining, subtract 1 from its Hit rolls.');
  }
  if(formation.root.id===squad.id){
   const ids=formation.members.map(s=>s.id),links=formation.members.filter(s=>selectedLink(army,s));
   const conditional=(title:string,stage:ProfileStage,summary:string,units=ids)=>emit(title,stage,(links.length?'If Soul Link has replaced a bearer’s native Core abilities, every required model must still have the relevant ability from its selected source. ':'')+summary,units);
   printFormationDeployment(ids,csmFormationHasDeepStrike(army,formation.members),csmFormationScoutRange(army,formation.members,roster),csmFormationHasInfiltrators(army,formation.members),conditional);
   if(formation.members.every(s=>core(s).includes('Lone Operative')))for(const stage of defences.filter(s=>s[0]!=='Fight'))conditional('Lone Operative',stage,'Every surviving model in this formation has Lone Operative. Enemy models more than 12″ away cannot see it or target it with Indirect Fire.');
   if(formation.members.every(s=>core(s).includes('Stealth')))for(const stage of defences.filter(s=>s[0]!=='Fight'))conditional('Stealth',stage,'Every surviving model in this formation has Stealth, so it has the Benefit of Cover against ranged attacks.');
   if(formation.members.every(s=>core(s).includes('Fights First')))conditional('Fights First',['Fight','either','start'],'Every surviving model has Fights First, so this formation fights in the Fights First step; use the normal alternation and eligibility rules.');
  }
  if(!tags.has('TRANSPORT'))continue;
  const passengers=csmCargoFormations(army,squad,roster),deck=Number(core(squad).find(c=>c.startsWith('Firing Deck '))?.match(/\d+/)?.[0]??0);
  if(deck)printFiringDeck(squad,deck,passengers,profileCards,csmArmyModelLoadouts,emit);
  const scout=tags.has('DEDICATED TRANSPORT')?passengers.map(g=>({...g,range:csmFormationScoutRange(army,g.members,roster)})).filter(g=>g.range):[];
  if(scout.length)emit('Scouts · passengers',['Pre-battle','either','during'],'During Resolve Pre-battle Abilities, this Dedicated Transport can scout only if wholly within your deployment zone and every actual embarked model has Scouts. Use the lowest Scouts distance among all models aboard and finish more than 8″ horizontally from enemies. Eligible whole formations: '+scout.map(g=>g.root.id+' ('+g.range+'″)').join(', ')+'. A passenger without Scouts blocks this move unless a rule grants Scouts to its entire formation; count actual Leader and Support models.',[squad.id,...scout.flatMap(g=>g.members.map(s=>s.id))]);
 }
 return result;
}

/** Soul Link replaces abilities on one actual Character; equipment, profile
 * saves and stats stay with that Character, and attachment permission is not copied. */
export function csmCopiedCoreReminders(army:ArmySelection,bearer:RosterInstance,source:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(!selectedLink(army,bearer)||!roster.some(s=>s.id===bearer.id)||!csmSoulLinkSources(army,bearer).some(s=>s.id===source.id))return [];
 const card=CSM_CARDS[source.unit];if(!card)return [];
 const formation=csmFormations(army,roster).find(g=>g.members.some(s=>s.id===bearer.id));if(!formation)return [];
 const result:GeneratedReminder[]=[],ids=formation.members.map(s=>s.id);
 const prefix='Only if '+bearer.id+' chose '+source.id+' for Soul Link in your Command phase, until your next Command phase: ';
 function emit(title:string,[window,turn,timing]:ProfileStage,summary:string,units=[bearer.id]){
  result.push({id:['11e-csm-copied-core',bearer.id,source.id,title,window,turn,timing].join(':'),title:'Soul Link · '+title,window,turn,timing,summary:prefix+summary,units,source:card.source,origin:'unit'});
 }
 const otherModelsQualify=(ability:string)=>formation.members.every(s=>{
  if(s.id!==bearer.id)return core(s).includes(ability);
  return csmArmyModelLoadouts(s).every(m=>csmKeywords(army,s,m.model,roster).has('CHARACTER')||core(s).includes(ability));
 });
 if(card.core?.includes('Deep Strike')){
  const all=otherModelsQualify('Deep Strike');
  for(const stage of [['Movement','own','during'],['Movement','opponent','end']] as const)emit('Deep Strike',stage,'The actual Soul Link bearer has Deep Strike. '+(all?'Every other surviving model in this formation also qualifies; when arriving by ingress, normally in battle round two or later, set up more than 8″ horizontally from every enemy unit, including inside the enemy deployment zone.':'The current formation includes other models without Deep Strike; this personal copy does not allow the whole formation to arrive using Deep Strike.')+(stage[1]==='opponent'?' An opponent-phase arrival still requires Rapid Ingress and cannot arrive in battle round one.':''),ids);
 }
 for(const ability of ['Stealth','Lone Operative'])if(card.core?.includes(ability))for(const stage of defences.filter(s=>s[0]!=='Fight'))emit(ability,stage,'The actual Soul Link bearer gains '+ability+'. '+(otherModelsQualify(ability)?ability==='Stealth'?'All models qualify, so this formation has the Benefit of Cover against ranged attacks.':'All models qualify, so enemy models more than 12″ away cannot see this formation or target it with Indirect Fire.':'Other models in the current formation do not all have this ability, so the whole formation does not gain its protection.'),ids);
 if(card.core?.includes('Fights First'))emit('Fights First',['Fight','either','start'],'The actual bearer has Fights First. '+(otherModelsQualify('Fights First')?'Every other surviving model also qualifies, so this formation may fight in the Fights First step.':'The current formation contains models without Fights First, so it cannot use the Fights First step from this personal copy.'),ids);
 const fnp=card.core?.find(c=>c.startsWith('Feel No Pain '));
 if(fnp)for(const phase of PHASES)emit(fnp,[phase,'either','during'],'Only when the actual Soul Link bearer would lose a wound, roll a D6: on '+fnp.slice('Feel No Pain '.length)+' it keeps that wound. Other models do not inherit this personal copy.');
 if(card.demise)for(const phase of PHASES)emit('Deadly Demise '+card.demise,[phase,'either','during'],'When the actual Soul Link bearer is destroyed, roll one D6: on a 6, each unit within 6″ suffers '+card.demise+' mortal wounds. Resolve each affected unit separately.');
 if(csmCanDarkPact(army,[source]))emit('Core and Faction abilities',['Command','own','during'],'Soul Link itself grants the actual bearer the Psyker keyword until your next Command phase. The copy includes the selected source’s Core abilities and Dark Pacts. It does not copy weapons, profile characteristics, source keywords, invulnerable saves printed in the profile, or which units this model may join. Only the actual bearer replaces its abilities; other models in its unit keep their own rules.');
 return result;
}
