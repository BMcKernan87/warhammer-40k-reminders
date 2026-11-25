import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import type {RosterInstance} from './roster-instances';

export interface ArmyFormation {id:string; body:RosterInstance; members:RosterInstance[]}
const source='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';
export function coreStratagemReminders(roots:ArmyFormation[], keywords:(unit:string)=>readonly string[], hasGun:(s:RosterInstance)=>boolean, modelRestrictions:(unit:string,keyword:string)=>readonly string[]):GeneratedReminder[]{
 const withKeyword=(formation:ArmyFormation,keyword:string)=>formation.members.some(s=>keywords(s.unit).includes(keyword));
 const eligible=(predicate:(f:ArmyFormation)=>boolean)=>roots.filter(predicate).map(f=>f.id);
 const all=roots.map(f=>f.id);
 const characters=eligible(f=>withKeyword(f,'CHARACTER'));
 const characterRestrictions=roots.flatMap(f=>f.members.flatMap(s=>{
  const names=modelRestrictions(s.unit,'CHARACTER');
  return names.length?[s.id+' qualifies through '+names.join(', ')+' while that model survives.']:[];
 })).join(' ');
 const canCharge=(f:ArmyFormation)=>!withKeyword(f,'AIRCRAFT')&&!withKeyword(f,'FORTIFICATION');
 const vehicleMonster=eligible(f=>canCharge(f)&&(withKeyword(f,'VEHICLE')||withKeyword(f,'MONSTER')));
 const heroic=eligible(f=>canCharge(f)&&(!withKeyword(f,'VEHICLE')||withKeyword(f,'CHARACTER')||withKeyword(f,'WALKER')));
 const ingress=eligible(f=>!withKeyword(f,'AIRCRAFT')&&!withKeyword(f,'FORTIFICATION'));
 const overwatch=eligible(f=>!withKeyword(f,'TITANIC')&&f.members.some(hasGun));
 const out:GeneratedReminder[]=[];
 const emit=(id:string,title:string,window:ReminderWindow,summary:string,units:string[],timing:GeneratedReminder['timing']='during')=>{
  if(units.length)out.push({id:'11e-core-'+id,title,window,timing,summary,units,source,origin:'army'});
 };
 // Core 15.01: use conditions remain prospective; no invented battlefield state.
 for(const window of ['Command','Movement','Shooting','Charge','Fight'] as const){
  emit('stratagem-limits-'+window,'Core Stratagem restrictions',window,'Do not target battle-shocked units. Normally a Stratagem can be used once per phase and a unit can be targeted by only one Stratagem per phase; apply explicit exceptions.',all);
  emit('command-reroll-'+window,'Command Re-roll · 1CP',window,'After an eligible Advance, Charge, Damage, Hazard, Hit, Save, Wound or weapon attack-count roll, re-roll one die (all dice for a Charge roll). Never re-roll a die twice. Battle-shock rolls are ineligible.',all);
 }
 emit('insane-bravery','Insane Bravery · 1CP','Command','Before rolling battle-shock in your Command phase, automatically pass the test for a unit that is not already battle-shocked. Once per battle.',all);
 emit('rapid-ingress','Rapid Ingress · 1CP','Movement','End of the opposing Movement phase: an eligible non-Aircraft unit in Strategic Reserves makes an ingress move. Not in battle round one.',ingress,'end');
 emit('overwatch','Fire Overwatch · 1CP','Movement','End of opponent’s Movement phase: select an unengaged non-Titanic unit. Snap shoot one visible legal enemy within 24″. Normally only unmodified 6s hit; these are not critical hits. Hit rolls cannot be re-rolled. Follow specific threshold exceptions. The firing unit cannot start an action for the remainder of the phase. No Charge-phase Fire Overwatch.',overwatch,'end');
 emit('crushing-impact','Crushing Impact · 1CP','Charge','After your Monster or Vehicle charges, pick an engaged enemy and one engaged friendly model. Roll dice equal to that model’s Toughness: each 1 deals your unit a mortal wound; each 5+ deals the enemy one. Maximum six mortal wounds to either unit.',vehicleMonster);
 emit('heroic-intervention','Heroic Intervention · 1CP (+1CP option)','Charge','At the end of the enemy Charge phase, an unengaged eligible unit within 12″ may charge. Leap to Defend targets enemies that charged this phase. Spend 1 additional CP for Into the Fray: target any eligible enemy within 6″ and cap the modified charge roll at 6. Vehicles qualify only if Character or Walker.',heroic,'end');
 emit('epic-challenge','Epic Challenge · 1CP','Fight','Just after choosing a Character unit to fight, choose one Character model in it; that model’s melee weapons gain Precision for this phase.'+(characterRestrictions?' '+characterRestrictions:''),characters);
 emit('counteroffensive','Counteroffensive · 2CP','Fight','In the opposing Fight step, after an enemy unit resolves attacks, choose a friendly unit eligible to fight. It gains Fights First for the phase and must be your next unit selected to fight.',all);
 emit('smokescreen','Smokescreen · 1CP','Shooting','At the start of the opponent’s Shooting phase, select a Smoke unit. It gains cover this phase. A target gains cover against an attacker if models in the Smoke unit prevent that target from being fully visible to the attacker.',eligible(f=>withKeyword(f,'SMOKE')),'start');
 emit('explosives','Explosives · 1CP','Shooting','In your Shooting phase choose a friendly unengaged unit eligible to shoot that did not Advance this turn. Choose an Explosives or Grenades model in it and a visible unengaged enemy within 8″ of that model. Roll six dice. Each 4+ inflicts one mortal wound on that enemy.',eligible(f=>withKeyword(f,'EXPLOSIVES')||withKeyword(f,'GRENADES')));
 return out;
}
