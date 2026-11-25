import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import type {KnightCardStats} from './knight-card-rules';
import {GUARD_CARDS} from './brood-brother-cards.generated';
import {gscAlliedMusterUnits,gscAlliedKeywords} from './gsc-allies';
import {gscTransportOptions} from './gsc-army-transports';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';
import {broodBrotherSpecialReminders} from './brood-brother-special';
import {broodBrotherProfileReminders} from './brood-brother-profiles';

export interface BroodBrotherCard {
 source:string;
 damage?:{threshold:number;oc:number;source:string};
 saves:readonly {model:string;save:number;restriction:string}[];
 core:readonly string[];
 named:readonly string[];
 weapons:KnightCardStats['weapons'];
}
type Stage=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const shooting:Stage=['Shooting','own','during'],fight:Stage=['Fight','either','during'],movement:Stage=['Movement','own','during'];
const overwatch:Stage=['Movement','opponent','end'],enemyShooting:Stage=['Shooting','opponent','during'],enemyOverwatch:Stage=['Movement','own','end'];
const battlePhases:Stage[]=['Command','Movement','Shooting','Charge','Fight'].map(p=>[p as ReminderWindow,'either','during']);
const defence=[enemyShooting,enemyOverwatch,fight],attacks=[shooting,overwatch,fight];
type Recipients='self'|'led'|'cargo'|'otherGuard'|'guard';
interface Rule {windows:readonly Stage[];text:string;recipients?:Recipients}
const effect=(windows:readonly Stage[],text:string,recipients?:Recipients):Rule=>({windows,text,recipients});

