import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import type {RosterInstance} from './roster-instances';
import {DG_CARDS} from './dg-profiles.generated';
import {deathGuardKeywords,deathGuardMusterUnits} from './death-guard-data';
import {deathGuardModelLoadouts,deathGuardWeaponCount} from './death-guard-loadouts';
import {deathGuardCargoFormations,deathGuardFormations} from './death-guard-transports';
import {printCombatProfiles,printFiringDeck,printFormationDeployment,type ProfileStage} from './faction-card-profiles';

export function dgProfileReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Death Guard')return [];
 const allowed=new Set(deathGuardMusterUnits(army)),native=roster.filter(s=>allowed.has(s.unit)&&Object.hasOwn(DG_CARDS,s.unit));
 const formations=new Map(deathGuardFormations(army,roster).map(g=>[g.root.id,g]));
 const reinforcements:RosterInstance={unit:'Poxwalkers',id:'Poxwalkers (Numberless Horde reinforcements)',models:10};
 if(army.detachments2026?.includes('Shamblerot Vectorium'))native.push(reinforcements);
 const result:GeneratedReminder[]=[];
 for(const squad of native){
  const card=DG_CARDS[squad.unit],group=formations.get(squad.id);
  function emit(title:string,[window,turn,timing]:ProfileStage,summary:string,units=[squad.id]){
   const condition=squad===reinforcements?'For a new ten-model Poxwalkers unit after Numberless Horde adds it to your army and it arrives from Strategic Reserves. ':'';
   result.push({id:['11e-dg-profile',squad.id,title,window,turn].join(':'),title:squad.id+' · '+title,window,turn,timing,summary:condition+summary,units,origin:'unit',source:card.source});
  }
  printCombatProfiles(squad,card,deathGuardKeywords(army,squad).has('TITANIC'),deathGuardWeaponCount,emit);
  if(group){
   const ids=group.members.map(s=>s.id),all=(ability:string)=>group.members.every(s=>DG_CARDS[s.unit]?.core?.includes(ability));
   printFormationDeployment(ids,all('Deep Strike'),all('Scouts 6"')?6:0,all('Infiltrators'),(title,stage,summary,units)=>{
    // Death Approaches supplies the complete own-phase ingress cue, including
    // the separate minimum distances from Afflicted and other enemies.
    if(group.root.unit==='Deathshroud Terminators'&&title==='Deep Strike'&&stage[0]==='Movement')return;
    emit(title,stage,summary,units);
   });
  }
  const deck=Number(card.core?.find(c=>c.startsWith('Firing Deck '))?.match(/\d+/)?.[0]);
  if(deck)printFiringDeck(squad,deck,deathGuardCargoFormations(army,squad,roster),DG_CARDS,deathGuardModelLoadouts,emit);
 }
 return result;
}
