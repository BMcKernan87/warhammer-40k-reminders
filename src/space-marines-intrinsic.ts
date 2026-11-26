import {spaceMarineDoctrineText} from './space-marines-doctrines';
import {spaceMarineCards} from './space-marines-card-data';
import {isSpaceMarineFaction} from './space-marines-factions';
import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';

import {SM_INTRINSIC_INVENTORY as SM_INTRINSIC} from './space-marines-intrinsic.generated';
import {spaceMarineModelLoadouts,spaceMarineWeaponCount} from './space-marines-loadouts';
import {spaceMarineMusterUnits} from './space-marines-muster-data';
import {spaceMarineKeywords} from './space-marines-keywords';
import {spaceMarineFormations} from './space-marines-formations';
import {expandRoster,type RosterInstance} from './roster-instances';

type Step=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const shoot:Step=['Shooting','own','during'],fight:Step=['Fight','either','during'],move:Step=['Movement','own','during'],command:Step=['Command','own','during'],pre:Step=['Pre-battle','either','during'];
const snap:Step=['Movement','opponent','end'],enemyShooting:Step=['Shooting','opponent','during'],enemySnap:Step=['Movement','own','end'];
const ranged:readonly Step[]=[shoot,snap,enemyShooting],defence:readonly Step[]=[enemyShooting,enemySnap,shoot,fight];
const eachPhase=PHASES.map((p):Step=>[p,'either','during']),endPhase=PHASES.map((p):Step=>[p,'either','end']);
const sourceExpiry=' The original ability source must survive. If its last source model is destroyed by an attack, keep the benefit until that attacking unit finishes its attacks.';
const persistent=' This already applied effect keeps its duration if its original source is destroyed or leaves the battlefield.';
const psychicRoll='Only if this formation is not Battle-shocked and this model has enough of its Librarius budget: roll one D6. On 1 the formation becomes Battle-shocked; the following effect still applies. ';
const unitHealing=' Resolve one wound at a time: first heal a surviving wounded model; if all surviving models have full wounds, revive a destroyed non-Character model with 1 wound, then continue healing. Never exceed starting wounds or revive a Character through unit healing; follow revival placement rules.';
const key=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const publisher='https://assets.warhammer-community.com/eng_14-10_wh40k_printed_product_updates_space_marines_updates-91hillwcff-wzs8qnozam.pdf';

/** The named entries below have explicit implementations in the core, army,
 * muster or transport modules. No unreviewed paragraph becomes a fallback. */
export const SM_DELEGATED_INTRINSIC:Readonly<Record<string,readonly string[]>>={
 'Cato Sicarius':['Captain of the Honour Guard'],'Roboute Guilliman':['SUPREME COMMANDER'],
 'Drop Pod':['Drop Pod Assault','Deployment Complete'],'Land Raider':['Assault Ramp'],'Land Raider Crusader':['Assault Ramp'],'Land Raider Redeemer':['Assault Ramp'],
 Impulsor:['Rapid Disembarkation','Orbital Comms Array','Shield Dome'],Repulsor:['Combat Embarkation'],'Thunderhawk Gunship':['Aerial Assault'],
 Captain:['Relic Shield'],'Captain With Jump Pack':['Relic Shield'],'Chaplain In Terminator Armour':['Relic Shield'],
 'Deathwatch Terminator Squad':['Storm Shield'],'Deathwatch Veterans':['Storm Shield'],'Decimus Kill Team':['Storm Shield'],Lieutenant:['Storm Shield'],
 'Terminator Assault Squad':['Storm Shield'],'Vanguard Veteran Squad With Jump Packs':['Combat Shield'],'Reiver Squad':['Grav-chutes'],
 'Chief Librarian Tigurius':['Chief Librarian (psyker level 3)'],Librarian:['Librarian (psyker level 1)'],
 'Librarian In Phobos Armour':['Librarian (psyker level 1)'],'Librarian In Terminator Armour':['Librarian (psyker level 1)'],
};

