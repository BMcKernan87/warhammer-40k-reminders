import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {CHAPTER_CARDS} from './space-marine-chapters-card-profiles.generated';
import {CHAPTER_INTRINSIC_INVENTORY} from './space-marine-chapters-intrinsic.generated';
import {spaceMarineCard} from './space-marines-card-data';
import {spaceMarineModelLoadouts,spaceMarineWeaponCount} from './space-marines-loadouts';
import {spaceMarineMusterUnits} from './space-marines-muster-data';
import {spaceMarineKeywords} from './space-marines-keywords';
import {spaceMarineFormations} from './space-marines-formations';
import {chapterSplitPlan} from './space-marine-chapters-splits';
import {SPACE_MARINE_DOCTRINE_EFFECTS} from './space-marines-doctrines';
import {spaceMarineWeaponText} from './space-marines-weapons';
import {expandRoster,type RosterInstance} from './roster-instances';

type Step=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const shoot:Step=['Shooting','own','during'],fight:Step=['Fight','either','during'],move:Step=['Movement','own','during'],command:Step=['Command','own','during'],pre:Step=['Pre-battle','either','during'];
const charge:Step=['Charge','own','during'],snap:Step=['Movement','opponent','end'],enemyShooting:Step=['Shooting','opponent','during'],enemySnap:Step=['Movement','own','end'];
const ranged:readonly Step[]=[shoot,snap,enemyShooting],defence:readonly Step[]=[enemyShooting,enemySnap,shoot,fight];
const eachPhase=PHASES.map((p):Step=>[p,'either','during']),startPhase=PHASES.map((p):Step=>[p,'either','start']),endPhase=PHASES.map((p):Step=>[p,'either','end']);
const key=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const sourceExpiry=' The actual ability source must survive. If its last source is destroyed by an attack, retain the benefit until that attacking unit finishes its attacks.';
const persistent=' An already applied effect keeps its stated duration if its original source is destroyed or leaves the battlefield.';
const snapLimit=' Snap shooting cannot re-roll or modify Hit rolls or score Critical Hits.';
const doctrineText=Object.entries(SPACE_MARINE_DOCTRINE_EFFECTS).map(([name,text])=>name+': '+text).join(' ');
const healing=' Resolve wounds one at a time: heal a wounded surviving model first; when every survivor has full wounds, revive a destroyed non-Character model with 1 wound and continue. Do not exceed starting wounds or revive a Character through unit healing; follow revival placement rules.';
const surge=' Only if unengaged, not Battle-shocked and not already moved this phase. Select the closest enemy as the surge target; each model must finish engaged with it if possible, otherwise as close as possible. Do not engage another enemy or move again this phase.';
const psychic=(level:number)=>'Once per phase for this power, only while this formation is not Battle-shocked and has '+level+' psychic level'+(level===1?'':'s')+' remaining in its printed per-battle-round budget, roll D6. On 1 the formation becomes Battle-shocked; the effect still applies. ';
const holdDead=(who:string,roll:string)=>'In the Fight phase, when '+who+' is destroyed before this formation has been selected to fight, '+roll+' Retain the qualifying destroyed model until this formation has fought or the phase ends, whichever comes first, then remove it. This does not itself select the formation to fight.';

/** Explicit owners for named source rows implemented by shared army, muster,
 * transport or actual-equipment rules. No paragraph is rendered as fallback. */
export const CHAPTER_DELEGATED_INTRINSIC:Readonly<Record<string,Readonly<Record<string,readonly string[]>>>>={
 'Blood Angels':{'Chief Librarian Mephiston':['Chief Librarian (psyker level 3)'],'Death Company Captain with Jump Pack':['Relic Shield']},
 'Dark Angels':{Ezekiel:['Chief Librarian (psyker level 3)'],'Lion El’jonson':['Supreme Commander']},
 'Black Templars':{
  Impulsor:['Rapid Disembarkation','Orbital Comms Array','Shield Dome'],'Gladiator Lancer':['Aquilon Optics'],'Gladiator Valiant':['Priority Target Acquisition'],'Gladiator Reaper':['Reaping Tally'],Repulsor:['Combat Embarkation'],'Repulsor Executioner':['Executioner'],
  'Emperor’s Champion':['Chosen of the Emperor'],
 },
 'Space Wolves':{
  'Njal Stormcaller':['High Rune Priest (psyker level 3)'],Murderfang:['Force of Untamed Destruction'],'Grey Hunters':['Old Greymanes'],
  'Wolf Guard Terminators':['Storm Shield'],'Thunderwolf Cavalry':['Storm Shield'],'Wolf Guard Battle Leader':['Storm Shield'],'Wolf Guard Headtakers':['Let Loose the Wolves','Storm Shield'],'Venerable Dreadnought':['Blizzard Shield'],'Wulfen Dreadnought':['Blizzard Shield'],
 },
};

