import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import type {RosterInstance} from './roster-instances';
import {necronFormationRoots} from './necron-retinues';
import {CHARACTERS} from './necron-muster-legality';
import {necronKeywords as k} from './necron-wargear';

const source='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';
const walkers=new Set(['Canoptek Doomstalker','Canoptek Reanimator','Triarch Stalker','Seraptek Heavy Construct']);
const aircraft=new Set(['Doom Scythe']);
export function necronCoreStratagemReminders(army:ArmySelection,roster:RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Necrons')return [];
 const roots=necronFormationRoots(army,roster);
 const match=(test:(unit:string)=>boolean)=>roots.filter(f=>f.members.some(s=>test(s.unit))).map(f=>f.id);
 const all=roots.map(f=>f.id),characters=match(u=>CHARACTERS.has(u));
 const vehicleMonster=match(u=>k.VEHICLE.has(u)||k.MONSTER.has(u));
 const heroic=roots.filter(f=>!f.members.some(s=>k.VEHICLE.has(s.unit))||f.members.some(s=>CHARACTERS.has(s.unit)||walkers.has(s.unit))).map(f=>f.id);
 const ingress=roots.filter(f=>!f.members.some(s=>aircraft.has(s.unit)||s.unit==='Convergence Of Dominion')).map(f=>f.id);
 const overwatch=roots.filter(f=>!f.members.some(s=>k.TITANIC.has(s.unit))).map(f=>f.id);
 const out:GeneratedReminder[]=[];
 const emit=(id:string,title:string,window:ReminderWindow,summary:string,units:string[],timing:GeneratedReminder['timing']='during')=>{
  if(units.length)out.push({id:'11e-core-'+id,title,window,timing,summary,units,source,origin:'army'});
 };
 // Core 15.01: use conditions remain prospective; no invented battlefield state.
 for(const window of ['Command','Movement','Shooting','Charge','Fight'] as const){
  emit('stratagem-limits-'+window,'Core Stratagem restrictions',window,'Do not target battle-shocked units. Normally each Stratagem and each targeted unit may be used once per phase; apply explicit exceptions.',all);
  emit('command-reroll-'+window,'Command Re-roll · 1CP',window,'After an eligible Advance, Charge, Damage, Hazard, Hit, Save, Wound or weapon attack-count roll, re-roll one die (all dice for a Charge roll). Never re-roll a die twice. Not for Reanimation or battle-shock rolls.',all);
 }
 emit('insane-bravery','Insane Bravery · 1CP','Command','Before rolling battle-shock in your Command phase, automatically pass the test for a unit that is not already battle-shocked. Once per battle.',all);
 emit('rapid-ingress','Rapid Ingress · 1CP','Movement','End of the opposing Movement phase: an eligible non-Aircraft unit in Strategic Reserves makes an ingress move. Not in battle round one.',ingress,'end');
 emit('overwatch','Fire Overwatch · 1CP','Movement','End of opponent’s Movement phase: select an unengaged non-Titanic unit. Snap shoot one visible legal enemy within 24″. Normally only unmodified 6s hit; no critical hits or Hit re-rolls. Follow specific threshold exceptions. The firing unit cannot start an action for the remainder of the phase. No Charge-phase Fire Overwatch.',overwatch,'end');
 emit('crushing-impact','Crushing Impact · 1CP','Charge','After your Monster or Vehicle charges, pick an engaged enemy and one engaged friendly model. Roll dice equal to that model’s Toughness: each 1 deals your unit a mortal wound; each 5+ deals the enemy one. Maximum six mortal wounds to either unit.',vehicleMonster);
 emit('heroic-intervention','Heroic Intervention · 1CP (+1CP option)','Charge','At the end of the enemy Charge phase, an unengaged eligible unit within 12″ may charge. Leap to Defend targets enemies that charged this phase. Spend 1 additional CP for Into the Fray: target any eligible enemy within 6″ and cap the modified charge roll at 6. Vehicles qualify only if Character or Walker.',heroic,'end');
 emit('epic-challenge','Epic Challenge · 1CP','Fight','Just after choosing a Character unit to fight, choose one Character model in it; that model’s melee weapons gain Precision for this phase.',characters);
 emit('counteroffensive','Counteroffensive · 2CP','Fight','In the opposing Fight step, after an enemy unit resolves attacks, choose a friendly unit eligible to fight. It gains Fights First for the phase and must be your next unit selected to fight.',all);
 // No current matched-play Necron datasheets have SMOKE or EXPLOSIVES/GRENADES.
 return out;
}
