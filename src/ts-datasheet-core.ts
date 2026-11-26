import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import type {RosterInstance} from './roster-instances';
import {printCombatProfiles,printFiringDeck,printFormationDeployment,type ProfileStage} from './faction-card-profiles';
import {TS_CARDS,HORROR_SPLIT_PROFILES} from './ts-profiles.generated';
import {thousandSonsWeaponCount,thousandSonsModelLoadouts} from './thousand-sons-loadouts';
import {thousandSonsKeywords,thousandSonsMusterUnits} from './thousand-sons-data';
import {eligibleThousandSonsUpgrades} from './thousand-sons-detachment-data';
import {thousandSonsFormations,thousandSonsCargoFormations} from './thousand-sons-transports';

const weaponKey=(s:string)=>s.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
interface EquippedPsychicWeapon {model:string;name:string;phase:'Shooting'|'Fight';abilities:readonly string[];count:number}
export function thousandSonsPsychicWeapons(army:ArmySelection,squad:RosterInstance):EquippedPsychicWeapon[]{
 const card=TS_CARDS[squad.unit];
 if(!card||!thousandSonsMusterUnits(army).includes(squad.unit))return [];
 const psychic=card.weapons.filter(w=>w.abilities.some(a=>a.toLowerCase()==='psychic'));
 const selected=new Map<string,EquippedPsychicWeapon>();
 for(const {model,items} of thousandSonsModelLoadouts(squad)){
  if(!thousandSonsKeywords(army,squad,model).has('PSYKER'))continue;
  for(const w of psychic){
   const count=items.filter(item=>weaponKey(item)===weaponKey(w.name)).length;
   if(!count)continue;
   const key=[model,w.phase,w.name].join('|'),previous=selected.get(key);
   if(previous)previous.count+=count;else selected.set(key,{model,name:w.name,phase:w.phase,abilities:w.abilities,count});
  }
 }
 return [...selected.values()];
}
function scouts(army:ArmySelection,members:readonly RosterInstance[]):number{
 return Math.min(...members.map(s=>{
  const printed=TS_CARDS[s.unit]?.core?.find(c=>c.startsWith('Scouts '));
  if(printed)return Number(printed.match(/\d+/)?.[0]);
  const upgrade=army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
  return upgrade==='Bray Lord'&&eligibleThousandSonsUpgrades(army,s.unit,s.id).some(u=>u.name===upgrade)?6:0;
 }));
}

export function tsProfileReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Thousand Sons')return [];
 const allowed=new Set(thousandSonsMusterUnits(army)),native=roster.filter(s=>allowed.has(s.unit)&&Object.hasOwn(TS_CARDS,s.unit));
 const formations=new Map(thousandSonsFormations(army,roster).map(g=>[g.root.id,g]));
 const result:GeneratedReminder[]=[];
 for(const squad of native){
  const card=TS_CARDS[squad.unit],group=formations.get(squad.id),tags=thousandSonsKeywords(army,squad);
  function emit(title:string,[window,turn,timing]:ProfileStage,summary:string,units=[squad.id]){
   result.push({id:['11e-ts-profile',squad.id,title,window,turn].join(':'),title:squad.id+' · '+title,window,turn,timing,summary,units,origin:'unit',source:card.source});
  }
  printCombatProfiles(squad,card,tags.has('TITANIC'),thousandSonsWeaponCount,emit);
  if(group){
   const ids=group.members.map(s=>s.id),all=(ability:string)=>group.members.every(s=>TS_CARDS[s.unit]?.core?.includes(ability));
   printFormationDeployment(ids,all('Deep Strike'),scouts(army,group.members),all('Infiltrators'),emit);
   if(all('Stealth'))for(const stage of [['Shooting','opponent','during'],['Movement','own','end'],['Shooting','own','during']] as const)emit('Stealth',stage,'While every model in this formation has Stealth, ranged attacks targeting it give its models the Benefit of Cover.',ids);
  }
  if(squad.unit==='Pink Horrors'||squad.unit==='Blue Horrors'){
   const profiles=HORROR_SPLIT_PROFILES[squad.unit];
   for(const stage of [['Shooting','own','during'],['Movement','opponent','end'],['Fight','either','during']] as const){
    const melee=stage[0]==='Fight',snap=stage[0]==='Movement';
    const weapons=profiles.filter(w=>w.phase===(melee?'Fight':'Shooting')).map(w=>{
     const skill=melee?'WS '+w.skill+'+':snap?'snap shooting, unmodified 6 to hit':'BS '+w.skill+'+';
     return w.model+' — '+w.name+' ('+(melee?'':w.range+'″, ')+w.attacks+(w.attacks===1?' attack, ':' attacks, ')+skill+', S'+w.strength+', AP '+w.ap+', D'+w.damage+(melee?'':', Pistol, Psychic')+')';
    });
    emit('Split models · weapons',stage,'Only for models actually added by Split and still in this unit. Use one profile per replacement model: '+weapons.join('. ')+'.');
   }
  }
  const deck=Number(card.core?.find(c=>c.startsWith('Firing Deck '))?.match(/\d+/)?.[0]);
  if(!deck)continue;
  const cargo=thousandSonsCargoFormations(army,squad,roster);
  printFiringDeck(squad,deck,cargo,TS_CARDS,thousandSonsModelLoadouts,emit);
  if(!tags.has('DEDICATED TRANSPORT'))continue;
  const candidates=cargo.map(g=>({g,range:scouts(army,g.members)})).filter(x=>x.range>0);
  if(candidates.length)emit('Scouts · Dedicated Transport',['Pre-battle','either','during'],'During Resolve Pre-battle Abilities, if wholly in your deployment zone and every embarked model has Scouts, this transport may scout up to the shortest embarked Scouts distance and finish more than 8″ horizontally from all enemies. Eligible passengers include '+candidates.map(({g,range})=>g.root.id+' ('+range+'″)').join(', ')+'.',[squad.id,...candidates.flatMap(({g})=>g.members.map(s=>s.id))]);
 }
 return result;
}