export function chapterIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 const chapter=CHAPTER_CARDS[army.faction],inventory=CHAPTER_INTRINSIC_INVENTORY[army.faction];if(!chapter||!inventory)return [];
 const legal=new Set(spaceMarineMusterUnits(army)),selected=roster.filter(s=>chapter[s.unit]&&legal.has(s.unit));
 const groups=spaceMarineFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit))),original=expandRoster(army),originalGroups=spaceMarineFormations(army,original);
 const has=(s:RosterInstance,tag:string)=>spaceMarineKeywords(army,s,undefined,roster).has(tag);
 const tagged=(...tags:string[])=>groups.filter(g=>tags.every(t=>g.members.some(s=>has(s,t))));
 const ids=(gs:typeof groups)=>gs.flatMap(g=>g.members.map(s=>s.id));
 const allIds=ids(groups),astartesIds=ids(tagged('ADEPTUS ASTARTES')),darkAngelIds=ids(tagged('DARK ANGELS')),wolfIds=ids(tagged('SPACE WOLVES'));
 const wolfVehicleIds=ids(groups.filter(g=>g.members.some(s=>spaceMarineModelLoadouts(s,army.faction).some(m=>{
  const tags=spaceMarineKeywords(army,s,m.model,roster);return tags.has('SPACE WOLVES')&&tags.has('VEHICLE');
 }))));
 const wulfenIds=ids(groups.filter(g=>g.members.some(s=>spaceMarineModelLoadouts(s,army.faction).some(m=>spaceMarineKeywords(army,s,m.model,roster).has('WULFEN')))));
 const result:GeneratedReminder[]=[];
 const canonical=(unit:string,title:string)=>inventory[unit]?.find(a=>a.name===title||a.name.startsWith(title+' ('))?.name??title;
 for(const squad of selected){
  const {id,unit}=squad,group=groups.find(g=>g.members.some(s=>s.id===id));if(!group)continue;
  const split=chapterSplitPlan(army,group,roster),parts=split?.valid?split.parts.filter(p=>p.physical.some(m=>m.squad.id===id)):[undefined];
  for(const part of parts){
  const members=part?.members??group.members,formation=members.map(s=>s.id);
  const physical=part?part.physical.filter(m=>m.squad.id===id):spaceMarineModelLoadouts(squad,army.faction);
  const fitted=(item:string)=>physical.some(m=>m.items.some(i=>key(i)===key(item)))||!part&&spaceMarineWeaponCount(squad,item,army.faction)>0;
  const hasGun=part?part.physical.some(m=>spaceMarineCard(m.squad.unit,army.faction)?.weapons.some(w=>w.phase==='Shooting'&&m.items.some(i=>key(i)===key(w.name.split(/\s+[-–—]\s+/)[0])))):
   members.some(s=>spaceMarineCard(s.unit,army.faction)?.weapons.some(w=>w.phase==='Shooting'&&spaceMarineWeaponCount(s,w.name,army.faction)>0));
  const attacks:readonly Step[]=[fight,...(hasGun?ranged:[])],normalAttacks:readonly Step[]=[fight,...(hasGun?[shoot,enemyShooting]:[])];
  function add(title:string,steps:readonly Step[],summary:string,recipients=[id]){
   if(!recipients.length)return;const name=canonical(unit,title);
   const scoped=part?part.root.id+': '+summary+' Apply this reminder to this separate part; Leader/Support sources in the other part do not contribute.':summary;
   for(const [window,turn,timing] of steps)result.push({id:['11e-chapter-native',army.faction,id,part?.key??'whole',name,window,turn,timing].join(':'),title:part?part.root.id+' · '+name:name,window,turn,timing,summary:scoped,units:[...new Set([id,...recipients])],source:chapter[unit].source,origin:'unit'});
  }
  const effect=(title:string,steps:readonly Step[],summary:string,recipients=formation)=>add(title,steps,summary+sourceExpiry,recipients);
  switch(unit){
   case 'Commander Dante':
    add('Death Mask of Sanguinius',[['Fight','either','start']],'At Fight-phase start, each enemy unit within 6″ of the actual Dante model makes a Battle-shock roll with −1 to that roll.');
    effect('Warden of the Imperium Nihilus',[move,shoot,charge,fight],'Assault and Tactical Doctrine are both active for this formation in addition to any other doctrine. '+SPACE_MARINE_DOCTRINE_EFFECTS.Assault+' '+SPACE_MARINE_DOCTRINE_EFFECTS.Tactical);break;
   case 'Chief Librarian Mephiston':
    add('Quickening',[command],psychic(1)+'Assault Doctrine becomes active for this formation in addition to any other doctrine until the start of your next Command phase. '+SPACE_MARINE_DOCTRINE_EFFECTS.Assault,formation);
    add('Transfixing Gaze',[['Movement','opponent','start']],psychic(2)+'Until this Movement phase ends, when an enemy within 6″ of this formation makes a Fall Back move, it must make a Leadership roll. If failed, it must Remain Stationary. This is a Leadership roll, not a Battle-shock roll.',formation);break;
   case 'The Sanguinor':
    effect('Aura of Fervour',eachPhase,'Friendly Adeptus Astartes formations within 12″ of the actual Sanguinor may re-roll Leadership rolls. This does not grant Battle-shock re-rolls.',astartesIds);
    add('Miraculous Saviour',[['Charge','opponent','end']],'Once per battle across your army, at the end of the opponent’s Charge phase after battle round one, choose up to one enemy unit that made a Charge move this phase. If this unit is in Strategic Reserves, it may make an ingress move and must be set up engaged with that enemy. This ingress does not prevent further movement; it does not itself select the unit to fight.');break;
   case 'Astorath':
    effect('Redeemer of the Lost',[fight],holdDead('a model in this formation','Roll D6, adding 1 if that model was engaged with an enemy whose Toughness is at least this formation’s Toughness; succeed on 4+.'));
    effect('Mass of Doom',[fight],'If this formation made a Charge move this turn, its melee attacks have Devastating Wounds against targets with neither Monster nor Vehicle: Critical Wounds inflict their Damage as mortal wounds on one model after normal damage.');break;
   case 'Sanguinary Priest':
    effect('Blood Chalice',defence,'This formation has +1 Toughness.');
    add('Narthecium',[command],'Once per turn for this unit, this formation heals D3+1 wounds.'+healing,formation);break;
   case 'Lemartes':
    effect('Fury Unbound',[fight],'This formation’s melee attacks have Lethal Hits: a Critical Hit may wound automatically without a Wound roll.');
    effect('Guardian of the Lost',defence,'Attacks targeting this formation have −1 Damage, to a minimum of 1.');break;
   case 'Sanguinary Guard':
    effect('Heirs of Azkaellon',defence,'Attacks targeting this formation with Strength greater than its Toughness subtract 1 from Wound rolls.');
    effect('Angelic Visage',[fight],'Melee attacks targeting this formation subtract 1 from Hit rolls.');break;
   case 'Death Company Dreadnought':add('Driven by Fury',[enemyShooting],'After an enemy finishes shooting in the opponent’s Shooting phase, if those attacks hit this formation, it may surge up to D6+1″. Losing a wound or model is not required.'+surge,formation);break;
   case 'Baal Predator':effect('Overcharged Engines',[move],'This formation may re-roll Advance rolls.');break;
   case 'Death Company Marines':effect('An Honourable Death in Combat',normalAttacks,'While below Starting Strength, this formation’s attacks have Sustained Hits 1. While below half Starting Strength, use Sustained Hits 2 instead; exactly half is not below half. Use the original whole attached formation’s Starting Strength.'+snapLimit);break;
   case 'Death Company Marines With Jump Packs':effect('Savage Fury',[charge],'This formation adds 1 to Charge rolls.');break;
   case 'Blood Angels Captain':
    add('Finest Hour',[fight],'Once per battle for this unit, when its formation is selected to fight, this actual Captain’s melee attacks gain +3 Attacks and Devastating Wounds until the Fight phase ends. Other models do not gain this personal bonus.');
    add('Strategic Acumen',[command],'Choose one Combat Doctrine for this formation until the start of your next Command phase. This unit-specific choice does not spend an army-wide doctrine selection and does not permit an additional simultaneous doctrine by itself. '+doctrineText,formation);break;
   case 'Death Company Captain':effect('Forlorn Hero',[pre],'This whole formation has Scouts 6″ while the actual Captain survives. Resolve the current Scout move and Dedicated Transport passenger requirements.');break;
   case 'Death Company Captain with Jump Pack':effect('Lost to Fury',[fight],'This formation’s melee attacks have Sustained Hits 1.');break;

   case 'Azrael':
    add('Masterful Tactician',[move],'In your Movement phase choose up to one visible friendly Adeptus Astartes formation within 9″ of the actual Azrael model and choose one Combat Doctrine. That doctrine is active for that recipient until the start of your next Command phase. It does not by itself allow an additional simultaneous doctrine. '+doctrineText,astartesIds);
    effect('Supreme Grand Master',normalAttacks,'This formation’s attacks have Sustained Hits 1.'+snapLimit);
    add('Watcher in the Dark',eachPhase,'Once per battle for this unit, when this formation suffers a mortal wound, it may summon its Watcher. It has Feel No Pain 4+ against mortal wounds until this phase ends, including against the triggering wound. No duration extending beyond this phase is printed.',formation);
    if(fitted('The Lion Helm'))effect('The Lion Helm',defence,'This formation has a 4+ invulnerable save while the actual Lion Helm bearer survives. This is a printed unit-wide equipment benefit.');break;
   case 'Belial':
    effect('Grand Master of the Deathwing',attacks,'This formation’s attacks add 1 to Wound rolls against an enemy Character unit. The target may include a Character attached to a Bodyguard; this grants no Precision.');
    add('Strikes of Retribution',[fight],holdDead('the actual Belial model','Roll D6; succeed on 2+.'));break;
   case 'Asmodai':
    effect('Exemplar of Hate',[fight],'This formation may re-roll melee attack Hit rolls.');
    add('Feared Interrogator',[['Fight','either','start']],'At Fight-phase start, each enemy Character unit within 6″ of the actual Asmodai model makes a Battle-shock roll with −1 to that roll.');break;
   case 'Ezekiel':
    effect('Book of Salvation',[fight],'This formation’s melee attacks have +1 Attacks.');
    effect('Psychic Hood',eachPhase,'This formation has Feel No Pain 4+ against psychic attacks and mortal wounds. Roll once per qualifying wound it would lose; overlapping protections do not give extra rolls.');
    add('Engulfing Fear',[shoot],psychic(1)+'Choose one enemy unit within 12″ of the actual Ezekiel model. It makes a Battle-shock roll with −1. Visibility is not required by this ability.');
    add('Whispers of the Shadow Forest',eachPhase,'When an enemy unit targets this formation, '+psychic(1)+'Attacks targeting this formation subtract 1 from Hit rolls until this phase ends. Fixed snap-shot Hit rolls are unchanged.',formation);break;
   case 'Deathwing Terminator Squad':effect('Deathwing',normalAttacks,'This formation’s attacks may ignore modifiers to Ballistic Skill, Weapon Skill and Hit rolls. This does not ignore Damage, Wound-roll or other modifiers.'+snapLimit);break;
   case 'Deathwing Knights':
    effect('Inner Circle',defence,'Attacks targeting this formation have −1 Damage, to a minimum of 1. This unit cannot be targeted with Tactical Dreadnought Fortitude.');
    add('Teleport Homer',[pre],'At battle start, you may place one Teleport Homer token for this unit on the battlefield. It is a marker, not a model. An enemy ending any move within 1″ removes it.',formation);
    add('Teleport Homer',[snap],'Once per battle for this unit, when using Rapid Ingress, use its remaining Teleport Homer token for −1CP. Set up within 3″ of that token and not within 8″ of an enemy, then remove the token. This does not change normal reserve arrival timing.',formation);
    add('Teleport Homer · enemy movement',[['Movement','either','during'],['Charge','either','during'],fight],'Remove this formation’s remaining Teleport Homer token immediately if an enemy ends any move within 1″ of it, including a reaction in your turn. The removed token cannot then reduce Rapid Ingress’s cost.',formation);break;
   case 'Ravenwing Darkshroud':effect('Icon of Old Caliban',[enemyShooting,enemySnap,shoot],'Friendly Dark Angels formations within 6″ of this actual Darkshroud unit have Stealth, granting the Benefit of Cover against ranged attacks. Merely being an eligible roster recipient does not establish range.',darkAngelIds);break;
   case 'Nephilim Jetfighter':effect('Lightning-fast Manoeuvres',[enemyShooting,enemySnap,shoot],'Ranged attacks targeting this formation subtract 1 from Wound rolls.');break;
   case 'Ravenwing Dark Talon':add('Stasis Bomb',[['Fight','opponent','end']],'At the end of the opponent’s Fight phase, choose one visible enemy unit within 24″ of this unit, excluding Aircraft and units with Lone Operative. It is slowed until the end of the opponent’s next Movement phase. When selected to move in that phase, unless it Remains Stationary, roll D6: on 1–4 it suffers D3 mortal wounds and −2″ Move; on 5–6 it suffers 2D3 mortal wounds and −3″ Move.');break;
   case 'Ravenwing Black Knights':effect('Knights of Caliban',[fight],'If this formation made a Charge move this turn, its melee attacks have Anti-Monster 4+ and Anti-Vehicle 4+: an unmodified Wound roll of 4+ is critical against either target type.');break;
   case 'Land Speeder Vengeance':add('Storm of Vengeance',[enemyShooting],'Once per turn for this unit, after an enemy finishes shooting in the opponent’s Shooting phase, if those attacks destroyed a friendly Dark Angels unit within 6″ of this formation, this formation may use normal shooting against only that attacking enemy. Normal target eligibility still applies; rules restricted to your Shooting phase do not trigger. '+spaceMarineWeaponText(army,squad,'Shooting'),formation);break;
   case 'Sammael':
    effect('Cut Off Their Escape',[['Movement','either','during'],['Fight','either','during']],'When an engaged enemy with neither Monster nor Vehicle makes a Fall Back move, it must use desperate escape. If it is Battle-shocked, subtract 1 from its Hazard rolls.');
    effect('Grand Master of the Ravenwing',[move,charge],'This formation has Mobile. Its models can move horizontally through dense terrain under the normal Mobile rules.');
    add('Grand Master of the Ravenwing',[command],'Choose one Combat Doctrine for this formation until the start of your next Command phase. This does not by itself allow an additional simultaneous doctrine. '+doctrineText,formation);break;
   case 'Lazarus':
    effect('Intractable Will',[fight],holdDead('a model in this formation','Roll D6; succeed on 4+.'));
    effect('The Spiritshield Helm',eachPhase,'This formation has Feel No Pain 3+ against psychic attacks and mortal wounds.');break;
   case 'Lion El’jonson':
    effect('Dark Angels Bodyguard',[enemyShooting,enemySnap,shoot],'While this unit is within 3″ of a friendly Dark Angels Infantry unit, it has Lone Operative: enemies more than 12″ away cannot see it or target it with Indirect Fire.');
    effect("The Emperor's Shield",defence,'Attacks targeting this formation with Strength greater than its Toughness subtract 1 from Wound rolls.');
    add('Primarch of the First Legion',[['Command','own','start']],'At the start of your Command phase, choose up to two of Mist-wreathed Shadow Realms, Martial Exemplar and No Hiding from the Watchers. Only the selected abilities are available until the start of your next Command phase.');
    effect('The Watchers',eachPhase,'This formation has Feel No Pain 4+ against psychic attacks and mortal wounds.');
    add('Master Strategist',[command],'Choose one Combat Doctrine for this formation, in addition to any other doctrine, until the start of your next Command phase. '+doctrineText,formation);
    add('Mist-wreathed Shadow Realms',[command],'Only if selected through Primarch of the First Legion and this formation is unengaged: place it in Strategic Reserves. It may make ingress in your next Movement phase, including your first turn. While off the battlefield it cannot project its auras.',formation);
    effect('Martial Exemplar',[fight],'Only while Martial Exemplar is one of the Lion’s selected abilities, friendly Dark Angels formations within 6″ of this actual Lion unit may re-roll melee Hit rolls of 1 and Wound rolls of 1. The selection expires at the start of your next Command phase.',darkAngelIds);
    effect('No Hiding from the Watchers',eachPhase,'Only while No Hiding from the Watchers is selected, friendly Dark Angels formations within 6″ of this actual Lion unit have Feel No Pain 5+ against psychic attacks and mortal wounds. The selection expires at the start of your next Command phase.',darkAngelIds);break;
   case 'Ravenwing Command Squad':
    if(physical.some(m=>m.model==='Ravenwing Ancient'))effect('Astartes Banner',endPhase,'While this unit contains its actual surviving Ravenwing Ancient, models in this formation have +1 Objective Control.');
    if(physical.some(m=>m.model==='Ravenwing Champion')){
     effect('Honour or Death',[move,charge],'While this unit contains its actual surviving Ravenwing Champion, this formation adds 1 to Advance and Charge rolls.');
     add('Honour or Death',[['Charge','opponent','end']],'While the actual Ravenwing Champion survives, targeting this formation with Heroic Intervention costs 1CP less. This alone does not allow an extra use of that Stratagem.',formation);
    }
    if(physical.some(m=>m.model==='Ravenwing Apothecary'))add('Narthecium',[command],'While this unit contains its actual surviving Ravenwing Apothecary, this formation heals D3+1 wounds.'+healing,formation);break;
   case 'Inner Circle Companions':
    effect('Braziers of Judgement',[enemyShooting,enemySnap,shoot],'This formation has Stealth, granting the Benefit of Cover against ranged attacks.');
    effect('Braziers of Judgement',[fight],'Melee attacks targeting this formation subtract 1 from Hit rolls.');
    effect('Emnity for the Unworthy',normalAttacks,'This formation’s attacks add 1 to Hit rolls against an enemy Character unit. This grants no Precision.'+snapLimit);break;

   case 'Chaplain Grimaldus':
    if(physical.some(m=>m.model==='Cenobyte Servitor'))add('Temple Relics',[['Command','own','start']],'At the start of your Command phase, only if this unit contains at least one actual surviving Cenobyte Servitor, choose up to one Temple Relic. Grimaldus has only that selected ability until the start of your next Command phase. Losing the last Servitor after selection does not end the already selected relic; Grimaldus must still survive to provide it.');
    add('Faithful Cenobytes',eachPhase,'If the actual Chaplain Grimaldus model is destroyed, destroy this unit’s remaining Cenobyte Servitor models as well. Each actual Cenobyte Servitor uses 0 transport spaces, while still counting as a physical model for starting strength and other rules.');
    effect('Litanies of the Devout',[fight],'This formation may re-roll melee Hit rolls.');
    effect('Banner of the Emperor Victorious',[move,charge],'Only if this is Grimaldus’s selected Temple Relic, this formation adds 1 to Advance and Charge rolls until the start of your next Command phase. This selected relic requires the surviving Grimaldus model, not the continued survival of a Servitor.');
    effect('Column from the Major Altar',defence,'Only if this is Grimaldus’s selected Temple Relic, this formation has +1 Toughness until the start of your next Command phase. This selected relic requires the surviving Grimaldus model, not the continued survival of a Servitor.');
    effect('Water from the Stoup of Elucidation',[fight],'Only if this is Grimaldus’s selected Temple Relic, this formation’s melee attacks improve AP by 1 until the start of your next Command phase. This selected relic requires the surviving Grimaldus model, not the continued survival of a Servitor.');break;
   case 'Castellan':add('Vehement Aggression',[fight],'When this formation is selected to fight, you may make a Leadership roll. Until this Fight phase ends, its melee attacks may re-roll Hit rolls of 1 regardless of that result; if the roll succeeds, they may also re-roll Wound rolls of 1. This is a Leadership roll, not a Battle-shock roll.',formation);break;
   case 'High Marshal Helbrecht':
    add('High Marshal',[['Fight','either','start']],'At Fight-phase start choose up to one enemy unit engaged with this formation and roll D6: on 2–3 it suffers D3 mortal wounds; on 4–5 it suffers 3; on 6+ it suffers D3+3. On 1 there is no effect.',formation);
    effect('Crusade of Wrath',[fight],'This formation’s melee attacks have +1 Attacks and +1 Strength.');break;
   case 'Emperor’s Champion':
    add('Armour of Faith',defence,'Attacks allocated to the actual Emperor’s Champion model have −1 Damage, to a minimum of 1. Other models do not gain this personal reduction.');
    effect("Sigismund's Heir",[charge],'This formation adds 1 to Charge rolls.');break;
   case 'Marshal':
    effect('Inspirational Exemplar',[fight],'This formation’s melee attacks add 1 to Hit rolls.');
    add('Pious Fervour',[fight],'When this formation is selected to fight, you may give this actual Marshal’s melee attacks +1 Attacks per enemy unit within 6″ of the Marshal, to a maximum of +3 Attacks, until this Fight phase ends. Count enemy units, not models; attached comrades do not gain this personal bonus.');break;
   case 'Sword Brethren Squad':add('Exploit their Cowardice',[['Movement','opponent','during']],'In the opponent’s Movement phase, after an enemy that was engaged with this formation ends a Fall Back move, if this formation is now unengaged it may make a Normal move up to 6″. This is a Normal move, so it cannot finish engaged.',formation);break;
   case 'Crusader Squad':add('Righteous Zeal',[enemyShooting],'After an enemy finishes shooting in the opponent’s Shooting phase, if those attacks destroyed a model in this formation, it may surge up to D6+1″. A hit or wound without a destroyed model is insufficient.'+surge,formation);break;
   case 'Execrator':
    effect('Remorseless Persecution',[move,charge],'When this formation is selected to Advance in your Movement phase, that Advance does not prevent it from declaring a charge. Other charge restrictions still apply.');
    add('Condemnatory Annihilation',[fight],'After this formation fights, if it destroyed an enemy model this phase, each enemy unit still engaged with it makes a Battle-shock roll with −1 to that roll.',formation);break;
   case 'Crusade Ancient':
    add('Martial Honour',[fight],'Once per battle for this unit, if this formation’s melee attacks destroyed an enemy unit this phase, this actual Crusade Ancient may gain +5 Objective Control until the battle ends. This personal benefit does not give every attached model +5 OC.');
    add('Martial Honour · active honour',endPhase,'Only if Martial Honour was already earned and used, this actual surviving Crusade Ancient retains +5 Objective Control until the battle ends.');
    add('Vengeful Exhortation',[fight],'You may use this ability in the Fight phase. Until that phase ends, '+holdDead('a model in this formation','roll D6; succeed on 4+.'),formation);break;

   case 'Logan Grimnar':
    add('High King of Fenris',[move],'Once per battle round for this unit, in your Movement phase choose up to one friendly Space Wolves formation currently in Strategic Reserves. When that chosen formation makes ingress this phase, treat the battle round as one higher for that ingress. This can permit first-round arrival; it does not grant Deep Strike or change an unrelated reserve deadline.',wolfIds);
    add('Guile of the Wolf',startPhase,'At the start of each phase, Assault, Devastator and Tactical Doctrine are all active for this formation for that phase. These unit-specific activations do not spend army-wide doctrine selections. '+doctrineText,formation);break;
   case 'Ragnar Blackmane':{
    add('Battle-lust',[fight],'If this formation made a Charge move this turn, this actual Ragnar model’s melee attacks have +2 Attacks. Attached models do not gain this personal bonus.');
    const originalBody=originalGroups.find(g=>g.members.some(s=>s.id===id))?.root.unit;
    if(originalBody==='Blood Claws')effect('War Howl',[fight],'While Ragnar is attached to the original Blood Claws formation, its melee attacks have +1 Strength and Sustained Hits 1. Ragnar retains his own leading ability for surviving members if that original Bodyguard is destroyed.');
    if(originalBody==='Wolf Guard Headtakers')effect('War Howl',[move,charge],'While Ragnar is attached to the original Wolf Guard Headtakers formation, an Advance selected for it does not prevent declaring a charge. This applies to the Headtaker formation containing its Leader after a chosen split, not to a separate Hunting Wolves unit. Ragnar retains this leading ability after the original Bodyguard is destroyed.');break;
   }
   case 'Njal Stormcaller':
    effect('Wind Walker',[move,...ranged],'This formation’s ranged attacks have Assault. When selected to Advance, it may change its Advance roll to 6; this changes the roll, not its total movement distance.');
    add('Murderous Hurricane',[move],psychic(1)+'Choose one visible enemy unit within 12″ of this formation. That enemy cannot make snap-shooting attacks until this Movement phase ends. No duration extending to the Shooting or Charge phase is printed.');
    add('Storm Caller',eachPhase,'When an enemy unit targets this formation, '+psychic(1)+'This formation has −3″ detection range until this phase ends. This changes detection, not weapon Range or Lone Operative distance.',formation);
    add("Tempest's Wrath",[shoot],psychic(1)+'Choose one visible enemy unit within 18″ of this formation. It is suppressed until the start of your next turn: its attacks subtract 1 from Hit rolls. Fixed snap-shot Hit rolls remain unchanged.');break;
   case 'Ulrik The Slayer':
    add("Slayer's Oath",[['Start of battle round','either','start']],'At the start of the first battle round only, choose up to one enemy Character, Monster or Vehicle unit as this formation’s slayer’s oath. Against that chosen target, this formation’s attacks may ignore Ballistic Skill, Weapon Skill and Hit-roll modifiers. This choice grants no Precision.'+snapLimit,formation);
    effect("Slayer's Oath",normalAttacks,'Against the enemy actually chosen as this formation’s slayer’s oath at the start of the first battle round, this formation’s attacks may ignore Ballistic Skill, Weapon Skill and Hit-roll modifiers. Do not choose a new target merely because another enemy is eligible.'+snapLimit);
    effect('Oathbound',[fight],'This formation’s melee attacks add 1 to Hit rolls. Against its already chosen slayer’s oath target, also add 1 to Wound rolls. The target must be the one actually chosen at the start of the first battle round.');break;
   case 'Bjorn The Fell-handed':
    effect('Legendary Tenacity',defence,'Attacks targeting this formation with Strength greater than its Toughness subtract 1 from Wound rolls.');
    add('Ancient Tactician',eachPhase,'Once per turn across your army, when targeting this formation with a Stratagem, reduce that use’s CP cost by 1. This does not itself permit targeting it with an otherwise ineligible Stratagem or using a Stratagem an extra time.',formation);break;
   case 'Blood Claws':effect('Berserk Charge',[move,charge],'When this formation is selected to Advance, that Advance does not prevent it from declaring a charge. Other charge restrictions still apply.');break;
   case 'Grey Hunters':effect('Cunning Hunters',[fight],'In the Fight phase, while this formation is within range of an objective, its melee attacks have +1 Strength and improve AP by 1. It need not control that objective.');break;
   case 'Iron Priest':
    add('Gift of the Iron Wolf',[move],'At the start or end of this formation’s move in your Movement phase, choose up to one friendly Space Wolves Vehicle model within 3″ of this actual Iron Priest. That model heals D3 wounds and its attacks may ignore Hit- and Wound-roll modifiers until the start of your next Movement phase. Do not choose the same Vehicle model for this ability more than once per phase; it does not ignore BS/WS modifiers or permit snap Hit modifications.',wolfVehicleIds);
    add('Iron Priest',[enemyShooting,enemySnap,shoot],'While this actual Iron Priest is within 3″ of a friendly Space Wolves Vehicle unit, the Priest model has Lone Operative. An attached formation benefits only when every surviving model has Lone Operative; this does not grant it to unqualified Bodyguards.');
    add('Judgement of the Omnissiah',attacks,'This actual Iron Priest’s attacks may re-roll Wound rolls against an enemy engaged with a friendly Space Wolves Vehicle unit. This is personal to the Priest; it does not grant Hit re-rolls or require the Priest’s own unit to be engaged.');break;
   case 'Wulfen':effect('Savage Frenzy',[['Movement','either','during'],fight],'When an enemy engaged with this formation, with neither Monster nor Vehicle, makes a Fall Back move, it must use desperate escape. If that enemy is Battle-shocked, subtract 1 from its Hazard rolls.');break;
   case 'Murderfang':
    effect('Murder-maker',[fight],'In the Fight phase, when an actual friendly Wulfen model within 6″ of this Murderfang unit is destroyed before that model’s formation has been selected to fight, roll D6. On 4+, retain that model until its own formation has fought or the phase ends, whichever comes first, then remove it. Only models with Wulfen qualify; sharing a formation with a Wulfen model is insufficient.',wulfenIds);
    effect('Bestial Fury',[move,charge],'This formation may re-roll Advance and Charge rolls.');break;
   case 'Arjac Rockfist':
    add('Champion of the Kingsguard',attacks,'This actual Arjac model’s attacks against a Character unit may re-roll Hit rolls of 1 and Wound rolls of 1. Other models do not gain these personal re-rolls. During permitted snap shooting, only the Wound re-roll remains available.'+snapLimit);
    effect('Anvil of Endurance',[fight],holdDead('a model in this formation','Roll D6; succeed on 4+.'));break;
   case 'Wolf Guard Terminators':effect('Rugged Resilience',defence,'Attacks targeting this formation with Strength greater than its Toughness subtract 1 from Wound rolls.');break;
   case 'Thunderwolf Cavalry':effect('Thunderous Charge',[fight],'If this formation made a Charge move this turn, its melee attacks have +1 Strength and +1 Damage.');break;
   case 'Fenrisian Wolves':
    add('Predatory Instinct',[['Movement','opponent','during']],'Once per battle round for this unit, when an enemy ends a move within 8″ of this formation in the opponent’s Movement phase, if this formation is unengaged it may make a Normal move up to D6″. A Normal move cannot finish engaged.',formation);
    effect('Hunting Hounds',endPhase,'While this formation is not Battle-shocked and within 6″ of a friendly Space Wolves Character model without Wulfen, every model in this formation has +1 Objective Control.');break;
   case 'Venerable Dreadnought':effect('Fervour of the Ancients',[move,charge],'Friendly Space Wolves formations within 6″ of this actual Venerable Dreadnought unit add 1 to Advance and Charge rolls.',wolfIds);break;
   case 'Wolf Priest':
    add('Healing Balms',[command],'This formation heals D3+1 wounds.'+healing,formation);
    effect('Litany of Hate',[fight],'This formation’s melee attacks have Lance: add 1 to Wound rolls if the formation made a Charge move this turn.');break;
   case 'Wolf Guard Battle Leader':
    effect('Tempered Ferocity',normalAttacks,'This formation’s attacks have Sustained Hits 1. Against an enemy within 6″ of this formation, its attacks may also re-roll Hit rolls of 1.'+snapLimit);
    add('Heroic Last Stand',[fight],holdDead('the actual Wolf Guard Battle Leader model','Roll D6; succeed on 2+.'));break;
   case 'Wolf Guard Headtakers':
    add('Headhunters',[['Start of battle round','either','start']],'At the start of the first battle round only, choose up to one enemy unit as this formation’s quarry. Its attacks against the chosen quarry have Devastating Wounds and Precision. Each time the quarry is destroyed, choose a new enemy unit as the quarry.',formation);
    effect('Headhunters',attacks,'Only against this formation’s actually selected quarry, its attacks have Devastating Wounds and Precision. Replace that chosen quarry when it is destroyed. Precision changes eligible Character allocation; it does not let you split attacks illegally.');break;
   case 'Wulfen with Storm Shields':add('Hammer Blow',[fight],'After this formation fights, choose up to one enemy Monster or Vehicle unit hit by its attacks. It is suppressed until the start of your next turn: its attacks subtract 1 from Hit rolls. Fixed snap-shot Hit rolls remain unchanged.',formation);break;
   case 'Wulfen Dreadnought':{
    const meleeItems=physical.flatMap(m=>m.items).filter(item=>chapter[unit].weapons.some(w=>w.phase==='Fight'&&key(w.name.split(' - ')[0])===key(item)));
    if(meleeItems.length===2)effect('Violent Fury',[fight],'This actual Wulfen Dreadnought is equipped with two melee weapons, so this formation’s melee attacks have Twin-linked and may re-roll Wound rolls. Count actual weapons, not the Strike/Sweep profiles of one weapon.');
    add('Bestial Rage',[enemyShooting],'After an enemy finishes shooting in the opponent’s Shooting phase, if this formation lost a wound to those attacks, it may surge up to D6+1″. A hit without a lost wound is insufficient.'+surge,formation);break;
   }
   case 'Wolf Scouts':
    effect('Deadly Stalkers',attacks,'This formation’s attacks add 1 to Wound rolls against an enemy unit more than 6″ from every other enemy unit. Check isolation from the opponent’s other units, not from your own army.');
    if(fitted('Haywire Mine (Once per battle, per unit)'))add('Haywire Mine',[shoot],'Once per battle for this equipped unit, choose up to one visible enemy within 6″ of this formation and roll D6. On 2+ it suffers D3 mortal wounds, or 2D3 if it is a Vehicle. The actual equipped mine bearer must survive; a Wolf Scout without the optional mine cannot use it.',formation);break;
  }
  if(inventory[unit].some(a=>a.name==='Black Rage')){
   effect('Black Rage',[fight],'This formation may re-roll melee Hit rolls of 1.');
   effect('Black Rage',[['Movement','either','during'],...endPhase],'If either condition is absent—at least one friendly Blood Angels Character model within 6″, and at least one friendly Chaplain model within 12″—this formation cannot Fall Back and its Objective Control is modified to 0. The current rule uses “or” between the two absence conditions; both proximity checks must be met to avoid the restriction.');
  }
  if(['Death Company Captain','Death Company Captain with Jump Pack'].includes(unit))add('Death Visions of Sanguinius',[fight],'After an enemy finishes fighting in the Fight phase, if those attacks destroyed this actual Captain, roll D6, adding 2 if the Captain was engaged with an enemy Warlord unit. On 2–3 that attacking enemy suffers D3 mortal wounds; on 4–5 it suffers 3; on 6+ it suffers D3+3. An unmodified 1 with no bonus has no effect.');
  if(['Deathwing Knights','Deathwing Terminator Squad'].includes(unit)&&fitted('Watcher in the Dark'))add('Watcher in the Dark',eachPhase,'Once per battle for this unit, just after a mortal wound is allocated to an Adeptus Astartes model in this equipped formation, summon its Watcher: models in the formation have Feel No Pain 4+ against mortal wounds until phase end, including against the triggering wound. Remove its token after use; the token is not an extra model.',formation);
  if(['Wulfen','Wulfen with Storm Shields'].includes(unit)&&fitted('Death Totem'))effect('Death Totem',[fight],'While at least one actual Death Totem bearer in this unit survives, this formation may re-roll melee Hit rolls of 1. Multiple totems do not stack extra re-rolls.');
  if(['Wolf Guard Headtakers','Wolf Scouts'].includes(unit)&&physical.some(m=>m.model==='Hunting Wolf'))effect('Hunting Hounds',endPhase,'While this formation is not Battle-shocked and within 6″ of a friendly Space Wolves Character model without Wulfen, only its actual Hunting Wolf models have +1 Objective Control. Headtakers, Scouts and attached models do not receive that personal-model bonus.');
  }
 }
 // A selected recipient or a completed activation is separate from a live
 // aura. Keep only its printed duration (or Core 01.02.02's phase default).
 for(const source of original.filter(s=>chapter[s.unit]&&legal.has(s.unit))){
  const {unit,id}=source,alive=selected.some(s=>s.id===id),originalGroup=originalGroups.find(g=>g.members.some(s=>s.id===id));
  const originalSplit=originalGroup&&chapterSplitPlan(army,originalGroup,original),currentSplit=originalGroup&&chapterSplitPlan(army,originalGroup,roster);
  const sourceParts=originalSplit?.valid?originalSplit.parts.filter(p=>p.physical.some(m=>m.squad.id===id)):[undefined];
  for(const originalPart of sourceParts){
  const part=originalPart&&currentSplit?.parts.find(p=>p.key===originalPart.key);
  const own=(part?part.members:roster.filter(s=>originalGroup?.members.some(m=>m.id===s.id))).filter(s=>legal.has(s.unit)).map(s=>s.id);
  const add=(title:string,steps:readonly Step[],summary:string,recipients=astartesIds)=>{
   if(!recipients.length)return;
   const scoped=id+(originalPart?' / '+originalPart.root.id:'')+': '+summary+(originalPart?' This effect remains with its original declared part; it does not transfer to the other part.':'');
   for(const [window,turn,timing] of steps)result.push({id:['11e-chapter-lasting',army.faction,id,originalPart?.key??'whole',title,window,turn,timing].join(':'),title:originalPart?originalPart.root.id+' · '+title:title,window,turn,timing,summary:scoped,units:[...new Set([id,...recipients])],source:chapter[unit].source,origin:'unit'});
  };
  if(unit==='Blood Angels Captain')add('Strategic Acumen · selected doctrine',[move,shoot,charge,fight],'Only if this formation already received Strategic Acumen’s chosen doctrine, it stays active until the start of your next Command phase. '+doctrineText+persistent,own);
  if(unit==='Chief Librarian Mephiston'){
   add('Quickening · active psychic effect',[move,shoot,charge,fight],'If Quickening was already used, Assault Doctrine remains active for the original formation in addition to other doctrines until the start of your next Command phase. '+SPACE_MARINE_DOCTRINE_EFFECTS.Assault+persistent,own);
   add('Transfixing Gaze · active psychic effect',[['Movement','opponent','during']],'If this power was already used at the start of this opponent’s Movement phase, an enemy within 6″ of the surviving original formation must pass a Leadership roll to Fall Back; on failure it must Remain Stationary. This power expires when this Movement phase ends.'+persistent,own);
  }
  if(unit==='Azrael')add('Masterful Tactician · chosen recipient',[move,shoot,charge,fight],'Only the formation already chosen in your Movement phase retains its selected doctrine until the start of your next Command phase. '+doctrineText+persistent);
  if(unit==='Ezekiel')add('Whispers of the Shadow Forest · active psychic effect',defence,'If this power was already used this phase, attacks targeting the original formation retain −1 to Hit rolls until this phase ends. Fixed snap-shot Hit rolls stay unchanged.'+persistent,own);
  if(unit==='Ravenwing Dark Talon')add('Stasis Bomb · slowed enemy',[['Movement','opponent','during']],'Only the enemy already bombed is slowed through the end of the opponent’s next Movement phase. When it is selected to move in that phase and does not Remain Stationary, roll D6: 1–4 causes D3 mortal wounds and −2″ Move; 5–6 causes 2D3 mortal wounds and −3″ Move. The printed end-of-Movement expiry is retained.'+persistent,allIds);
  if(unit==='Sammael')add('Grand Master of the Ravenwing · selected doctrine',[move,shoot,charge,fight],'Only if this formation already received its chosen doctrine, it remains active until the start of your next Command phase. The separate Mobile ability still needs its surviving source. '+doctrineText+persistent,own);
  if(unit==='Lion El’jonson'){
   add('Master Strategist · selected doctrine',[move,shoot,charge,fight],'If already chosen, this formation’s additional doctrine remains active until the start of your next Command phase. '+doctrineText+persistent,own);
   add('Mist-wreathed Shadow Realms · return',[move],'Only if this formation was placed in Strategic Reserves by the selected Mist-wreathed Shadow Realms ability, it may make ingress in the next own Movement phase, including turn one. Apply its actual Deep Strike or other legal ingress placement; no return is granted merely because it could have chosen the ability.',own);
  }
  if(unit==='Azrael'||['Deathwing Knights','Deathwing Terminator Squad'].includes(unit)&&spaceMarineWeaponCount(source,'Watcher in the Dark',army.faction)>0)add('Watcher in the Dark · active protection',eachPhase,'Only if this unit already used its once-per-battle Watcher in the current phase, its original formation has Feel No Pain 4+ against mortal wounds until this phase ends. Do not extend the protection into a later phase.'+persistent,own);
  if(unit==='Castellan')add('Vehement Aggression · active effect',[fight],'If this formation already used Vehement Aggression this Fight phase, its melee attacks retain Hit re-rolls of 1; they also retain Wound re-rolls of 1 only if the Leadership roll succeeded. Both expire at the end of this Fight phase.'+persistent,own);
  if(unit==='Crusade Ancient')add('Vengeful Exhortation · active effect',[fight],'If Vengeful Exhortation was already used this Fight phase, when a model in the original formation is destroyed before it was selected to fight, roll D6. On 4+, retain that model until the formation fights or the phase ends, whichever comes first, then remove it. The activated protection lasts only this Fight phase.'+persistent,own);
  if(unit==='Logan Grimnar'){
   add('High King of Fenris · chosen reserves',[move],'Only the friendly Space Wolves formation already selected this Movement phase treats the battle round as one higher for its ingress in this phase. This does not grant every eligible reserve formation early arrival.'+persistent,wolfIds);
   add('Guile of the Wolf · active doctrines',[move,shoot,charge,fight],'If Guile of the Wolf activated at this phase’s start, all three doctrines remain active for the original formation until this phase ends. '+doctrineText+persistent,own);
  }
  if(unit==='Njal Stormcaller'){
   add('Murderous Hurricane · chosen enemy',[enemySnap],'Only the enemy already chosen by this power in the current own Movement phase cannot make snap-shooting attacks. This restriction expires at the end of this Movement phase; it does not persist into Shooting or Charge.'+persistent,allIds);
   add('Storm Caller · active psychic effect',defence,'If Storm Caller was already used this phase, the original formation retains −3″ detection range until the phase ends. Weapon Range and Lone Operative distance are unchanged.'+persistent,own);
   add("Tempest's Wrath · suppressed enemy",defence,'Only the enemy already selected by this power is suppressed, with −1 to attack Hit rolls until the start of your next turn. Fixed snap-shot Hit rolls stay unchanged.'+persistent,allIds);
  }
  if(unit==='Iron Priest')add('Gift of the Iron Wolf · chosen vehicle',[...ranged,fight],'Only the actual Space Wolves Vehicle model already selected may ignore Hit- and Wound-roll modifiers until the start of your next Movement phase. This grants no BS/WS immunity and does not change fixed snap-shot Hit rolls.'+persistent,wolfVehicleIds);
  if(unit==='Wulfen with Storm Shields')add('Hammer Blow · suppressed enemy',defence,'Only the Monster or Vehicle enemy already selected after this formation fought is suppressed, with −1 to attack Hit rolls until the start of your next turn. Fixed snap-shot Hit rolls stay unchanged.'+persistent,allIds);
  if(!alive){
   if(['Death Company Captain','Death Company Captain with Jump Pack'].includes(unit))add('Death Visions of Sanguinius',[fight],'If this actual Captain was destroyed by the enemy that just finished fighting in this Fight phase, resolve the pending Death Visions roll: D6, +2 if the Captain was engaged with an enemy Warlord unit; 2–3 causes D3 mortal wounds, 4–5 causes 3, and 6+ causes D3+3 to that attacking enemy. Removing the Captain from the surviving roster does not erase this destruction trigger.',[id,...own]);
   const personal=unit==='Belial'?'Strikes of Retribution':unit==='Wolf Guard Battle Leader'?'Heroic Last Stand':undefined;
   if(personal)add(personal,[fight],'If this model was destroyed before its formation was selected to fight in the current Fight phase and its own fight-on-death roll was 2+, retain it until the original formation has fought or this phase ends, whichever comes first, then remove it. This reminder resolves an already pending death; it does not restore the model or select it to fight.',[id,...own]);
   const protection=unit==='Astorath'?'Redeemer of the Lost':unit==='Lazarus'?'Intractable Will':unit==='Arjac Rockfist'?'Anvil of Endurance':undefined;
   if(protection)add(protection+' · pending destroyed model',[fight],'Any model whose qualifying fight-on-death roll already succeeded while this source applied is retained until its original formation has fought or this Fight phase ends, whichever comes first. Removing the ability source does not erase that pending removal. Do not grant new protection after the source’s final attacking sequence has finished.',[id,...own]);
   if(unit==='Murderfang')add('Murder-maker · pending Wulfen model',[fight],'Only a friendly Wulfen model whose Murder-maker roll already succeeded is retained until its own formation has fought or this Fight phase ends, whichever comes first. This does not create new aura triggers after Murderfang is gone.',wulfenIds);
  }
  }
 }
 return result;
}
