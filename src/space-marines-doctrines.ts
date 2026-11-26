import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {SM_CARDS} from './space-marines-loadouts';
import {spaceMarineHasDetachment} from './space-marines-muster-data';
import {spaceMarineFormations} from './space-marines-formations';
import {spaceMarineKeywords} from './space-marines-keywords';
import {resolvedSpaceMarineWarlord} from './space-marines-muster';
import {expandRoster,type RosterInstance} from './roster-instances';

export const SPACE_MARINE_DOCTRINE_EFFECTS={
 Assault:'When selected to Advance while Assault Doctrine is active, that Advance move does not prevent this unit from declaring a charge.',
 Devastator:'This unit’s ranged attacks have Assault, allowing it to shoot after Advancing.',
 Tactical:'When selected to Fall Back while Tactical Doctrine is active, that Fall Back move does not prevent this unit from shooting or declaring a charge.',
} as const;
const source='https://wahapedia.ru/wh40k11ed/factions/space-marines/';
export function spaceMarineDoctrineAllowance(army:ArmySelection){
 const allowance={Assault:1,Devastator:1,Tactical:1},choices:string[]=[];
 for(const doctrine of ['Assault','Devastator','Tactical'] as const)if(spaceMarineHasDetachment(army,doctrine+' Brethren'))allowance[doctrine]++;
 if(spaceMarineHasDetachment(army,'Forgefather’s Seekers'))allowance.Devastator++;
 if(spaceMarineHasDetachment(army,'Blade of Ultramar')&&(army.units['Marneus Calgar']??0)>0)for(const key of ['Assault','Devastator','Tactical'] as const)allowance[key]++;
 if(spaceMarineHasDetachment(army,'Gladius Task Force'))choices.push('Gladius Task Force: select one doctrine one additional time per battle');
 if(spaceMarineHasDetachment(army,'Spearpoint Task Force'))choices.push('Spearpoint Task Force: select either Assault or Tactical one additional time per battle');
 return {allowance,choices};
}
export function spaceMarineDoctrineReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Space Marines')return [];
 const rows:GeneratedReminder[]=[],formations=spaceMarineFormations(army,roster);
 const eligible=formations.filter(g=>g.members.some(s=>SM_CARDS[s.unit]?.factionAbilities.includes('Combat Doctrines'))),units=eligible.flatMap(g=>g.members.map(s=>s.id));
 if(units.length){
  const {allowance,choices}=spaceMarineDoctrineAllowance(army),counts=Object.entries(allowance).map(([doctrine,n])=>doctrine+' '+n).join('; ');
  rows.push({id:'11e-sm-combat-doctrines',title:'Combat Doctrines · choose a doctrine',window:'Command',turn:'own',timing:'start',origin:'army',units,source,summary:'At the start of your Command phase, you may select one Combat Doctrine. It is active for friendly Adeptus Astartes units with Combat Doctrines until the start of your next Command phase. Per-battle selections: '+counts+'.'+(choices.length?' '+choices.join('. ')+'.':'')+' Only one doctrine is active for a unit unless a rule explicitly permits another; a new doctrine replaces the previous one. Unit-specific doctrine abilities do not spend an army-wide selection. '+Object.entries(SPACE_MARINE_DOCTRINE_EFFECTS).map(([name,effect])=>name+': '+effect).join(' ')});
  rows.push({id:'11e-sm-doctrine-movement',title:'Active Combat Doctrine · movement',window:'Movement',turn:'own',timing:'during',origin:'army',units,source,summary:'If the corresponding doctrine is active for this formation: '+SPACE_MARINE_DOCTRINE_EFFECTS.Assault+' '+SPACE_MARINE_DOCTRINE_EFFECTS.Tactical+' '+SPACE_MARINE_DOCTRINE_EFFECTS.Devastator+' Resolve the doctrine active when selecting the move; a later doctrine change does not undo permission already attached to that Advance or Fall Back move.'});
  rows.push({id:'11e-sm-doctrine-shooting',title:'Active Combat Doctrine · shooting',window:'Shooting',turn:'own',timing:'during',origin:'army',units,source,summary:'If Devastator Doctrine is active, ranged attacks have Assault and may be used after Advancing. If the formation selected its Fall Back move while Tactical Doctrine was active, that move does not prevent shooting. Doctrines otherwise follow their stated duration; the army-wide selection ends at the start of your next Command phase.'});
  rows.push({id:'11e-sm-doctrine-charge',title:'Active Combat Doctrine · charge eligibility',window:'Charge',turn:'own',timing:'during',origin:'army',units,source,summary:'An Advance selected while Assault Doctrine was active does not prevent declaring a charge. A Fall Back selected while Tactical Doctrine was active does not prevent declaring a charge. Other charge restrictions, including a disembarkation prohibition, still apply.'});
 }
 const warlord=resolvedSpaceMarineWarlord(army),liveWarlord=warlord&&roster.find(s=>s.id===warlord.id&&s.unit===warlord.unit);
 if(liveWarlord&&SM_CARDS[liveWarlord.unit]?.factionAbilities.includes('Transhuman Strategist'))rows.push({id:'11e-sm-transhuman-strategist-'+liveWarlord.id,title:liveWarlord.id+' · Transhuman Strategist',window:'Start of battle round',turn:'either',timing:'start',origin:'army',units:[liveWarlord.id],source:SM_CARDS[liveWarlord.unit].source,summary:'At the start of the battle round, if this model is your Warlord and its ability is available, gain 1CP. This is a single Warlord trigger, not one CP per Captain or other model with the ability. Embarked units cannot use abilities unless expressly permitted.'});
 const psykers=roster.filter(s=>SM_CARDS[s.unit]?.factionAbilities.includes('Librarius')&&spaceMarineKeywords(army,s,undefined,roster).has('PSYKER'));
 if(psykers.length)rows.push({id:'11e-sm-librarius-budget',title:'Librarius · psychic level budget',window:'Start of battle round',turn:'either',timing:'start',origin:'army',units:psykers.map(s=>s.id),source,summary:'Each Adeptus Astartes Psyker unit with Librarius has its own printed psyker level. Across this entire battle round, including the opponent’s turn, the total psychic levels of abilities that unit uses cannot exceed its psyker level. For example, level 3 permits three level-1 powers, one level-1 plus one level-2 power, or one level-3 power. Reset the budget for each new battle round; weapon attacks are not psychic ability activations.'});
 return rows;
}