const rules:Readonly<Record<string,Rule>>={
 'Death Befitting An Officer':effect([enemyShooting],'If destroyed by enemy shooting, roll before resolving Deadly Demise. On 2+, leave the model in place. After the attacking unit shoots, it may use normal shooting against that unit only. Resolve its demise and remove it after firing or at phase end, whichever comes first.'),
 'Daring Recon':effect([['Shooting','own','start']],'Mark one visible enemy within 18″. Friendly Astra Militarum models re-roll Hit rolls of 1 against that target until the phase ends.','guard'),
 'Mobile Hunter-killers':effect(attacks,'Re-roll Wound rolls when attacking a Monster or Vehicle.'),
 'Rapid Deployment':effect([movement],'A unit aboard before this phase may make a shock disembark after this transport Advances. Set up wholly within 3″ and forgo charging this turn.','cargo'),
 'Flush Them Out':effect([shooting],'After firing, choose one enemy hit. It cannot receive cover until your next Shooting phase starts.'),
 'Earthshaker Rounds':effect([shooting],'After firing, enemy Infantry hit by the earthshaker cannon lose 2″ Move and subtract 2 from Charge rolls until your next Shooting phase starts.'),
 'Flak Battery':effect([shooting,fight],'Re-roll Hit rolls against units that can Fly.'),
 'Suppression Bombardment':effect([shooting],'After firing, choose a non-Monster, non-Vehicle enemy hit by the quad stormshard mortar. It subtracts 1 from Hit rolls until your next Shooting phase starts.'),
 'Furious Barrage':effect([shooting],'After firing, select a non-Monster, non-Vehicle enemy hit by storm eagle rockets. Its models lose 1 OC, minimum 1, until the start of your next Shooting phase.'),
 'Deathstrike Missile':effect([shooting],'If the missile has not fired this battle, when selected to shoot you can place its own target marker anywhere or move its existing marker. The launcher can still fire its other guns.'),
 'Plasma Warhead':effect([shooting],'Fire the missile once per battle in your Shooting phase if stationary, with an existing marker that you neither placed nor moved this phase. Resolve attacks separately for every unit within 6″ of its centre, including friendly units.'),
 'Armoured Spearhead':effect([shooting,fight],'Re-roll Hit rolls of 1. Against an enemy within range of an objective you do not control, you may re-roll the entire Hit roll instead.'),
 'Line-breaker':effect([shooting],'While engaged, ignore the ranged Hit penalty. The demolisher cannon may target an enemy engaged with this tank if no other friendly unit is engaged with that enemy.'),
 'Rolling Fortress':effect([enemyShooting,enemyOverwatch],'A friendly Astra Militarum model obscured by this Baneblade from at least one attacking model gains cover against the ranged attack.','otherGuard'),
 'Tremor Quake':effect([shooting],'When the tremor cannon declares its target, that unit and every other enemy Infantry unit within 3″ of it take Battle-shock tests.'),
 'Armour Obliteration':effect([shooting],'When the quake cannon destroys a model with Deadly Demise, its demise inflicts mortal wounds on 3+ instead of 6.'),
 'Close-range Titan Killer':effect([shooting],'For the magma cannon, count a Monster or Vehicle target as being within half range, regardless of the actual distance.'),
 'Close-quarters Warfare':effect([shooting],'Ignore the ranged Hit penalty for being engaged.'),
 'Titan-killer':effect([shooting],'The volcano cannon gains Devastating Wounds against Monsters and Vehicles.'),
 'Mount Up!':effect([overwatch],'If this transport is empty, choose one eligible unengaged Astra Militarum Infantry formation wholly within 6″. It may embark now. Artillery is excluded.','cargo'),
 'Concussive Wave':effect([shooting],'When declaring the siege cannon target, roll for that unit and each other unit within 3″. For each 5+, deal D3 mortal wounds to that unit after completing attacks against the original target.'),
 'Transport Support':effect([shooting],'After firing, choose an enemy hit. Models that disembarked from this transport this turn may re-roll Hit rolls against it for this phase.','cargo'),
 'Airborne Insertion':effect([overwatch],'At the end of the opponent’s Movement phase, any number of units currently aboard may disembark.','cargo'),
 'Malign Wardings(Psychic)':effect(defence,'While the Primaris Psyker leads this formation, its models have Feel No Pain 4+ against psychic attacks.','led'),
 'Psychic Barrier (Psychic)':effect([['Shooting','opponent','start']],'You may roll one D6. On 1 the Psyker’s formation suffers D3 mortal wounds. On 2+ its models gain a 4+ invulnerable save through this phase.'),
 'Senior Officer':effect([shooting],'While the Castellan leads this formation, its ranged weapons gain Sustained Hits 1.','led'),
 'Get Back in the Fight':effect([movement,shooting],'While the Castellan leads this formation, it can shoot in a turn in which it Fell Back.','led'),
 'Cadia Stands!':effect(battlePhases,'While an Officer remains in this unit and it is in range of an objective, re-roll its Battle-shock rolls.'),
 'Shock Troops':effect([['Command','own','end']],'An objective you control within range of this unit stays under your control until the opponent has greater Level of Control there at the end of a phase.'),
 'Jungle Fighters':effect([fight],'Add 1 to melee Wound rolls if the unit charged or was charged this turn.'),
 'Horsemasters':effect([movement,shooting,['Charge','own','during']],'Falling Back this turn leaves this unit eligible to shoot and charge.'),
 'Ablative Plating':effect(defence,'Once per battle, when allocating an attack to this model, change that attack’s Damage to 0.'),
 'Urban Warfare':effect([enemyShooting,enemyOverwatch],'While this tank has cover against a ranged attack, reduce its Damage by 1.'),
 'Gung-ho Executioners':effect([shooting],'Add 1 to Hit with the executioner plasma cannon against a unit below Half-strength.'),
 'Withering Hail':effect([shooting],'After firing, select an enemy hit by the exterminator autocannon. Friendly Astra Militarum attacks improve AP by 1 against it for the rest of the phase. Apply this effect to a given target only once per phase.','guard'),
 'Mow Down the Enemy':effect([shooting,overwatch],'Against a target with neither Monster nor Vehicle, the punisher gatling cannon gains Devastating Wounds.'),
 'Tank-killer':effect([shooting,overwatch],'Re-roll vanquisher battle cannon Wound rolls against Monsters and Vehicles.'),
 'Grim Determination':effect(battlePhases,'While an Officer remains in this unit, you may target the unit with Stratagems even when Battle-shocked.'),
 'Gung-ho Command':effect([movement,shooting],'While an Officer remains, this formation’s ranged weapons gain Assault. After advancing, use assault shooting if unengaged.'),
 'Called Shots':effect([shooting],'Each time this tank is selected to shoot, you may re-roll one Hit roll, one Wound roll and one Damage roll.'),
 'Grenadiers':effect([shooting],'Once per turn, use the Explosives Stratagem on this unit for 0 CP when its targeting requirements are met.'),
 'Bring it Down!':effect([shooting],'When firing at a Monster or Vehicle, re-roll Hit rolls of 1 and Wound rolls of 1.'),
 'Final Duty':effect(defence,'While the Fire Coordinator is on the battlefield, roll for each Heavy Weapons Gunner destroyed. On 3+, after the attacking unit finishes its attacks, the gunner can shoot before removal.'),
 'Remorseless Barrage':effect([shooting],'After firing, an enemy hit by an Indirect Fire weapon must test for Battle-shock. Infantry hit by the multiple rocket launcher subtract 1 from that test.'),
 'Screening Line':effect([['Movement','opponent','during']],'When an enemy ends a move within 8″, this unengaged unit can make a Normal move of up to 6″.'),
 'Convoy Escort Vehicle':effect([shooting],'After shooting, this unit may make a Normal move of up to D6″. Doing so prevents it from charging for the rest of this turn.'),
 'Rapid Strike Vehicle':effect(battlePhases,'While the Centaur has passengers and is not Battle-shocked, add 1 OC for each full three models aboard.','cargo'),
 'Demolition Charges':effect([['Movement','either','during'],['Charge','either','during'],fight],'Whenever this Cyclops or an enemy unit ends a move with one or more enemies within 3″ of the Cyclops, choose one of them and destroy the Cyclops. Replace its normal demise roll with one D6. On 2–5 that enemy suffers D3 mortal wounds, or D6 on 6.'),
 'Grim Demeanour':effect([shooting,fight],'If below Starting Strength add 1 to Hit. If below Half-strength also add 1 to Wound.'),
};

