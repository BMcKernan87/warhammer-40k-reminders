import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {SORORITAS_CARDS,type SororitasCardStats} from './sororitas-card-profiles.generated';
import {SORORITAS_ARMY_SHEETS,sororitasAgentName,sororitasKeywords,sororitasMusterUnits} from './sororitas-army-data';
import {sororitasModelLoadouts,sororitasWeaponCount} from './sororitas-loadouts';
import {sororitasCargoFormations,sororitasFormations,sororitasSplitCargoFormations} from './sororitas-transports';
import {sororitasReactionShooting} from './sororitas-reactions';
import {printCombatProfiles,printFiringDeck,printFormationDeployment,type ProfileStage} from './faction-card-profiles';
import {equippedWeaponText} from './knight-card-rules';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
import {knightEquippedItems} from './knight-loadouts';
import {expandRoster,type RosterInstance} from './roster-instances';

const weaponKey=(name:string)=>name.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
const agentData=(s:RosterInstance)=>ASSIGNED_AGENT_DATA.find(a=>a.sheet.unit===sororitasAgentName(s.unit));
const allCards={...SORORITAS_CARDS,...Object.fromEntries(SORORITAS_ARMY_SHEETS.flatMap(s=>{
 const data=ASSIGNED_AGENT_DATA.find(a=>a.sheet.unit===sororitasAgentName(s.unit));
 return data?[[s.unit,{weapons:data.weapons.map(w=>({name:w.name,phase:w.type==='Melee'?'Fight' as const:'Shooting' as const,abilities:w.abilities.split(',').map(a=>a.trim()).filter(Boolean)}))}]]:[];
}))};
// The only allied models allowed in native cargo are single-model Inquisitors
// attached through Authority of the Inquisition.
const models=(s:RosterInstance)=>SORORITAS_CARDS[s.unit]?sororitasModelLoadouts(s):[{model:s.unit,items:knightEquippedItems({...s,unit:sororitasAgentName(s.unit)??s.unit})}];
const core=(s:RosterInstance):readonly string[]=>SORORITAS_CARDS[s.unit]?.core??agentData(s)?.core??[];
function passengerInventory(s:RosterInstance):string[]{
 const ordinal=new Map<string,number>();
 return models(s).flatMap(m=>{
  const n=(ordinal.get(m.model)??0)+1;ordinal.set(m.model,n);
  const guns=allCards[s.unit]?.weapons.filter(w=>w.phase==='Shooting'&&!w.abilities.some(a=>a.toLowerCase()==='one shot')&&m.items.some(i=>weaponKey(i)===weaponKey(w.name)))??[];
  return guns.length?[s.id+' / '+m.model+' '+n+' — '+guns.map(w=>w.name).join(' or ')]:[];
 });
}

function fullWeapons(s:RosterInstance,card:SororitasCardStats,phase:'Shooting'|'Fight',snap:boolean,count=sororitasWeaponCount):string{
 return card.weapons.filter(w=>w.phase===phase&&count(s,w.name)>0).map(w=>{
  const stats=(phase==='Shooting'?w.range+'″; ':'')+'A '+w.attacks+'; '+(snap?'':(phase==='Shooting'?'BS ':'WS ')+w.skill+(w.skill==='-'?'':'+')+'; ')+'D '+w.damage;
  const text=equippedWeaponText(s,{...card,weapons:[w]},phase,snap,count);
  return text.replace(' — ',' — '+stats+'; ');
 }).join(' ');
}

export function sororitasFormationHasDeepStrike(members:readonly RosterInstance[]):boolean{
 return members.length>0&&members.every(s=>core(s).includes('Deep Strike'));
}
function infiltrators(root:RosterInstance,members:readonly RosterInstance[]):boolean{
 return members.every(s=>core(s).includes('Infiltrators')||root.unit==='Sisters Novitiate Squad'&&s.unit==='Ministorum Priest'&&s.id!==root.id);
}
function scouts(root:RosterInstance,members:readonly RosterInstance[],embarked=false):boolean{
 return members.every(s=>core(s).includes('Scouts 6″')||core(s).includes('Scouts 6"')||core(s).includes('Scouts 6')||
  s.id!==root.id&&s.unit==='Ministorum Priest'&&['Dominion Squad','Sanctifiers'].includes(root.unit)||
  embarked&&root.unit==='Dominion Squad'&&s.id!==root.id&&core(s).includes('Leader'));
}