export function spaceMarineIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(!isSpaceMarineFaction(army.faction))return [];
 const legal=new Set(spaceMarineMusterUnits(army)),selected=roster.filter(s=>spaceMarineCards(army.faction)[s.unit]&&legal.has(s.unit));
 const groups=spaceMarineFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 const original=expandRoster(army),originalGroups=spaceMarineFormations(army,original);
 const has=(s:RosterInstance,tag:string)=>spaceMarineKeywords(army,s,undefined,roster).has(tag);
 const tagged=(...tags:string[])=>groups.filter(g=>tags.every(t=>g.members.some(s=>has(s,t))));
 const ids=(gs:typeof groups)=>gs.flatMap(g=>g.members.map(s=>s.id));
 const allIds=ids(groups),astartesIds=ids(tagged('ADEPTUS ASTARTES')),infantryIds=ids(tagged('ADEPTUS ASTARTES','INFANTRY')),vehicleIds=ids(tagged('ADEPTUS ASTARTES','VEHICLE'));
 const result:GeneratedReminder[]=[];
 const canonical=(unit:string,title:string)=>SM_INTRINSIC[unit]?.find(a=>a.name===title||a.name.startsWith(title+' ('))?.name??title;
 for(const squad of selected){
  const {id,unit}=squad,group=groups.find(g=>g.members.some(s=>s.id===id));if(!group)continue;
  const doctrineEffect=spaceMarineDoctrineText(army,group.members);
  const formation=group.members.map(s=>s.id),physical=spaceMarineModelLoadouts(squad,army.faction);
  const fitted=(item:string)=>physical.some(m=>m.items.some(i=>key(i)===key(item)))||spaceMarineWeaponCount(squad,item,army.faction)>0;
  const hasGun=group.members.some(s=>spaceMarineCards(army.faction)[s.unit]?.weapons.some(w=>w.phase==='Shooting'&&spaceMarineWeaponCount(s,w.name,army.faction)>0));
  const attacks:Step[]=[fight,...(hasGun?ranged:[])],normalAttacks:Step[]=[fight,...(hasGun?[shoot,enemyShooting]:[])];
  function add(title:string,steps:readonly Step[],summary:string,recipients=[id],source=spaceMarineCards(army.faction)[unit].source){
   if(!recipients.length)return;const name=canonical(unit,title);
   for(const [window,turn,timing] of steps)result.push({id:['11e-space-marines-native',id,name,window,turn,timing].join(':'),title:name,window,turn,timing,summary,units:[...new Set([id,...recipients])],source,origin:'unit'});
  }
  const effect=(title:string,steps:readonly Step[],summary:string)=>add(title,steps,summary+sourceExpiry,formation);
  switch(unit){
   case 'Adrax Agatone':
    effect('Lord of the Pyroclasts',endPhase,'Enemy units engaged with this formation have −1 Objective Control. Apply the current OC modifier rules when comparing control.');
    effect('Unto the Anvil',[fight],'Re-roll melee Wound rolls of 1 for this formation. If Assault Doctrine is active for it, re-roll the Wound roll instead.');break;
   case 'Aethon Shaan':
    add('Master of Shadows',[command],'Select one friendly Adeptus Astartes Infantry formation. It can re-roll Charge rolls until the start of your next Command phase. This selection has no printed range or visibility requirement.',infantryIds);
    add('Blackwing Mantle',[['Charge','opponent','end']],'Once per phase across your army, use Heroic Intervention on this formation for 1CP less, even if it was already used this phase. This use does not prevent another use that phase.',formation);break;
   case 'Aggressor Squad':effect('Close-quarters Firestorm',attacks,'This formation’s attacks add 1 Strength against an enemy within 9″ of this formation. This applies to both ranged and melee attacks, including permitted snap shots.');break;
   case 'Ancient':effect('Honour of the Company',endPhase,'Models in this formation have +1 Objective Control.');break;
   case 'Ancient In Terminator Armour':effect('Never Shall the Standard Fall',defence,'While this formation is within range of an objective, attacks targeting it with Strength greater than its Toughness subtract 1 from Wound rolls.');break;
   case 'Apothecary':add('Narthecium',[command],'This formation heals D3+1 wounds.'+unitHealing,formation);break;
   case 'Apothecary Biologis':effect('Vivispectral Analysis Targeting',normalAttacks,'This formation’s attacks have Lethal Hits against non-Vehicle targets: you may skip a Critical Hit’s Wound roll to wound automatically. Monsters qualify if they are not Vehicles. Snap shooting cannot score Critical Hits.');break;
   case 'Assault Intercessor Squad':effect('Targeted Intercession',[fight],'If this formation made a Charge move this turn, its melee attacks have +1 Strength and improve AP by 1.');break;
   case 'Assault Intercessors With Jump Packs':add('Hammer of Wrath',[['Charge','own','during']],'After this formation ends a Charge move, choose one enemy it is engaged with. Roll one D6 per surviving model in this formation that is engaged with that enemy; each 4+ inflicts 1 mortal wound. Count actual engaged attached models as well as the Jump Intercessors.',formation);break;
   case 'Astraeus':if(fitted('Twin Macro-accelerator Cannon'))add('Suppression Fire',[shoot],'After this Astraeus shoots in your Shooting phase, choose one enemy hit by its actual Twin Macro-accelerator Cannon. Until the start of your next turn, that enemy is suppressed and subtracts 1 from attack Hit rolls. Fixed snap-shot Hit rolls cannot be modified.');break;
   case 'Ballistus Dreadnought':effect('Ballistus Strike',[shoot,enemyShooting],'This formation’s ranged attacks against an enemy within 24″ of this formation have Sustained Hits 1. Snap shooting cannot score Critical Hits.');break;
   case 'Bladeguard Ancient':effect('Deeds of Legend',[fight],'While this formation is within range of an objective, its melee attacks have +1 Attacks.');break;
   case 'Bladeguard Veteran Squad':add('Bladeguard',[fight],'Once per turn for this unit, when this formation is selected to fight or is selected as the target of a melee attack, choose one benefit until phase end: add 1 to its melee Hit rolls, or subtract 1 from Hit rolls for melee attacks targeting it. Only the chosen benefit applies.',formation);break;
   case 'Brutalis Dreadnought':add('Brutalis Charge',[['Charge','own','during']],'Once per phase for this unit, use Crushing Impact on it for 1CP less, even if that Stratagem was already used this phase. This use does not prevent another use that phase. Resolve the actual Stratagem’s charge-end trigger.');break;
   case 'Caanok Var':
    add('Cold and Calculating',[shoot,fight],'When selected to shoot in your Shooting phase or selected to fight, choose Lethal Hits against Monster/Vehicle targets, or Sustained Hits 1 against targets with neither keyword, for this formation’s attacks until phase end. If Tactical Doctrine is active for this formation, both benefits apply. Snap shooting cannot score Critical Hits.',formation);
    add('Cerebrex Logic Engine',[pre],'During Declare Battle Formations, choose one friendly Adeptus Astartes Infantry formation. The chosen formation has Scouts 6″; this is a single chosen recipient, not an army-wide grant.',infantryIds);break;
   case 'Captain':add('Finest Hour',[fight],'Once per battle for this unit, when its formation is selected to fight, this actual Captain’s melee attacks gain +3 Attacks and Devastating Wounds until phase end. Other models do not gain this personal bonus.');break;
   case 'Captain In Gravis Armour':add('Refuse to Yield',defence,'When an attack is allocated to this actual Captain model, reduce its Damage characteristic by 1, to a minimum of 1. Other models do not receive this personal reduction.');break;
   case 'Captain In Phobos Armour':
    add('Tactical Fluidity',[shoot],'Once per battle round for this unit, after this formation shoots in your Shooting phase, if it is unengaged it may make a Normal move up to D6″. This shares its single use with the opponent’s Fight-phase Fall Back option.',formation);
    add('Tactical Fluidity',[['Fight','opponent','end']],'Once per battle round for this unit, at the end of the opponent’s Fight phase, if this formation is engaged it may make a Fall Back move up to 6″. This shares its single use with the shoot-then-move option.',formation);break;
   case 'Captain In Terminator Armour':effect('Unstoppable Valour',[['Charge','own','during']],'This formation can re-roll Charge rolls.');break;
   case 'Captain With Jump Pack':effect('Angel’s Wrath',[[ 'Movement','either','during'],['Charge','either','during']],'This formation adds 1 to Advance and Charge rolls.');break;
   case 'Captain on Bike':effect('Into the Fray',[fight],'If this formation made a Charge move this turn, its melee attacks have Cleave 1.');break;
   case 'Captain Titus':
    effect('Press the Attack',[fight],'This formation’s melee attacks have Sustained Hits 1 against targets with neither Monster nor Vehicle. If Assault Doctrine is active for this formation, Sustained Hits 1 applies against every target.');
    add('Righteous Fury',[fight],'Once per battle across your army, use this in the Fight phase: this formation’s melee attacks gain +1 Strength until phase end. After it has fought, this actual Titus model heals D3 wounds, or 2D3 if Titus himself destroyed an enemy model this phase. Healing Titus does not revive another model.',formation,publisher);
    add('Honour of Ultramar',[fight],'When this actual Titus model is destroyed in the Fight phase, only if his formation has not been selected to fight this phase, roll one D6. On 2+, leave Titus on the battlefield until his formation has fought or the phase ends, whichever comes first; then remove him. This does not itself select the unit to fight.');break;
   case 'Cato Sicarius':
    add('Knight Champion of Macragge',[['Movement','opponent','during']],'Once per phase across your army, when an enemy ends a move within 8″ of this formation in the opponent’s Movement phase, if this formation is unengaged it may make a Normal move up to 6″.',formation);
    add('Honour or Death',[['Charge','opponent','end']],'When using Heroic Intervention on this formation, reduce the CP cost by 1. This ability alone does not permit an additional use of that Stratagem in the same phase.',formation);break;
   case 'Chaplain':add('Spiritual Leader',PHASES.map((p):Step=>[p,'either','start']),'Once per battle round for this unit, at the start of any phase choose one friendly Battle-shocked Adeptus Astartes formation within 6″ of the actual Chaplain model. That formation is no longer Battle-shocked.',astartesIds);break;
   case 'Chaplain In Terminator Armour':effect('Zealous Fortitude',eachPhase,'This formation has Feel No Pain 4+ against mortal wounds: roll per wound it would lose to a mortal wound, preventing it on 4+. This does not protect against ordinary non-psychic damage.');break;
   case 'Chaplain On Bike':add('Catechism of Fire',[shoot],'When selected to shoot in your Shooting phase, choose one visible enemy unit. This formation’s ranged attacks against that enemy have Devastating Wounds until phase end.',formation);break;
   case 'Chaplain With Jump Pack':effect('Exhortation of Rage',[fight],'While this formation is at or below half of its Starting Strength, it can re-roll melee Wound rolls. Use the current attached formation’s actual Starting Strength.');break;
   case 'Chief Librarian Tigurius':
    effect('Hood of Hellfire',eachPhase,'This formation has Feel No Pain 4+ against psychic attacks and mortal wounds. Roll once per wound it would lose from either qualifying source; overlapping protections never give multiple Feel No Pain rolls.');
    add('Prescience',[move],psychicRoll+'This formation has +1 Save until the start of your next turn. This is a modifier to its Save characteristic; it does not improve invulnerable saves.',formation);
    add('Telepathic Assault',[shoot],psychicRoll+'Choose one visible enemy unit within 24″ of this formation. It suffers 2D3 mortal wounds from this psychic ability.',formation);break;
   case 'Company Heroes':effect('Command Squad',defence,'Subtract 1 from Wound rolls for attacks targeting this formation.');break;
   case 'Corvus Blackstar':
    add('Blackstar Cluster Launcher',[move],'After this Corvus ends a Normal move in your Movement phase, choose up to one enemy unit it moved over. Roll six D6; each 4+ inflicts 1 mortal wound on that enemy. An Advance does not trigger this ability.');
    if(fitted('Auspex Array'))add('Auspex Array',ranged,'The actual model equipped with its Auspex Array has Ignores Cover on its ranged attacks. The array does not grant this ability to passengers.');break;
   case 'Darnath Lysander':
    add('Rampart',PHASES.map((p):Step=>[p,'either','start']),'Once per battle across your army, at the start of any phase this actual Lysander model may gain a 2+ invulnerable save until phase end. Other models keep their own saves.');
    effect('Icon of Obstinacy',defence,'Attacks targeting this formation subtract 1 from Hit rolls. Fixed snap-shot Hit rolls cannot be modified.');break;
   case 'Deathwatch Terminator Squad':
    effect('Terminatus Assault',[['Charge','own','during']],'This formation can re-roll Charge rolls. After it ends a Charge move, each enemy engaged with it makes a Battle-shock roll, subtracting 1 if that enemy has neither Imperium nor Chaos.');break;
   case 'Deathwatch Veterans':case 'Decimus Kill Team':effect('Death to the Alien',normalAttacks,'Re-roll attack Hit rolls of 1 for this formation. Against a target with neither Imperium nor Chaos, re-roll the Hit roll instead. Snap-shot Hit rolls cannot be re-rolled.');break;
   case 'Desolation Squad':effect('Targeter Optics',ranged,'This formation’s ranged attacks have Ignores Cover when targeting a visible enemy unit. Visibility remains required for this bonus, including when the weapon also has Indirect Fire.');break;
   case 'Eliminator Squad':
    effect('Chameleoline Cloaks',[enemyShooting,enemySnap,shoot],'Enemy models checking whether this formation is Hidden subtract 3″ from their detection range. This changes detection range, not weapon Range or the separate Lone Operative restriction.');
    add('Special-issue Optics and Ammunition',[shoot],'When selected to shoot in your Shooting phase, choose one benefit: its ranged attacks have Ignores Cover until phase end; or choose one enemy unit within 24″ of it, which has +6″ detection range until this formation has shot. Apply only the chosen benefit.',formation);break;
   case 'Eradicator Squad with Heavy Bolters':if(fitted('Heavy Bolter'))add('Overlapping Destruction',[shoot],'In your Shooting phase choose one enemy unit. Until phase end, this formation’s actual Heavy Bolter attacks against that enemy have Blast 1. Other weapons do not gain Blast.',formation);break;
   case 'Eradicator Squad with Melta Rifles':effect('Total Obliteration',ranged,'This formation can re-roll ranged Damage rolls. This does not grant Hit or Wound re-rolls.');break;
   case 'Firestrike Servo-turrets':add('Sentinel Protocols',[snap],'Once per phase for this unit, it may be targeted by Fire Overwatch even if that Stratagem was already used this phase. Until that use is resolved its snap shots hit on unmodified 4+, and this use does not prevent another use that phase. Snap shooting still cannot use Hit re-rolls or modifiers or score Critical Hits.');break;
   case 'Fortis Kill Team':effect('Fortis Doctrines',attacks,'Against a target below Starting Strength, this formation’s attacks add 1 to Hit rolls. If the target is at or below half Starting Strength, add 1 to Hit and Wound rolls instead. Fixed snap-shot Hit rolls stay unchanged, but the qualifying Wound bonus still applies.');break;
   case 'Gladiator Lancer':add('Aquilon Optics',ranged,'Each time this unit shoots against Monster/Vehicle targets, it may re-roll one Hit roll, one Wound roll and one Damage roll. These are single allowances for that shooting sequence, not re-rolls for every attack. Snap-shot Hit rolls cannot be re-rolled; the Wound and Damage re-rolls remain available.');break;
   case 'Gladiator Reaper':effect('Reaping Tally',ranged,'Ranged attacks made by this formation improve AP by 1 against targets with neither Monster nor Vehicle.');break;
   case 'Gladiator Valiant':effect('Priority Target Acquisition',ranged,'This formation’s ranged attacks add 1 Strength against targets within 12″ of this formation.');break;
   case 'Heavy Intercessor Squad':effect('Unyielding in the Face of the Foe',defence,'While this formation is controlling an objective, add 1 to its saving throws. Being merely within range of an objective is insufficient.');break;
   case 'Hellblaster Squad':if(fitted('Plasma Incinerator')||fitted('Plasma Pistol'))add('Rites of Thermal Appeasement',ranged,'Add 1 to Hazard rolls for this formation’s actual Plasma Incinerators and Plasma Pistols. Other weapons do not receive this modifier.',formation);break;
   case 'Inceptor Squad':
    effect('Meteoric Descent',[shoot,enemyShooting],'If this formation made an ingress move this turn, add 1 to its ranged attack Hit rolls. Fixed snap-shot Hit rolls cannot be modified.');
    add('Parabolic Jetleap',[['Fight','opponent','end']],'At the end of the opponent’s Fight phase, if this formation is unengaged, you may remove it from the battlefield and place it in Strategic Reserves.',formation);break;
   case 'Incursor Squad':
    add('Divinator-class Auspexes',[shoot],'Once per phase for this unit, when a friendly Adeptus Astartes formation is selected to shoot in your Shooting phase, choose one enemy visible to and within 18″ of this Incursor formation. That enemy is scanned until phase end: ranged attacks against it re-roll Hit rolls of 1. Fixed snap-shot Hit rolls cannot be re-rolled.',allIds);
    add('Haywire Mine',[shoot],'Once per battle for this unit, in your Shooting phase choose one visible enemy within 6″ of this formation and roll D6. On 2+ it suffers D3 mortal wounds, or 2D3 if it is a Vehicle.',formation);break;
   case 'Indomitor Kill Team':
    effect('Indomitor Doctrines',ranged,'This formation’s ranged attacks add 1 Strength when targeting the closest eligible enemy unit. Determine eligibility for the actual attack and its weapon profile, including Hunter restrictions.');
    effect('Indomitor Doctrines',[fight],'If this formation made a Charge move this turn, its melee attacks have +1 Strength.');break;
   case 'Infernus Squad':add('Driven from Cover',[shoot],'After this formation shoots in your Shooting phase, choose one enemy unit hit by its attacks. Friendly Adeptus Astartes ranged attacks against that enemy have Ignores Cover until phase end.',astartesIds);break;
   case 'Infiltrator Squad':add('Omni-scramblers',[shoot],'In your Shooting phase, choose one enemy visible to and within 18″ of this formation. That enemy has +3″ detection range until phase end; apply this when checking whether it is Hidden.',astartesIds);break;
   case 'Intercessor Squad':
    effect('Bolter Discipline',[shoot],'In your Shooting phase, if this formation or its target is within range of an objective, add 1 to this formation’s ranged attack Hit rolls. Fixed snap-shot Hit rolls cannot be modified.');
    effect('Tactical Mainstay',eachPhase,'This formation may start an action while engaged or Battle-shocked, and performing an action does not prevent it shooting. Other requirements and restrictions for the chosen action still apply.');break;
   case 'Invader ATVs':effect('Aggressive Reconnaissance',[shoot],'In your Shooting phase, this formation’s ranged attacks add 1 to Wound rolls against an enemy with no other enemy units within 6″ of it. Check the target’s isolation, not the distance from this formation.');break;
   case 'Invictor Tactical Warsuit':
    add('Forward Assault Warsuit',[['Start of battle round','either','start']],'At the start of the first battle round, choose one enemy unit as this Invictor’s marked target. Each time that marked unit is destroyed, choose another enemy unit.');
    effect('Forward Assault Warsuit',attacks,'Re-roll Wound rolls of 1 for this formation’s attacks against its currently marked enemy. Select a new mark whenever the current marked unit is destroyed.');break;
   case 'Iron Father Feirros':
    add('Master of the Forge',[move],'When this formation starts or ends a move in your Movement phase, choose one friendly Adeptus Astartes Vehicle model within 3″ of the actual Feirros. That model heals 3 wounds and may ignore any or all modifiers to its Ballistic Skill and its Hit and Wound rolls until the start of your next Movement phase. Model healing cannot revive another model.',vehicleIds);
    effect('Rites of Tempering',defence,'Attacks targeting this formation with Strength greater than its Toughness subtract 1 from Wound rolls.');
    if(vehicleIds.length)add('Iron Father',[enemyShooting,enemySnap,shoot],'While this actual Feirros model is within 3″ of a friendly Adeptus Astartes Vehicle unit, he has Lone Operative. The formation receives Lone Operative protection only if every surviving model has it: enemies more than 12″ away cannot see it or target it with Indirect Fire.',[id,...vehicleIds],publisher);break;
   case 'Judiciar':effect('Tempormortis',[['Fight','either','start']],'This formation has Fights First and fights in the Fights First step, following normal alternation and eligibility.');break;
   case 'Kaius Konorius':{
    const attached=group.root.id!==id||group.members.length>1;
    const characters=group.members.filter(s=>s.id!==id&&spaceMarineModelLoadouts(s,army.faction).some(m=>spaceMarineKeywords(army,s,m.model,roster).has('CHARACTER'))).map(s=>s.id);
    if(attached&&characters.length)add('Veteran Bodyguard',eachPhase,'While this actual Kaius model remains attached, other actual Character models in this formation have Feel No Pain 4+. Kaius himself and non-Character bodyguards do not receive it.'+sourceExpiry,characters);
    add('Calgar’s Champion',attacks,'This actual Kaius model re-rolls Hit rolls of 1 and Wound rolls of 1 for attacks targeting a Character unit. Other models do not gain these re-rolls. Snap-shot Hit rolls cannot be re-rolled; the Wound re-roll still applies.');break;
   }
   case 'Kayvaan Shrike':
    effect('Trifold Path of Shadow',[enemyShooting,enemySnap,shoot],'This formation has Stealth, granting the Benefit of Cover against ranged attacks. Enemy models checking whether it is Hidden subtract 3″ from their detection range.');
    add('Echo of the Ravenspire',[['Fight','opponent','end']],'At the end of the opponent’s Fight phase, if this formation is unengaged, you may remove it and place it in Strategic Reserves.',formation);break;
   case 'Kor’sarro Khan':
    effect('Trophy Taker',attacks,'This formation re-rolls Hit rolls of 1 and Wound rolls of 1 when attacking a Character unit. Snap-shot Hit rolls cannot be re-rolled; the Wound re-roll still applies.');
    effect('For the Khan!',[move,shoot,fight],'This formation’s ranged attacks have Assault, so its Assault weapons remain eligible to shoot after it Advances. Its melee attacks have Lance, adding 1 to Wound rolls if it made a Charge move this turn.');break;
   case 'Land Raider':add('Power of the Machine Spirit',ranged,'Each time this unit shoots, it may re-roll one Hit roll and one Wound roll. These are single allowances for that shooting sequence. Snap-shot Hit rolls cannot be re-rolled; the Wound re-roll remains available.');break;
   case 'Land Raider Crusader':effect('Fury of the Machine Spirit',[shoot,enemyShooting],'This formation’s ranged attacks against targets within 12″ of it have Lethal Hits. Snap shooting cannot score Critical Hits.');break;
   case 'Land Raider Redeemer':effect('Wrath of the Machine Spirit',ranged,'This formation’s ranged attacks against targets within 12″ of it have Devastating Wounds if the target has neither Monster nor Vehicle. Critical Wounds can still trigger during permitted snap shooting.');break;
   case 'Land Speeder':add('Purgation Run',[shoot],'After this formation shoots in your Shooting phase, it may make a Normal move up to D6″. If it does, it cannot declare a charge for the rest of this turn.',formation);add('Purgation Run · charge restriction',[['Charge','own','during']],'If this formation used Purgation Run this turn, it cannot declare a charge this turn.',formation);break;
   case 'Librarian':
    add('Veil of Time',[['Movement','either','during']],psychicRoll+'When this formation is selected to Advance, it can change that Advance roll to 6. This applies to that Advance only.',formation);
    add('Force Dome',[move],psychicRoll+'This formation has a 4+ invulnerable save until the start of your next turn.',formation);break;
   case 'Librarian In Phobos Armour':
    add('Shrouding',defence,psychicRoll+'When an enemy selects this formation as a target, attacks targeting this formation subtract 1 from Hit rolls until phase end. Fixed snap-shot Hit rolls cannot be modified.',formation);
    add('Soul Sight',[shoot],psychicRoll+'Choose one visible enemy unit. This formation’s ranged attacks against that enemy have Ignores Cover until phase end. There is no printed maximum range for the selection.',formation);break;
   case 'Librarian In Terminator Armour':
    add('Might of Heroes',[fight],psychicRoll+'This formation’s melee attacks have +2 Strength until phase end.',formation);
    add('Thunderous Force',[shoot],psychicRoll+'This formation’s ranged attacks have +6″ Range until phase end. Use the modified Range when checking half-range abilities.',formation);break;
   case 'Lieutenant':case 'Lieutenant In Phobos Armour':
    effect('Tactical Precision',normalAttacks,'This formation’s attacks have Lethal Hits against targets with neither Monster nor Vehicle. Snap shooting cannot score Critical Hits.');
    if(selected.some(s=>s.unit==='Blood Angels Captain'||s.unit.startsWith('Captain')&&SM_INTRINSIC[s.unit]?.some(a=>a.name==='Strategic Acumen')))add('Demi-company Commander',[command],'Once per turn for this unit, when a friendly Captain uses Strategic Acumen, the same selected doctrine may be active for this Lieutenant’s formation until the start of your next Command phase. No range or attachment to that Captain is required. '+doctrineEffect,formation);break;
   case 'Lieutenant with Combi-weapon':
    add('Priority Target Identified',[command],'Once per battle for this unit, choose one visible terrain feature. Until this turn ends, enemy units within that terrain feature have +3″ detection range.',astartesIds);
    add('Evade and Survive',[['Movement','opponent','during']],'Once per phase for this unit, when an enemy ends a move within 8″ of this formation in the opponent’s Movement phase, if this formation is unengaged it may make a Normal move up to D3+3″.',formation);break;
   case 'Marneus Calgar':
    effect('Codex Adept',[move,shoot,['Charge','own','during'],fight],'Tactical, Devastator and Assault Doctrine are all active for this formation. '+doctrineEffect);
    add('Master Tactician',[move],'Choose one visible friendly Adeptus Astartes formation within 9″ of the actual Calgar model, then choose one doctrine. That doctrine is active for the chosen formation until the start of your next Command phase. '+doctrineEffect,astartesIds);
    add('Thunderhawk Insertion',[pre],'During Declare Battle Formations, choose one friendly Gravis, Phobos or Tacticus formation. The single chosen formation has Deep Strike.',ids(groups.filter(g=>g.members.some(s=>['GRAVIS','PHOBOS','TACTICUS'].some(t=>has(s,t))))));break;
   case 'Outrider Squad':effect('Full-throttle Assault',[fight],'If this formation made a Charge move this turn, its Thunder Hammer attacks have +1 to Hit rolls and Sustained Hits 1; its other melee attacks have +1 Damage and Sustained Hits 1. Apply the appropriate benefit to each actual equipped weapon.');break;
   case 'Redemptor Dreadnought':effect('Duty Eternal',defence,'Attacks targeting this formation with Strength greater than its Toughness subtract 1 from Wound rolls.');break;
   case 'Reiver Squad':
    effect('Terror Troops',endPhase,'Enemy models within 3″ of this formation have −1 Objective Control. Measure to each enemy model; the aura does not reduce every model in a distant part of that enemy unit.');
    add('Fearsome Assault',[['Fight','either','start']],'At the start of the Fight phase, each enemy engaged with one or more formations with Fearsome Assault makes one Battle-shock roll with −1. Multiple sources do not force multiple rolls on that enemy.',formation);
    if(fitted('Grapnel Launchers'))effect('Grapnel Launchers',[['Movement','either','during'],['Charge','either','during'],fight],'While at least one actual Reiver from this equipped unit survives, whenever this formation makes a move it can move through all types of model and ignore all vertical distance when measuring movement. This includes Charge, Pile In and Consolidation moves. Obey legal ending positions, engagement and coherency requirements.');break;
   case 'Repulsor Executioner':effect('Executioner',[shoot,enemyShooting],'This formation’s ranged attacks add 1 to Hit rolls against targets that are not below half Starting Strength. A target exactly at half qualifies. Fixed snap-shot Hit rolls cannot be modified.');break;
   case 'Rhino':add('Veiling Smoke',[enemyShooting,enemySnap,shoot],'Once per phase for this unit, target it with Smokescreen for 1CP less, even if that Stratagem was already used this phase. This use does not prevent another use in the phase.');break;
   case 'Roboute Guilliman':
    effect('Codex Adept',[move,shoot,['Charge','own','during'],fight],'Tactical, Devastator and Assault Doctrine are all active for this formation. '+doctrineEffect);
    add('Primarch of the XIII',attacks,'Friendly Adeptus Astartes formations within 6″ of this actual Guilliman model re-roll attack Hit and Wound rolls of 1. The aura requires him to survive. Snap-shot Hit rolls cannot be re-rolled; the Wound re-roll remains available.',astartesIds);
    add('Author of the Codex',[move],'Choose one visible friendly Adeptus Astartes formation within 12″ of the actual Guilliman model and choose one additional doctrine. That doctrine is active for the chosen formation until the start of your next Command phase. '+doctrineEffect,astartesIds);
    if(infantryIds.length)add('Leader of Astartes',[enemyShooting,enemySnap,shoot],'While this actual Guilliman model is within 3″ of a friendly Adeptus Astartes Infantry unit, his unit has Lone Operative: enemies more than 12″ away cannot see it or target it with Indirect Fire.',[id,...infantryIds]);break;
   case 'Scout Squad':effect('Flexible Asset',eachPhase,'An Advance or Fall Back move does not prevent this formation starting an action. All other action requirements still apply.');break;
   case 'Spectrus Kill Team':add('Spectrus Doctrines',[['Fight','opponent','end']],'At the end of the opponent’s Fight phase, if this formation is unengaged, you may remove it and place it in Strategic Reserves.',formation);break;
   case 'Sternguard Veteran Squad':effect('Veteran Marksmen',[shoot,enemyShooting],'Re-roll ranged Hit rolls of 1 for this formation. Fixed snap-shot Hit rolls cannot be re-rolled.');break;
   case 'Storm Speeder Hailstrike':add('Hailstrike',[shoot],'After this formation shoots in your Shooting phase, choose one enemy hit by its attacks. Friendly Adeptus Astartes ranged attacks against that enemy have Ignores Cover until phase end.',astartesIds);break;
   case 'Storm Speeder Hammerstrike':effect('Hammerstrike',[shoot,enemyShooting],'This formation’s ranged attacks against a target within a terrain area have Sustained Hits 1. Snap shooting cannot score Critical Hits.');break;
   case 'Storm Speeder Thunderstrike':
    effect('Thunderstrike',ranged,'This formation’s ranged attacks against Monster/Vehicle targets add 1 to Wound rolls.');
    add('Shattered Defences',[shoot],'After this formation shoots in your Shooting phase, choose one Monster/Vehicle enemy hit by its attacks. Friendly Adeptus Astartes ranged attacks against that enemy improve AP by 1 until phase end.',astartesIds);break;
   case 'Suboden Khan':
    effect('Spear of Chogoris',[move,shoot,['Charge','own','during']],'This formation’s ranged attacks have Assault, and its Advance does not prevent it declaring a charge. If Assault Doctrine is active for it, add 1 to its Advance and Charge rolls.');
    effect('Skilled Riders',[['Movement','either','during'],['Charge','either','during'],fight],'This formation has Mobile: its models can move horizontally through dense terrain features. Mobile alone does not permit vertical movement through dense terrain or ending in an otherwise illegal position.');break;
   case 'Talonstrike Kill Team':effect('Talonstrike Doctrines',attacks,'In a turn in which this formation was set up on the battlefield, its attacks improve AP by 1 and its melee attacks have Lance. This is not restricted to ingress moves; Lance’s Wound bonus still requires a Charge move this turn.');break;
   case 'Techmarine':
    if(vehicleIds.length)add('Techmarine',[enemyShooting,enemySnap,shoot],'While this actual Techmarine model is within 3″ of a friendly Adeptus Astartes Vehicle unit, he has Lone Operative. Its protection requires every surviving model in his formation to have it: enemies more than 12″ away cannot see the formation or target it with Indirect Fire.',[id,...vehicleIds],publisher);
    add('Blessings of the Omnissiah',[move],'When this formation starts or ends a move in your Movement phase, choose one friendly Adeptus Astartes Vehicle model within 3″ of the actual Techmarine. That model heals D3 wounds and may ignore any or all Hit- and Wound-roll modifiers until the start of your next Movement phase. This does not grant Feirros’s separate Ballistic Skill modifier immunity. Model healing cannot revive another model.',vehicleIds);break;
   case 'Terminator Assault Squad':effect('Terminatus Assault',[fight],'If this formation made a Charge move this turn, its Lightning Claw attacks have Sustained Hits 1 against targets with neither Monster nor Vehicle, and its Thunder Hammer attacks have Sustained Hits 1 against Monster/Vehicle targets. Check each actual equipped weapon.');break;
   case 'Terminator Squad':effect('Fury of the First',attacks,'This formation’s attacks against enemies within 9″ of this formation improve AP by 1.');break;
   case 'Thunderhawk Gunship':add('Thunderhawk Cluster Bombs',[move],'After this Thunderhawk ends a Normal or Advance move in your Movement phase, choose one enemy it moved over. Roll six D6; each 3+ inflicts 1 mortal wound. This ability is distinct from its actual equipped Hellstrike Missiles.');break;
   case 'Tor Garadon':
    add('Siege Captain',attacks,'This actual Tor Garadon model’s attacks against a Fortification, Monster or Vehicle gain +2 Strength, improve AP by 2 and add 2 Damage. Other models do not gain these personal bonuses.');
    add('Signum Array',[shoot],'Choose one enemy visible to and within 18″ of this formation. That enemy cannot have the Benefit of Cover until phase end.',astartesIds);break;
   case 'Vanguard Veteran Squad With Jump Packs':effect('Vanguard Assault',[fight],'If this formation made a Charge move this turn, its melee attacks have +1 Attacks.');break;
   case 'Victrix Honour Guard':
    add('Glory of Ultramar',[enemyShooting],'After an enemy unit shoots in the opponent’s Shooting phase, if those attacks destroyed a model in this formation, this formation may make a Surge move up to D6″. Apply normal Surge movement and ending restrictions.',formation);
    effect('Honour Guard of Macragge',defence,'Subtract 1 from Wound rolls for attacks targeting this formation.');
    if(fitted('Banner of Macragge')){add('Banner of Macragge',[['Movement','own','end']],'While the actual Ancient equipped with the Banner of Macragge survives, at the end of your Movement phase, if this formation controls an objective, that objective becomes secured.',formation);add('Banner of Macragge',[fight],'Once per battle across your army, when this formation is selected to fight while its actual Banner of Macragge bearer survives, its melee attacks gain +1 Attacks and Strength until phase end.',formation);}break;
   case 'Vulkan He’stan':
    add('Seeker of the Unfound',[pre,move],'The first time this Vulkan model is set up on the battlefield, choose one objective. While this actual model is within range of that chosen objective, he has OC10, Leadership 5+ and Feel No Pain 4+. Attached models do not gain those personal characteristics.');
    add('Seeker of the Unfound',[...defence,...endPhase],'Only while this actual Vulkan is within range of the objective chosen when he was first set up, he has OC10, Leadership 5+ and Feel No Pain 4+. These are personal benefits, not a grant to attached models.');
    add('Forgefather',[shoot],'Choose one enemy visible to and within 24″ of the actual Vulkan model. Friendly Adeptus Astartes attacks made with Melta or Torrent weapons against that enemy gain +2 Strength until phase end.',astartesIds);break;
   case 'Wardens of Ultramar':add('Strategium Command',[pre],'After both armies have deployed, choose up to three friendly Adeptus Astartes formations and redeploy them. You may place them in Strategic Reserves regardless of how many units are already there. Follow other deployment and reserve restrictions; this does not waive a separate points limit. The ability source must be on the battlefield or in an on-battlefield transport when it is used.',astartesIds);break;
   case 'Watch Captain Artemis':
    add('Unstoppable Champion',endPhase,'Once per battle across your army, at the end of a phase in which this actual Artemis model was destroyed, roll D6. On 2+, return him with 3 wounds as close as possible to where he was destroyed and unengaged. Rejoin the original attached formation if possible under the current revival rules.');
    effect('Tactical Instinct',normalAttacks,'This formation’s attacks have Sustained Hits 1. Snap shooting cannot score Critical Hits.');break;
   case 'Watch Master':
    effect('Strategic Knowledge',[move,shoot,['Charge','own','during']],'This formation’s ranged attacks have Assault. Its Advance does not prevent it declaring a charge, and its Fall Back does not prevent it shooting or declaring a charge.');
    add('Watch Master',attacks,'This actual Watch Master’s attacks against Character units re-roll Hit rolls of 1 and Wound rolls of 1. Other models do not receive these personal re-rolls. Snap-shot Hit rolls cannot be re-rolled; the Wound re-roll remains available.');
    add('Purgatus Quarry',[['Start of battle round','either','start']],'At the start of the first battle round, choose up to one enemy unit as this formation’s hunted target. Each time its hunted unit is destroyed, choose up to one enemy as the new hunted target.',formation);
    effect('Purgatus Quarry',attacks,'This formation re-rolls Wound rolls of 1 against its currently hunted enemy. Whenever that enemy is destroyed, choose up to one new hunted target.');break;
  }
  if(['Ancient','Ancient In Terminator Armour','Bladeguard Ancient','Company Heroes','Wardens of Ultramar'].includes(unit))add('Raise the Banner',[['Movement','own','end']],'At the end of your Movement phase, if this formation is controlling an objective, that objective becomes secured. Apply the normal secured-objective rules after moving away.',formation);
  if(SM_INTRINSIC[unit]?.some(a=>a.name==='Strategic Acumen'))add('Strategic Acumen',[command],'Choose one combat doctrine. That doctrine is active for this Captain’s formation until the start of your next Command phase. '+doctrineEffect,formation);
  if(['Chaplain','Chaplain In Terminator Armour','Chaplain On Bike','Chaplain With Jump Pack'].includes(unit))effect('Litany of Hate',[fight],'This formation’s melee attacks have Lance, adding 1 to Wound rolls if it made a Charge move this turn.');
  if(['Librarian','Librarian In Phobos Armour','Librarian In Terminator Armour'].includes(unit))effect('Psychic Hood',eachPhase,'This formation has Feel No Pain 4+ against psychic attacks. Roll per wound it would lose from a psychic attack; this does not protect against unrelated mortal wounds.');
  if(['Infiltrator Squad','Spectrus Kill Team'].includes(unit)&&fitted('Helix Gauntlet'))add('Helix Gauntlet',[command],'While the actual Helix Gauntlet bearer survives, this formation heals D3 wounds in your Command phase.'+unitHealing,formation);
  if(['Deathwatch Terminator Squad','Terminator Assault Squad','Terminator Squad'].includes(unit)){
   add('Teleport Homer',[pre],'At the start of the battle you may place one Teleport Homer token for this unit on the battlefield. It is a marker, not a model. An enemy ending a move within 1″ removes it.',formation);
   add('Teleport Homer',[snap],'When using Rapid Ingress on this formation, you may use its remaining Teleport Homer token to reduce the cost by 1CP. Set up within 3″ of that token and not within 8″ of an enemy unit, then remove the token. Normal reserve timing still applies; the token is usable only once.',formation);
   add('Teleport Homer · enemy movement',[['Movement','opponent','during'],['Charge','opponent','during'],fight],'If an enemy ends any move within 1″ of this formation’s remaining Teleport Homer token, remove that token immediately. It can no longer reduce the cost of Rapid Ingress.',formation);
  }
 }
 // Only already applied effects survive removal of the original source. Their
 // printed duration (or the core phase default) is never extended to a turn.
 for(const source of original.filter(s=>spaceMarineCards(army.faction)[s.unit]&&legal.has(s.unit))){
  const {unit,id}=source,alive=selected.some(s=>s.id===id),originalGroup=originalGroups.find(g=>g.members.some(s=>s.id===id));
  const own=selected.filter(s=>originalGroup?.members.some(m=>m.id===s.id)).map(s=>s.id);
  const doctrineEffect=spaceMarineDoctrineText(army,originalGroup?.members??[source]);
  const add=(title:string,steps:readonly Step[],summary:string,recipients=astartesIds)=>{
   if(!recipients.length)return;
   for(const [window,turn,timing] of steps)result.push({id:['11e-space-marines-lasting',id,title,window,turn,timing].join(':'),title,window,turn,timing,summary:id+': '+summary,units:[...new Set([id,...recipients])],source:spaceMarineCards(army.faction)[unit].source,origin:'unit'});
  };
  if(SM_INTRINSIC[unit]?.some(a=>a.name==='Strategic Acumen')||['Lieutenant','Lieutenant In Phobos Armour'].includes(unit))add((unit.startsWith('Lieutenant')?'Demi-company Commander':'Strategic Acumen')+' · selected doctrine',[move,shoot,['Charge','own','during'],fight],'Only if this formation already received a selected doctrine, it stays active until the start of your next Command phase. '+doctrineEffect+persistent,own);
  if(['Marneus Calgar','Roboute Guilliman'].includes(unit))add((unit==='Marneus Calgar'?'Master Tactician':'Author of the Codex')+' · chosen recipient',[move,shoot,['Charge','own','during'],fight],'Only the formation already selected by this ability receives its chosen '+(unit==='Roboute Guilliman'?'additional ':'')+'doctrine until the start of your next Command phase. '+doctrineEffect+persistent);
  if(unit==='Aethon Shaan')add('Master of Shadows · chosen infantry',[['Charge','own','during']],'The Infantry formation already selected may re-roll Charge rolls until the start of your next Command phase.'+persistent,infantryIds);
  if(unit==='Caanok Var')add('Cerebrex Logic Engine · chosen infantry',[pre],'Only the Infantry formation actually selected during Declare Battle Formations gains Scouts 6″. During Resolve Pre-battle Abilities it may scout if wholly in your deployment zone, ending more than 8″ horizontally from enemies; from reserves it may instead set up wholly in your deployment zone. A Dedicated Transport can use embarked Scouts only when every actual passenger qualifies.'+persistent,infantryIds);
  if(unit==='Marneus Calgar')add('Thunderhawk Insertion · chosen formation',[pre,move,snap],'Only the Gravis, Phobos or Tacticus formation actually selected during Declare Battle Formations gains Deep Strike. When arriving by ingress, normally from battle round two, set up more than 8″ horizontally from all enemies, including when using Rapid Ingress. Being an eligible option alone does not grant Deep Strike.'+persistent,ids(groups.filter(g=>g.members.some(s=>['GRAVIS','PHOBOS','TACTICUS'].some(t=>has(s,t))))));
  if(unit==='Astraeus')add('Suppression Fire · suppressed enemy',defence,'An enemy already suppressed after being hit by the Twin Macro-accelerator Cannon subtracts 1 from its attack Hit rolls until the start of your next turn. Fixed snap-shot Hit rolls remain unchanged.'+persistent);
  if(['Infernus Squad','Storm Speeder Hailstrike'].includes(unit))add((unit==='Infernus Squad'?'Driven from Cover':'Hailstrike')+' · chosen enemy',[shoot],'Friendly Adeptus Astartes ranged attacks against the enemy already chosen after this unit shot have Ignores Cover until this Shooting phase ends.'+persistent);
  if(unit==='Storm Speeder Thunderstrike')add('Shattered Defences · chosen enemy',[shoot],'Friendly Adeptus Astartes ranged attacks against the Monster/Vehicle enemy already chosen after this unit shot improve AP by 1 until this Shooting phase ends.'+persistent);
  if(unit==='Incursor Squad')add('Divinator-class Auspexes · scanned enemy',[shoot],'Ranged attacks against the enemy already scanned this phase re-roll Hit rolls of 1 until this Shooting phase ends. Snap-shot Hit rolls cannot be re-rolled.'+persistent,allIds);
  if(unit==='Infiltrator Squad')add('Omni-scramblers · detected enemy',[shoot],'The enemy already selected this phase has +3″ detection range until this Shooting phase ends.'+persistent);
  if(unit==='Tor Garadon')add('Signum Array · chosen enemy',[shoot],'The enemy already selected this phase cannot have the Benefit of Cover until this Shooting phase ends.'+persistent);
  if(unit==='Vulkan He’stan')add('Forgefather · chosen enemy',[shoot],'Friendly Adeptus Astartes attacks made with Melta or Torrent weapons against the enemy already selected gain +2 Strength until this Shooting phase ends.'+persistent);
  if(unit==='Lieutenant with Combi-weapon')add('Priority Target Identified · chosen terrain',[shoot,['Charge','own','during'],['Fight','own','during']],'Enemy units within the terrain feature already identified have +3″ detection range until this turn ends.'+persistent);
  if(['Techmarine','Iron Father Feirros'].includes(unit))add((unit==='Techmarine'?'Blessings of the Omnissiah':'Master of the Forge')+' · chosen vehicle',[...ranged,fight],'Only the Vehicle model already chosen may ignore any or all '+(unit==='Iron Father Feirros'?'Ballistic Skill, ':'')+'Hit- and Wound-roll modifiers until the start of your next Movement phase. This does not permit snap-shot Hit modifiers or re-rolls.'+persistent,vehicleIds);
  if(['Librarian','Chief Librarian Tigurius'].includes(unit))add((unit==='Librarian'?'Force Dome':'Prescience')+' · active psychic effect',defence,'If this power was already used, the original formation retains '+(unit==='Librarian'?'its 4+ invulnerable save':'its +1 Save characteristic (not an improved invulnerable save)')+' until the start of your next turn.'+persistent,own);
  if(unit==='Librarian In Phobos Armour'){
   add('Shrouding · active psychic effect',defence,'If Shrouding was already used this phase, attacks targeting the original formation have −1 to Hit rolls until phase end. Fixed snap-shot Hit rolls remain unchanged.'+persistent,own);
   add('Soul Sight · chosen enemy',[shoot],'If Soul Sight was already used this Shooting phase, this original formation’s ranged attacks against the chosen enemy have Ignores Cover until phase end.'+persistent,own);
  }
  if(unit==='Librarian In Terminator Armour'){
   add('Might of Heroes · active psychic effect',[fight],'If this power was already used this Fight phase, the original formation’s melee attacks retain +2 Strength until phase end.'+persistent,own);
   add('Thunderous Force · active psychic effect',[shoot],'If this power was already used this Shooting phase, the original formation’s ranged attacks retain +6″ Range until phase end.'+persistent,own);
  }
  if(unit==='Captain Titus'){
   add('Righteous Fury · active effect',[fight],'If Righteous Fury was already used this Fight phase, the original formation’s melee attacks retain +1 Strength until phase end. Only Titus himself heals after the unit fights, and only if he remains eligible to heal.'+persistent,own);
   if(!alive)add('Honour of Ultramar',[fight],'If Titus was destroyed this Fight phase before his unit was selected to fight and his Honour of Ultramar roll was 2+, retain him on the battlefield until that unit has fought or the phase ends, whichever comes first. Removing him from the roster does not erase this pending trigger.',[id,...own]);
  }
  if(unit==='Bladeguard Veteran Squad')add('Bladeguard · selected stance',[fight],'If this unit already selected its once-per-turn Bladeguard stance this Fight phase, the original formation retains the chosen +1 melee Hit or −1 incoming melee Hit benefit until phase end.'+persistent,own);
  if(unit==='Caanok Var')add('Cold and Calculating · active choice',[shoot,fight],'If this unit already made its choice when selected to attack in this phase, retain the chosen Lethal Hits against Monster/Vehicle or Sustained Hits 1 against neither keyword until phase end; Tactical Doctrine grants both. Snap shooting cannot score Critical Hits.'+persistent,own);
  if(unit==='Eliminator Squad')add('Special-issue Optics and Ammunition · selected cover benefit',[shoot],'If this formation already selected the Ignores Cover option this Shooting phase, its ranged attacks retain Ignores Cover until phase end. The alternative detection effect applies to only one selected enemy and expires when this formation has shot.'+persistent,own);
  if(unit==='Chaplain On Bike')add('Catechism of Fire · chosen enemy',[shoot],'This formation’s ranged attacks against the enemy already chosen this Shooting phase retain Devastating Wounds until phase end.'+persistent,own);
  if(unit==='Eradicator Squad with Heavy Bolters')add('Overlapping Destruction · chosen enemy',[shoot],'If the target was already chosen this Shooting phase, actual Heavy Bolters in the original formation have Blast 1 against that target until phase end.'+persistent,own);
  if(unit==='Victrix Honour Guard'&&spaceMarineModelLoadouts(source,army.faction).some(m=>m.items.some(i=>key(i)==='bannerofmacragge')))add('Banner of Macragge · active effect',[fight],'If this army’s once-per-battle Banner benefit was already activated this Fight phase, the original formation’s melee attacks retain +1 Attacks and Strength until phase end.'+persistent,own);
  if(['Ancient','Ancient In Terminator Armour','Bladeguard Ancient','Company Heroes','Wardens of Ultramar','Victrix Honour Guard'].includes(unit))add('Secured objective · banner',endPhase,'An objective already secured by this formation’s actual banner ability remains secured under the normal objective rules after its source moves away or is destroyed. An unequipped optional banner cannot secure it.');
  if(unit==='Watch Captain Artemis'&&!alive)add('Unstoppable Champion',endPhase,'Once per battle across your army, if this is a phase in which Artemis was destroyed, roll D6 at phase end. On 2+, return him with 3 wounds, unengaged and as close as possible to where he died. Rejoin his original attached formation if possible; preserve its original Starting Strength.',[id]);
 }
 return result;
}