export function broodBrotherIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Genestealer Cults')return [];
 const eligible=new Set(gscAlliedMusterUnits(army));
 const guard=roster.filter(s=>eligible.has(s.unit)&&Object.hasOwn(GUARD_CARDS,s.unit));
 if(!guard.length)return [];
 const root=(s:RosterInstance)=>knightJoinedBodyguard(army,s)?.id??s.id;
 const guardRoots=[...new Set(guard.map(root))];
 const result:GeneratedReminder[]=[];
 const transports=new Map(gscTransportOptions(army,[...roster]).map(o=>[o.transport.id,o.passengers]));
 for(const s of guard){
  const card=GUARD_CARDS[s.unit],formation=root(s),led=knightJoinedBodyguard(army,s);
  const tags=gscAlliedKeywords(s);
  const emit=(title:string,window:Stage,summary:string,targets:string[]=[formation])=>{
   if(!targets.length)return;
   const [phase,turn,timing]=window;
   if(window===overwatch&&tags.has('TITANIC')&&title!=='Mount Up!')return;
   result.push({id:['11e-brood',s.id,title,phase,turn,timing].join('-'),title:s.unit+' · '+title,window:phase,turn,timing,
    source:card.source,origin:'unit',units:targets,summary});
  };
  for(const name of card.named){
   const rule=rules[name];
   if(!rule)continue;
   const targets=rule.recipients==='cargo'?transports.get(s.id)??[]:rule.recipients==='led'?(led?[led.id]:[]):
    rule.recipients==='guard'?guardRoots:rule.recipients==='otherGuard'?guardRoots.filter(id=>id!==formation):[formation];
   for(const stage of rule.windows)emit(name,stage,rule.text+(rule.recipients==='cargo'||rule.recipients==='guard'||rule.recipients==='otherGuard'?' Eligible formations: '+targets.join(', ')+'.':''),targets);
  }
  if(card.named.includes('Covering Fire')){
   const platoons=guard.filter(x=>gscAlliedKeywords(x).has('PLATOON')).map(root);
   emit('Covering Fire',overwatch,'When targeted with Fire Overwatch, use unmodified 5+ to hit.'+(platoons.length?' Improve to 4+ while within 6″ of a friendly Platoon unit. Qualifying formations: '+[...new Set(platoons)].join(', ')+'.':''));
  }
  if(card.named.includes('Bring it Down!'))emit('Bring it Down!',overwatch,'When snap shooting a Monster or Vehicle, re-roll Wound rolls of 1. Snap shots cannot re-roll Hit rolls.');
  if(card.named.includes('Called Shots'))emit('Called Shots',overwatch,'When selected to snap shoot, you may re-roll one Wound roll and one Damage roll.');
  if(card.named.includes('Grim Demeanour'))emit('Grim Demeanour',overwatch,'Below Half-strength, add 1 to Wound when snap shooting. Hit modifiers do not affect snap shots.');
 }
 return [...result,...broodBrotherSpecialReminders(army,roster),...broodBrotherProfileReminders(army,roster)];
}