export function sororitasProfileReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Adepta Sororitas')return [];
 const result:GeneratedReminder[]=[],legal=new Set(sororitasMusterUnits(army));
 const groups=sororitasFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 for(const squad of roster){
  const card=SORORITAS_CARDS[squad.unit];if(!card||!legal.has(squad.unit))continue;
  const group=groups.find(g=>g.root.id===squad.id),formation=groups.find(g=>g.members.some(s=>s.id===squad.id));
  if(!formation)continue;
  const tags=sororitasKeywords(army,squad),reactions=sororitasReactionShooting(army,squad,roster);
  function emit(title:string,[window,turn,timing]:ProfileStage,summary:string,units=[squad.id]){
   result.push({id:['11e-sororitas-profile',squad.id,title,window,turn,timing].join(':'),title:squad.id+' · '+title,window,turn,timing,summary,units,origin:'unit',source:card.source});
  }
  printCombatProfiles(squad,card,tags.has('TITANIC'),sororitasWeaponCount,(title,stage,summary,units)=>{
   if(title==='Ranged weapon profiles'||title==='Melee weapon profiles')summary=(stage[0]==='Movement'?'When firing Overwatch, use snap shooting. ':'')+fullWeapons(squad,card,title==='Melee weapon profiles'?'Fight':'Shooting',stage[0]==='Movement');
   emit(title,stage,summary,units);
  });
  if(reactions.length&&card.weapons.some(w=>w.phase==='Shooting'&&sororitasWeaponCount(squad,w.name)>0)){
   const ordinal=new Map<string,number>();
   const inventory=sororitasModelLoadouts(squad).map(m=>{
    const n=(ordinal.get(m.model)??0)+1;ordinal.set(m.model,n);
    const count=(_s:RosterInstance,name:string)=>m.items.filter(item=>weaponKey(item)===weaponKey(name)).length;
    return m.model+' '+n+' — '+(fullWeapons(squad,card,'Shooting',false,count)||'no ranged weapons.');
   });
   emit('Reaction shooting · equipped models',['Shooting','opponent','during'],
    'Only through '+reactions.join('; or ')+'. Use the actual surviving models’ equipment. For a split passenger, use only the models allocated to the disembarking half; a listed bearer in the other half grants nothing to these shots. Per-model ranged inventory: '+inventory.join(' '));
   if(card.damage)emit('Damaged · reaction shooting',['Shooting','opponent','during'],'Only while making the permitted normal reaction shots above, if this model has 1–'+card.damage.threshold+' wounds remaining, subtract 1 from its Hit rolls.');
  }
  if(card.specialDamage){
   const stages:ProfileStage[]=[['Shooting','own','during'],['Movement','opponent','end'],['Fight','either','during']];
   if(reactions.length)stages.push(['Shooting','opponent','during']);
   for(const stage of stages)emit('Damaged · weapon Attacks',stage,'While the Triumph itself has 1–6 wounds remaining, halve the Attacks characteristics of all its weapons. Its printed bolt pistols become 3 Attacks and relic weapons become 9 Attacks before other modifiers. Apply this to the Triumph’s own model.');
  }
  if(group){
   const ids=group.members.map(s=>s.id),scout=scouts(group.root,group.members);
   printFormationDeployment(ids,sororitasFormationHasDeepStrike(group.members),scout?6:0,infiltrators(group.root,group.members),emit);
   if(group.root.unit==='Dominion Squad'&&!scout&&scouts(group.root,group.members,true)){
    const carriers=roster.filter(s=>sororitasCargoFormations(army,s,roster).some(g=>g.root.id===group.root.id));
    if(carriers.length)emit('Holy Vanguard · conditional Scouts 6″',['Pre-battle','either','during'],
     'Only if this Dominion formation starts embarked in '+carriers.map(s=>s.id).join(' or ')+': its attached Leader gains Scouts 6″ during Declare Battle Formations. Every model aboard must have Scouts for the Dedicated Transport to make a scout move. The formation must fit and actually start aboard. Support models need their own Scouts ability.',ids);
   }
   if(group.root.unit==='Dominion Squad'&&!scout){
    const split=roster.filter(s=>sororitasSplitCargoFormations(army,s,roster).some(g=>g.root.id===group.root.id));
    if(split.length)emit('Holy Vanguard · split Scouts 6″',['Pre-battle','either','during'],
     'If this Dominion squad is split for '+split.map(s=>s.id).join(' or ')+', an attached Leader allocated to a half that starts embarked gains Scouts 6″ through Holy Vanguard. Check each resulting half separately: every model in a half must have Scouts, and a Support without its own Scouts blocks its half. No ability is granted to an attached model placed in the other, unembarked half.',ids);
   }
   if(group.members.every(s=>core(s).includes('Lone Operative')))for(const stage of [['Shooting','opponent','during'],['Movement','own','end'],['Shooting','own','during']] as const)
    emit('Lone Operative',stage,'Every model in this formation has Lone Operative. Enemy models more than 12″ away cannot see this unit or target it with Indirect Fire.',ids);
   if(group.members.some(s=>core(s).includes('Fights First')))emit('Fights First',['Fight','either','start'],'This formation has Fights First. It fights in the Fights First step; use the normal alternation and eligibility rules.',ids);
  }
  const deck=Number(core(squad).find(a=>a.startsWith('Firing Deck '))?.slice('Firing Deck '.length)??0);
  if(tags.has('DEDICATED TRANSPORT')){
   const whole=sororitasCargoFormations(army,squad,roster).filter(g=>scouts(g.root,g.members,true));
   const split=sororitasSplitCargoFormations(army,squad,roster).filter(g=>g.root.unit==='Dominion Squad');
   if(whole.length||split.length)emit('Scouts 6″ · passengers',['Pre-battle','either','during'],
    'During Resolve Pre-battle Abilities, this Dedicated Transport may make a scout move of up to 6″ only if it is wholly within your deployment zone and every actual embarked model has Scouts. Finish more than 8″ horizontally from enemies. Eligible whole formations: '+(whole.map(g=>g.root.id).join(', ')||'none')+'.'+(split.length?' A declared half of '+split.map(g=>g.root.id).join(', ')+' may also qualify, but only if every model assigned to that embarked half has Scouts; Holy Vanguard can grant it to its attached Leader, not a Support.':''),[squad.id,...whole.flatMap(g=>g.members.map(s=>s.id)),...split.flatMap(g=>g.members.map(s=>s.id))]);
  }
  if(deck){
   const passengers=sororitasCargoFormations(army,squad,roster);
   printFiringDeck(squad,deck,passengers,allCards,models,(title,stage,summary,units)=>emit(title,stage,summary+(roster.some(s=>s.unit==='Immolator')?' If a passenger squad was split for an Immolator, use only physical models in the half actually embarked in this Rhino.':''),units));
   const splits=[...new Map(roster.flatMap(transport=>sororitasSplitCargoFormations(army,transport,roster).map(g=>[g.root.id,{...g,transport}] as const))).values()]
    .filter(g=>!passengers.some(p=>p.root.id===g.root.id)&&g.halves.some(n=>n<=12));
   const choices=splits.map(g=>({g,inventory:g.members.flatMap(passengerInventory)})).filter(g=>g.inventory.length);
   if(choices.length)emit('Firing Deck '+deck+' · split passengers',['Shooting','own','during'],
    'Only if a squad was split for an actual Immolator and its other declared half is embarked in this Rhino: when selected to shoot, choose up to '+deck+' surviving models actually allocated to that embarked half, whose units have not been selected to shoot this phase. Choose one ranged weapon other than One Shot per selected model. The Rhino has those weapons until it finishes attacking; all units aboard are ineligible to shoot for the rest of this turn. Never use a model or ability bearer assigned to the other half. Split options and physical weapon inventory: '+choices.map(({g,inventory})=>g.root.id+' split '+g.halves.join(' + ')+' for '+g.transport.id+'; '+inventory.join('. ')).join('; ')+'.',[squad.id,...choices.flatMap(({g})=>g.members.map(s=>s.id))]);
  }
 }
 return result;
}
