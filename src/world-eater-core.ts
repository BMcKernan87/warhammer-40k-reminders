import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {printCombatProfiles,printFiringDeck,printFormationDeployment,type ProfileStage} from './faction-card-profiles';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterInstance} from './roster-instances';
import {WORLD_EATER_CARDS} from './world-eater-profiles.generated';
import {worldEaterModelLoadouts,worldEaterWeaponCount} from './world-eater-loadouts';
import {worldEatersKeywords,worldEatersMusterUnits} from './world-eaters-data';
import {eligibleWorldEatersUpgrades} from './world-eaters-detachment-data';
import {worldEatersCargoFormations} from './world-eaters-muster';

const has=(s:RosterInstance,ability:string)=>WORLD_EATER_CARDS[s.unit]?.core?.includes(ability)??false;
function carries(army:ArmySelection,s:RosterInstance,name:string):boolean{
 const upgrade=army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
 return upgrade===name&&eligibleWorldEatersUpgrades(army,s.unit,s.id).some(u=>u.name===name);
}
function lordOfTheEightbound(army:ArmySelection,s:RosterInstance):boolean{
 if(s.unit!=='Slaughterbound')return false;
 const body=knightJoinedBodyguard(army,s);
 return !!body&&worldEatersKeywords(army,body).has('POSSESSED')&&worldEatersKeywords(army,body).has('WORLD EATERS');
}
export function worldEaterFormationHasDeepStrike(army:ArmySelection,members:readonly RosterInstance[]):boolean{
 if(!members.length||army.faction!=='World Eaters')return false;
 const legal=worldEatersMusterUnits(army);
 if(!members.every(s=>legal.includes(s.unit)&&WORLD_EATER_CARDS[s.unit]))return false;
 const invocatus=members.find(s=>s.unit==='Lord Invocatus');
 const led=invocatus&&knightJoinedBodyguard(army,invocatus);
 if(led&&members.some(s=>s.id===led.id))return true;
 return members.every(s=>has(s,'Deep Strike')||lordOfTheEightbound(army,s)||carries(army,s,'Disciple of Khorne'));
}
function scoutRange(army:ArmySelection,members:readonly RosterInstance[]):number{
 return Math.min(...members.map(s=>lordOfTheEightbound(army,s)?6:Number(WORLD_EATER_CARDS[s.unit]?.core?.find(c=>c.startsWith('Scouts '))?.match(/\d+/)?.[0]??0)));
}
export function worldEaterProfileReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='World Eaters')return [];
 const legal=new Set(worldEatersMusterUnits(army)),native=roster.filter(s=>legal.has(s.unit)&&Object.hasOwn(WORLD_EATER_CARDS,s.unit));
 const parent=new Map(native.map(s=>[s.id,knightJoinedBodyguard(army,s)?.id]));
 const result:GeneratedReminder[]=[];
 for(const squad of native){
  const stats=WORLD_EATER_CARDS[squad.unit],tags=worldEatersKeywords(army,squad);
  function emit(title:string,[window,turn,timing]:ProfileStage,summary:string,units=[squad.id]){
   result.push({id:['11e-world-eater-core',squad.id,title,window,turn].join(':'),title:squad.id+' · '+title,window,turn,timing,summary,units,origin:'unit',source:stats.source});
  }
  printCombatProfiles(squad,stats,tags.has('TITANIC'),worldEaterWeaponCount,emit);
  if(!parent.get(squad.id)){
   const members=[squad,...native.filter(s=>parent.get(s.id)===squad.id)],ids=members.map(s=>s.id);
   const infiltrators=members.every(s=>has(s,'Infiltrators')||carries(army,s,'Butcher Lord'));
   printFormationDeployment(ids,worldEaterFormationHasDeepStrike(army,members),scoutRange(army,members),infiltrators,emit);
  }
  const deck=Number(stats.core?.find(c=>c.startsWith('Firing Deck '))?.match(/\d+/)?.[0]);
  if(!deck)continue;
  const passengers=worldEatersCargoFormations(army,squad,roster);
  printFiringDeck(squad,deck,passengers,WORLD_EATER_CARDS,worldEaterModelLoadouts,emit);
 }
 return result;
}
