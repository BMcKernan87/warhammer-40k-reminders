import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import type {GeneratedReminder} from './generated-reminders';
import {EC_CARDS} from './ec-profiles.generated';
import {printCombatProfiles,printFiringDeck,printFormationDeployment,type ProfileStage} from './faction-card-profiles';
import {eligibleEmperorsChildrenUpgrades} from './emperors-children-detachment-data';
import {emperorsChildrenWeaponCount,emperorsChildrenModelLoadouts} from './emperors-children-loadouts';
import {emperorsChildrenKeywords,emperorsChildrenMusterUnits} from './emperors-children-data';
import {emperorsChildrenCargoFormations,emperorsChildrenFormations} from './emperors-children-transports';

function deploymentAbilities(army:ArmySelection,{root,members}:{root:RosterInstance;members:readonly RosterInstance[]}){
 const bodyTags=emperorsChildrenKeywords(army,root);
 const exultant=(s:RosterInstance)=>s.unit==='Lord Exultant'&&s.id!==root.id&&s.attachedTo===root.id&&bodyTags.has('BATTLELINE')&&bodyTags.has('EMPEROR’S CHILDREN');
 const deepStrike=members.every(s=>{
  if(EC_CARDS[s.unit]?.core?.includes('Deep Strike'))return true;
  const upgrade=army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
  return upgrade==='Cacophonic Accompaniment'&&eligibleEmperorsChildrenUpgrades(army,s.unit,s.id).some(u=>u.name===upgrade);
 });
 const scouts=Math.min(...members.map(s=>exultant(s)?6:Number(EC_CARDS[s.unit]?.core?.find(a=>a.startsWith('Scouts '))?.match(/\d+/)?.[0]??0)));
 const infiltrators=members.every(s=>exultant(s)||EC_CARDS[s.unit]?.core?.includes('Infiltrators'));
 return {deepStrike,scouts,infiltrators};
}

export function ecProfileReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Emperor’s Children')return [];
 const permitted=new Set(emperorsChildrenMusterUnits(army)),native=roster.filter(s=>permitted.has(s.unit)&&Object.hasOwn(EC_CARDS,s.unit));
 const formations=new Map(emperorsChildrenFormations(army,roster).map(g=>[g.root.id,g]));
 const result:GeneratedReminder[]=[];
 for(const squad of native){
  const card=EC_CARDS[squad.unit],tags=emperorsChildrenKeywords(army,squad),group=formations.get(squad.id);
  function emit(title:string,[window,turn,timing]:ProfileStage,summary:string,units=[squad.id]){
   result.push({id:['11e-ec-profile',squad.id,title,window,turn].join(':'),title:squad.id+' · '+title,window,turn,timing,source:card.source,origin:'unit',summary,units});
  }
  printCombatProfiles(squad,card,tags.has('TITANIC'),emperorsChildrenWeaponCount,emit);
  if(group){
   const {deepStrike,scouts,infiltrators}=deploymentAbilities(army,group);
   const ids=group.members.map(s=>s.id);
   printFormationDeployment(ids,deepStrike,scouts,infiltrators,emit);
   if(group.members.every(s=>EC_CARDS[s.unit]?.core?.includes('Fights First')))emit('Fights First',['Fight','either','during'],'When this entire formation has Fights First, resolve its combat during the Fights First step.',ids);
   if(group.members.length===1&&card.core?.includes('Lone Operative'))for(const stage of [['Shooting','opponent','during'],['Movement','own','end']] as const)emit('Lone Operative',stage,'Unless part of an attached unit, this unit is invisible to enemy models outside 12″ and their Indirect Fire weapons cannot target it.',ids);
  }
  const deck=Number(card.core?.find(c=>c.startsWith('Firing Deck '))?.match(/\d+/)?.[0]);
  if(!deck)continue;
  const cargo=emperorsChildrenCargoFormations(army,squad,roster);
  printFiringDeck(squad,deck,cargo,EC_CARDS,emperorsChildrenModelLoadouts,emit);
  if(!tags.has('DEDICATED TRANSPORT'))continue;
  const scouts=cargo.map(g=>({g,range:deploymentAbilities(army,g).scouts})).filter(entry=>entry.range>0);
  if(scouts.length)emit('Scouts · Dedicated Transport',['Pre-battle','either','during'],'During Resolve Pre-battle Abilities, if wholly in your deployment zone and every embarked model has Scouts, this transport may make a scout move up to the shortest embarked Scouts distance. Finish more than 8″ horizontally from every enemy unit. Eligible formations: '+scouts.map(({g,range})=>g.root.id+' ('+range+'″)').join(', ')+'.',[squad.id,...scouts.flatMap(({g})=>g.members.map(m=>m.id))]);
 }
 return result;
}
