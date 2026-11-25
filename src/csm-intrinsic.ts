import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {CSM_ARMY_SHEETS,csmMusterUnits} from './csm-army-data';
import {csmArmyCard,csmArmyHasRangedWeapon,csmArmyModelLoadouts,csmArmyWeaponCount} from './csm-army-loadouts';
import {csmKeywords} from './csm-keywords';
import {csmChosenMark,csmHasDetachment,csmSelectedUpgrade} from './csm-muster-data';
import {csmCargoFormations,csmFormations} from './csm-transports';
import {eligibleCsmUpgrades,csmSoulLinkSources} from './csm-detachment-data';
import {csmCanDarkPact} from './csm-dark-pacts';
import {csmReactionShooting} from './csm-reactions';
import {expandRoster,type RosterInstance} from './roster-instances';

type Step=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const shoot:Step=['Shooting','own','during'],fight:Step=['Fight','either','during'],move:Step=['Movement','own','during'];
const snap:Step=['Movement','opponent','end'],incoming:Step=['Shooting','opponent','during'],incomingSnap:Step=['Movement','own','end'],returnFire:Step=['Shooting','own','during'];
const eachPhase=PHASES.map((p):Step=>[p,'either','during']),endPhase=PHASES.map((p):Step=>[p,'either','end']);
const defence=[incoming,incomingSnap,returnFire,fight] as const;
const pack='https://assets.warhammer-community.com/eng_wh40k_faction_pack_chaos_space_marines-vs0xkzuia9-omgej8huqu.pdf';
const sheets=new Map(CSM_ARMY_SHEETS.map(s=>[s.unit,s]));
const key=(s:string)=>s.toLowerCase().replace(/[^a-z]/g,'');
const weaponKey=(s:string)=>key(s.split(/\s+[–—-]\s+/)[0]);
const unitPassives=new Set(['Rapid Assault','Chosen Marauders','Headlong Destruction','Veterans of the Long War','Visions of Suffering','Twisted Defence Force','Murderous Charge','Bringers of Change']);
const iconUnits=new Set(['Chaos Bikers','Chosen','Dark Commune','Legionaries','Possessed']);
const princes=new Set(['Heretic Astartes Daemon Prince','Heretic Astartes Daemon Prince With Wings']);
interface Copy{bearer:RosterInstance;source:RosterInstance}

function reminders(army:ArmySelection,roster:readonly RosterInstance[],copy?:Copy):GeneratedReminder[]{
 if(army.faction!=='Chaos Space Marines')return [];
 const legal=new Set(csmMusterUnits(army));
 const native=copy?[copy.bearer]:roster.filter(s=>sheets.has(s.unit)&&legal.has(s.unit));
 const groups=csmFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit))),originalGroups=csmFormations(army,expandRoster(army));
 const groupOf=(s:RosterInstance)=>groups.find(g=>g.members.some(m=>m.id===s.id));
 const has=(s:RosterInstance,tag:string)=>csmKeywords(army,s,undefined,roster).has(tag);
 const tagged=(tags:string[],exclude:string[]=[])=>groups.filter(g=>tags.every(t=>g.members.some(s=>has(s,t)))&&!exclude.some(t=>g.members.some(s=>has(s,t))));
 const ids=(gs:typeof groups)=>gs.flatMap(g=>g.members.map(s=>s.id));
 const haGroups=tagged(['HERETIC ASTARTES']),ha=ids(haGroups),haInfantry=ids(tagged(['HERETIC ASTARTES','INFANTRY']));
 const gunGroups=groups.filter(g=>g.members.some(csmArmyHasRangedWeapon));
 const normalGuns=ids(gunGroups),haGuns=ids(haGroups.filter(g=>g.members.some(csmArmyHasRangedWeapon)));
 const snapGuns=ids(gunGroups.filter(g=>!g.members.some(s=>has(s,'TITANIC'))));
 const reactions=(s:RosterInstance)=>csmReactionShooting(army,s,roster).length>0;
 const hits=(s:RosterInstance)=>(csmArmyCard(s)?.weapons??[]).some(w=>w.phase==='Shooting'&&!w.abilities.includes('torrent')&&csmArmyWeaponCount(s,w.name)>0);
 const chosen=(s:RosterInstance,name:string)=>csmSelectedUpgrade(army,s)===name&&eligibleCsmUpgrades(army,s.unit,s.id).some(u=>u.name===name);
 const result:GeneratedReminder[]=[];
 for(const squad of native){
  const {id}=squad,unit=copy?.source.unit??squad.unit,group=groupOf(squad);if(!group)continue;
  const formation=group.members.map(s=>s.id),original=originalGroups.find(g=>g.members.some(s=>s.id===id));
  const leading=group.root.id!==id||!!original&&original.root.id!==id;
  const bodySource=group.root.id===id&&group.members.length>1;
  const ranged=group.members.some(csmArmyHasRangedWeapon),hitRanged=group.members.some(hits),titanic=group.members.some(s=>has(s,'TITANIC'));
  const selfGun=csmArmyHasRangedWeapon(squad),normalReaction=group.members.some(reactions),selfReaction=reactions(squad);
  const pact=csmCanDarkPact(army,group.members);
  const physical=group.members.flatMap(csmArmyModelLoadouts);
  const personal=copy?csmArmyModelLoadouts(squad).filter(m=>csmKeywords(army,squad,m.model,roster).has('CHARACTER')):csmArmyModelLoadouts(squad);
  const contains=(role:string)=>physical.some(m=>key(m.model)===key(role));
  const personalCount=(name:string)=>personal.flatMap(m=>m.items).filter(item=>weaponKey(item)===weaponKey(name)).length;
  const fitted=(name:string)=>personalCount(name)>0;
  const psychic=(phase:'Shooting'|'Fight')=>(csmArmyCard(squad)?.weapons??[]).some(w=>w.phase===phase&&w.abilities.includes('psychic')&&personalCount(w.name)>0);
  // Soul Link itself grants PSYKER to its actual bearer while the copy lasts.
  const personalPsyker=!!copy&&personal.length>0||personal.some(m=>csmKeywords(army,squad,m.model,roster).has('PSYKER'));
  const pursuit=csmHasDetachment(army,'Dread Talons')&&group.members.some(s=>has(s,'HERETIC ASTARTES'))&&group.members.some(s=>has(s,'INFANTRY'));
  const chargeSteps:Step[]=[['Charge','own','during'],...(pursuit?[snap]:[])];
  const chargeTitles=new Set(['Head Taker','Crushing Charge','Brutal Raider','Raider’s Due','Daemonkin','Warptime','Chosen Marauders']);
  const pactSteps:Step[]=[fight,...(ranged?[shoot]:[]),...(ranged&&!titanic?[snap]:[]),...(normalReaction?[incoming]:[])];
  const attackSteps:Step[]=[fight,...(ranged?[shoot]:[]),...(ranged&&!titanic?[snap]:[]),...(normalReaction?[incoming]:[])];
  const personalAttack:Step[]=[fight,...(selfGun?[shoot]:[]),...(selfGun&&!titanic?[snap]:[]),...(selfReaction?[incoming]:[])];
  const ownSoulLink=!copy&&chosen(squad,'Soul Link');
  function add(title:string,steps:readonly Step[],summary:string,recipients=[id],source=sheets.get(unit)!.source){
   if(!recipients.length)return;
   const condition=copy?'Only if '+id+' chose '+copy.source.id+' for Soul Link in your Command phase, until your next Command phase: ':ownSoulLink?'Uses from this Soul Link bearer require that ability not to have been replaced; other surviving models keep their own rules. ':'';
   const expiry=bodySource&&unitPassives.has(title)?' The original '+unit+' source must survive; if its last source model dies to an attack, keep this benefit until the attacking unit finishes its attacks.':'';
   for(const [window,turn,timing] of steps){
    const chargePermission=window==='Movement'&&turn==='opponent'&&chargeTitles.has(title)?'Only through Merciless Pursuit: this unengaged Heretic Astartes Infantry formation may charge one eligible enemy within 6″ that Fell Back this turn; it gains no Charge bonus. ' : '';
    result.push({id:[copy?'11e-csm-copied':'11e-csm-native',id,copy?.source.id??'',title,window,turn,timing].join(':'),title:copy?'Soul Link · '+title:title,window,turn,timing,summary:condition+chargePermission+summary+expiry,units:[...new Set([id,...recipients])],source,origin:'unit'});
   }
  }
  const leaderExpiry=' The original ability source must survive; its leading benefit continues after its original Bodyguard is destroyed. If that source dies to an attack, keep the benefit until the attacking unit finishes.';
  const led=(title:string,steps:readonly Step[],summary:string)=>{if(leading)add(title,steps,summary+leaderExpiry,formation);};
  const attack=(title:string,summary:string,snapSummary?:string,hitOnly=false)=>{
   add(title,[fight],summary,formation);
   if(hitOnly?hitRanged:ranged)add(title,[shoot,...(normalReaction?[incoming]:[])],summary,formation);
   if(snapSummary&&ranged&&!titanic)add(title,[snap],snapSummary,formation);
  };
  if(iconUnits.has(unit)&&fitted('Chaos icon')&&pact)add('Chaos Icon',pactSteps,'While this formation’s actual Chaos icon bearer survives, you may re-roll its Leadership test for Dark Pacts. This does not allow re-rolling other Leadership or Battle-shock tests.',formation);
  switch(unit){
   case 'Abaddon The Despoiler':{
    add('SUPREME COMMANDER',[['Pre-battle','either','during']],'Abaddon must be your Warlord if he is included in this army.');
    add('The Warmaster',[['Command','own','during']],'Choose one of Abaddon’s three Warmaster abilities. Only that chosen aura applies until the start of your next Command phase; every aura requires this Abaddon model to remain on the battlefield.');
    const elite=tagged(['HERETIC ASTARTES'],['DAMNED']),eliteIds=ids(elite),eliteGuns=ids(elite.filter(g=>g.members.some(hits)));
    add('Paragon of Hatred',[fight],'Only while Paragon of Hatred is the selected Warmaster aura: models in friendly Heretic Astartes formations within 6″ of this Abaddon model may re-roll attack Hit rolls. Damned formations are excluded.',eliteIds);
    add('Paragon of Hatred',[shoot,...(elite.some(g=>g.members.some(reactions))?[incoming]:[])],'Only while Paragon of Hatred is the selected Warmaster aura: models in friendly non-Damned Heretic Astartes formations within 6″ of Abaddon may re-roll ranged attack Hit rolls. This cannot change snap-shot Hit rolls.',eliteGuns);
    add('Mark of Chaos Ascendant',defence,'Only while Mark of Chaos Ascendant is the selected Warmaster aura: models in friendly non-Damned Heretic Astartes Infantry or Mounted formations within 6″ of this Abaddon have a 4+ invulnerable save.',ids(elite.filter(g=>g.members.some(s=>has(s,'INFANTRY')||has(s,'MOUNTED')))));
    add('Lord of the Traitor Legions',eachPhase,'Only while Lord of the Traitor Legions is the selected Warmaster aura: friendly non-Damned Heretic Astartes formations within 6″ of this Abaddon may re-roll their Leadership and Battle-shock tests.',eliteIds);
    if(pact)add('Dark Destiny',pactSteps,'Each time this Abaddon’s formation makes a Dark Pact, gain 1CP only if the resulting Leadership test is passed and its result is 7 or more. Apply the normal additional-CP limit. This can trigger during permitted Overwatch even though the pact’s Critical Hit benefits cannot.',formation,pack);
    break;
   }
   case 'Accursed Cultists':add('Howling Horde',[incoming],'After an enemy finishes shooting in the opponent’s Shooting phase, if those attacks destroyed at least one model in this formation, it may make a surge move up to D6″. Follow the core surge restrictions; merely losing a wound does not trigger this rule.',formation);break;
   case 'Chaos Bikers':add('Rapid Assault',[fight],'If this formation made a Charge move this turn, add 1 to the Strength of its melee attacks.',formation);break;
   case 'Chaos Land Raider':{
    const passengers=csmCargoFormations(army,squad,roster),targets=passengers.flatMap(g=>g.members.map(s=>s.id));
    add('Assault Ramp',[move,['Charge','own','during']],'When a unit disembarks after this Land Raider makes a Normal move, use Assault Disembark: set it up wholly within 3″ and unengaged. Those passengers remain eligible to charge. This permission is for a Normal move; an ingress move still requires Rapid Disembark.',targets);break;
   }
   case 'Chaos Lord':case 'Chaos Lord In Terminator Armour':case 'Chaos Lord with Jump Pack':
    add('Lord of Chaos',eachPhase,'Once per battle round, one unit in your army with the Chaos Lord discount version of Lord of Chaos may reduce a Stratagem targeting its own formation by 1CP. Chaos Lords, Terminator Lords and Jump Pack Lords share this one use.',formation);
    if(unit==='Chaos Lord')add('Chance for Glory',[['Fight','either','start']],'Once per battle, at the start of a Fight phase, improve the Strength, Attacks, Armour Penetration and Damage of this bearer model’s melee weapons by 1 until phase end. Other models in its formation do not gain these bonuses.');
    else if(unit==='Chaos Lord In Terminator Armour')add('Formidably Resilient',defence,'Each time an attack is allocated to this bearer model, halve that attack’s Damage characteristic, rounding up. Other models in the formation are not protected by this personal rule.');
    else led('Cruel Hunter',[fight],'Models in this formation may Pile In or Consolidate up to 6″ instead of 3″, following the normal movement requirements.');
    break;
   case 'Chaos Predator Annihilator':add('Annihilator',[shoot,snap],'When this model’s ranged attack is allocated to a Monster or Vehicle model, you may re-roll its Damage roll. A fixed Damage characteristic is not a Damage roll.');break;
   case 'Chaos Predator Destructor':add('Destructor',[shoot,snap],'Improve this model’s ranged attacks’ Armour Penetration by 1 when they target an Infantry unit.');break;
   case 'Chaos Rhino':add('Self Repair',[['Command','own','start']],'At the start of your Command phase, this Rhino regains 1 lost wound.');break;
   case 'Chaos Spawn':add('Mind-breaking Mutations',endPhase,'Enemy units within 3″ of this Chaos Spawn formation, excluding Vehicle units, subtract 1 from their models’ Objective Control characteristics. Follow the normal order of characteristic modifiers.');break;
   case 'Chaos Terminator Squad':if(pact)attack('Despoilers','If this formation made a Dark Pact this phase, its models may re-roll attack Hit rolls until phase end. This effect expires at the end of that phase.',undefined,true);break;
   case 'Chaos Vindicator':
    if(fitted('Demolisher cannon'))add('Siege Shield',[shoot,snap],'This model’s demolisher cannon may target an enemy unit engaged with this model only if no other friendly unit is also engaged with that enemy. When making ranged attacks, this model ignores the Hit-roll penalty for being engaged. Snap shooting still uses its fixed Hit rolls.');break;
   case 'Chosen':add('Chosen Marauders',[move,shoot,...chargeSteps],'This whole formation may shoot and declare a charge after Advancing or Falling Back this turn.',formation);break;
   case 'Cultist Firebrand':
    led('Fiery Faith',eachPhase,'You may re-roll Leadership tests taken for this formation. This does not by itself allow Battle-shock re-rolls.');
    if(selfGun)add('Cursed Flames',[shoot],'After this bearer model shoots in your Shooting phase, choose one enemy Infantry unit hit by its attacks. That enemy takes a Battle-shock test.');break;
   case 'Cultist Mob':add('For the Dark Gods',[['Command','own','end']],'At the end of your Command phase, an objective you control that this formation is within range of remains under your control until the opponent’s Level of Control over it is greater than yours at the end of a phase. Leaving it does not immediately end this control.',formation);break;
   case 'Cypher':
    add('Agent of Discord',eachPhase,'Once per turn, when your opponent targets one of their units within 12″ of this Cypher model with a Stratagem, you may increase that use’s cost by 1CP.',[id],pack);
    add('Guns Blazing',[incoming],csmReactionShooting(army,squad,roster).join(' '));break;
   case 'Dark Apostle':
    if(contains('Dark Apostle')){
     led('Dark Zealotry',[fight],'While an original Dark Apostle model survives in this formation, add 1 to its melee attack Wound rolls.');
     add('Demagogue',PHASES.map((p):Step=>[p,'either','start']),'Once per battle, at the start of any phase, select one Battle-shocked friendly Heretic Astartes formation within 12″ of this unit’s actual Dark Apostle model. It is no longer Battle-shocked.',ha);
    }
    if(contains('Dark Disciple'))add('Malign Sacrifice',[['Fight','either','start']],'At the start of either Fight phase, select one surviving Dark Disciple in this formation and one enemy unit engaged with this formation. Roll a D6: on 2–5 the enemy suffers 1 mortal wound, on 6 it suffers D3, and on 1 it suffers none. Then destroy the selected Dark Disciple regardless of the roll.',formation);
    break;
   case 'Dark Commune':
    if(contains('Cult Demagogue')){
     led('Faithful Flock',defence,'While an original Cult Demagogue survives in this formation, its models have a 5+ invulnerable save.');
     add('Dark Ritual',[['Command','own','during']],'Once per battle in your Command phase, while a Cult Demagogue survives in this formation, use Dark Ritual. Until the end of the turn, the formation may charge after Advancing and adds 1 to attack Hit and Wound rolls. The chosen effect lasts for that turn even if the Demagogue is later destroyed.',formation);
     add('Dark Ritual',[move,['Charge','own','during']],'Only during the turn in which this formation used Dark Ritual: it may declare a charge after Advancing.',formation);
     add('Dark Ritual · Attack bonus',[shoot,['Fight','own','during']],'Only during your turn in which this formation used Dark Ritual: add 1 to attack Hit and Wound rolls. This effect ends before the opponent’s turn.',formation);
    }break;
   case 'Defiler':
    add('Scuttling Walker',[['Movement','either','during']],'When making a Normal, Advance or Fall Back move, this Defiler may move through terrain and non-Titanic models, may pass through enemy Engagement Range, and automatically passes Desperate Escape tests. It must finish outside enemy Engagement Range and obey normal final-position restrictions.');
    if(pact)attack('Daemonforge','If this Defiler made a Dark Pact this phase, re-roll its attack Wound rolls of 1 until phase end.','If this Defiler made a Dark Pact this phase, re-roll its snap-shot Wound rolls of 1 until phase end.');break;
   case 'Fabius Bile':
    if(contains('Fabius Bile'))add('Surgeon Acolyte',defence,'Once per turn, when an attack is allocated to any model in this formation, you may change that attack’s Damage to 0 while the formation contains Fabius Bile. This ability does not require the Surgeon Acolyte model to survive.',formation);
    break;
   case 'Fellgor Beastmen':
    add('Bestial Raiders',[['Pre-battle','either','during'],move],'If this formation started the battle in Strategic Reserves, it may arrive in your first, second or third Movement phase regardless of mission restrictions. Whenever setting it up from Strategic Reserves, treat the current battle round as one higher. This does not permit first-round Rapid Ingress.');
    add('Bestial Raiders',[snap],'When using Rapid Ingress in battle round two or later, treat the current battle round as one higher for this unit’s Strategic Reserves placement. Bestial Raiders does not waive Rapid Ingress’s first-round prohibition.');break;
   case 'Forgefiend':add('Daemonic Ordnance',[shoot,snap],'When this Forgefiend is selected to shoot, it may give its ranged weapons Devastating Wounds and Hazardous until the end of the phase. Resolve Hazard tests for the Hazardous weapons it uses. This works during Overwatch: snap shooting prevents Critical Hits, not Critical Wounds.');break;
   case 'Haarken Worldclaimer':
    led('Head Taker',chargeSteps,'After this formation ends a Charge move, choose one enemy unit engaged with it. Roll one D6 per model in this formation that is engaged with that chosen enemy; each 4+ inflicts 1 mortal wound.');
    add('Herald of the Apocalypse',[['Command','opponent','during']],'In the opponent’s Battle-shock step, enemy units below Starting Strength within 6″ of this Haarken model must test Battle-shock. This ability cannot make a unit take two Battle-shock tests in that phase.');break;
   case 'Havocs':add('Stabilisation Talons',[shoot],'This formation’s ranged attacks may ignore any or all modifiers to their Hit rolls and Ballistic Skill. This permission does not replace the fixed rolls used for snap shooting.',formation);break;
   case 'Helbrute':{
    const recipients=ids(haGroups.filter(g=>csmCanDarkPact(army,g.members)));
    add('Dark Ascension',[shoot,snap,fight,...(groups.some(g=>g.members.some(reactions))?[incoming]:[])],'When a friendly Heretic Astartes formation within 6″ of this surviving Helbrute makes a Dark Pact, its weapons gain both Lethal Hits and Sustained Hits 1 until phase end. The Leadership test and any failed-test mortal wounds are still resolved first. Neither Critical Hit benefit can trigger during snap shooting.',recipients);
    const arms=csmArmyModelLoadouts(squad).flatMap(m=>m.items).filter(w=>['Helbrute fist','Helbrute hammer','Power scourge'].some(n=>key(n)===key(w)));
    if(arms.length===2)add('Devoted to Destruction',[fight],'This Helbrute has two fitted melee weapons in addition to its close combat weapon. Add 2 Attacks to each of those two weapons: '+arms.join(' and ')+'. Its close combat weapon does not gain those extra attacks.');
    break;
   }
   case 'Heldrake':add('Airborne Predator',[shoot,fight],'Add 1 to this Heldrake’s attack Hit rolls against a unit that can Fly. This modifier cannot alter fixed snap-shot Hit rolls.');break;
   case 'Heretic Astartes Daemon Prince':{
    add('Dark Blessing',[incoming,incomingSnap,returnFire],'Models in friendly Heretic Astartes Infantry formations within 6″ of this Prince model have the Benefit of Cover against ranged attacks.',haInfantry);
    add('Ascended Daemon',[shoot,fight],'Each time this Prince shoots or fights, while resolving those attacks, it may re-roll one Hit roll and one Wound roll. These are one roll of each type for that activation, not one per weapon.');
    add('Ascended Daemon',[snap],'Each time this Prince fires Overwatch, it may re-roll one Wound roll while resolving those attacks. Snap-shot Hit rolls cannot be re-rolled.');
    add('Lord of Chaos',[incoming,incomingSnap,returnFire],'While this Prince is within 3″ of a friendly Heretic Astartes Infantry unit, it has Lone Operative: enemy models more than 12″ away cannot see it or target it with Indirect Fire.',haInfantry);break;
   }
   case 'Heretic Astartes Daemon Prince With Wings':
    add('Daemonic Destruction',[['Charge','own','during']],'After this Prince ends a Charge move, select one enemy unit engaged with it. Roll one D6 for each of this model’s remaining wounds; each 4+ inflicts 1 mortal wound, to a maximum of 6 mortal wounds.');
    add('Flying Horror',[['Movement','either','during']],'After this Prince ends a Normal or Advance move, select one enemy unit it moved over during that move. That enemy takes a Battle-shock test. A Fall Back move does not trigger this rule.');break;
   case 'Huron Blackheart':
    add('Lord of Badab',endPhase,'Friendly Heretic Astartes Infantry formations within 6″ of this Huron model add 1 to their models’ Objective Control. Damned and Battle-shocked formations are excluded.',ids(tagged(['HERETIC ASTARTES','INFANTRY'],['DAMNED'])));
    add('Hamadrya’s Knowledge',eachPhase,'Once per battle round, after an enemy ends a Normal, Advance or Fall Back move within 8″ of this formation, if this formation is unengaged it may make a Normal move up to D3+3″. The trigger is not restricted to one player’s Movement phase.',formation);break;
   case 'Khorne Lord Of Skulls':add('Plough Through the Enemy',[fight],'After this model finishes its attacks in the Fight phase, if it destroyed one or more enemy units this phase, every enemy unit within 6″ of it must take a Battle-shock test.');break;
   case 'Kravek Morne':
    attack('Headlong Destruction','Improve this formation’s attacks’ Armour Penetration by 1 when targeting the closest eligible enemy unit.','Improve this formation’s snap shots’ Armour Penetration by 1 against the closest eligible enemy unit.');
    add('Architect of Ruin',[['Pre-battle','either','during']],'At the start of the battle, choose one enemy unit as this Kravek model’s hated foe. Each time that hated foe is destroyed, you may select a new enemy unit.');
    add('Architect of Ruin · New hated foe',eachPhase,'Each time this Kravek model’s current hated foe is destroyed, you may choose a new enemy unit as its hated foe. Kravek need not have inflicted the killing attack.');
    add('Architect of Ruin',personalAttack,'This Kravek model may re-roll Wound rolls for attacks against its current hated foe. Its Bodyguard and other attached models do not inherit this personal re-roll.');break;
   case 'Legionaries':add('Veterans of the Long War',[fight],'This formation’s melee attacks re-roll Wound rolls of 1. Against an enemy unit within range of an objective marker, they may re-roll the Wound roll instead.',formation);break;
   case 'Lord Discordant On Helstalker':
    add('Corrupt Machine Spirits',[['Shooting','own','start']],'Select one visible enemy Vehicle unit within 12″ of this Lord Discordant model and roll a D6. On 2–3 it suffers D3 mortal wounds; on 4–5 it suffers 3; on 6 it suffers D3+3. On 1 it suffers none.',[id],pack);
    add('Spirit Thief',[['Shooting','own','start'],shoot],'At the start of your Shooting phase, choose one visible enemy Vehicle unit. Friendly Heretic Astartes models re-roll attack Wound rolls of 1 against that target until this phase ends. The target selection has no stated range limit.',haGuns,pack);break;
   case 'Master Of Executions':
    led('Warp-sighted Butcher',[fight],'Melee attacks from this formation may re-roll Hit rolls against an enemy unit below Starting Strength. Against an enemy Below Half-strength, they may also re-roll Wound rolls.');
    add('Trophy Taker',personalAttack,'Each time this bearer model destroys an enemy Character model, gain 1CP, subject to the normal additional-CP limit. Its own ranged and melee attacks can trigger this; kills by other models in its formation do not.');break;
   case 'Master Of Possession':
    led('Daemonkin',[move,...chargeSteps],'Add 1 to this formation’s Advance and Charge rolls.');
    for(const [phase,steps] of [['Fight',[fight]],['Shooting',[shoot,...(!titanic?[snap]:[]),...(selfReaction?[incoming]:[])]]] as const)if(psychic(phase))for(const stage of steps)add('Sacrificial Dagger',[stage],'Once per phase, when this bearer model is selected to '+(phase==='Fight'?'fight':'shoot')+', it may inflict 1 mortal wound on its own formation. Until phase end, its own Psychic attacks add 1 to Wound rolls'+(stage[0]==='Movement'?'; the Hit modifier cannot alter snap-shot accuracy.':' and 1 to Hit rolls.')+' Other models and non-Psychic weapons do not gain these attack modifiers.',formation);
    break;
   case 'Masters of the Maelstrom':
    if(contains('Garreon the Corpsemaster'))add('Choice Samples',[['Command','own','during']],'While the actual Garreon the Corpsemaster model survives on the battlefield, choose one option in your Command phase: return one destroyed non-Character model to this formation, or gain 1CP if a friendly Heretic Astartes Infantry unit below Starting Strength is within 3″ of this formation. The options are mutually exclusive; the normal additional-CP limit applies.',formation);
    add('Fleet Command',[['Pre-battle','either','during']],'After both armies deploy, if this Masters of the Maelstrom unit or its transport is on the battlefield, select up to three friendly Heretic Astartes formations and redeploy them. You may put those formations into Strategic Reserves regardless of how many units are already there.',ha);
    add('Plunder',eachPhase,'Once per battle, after this formation ends a Normal move, choose one visible enemy unit within 12″ of this formation. On a D6 result of 2+, that enemy suffers D3+1 mortal wounds. This can follow an eligible Normal move outside your Movement phase; it does not follow an Advance, surge or charge.',formation);break;
   case 'Maulerfiend':add('Siege Crawler',[['Movement','either','during'],['Charge','own','during']],'You may ignore any or all modifiers to this Maulerfiend’s Move characteristic and its Advance and Charge rolls.');break;
   case 'Mutilators':add('Crushing Charge',chargeSteps,'You may re-roll this formation’s Charge rolls. After it makes a Charge move, choose one enemy unit and roll one D6 for each model in this formation engaged with that enemy; each 4+ inflicts D3 mortal wounds. Count the engaged models, including attached models.',formation);break;
   case 'Nemesis Claw':
    attack('Visions of Suffering','Add 1 to this formation’s attack Hit rolls against an enemy below Starting Strength. If that enemy is also Below Half-strength, add 1 to Wound rolls.','Against an enemy Below Half-strength, add 1 to this formation’s snap-shot Wound rolls. The Hit modifier does not alter snap-shot accuracy.');
    if(fitted('Voice eater'))add('Voice Eater',eachPhase,'While the actual voice eater bearer survives, enemy units engaged with its formation cannot be targeted with Stratagems. Monster and Vehicle units are exempt.',formation);break;
   case 'Noctilith Crown':
    add('Malevolent Locus',eachPhase,'Friendly Heretic Astartes formations within 9″ of this surviving Noctilith Crown improve their models’ Leadership characteristic by 1.',ha);
    add('Malign Cover',[incoming,incomingSnap,returnFire],'When a ranged attack is allocated to a model that is not fully visible to every attacking model because of this Noctilith Crown, that model has the Benefit of Cover. This terrain-like protection is not restricted to friendly models.',roster.map(s=>s.id));
    add('Fortification',[shoot,...(groups.some(g=>g.members.some(reactions))?[incoming]:[])],'An enemy unit engaged only with friendly Fortifications can still be targeted by ranged attacks. Non-Pistol attacks targeting it subtract 1 from their Hit rolls; Pistol attacks do not suffer that penalty.',normalGuns);
    add('Fortification',[snap],'An enemy unit engaged only with friendly Fortifications can still be targeted by permitted Overwatch. The non-Pistol Hit penalty does not change fixed snap-shot accuracy.',snapGuns);
    add('Fortification · Falling Back',eachPhase,'An enemy unit engaged only with friendly Fortifications does not make Desperate Escape tests just for Falling Back while Battle-shocked. Models moving over enemy models still make the applicable tests.');break;
   case 'Obliterators':add('Warp Rift Firepower',[shoot],'Once per battle for this unit, when selected to shoot in your Shooting phase, you may give its ranged attacks Indirect Fire until phase end. This cannot be activated by Overwatch.',formation,pack);break;
   case 'Possessed':if(pact)attack('Unholy Bloodshed','Once per battle for this formation, when it makes a Dark Pact, its weapons may gain Devastating Wounds until phase end.','Once per battle for this formation, when it makes a Dark Pact while firing Overwatch, its weapons may gain Devastating Wounds until phase end. Snap shooting still allows Critical Wounds.');break;
   case 'Raptors':
    add('Fearsome',eachPhase,'Enemy units within 6″ of this Raptor formation subtract 1 from their Battle-shock and Leadership tests.');
    add('Terrifying Assault',[['Fight','either','start']],'At the start of either Fight phase, each enemy unit engaged with one or more formations with Terrifying Assault takes one Battle-shock test. Multiple nearby Raptor formations do not force repeated tests from this ability.');break;
   case 'Red Corsairs Raiders':add('Trophy Takers',[...attackSteps,...endPhase],'The first time this formation destroys an enemy unit, it gains a lasting bonus: for the rest of the battle, add 1 to its models’ Objective Control while it is not Battle-shocked. Further kills do not add further bonuses.',formation);break;
   case 'Red Corsairs Reave-Captain':
    add('Brutal Raider',[...chargeSteps,fight],'After this bearer model’s formation ends a Charge move, this bearer’s melee weapons gain 1 Strength and improve Armour Penetration by 1 until the end of that turn. Other models do not receive these bonuses.');
    add('Raider’s Due',chargeSteps,'When this formation declares a charge, if an enemy unit within range of an objective is within 12″ of it, you may re-roll the Charge roll. If you use this ability, the charge must finish engaged with at least one such enemy unit.',formation);break;
   case 'Sorcerer':
    led('Prescience',[incoming,returnFire,fight],'Enemy attack Hit rolls against this formation subtract 1. This modifier does not change fixed snap-shot Hit rolls.');
    for(const [phase,steps] of [['Fight',[fight]],['Shooting',[shoot,...(!titanic?[snap]:[]),...(selfReaction?[incoming]:[])]]] as const)if(psychic(phase))add('Gift of Chaos',steps,'After this bearer model resolves its attacks when selected to '+(phase==='Fight'?'fight':'shoot')+', choose one enemy unit hit by one of its actual Psychic attacks. That enemy takes a Leadership test and suffers D3 mortal wounds if it fails. Attacks made by other models or non-Psychic weapons do not trigger this ability.');
    break;
   case 'Sorcerer In Terminator Armour':
    if(fitted('Chaos familiar'))add('Chaos Familiar',defence,'Once per battle, when an attack is allocated to the actual Chaos familiar bearer, you may change its Damage to 0. The familiar is equipment and adds no physical model.');
    led('Warptime',[move,...chargeSteps],'You may re-roll this formation’s Advance and Charge rolls.');
    if(personalPsyker)add('Death Hex',[['Shooting','own','start']],'At the start of your Shooting phase, only one Psyker with Death Hex in your army may use it. Choose one visible enemy unit within 12″ of that actual Psyker and roll a D6. On 1, its own formation suffers D3 mortal wounds. On 2+, attacks targeting that enemy improve Armour Penetration by 1 until the start of your next Movement phase. The mark survives the source’s later destruction.',formation);
    if(personalPsyker)add('Death Hex · Marked enemy',[shoot,snap,fight,...(groups.some(g=>g.members.some(reactions))?[incoming]:[])],'Only against an enemy successfully marked by Death Hex: improve attacks’ Armour Penetration by 1 until the start of your next Movement phase. This benefits attacks targeting the marked enemy, not just this Sorcerer’s formation.',roster.map(s=>s.id));break;
   case 'Traitor Enforcer':
    if(contains('Traitor Enforcer'))led('Brutal Example',[snap],'Once per turn, while the actual Traitor Enforcer model survives, you may target this formation with Fire Overwatch for 0CP even if a different unit has already been targeted with it this turn. Each use destroys one Bodyguard model before resolving Fire Overwatch; remove that model before choosing the surviving models’ guns. All other Overwatch eligibility and snap-shooting restrictions apply.');
    if(contains('Traitor Ogryn'))add('Mutated Bodyguard',eachPhase,'While this formation contains its actual Traitor Ogryn, Character models in the formation have Feel No Pain 4+. The Ogryn and other non-Character models do not gain that save.',group.members.filter(s=>has(s,'CHARACTER')).map(s=>s.id));break;
   case 'Traitor Guardsmen Squad':add('Twisted Defence Force',[incoming,incomingSnap,returnFire],'While this formation is within range of an objective marker, its models improve their Save characteristic by 1 against ranged attacks. The rule does not require you to control that objective.',formation,pack);break;
   case 'Vashtorr The Arkifane':{
    const machines=tagged(['DAEMON','VEHICLE']),machineIds=ids(machines);
    add('Unholy Mechanisms',[shoot,snap,fight],'Weapons equipped by models in friendly Daemon Vehicle formations within 6″ of this Vashtorr model gain 2 Strength. This aura does not require the Heretic Astartes keyword.',machineIds,pack);
    add('Reorder Reality',[incoming,returnFire,fight],'When an enemy unit within 18″ of this Vashtorr model targets it, subtract 1 from that enemy’s attack Hit rolls and give the enemy unit’s ranged weapons Hazardous until phase end. The ability is triggered by targeting Vashtorr itself.',[id],pack);
    add('Reorder Reality',[incomingSnap],'When enemy snap shooting from within 18″ targets this Vashtorr, the enemy unit’s ranged weapons gain Hazardous until phase end. The −1 Hit modifier does not change fixed snap-shot accuracy.',[id],pack);
    add('Indentured Daemon Engines',[incoming,incomingSnap,returnFire],'While this Vashtorr is within 3″ of a friendly Daemon Vehicle unit, it has Lone Operative. Enemy models more than 12″ away cannot see it or target it with Indirect Fire.',machineIds,pack);break;
   }
   case 'Venomcrawler':
    add('Soul Eater',[['Fight','either','end']],'At the end of a Fight phase in which this Venomcrawler’s own attacks destroyed one or more enemy units, add 1 to the Attacks of its weapons for the rest of the battle. Gain one increment for that qualifying phase, regardless of how many enemy units it destroyed.');
    add('Soul Eater · Earned attacks',[shoot,snap,fight],'Apply +1 Attacks to this Venomcrawler’s weapons for each earlier Fight phase in which its own attacks destroyed one or more enemy units. These earned increments last for the battle.');break;
   case 'Warp Talons':add('Warp Strike',[['Fight','either','end']],'At the end of either Fight phase, if this formation actually fought, destroyed one or more enemy units during that phase and is now unengaged, you may remove the whole formation and place it in Strategic Reserves. Being eligible to fight without fighting is insufficient. This can follow a permitted Opportunistic Raiders Fall Back after the qualifying fight.',formation,pack);break;
   case 'Warpsmith':{
    const crown=chosen(squad,'Crown of Worms')?3:0,vehicles=tagged(['HERETIC ASTARTES','VEHICLE']);
    add('Warpsmith',[incoming,incomingSnap,returnFire],'While this bearer model is within '+(3+crown)+'″ of a friendly Heretic Astartes Vehicle unit, it has Lone Operative. This protection applies to an attached formation only if every surviving model also has Lone Operative; a Bodyguard without it prevents the protection. When every model qualifies, enemy models more than 12″ away cannot see this formation or target it with Indirect Fire.',ids(vehicles));
    add('Master of Mechanisms',[['Command','own','during']],'Select one friendly Heretic Astartes Vehicle model within '+(3+crown)+'″ of this bearer model. It regains up to D3 lost wounds and adds 1 to its attack Hit rolls until the start of your next Command phase. Each model may be selected only once per Command phase. The timed bonus survives the Warpsmith’s later destruction.',ids(vehicles));
    add('Master of Mechanisms · Blessed vehicle',[shoot,fight],'A Vehicle model selected by this bearer’s Master of Mechanisms adds 1 to attack Hit rolls until your next Command phase begins. This does not modify snap-shot accuracy and does not affect every model in a multi-model unit.',ids(vehicles));
    add('Enrage Machine Spirits',[['Movement','own','end']],'Select one enemy Vehicle unit within '+(12+crown)+'″ of this bearer model. That unit must take a Battle-shock test.');break;
   }
   case 'Khorne Berzerkers':
    add('Blood Surge',[incoming],'After an enemy finishes shooting in the opponent’s Shooting phase, if those attacks destroyed a model in this formation, it may make a surge move up to D6+2″, following the core surge restrictions.',formation);
    add('Murderous Charge',[fight],'If this formation made a Charge move this turn, its melee attacks gain 1 Strength.',formation);break;
   case 'Rubric Marines':
    add('Bringers of Change',[shoot,snap],'This formation’s ranged attacks re-roll Wound rolls of 1. Against an enemy unit within range of an objective you do not control, they may re-roll the Wound roll instead.',formation);
    if(fitted('Icon of flame'))add('Icon of Flame',[shoot,snap],'While the actual Icon of Flame bearer survives, ranged weapons equipped by non-Character models in this formation have Ignores Cover. Character models do not gain this effect.',formation);break;
   case 'Plague Marines':
    // Publisher FAQ explicitly says Infused with the Blessings of Nurgle has no effect in a CSM army.
    if(fitted('Icon of despair'))add('Icon of Despair',eachPhase,'While an enemy unit is within 6″ of this formation’s actual Icon of Despair bearer, its models worsen Leadership by 1. Measure from that bearer model.');break;
   case 'Noise Marines':
    add('Terrifying Crescendo',[shoot],'After this formation shoots in your Shooting phase, choose one enemy unit it hit. Until the start of your next Shooting phase, that enemy subtracts 1 from Battle-shock and Leadership tests.',formation);
    add('Terrifying Crescendo · Marked enemy',eachPhase,'An enemy marked by this Noise Marine formation subtracts 1 from Battle-shock and Leadership tests until your next Shooting phase begins. The timed mark survives the source formation’s later destruction.');break;
  }
  if(princes.has(unit)){
   const allegiance=csmChosenMark(army,squad);
   if(allegiance){
    add('Daemonic Allegiance',[['Pre-battle','either','during']],'This Prince’s selected Daemonic Allegiance is '+allegiance+'. Its keyword and personal characteristic modifier apply for the battle.');
    if(allegiance==='Khorne')add('Daemonic Allegiance · Khorne',[fight],'This Prince’s hellforged weapons gain 2 Strength. Its other weapons and nearby models do not gain this modifier.');
    if(allegiance==='Tzeentch')add('Daemonic Allegiance · Tzeentch',[shoot,snap],'This Prince’s infernal cannon gains 3 Attacks. Its melee weapons do not gain these extra attacks.');
    if(allegiance==='Nurgle')add('Daemonic Allegiance · Nurgle',defence,'This Prince gains 1 Toughness for the battle.');
    if(allegiance==='Slaanesh')add('Daemonic Allegiance · Slaanesh',[['Movement','either','during']],'This Prince’s Move characteristic is increased by 2″ for the battle.');
   }
  }
 }
 if(!copy){
  const originalRoster=expandRoster(army),alive=new Set(roster.map(s=>s.id));
  for(const source of originalRoster.filter(s=>legal.has(s.unit))){
   const original=originalGroups.find(g=>g.members.some(s=>s.id===source.id));
   if(!original)continue;
   const survivors=original.members.filter(s=>alive.has(s.id)),sourceLink=sheets.get(source.unit)?.source;if(!sourceLink)continue;
   function lasting(title:string,steps:readonly Step[],summary:string,recipients=survivors.map(s=>s.id)){
    if(!recipients.length)return;
    for(const [window,turn,timing] of steps)result.push({id:['11e-csm-lasting',source.id,title,window,turn,timing].join(':'),title,window,turn,timing,summary,units:recipients,source:sourceLink!,origin:'unit'});
   }
   if(source.unit==='Fabius Bile'){
    if(original.root.id!==source.id&&alive.has(original.root.id))lasting('Enhanced Warriors',defence,source.id+' must have been attached to this Bodyguard at the start of the battle, including if embarked. For the entire battle, its Bodyguard models have +1 Toughness and +1 Strength to their melee weapons. Fabius, the Surgeon Acolyte and other attached models do not gain these bonuses; the Bodyguard bonuses persist after Fabius dies.',[original.root.id]);
    lasting('Chirurgeon',endPhase,'The first time '+source.id+'’s actual Fabius Bile model is destroyed, roll a D6 at that phase’s end. On 2+, return Fabius with all wounds remaining as close as possible to where he died, unengaged. This returns Fabius, not his Surgeon Acolyte.',survivors.length?survivors.map(s=>s.id):[source.id]);
   }
   if(alive.has(source.id))continue;
   if(source.unit==='Cultist Mob')lasting('For the Dark Gods · Held objective',endPhase,'Only an objective previously claimed by '+source.id+' through For the Dark Gods remains under your control after that formation is destroyed. It stops doing so when the opponent’s Level of Control is greater than yours at the end of a phase. A destroyed Cultist Mob cannot claim a new objective.',roster.map(s=>s.id));
   if(source.unit==='Red Corsairs Raiders')lasting('Trophy Takers · Earned control',endPhase,'Only if '+source.id+'’s original formation had already destroyed an enemy unit: surviving models in that formation retain +1 Objective Control for the rest of the battle while not Battle-shocked. The earned bonus survives loss of the Raiders and does not stack from further kills.');
   if(source.unit==='Dark Commune')lasting('Dark Ritual · Lasting effect',[move,shoot,['Fight','own','during'],['Charge','own','during']],'Only if '+source.id+' used Dark Ritual earlier in your current turn: its surviving original formation retains charge-after-Advance and +1 to attack Hit and Wound rolls until turn end. It expires before the opponent’s turn and does not permit a new use after the Cult Demagogue dies.');
   if(source.unit==='Chaos Terminator Squad'&&csmCanDarkPact(army,original.members))lasting('Despoilers · Lasting effect',[shoot,fight],'Only if '+source.id+'’s original formation made a Dark Pact earlier this phase: its surviving attached models retain Despoilers’ Hit re-rolls until phase end. Snap-shot Hit rolls cannot be re-rolled.');
   if(source.unit==='Possessed'&&csmCanDarkPact(army,original.members))lasting('Unholy Bloodshed · Lasting effect',[shoot,snap,fight],'Only if '+source.id+'’s original formation already used Unholy Bloodshed this phase: its surviving attached models retain Devastating Wounds until phase end. Losing the Possessed does not begin another use.');
   if(source.unit==='Warpsmith')lasting('Master of Mechanisms · Lasting effect',[shoot,fight],'Only a Vehicle model previously selected by '+source.id+' retains +1 to attack Hit rolls until your next Command phase begins, even after the Warpsmith dies. Snap-shot accuracy is unchanged.',ids(tagged(['HERETIC ASTARTES','VEHICLE'])));
   if(source.unit==='Sorcerer In Terminator Armour')lasting('Death Hex · Lasting mark',[shoot,snap,fight,...(groups.some(g=>g.members.some(reactions))?[incoming]:[])], 'Only against an enemy previously marked by '+source.id+'’s successful Death Hex: improve attacks’ Armour Penetration by 1 until the start of your next Movement phase, even after that Sorcerer dies.',roster.map(s=>s.id));
   if(source.unit==='Lord Discordant On Helstalker')lasting('Spirit Thief · Lasting mark',[shoot],'Only against an enemy Vehicle marked by '+source.id+' at the start of this Shooting phase: friendly Heretic Astartes models retain Wound re-rolls of 1 against it until phase end.',haGuns);
   if(source.unit==='Noise Marines')lasting('Terrifying Crescendo · Lasting mark',eachPhase,'Only an enemy previously marked by '+source.id+' retains −1 to Battle-shock and Leadership tests until your next Shooting phase begins, even after the Noise Marines die.',roster.map(s=>s.id));
   if(csmSelectedUpgrade(army,source)==='Soul Link'&&eligibleCsmUpgrades(army,source.unit,source.id).some(u=>u.name==='Soul Link'))for(const selected of csmSoulLinkSources(army,source)){
    const condition='Only if '+source.id+' had selected '+selected.id+' with Soul Link and used this copied ability before its destruction: ';
    const title='Soul Link · '+selected.id+' · ';
    if(selected.unit==='Warpsmith')lasting(title+'Master of Mechanisms · Lasting effect',[shoot,fight],condition+'a previously selected Vehicle model retains +1 to attack Hit rolls until your next Command phase begins. This does not change snap-shot accuracy.',ids(tagged(['HERETIC ASTARTES','VEHICLE'])));
    if(selected.unit==='Sorcerer In Terminator Armour')lasting(title+'Death Hex · Lasting mark',[shoot,snap,fight,...(groups.some(g=>g.members.some(reactions))?[incoming]:[])],condition+'attacks against the successfully marked enemy retain +1 Armour Penetration until the start of your next Movement phase. The mark is on the enemy and survives the bearer’s later destruction.',roster.map(s=>s.id));
    if(selected.unit==='Dark Commune'&&original.members.some(s=>csmArmyModelLoadouts(s).some(m=>key(m.model)===key('Cult Demagogue'))))lasting(title+'Dark Ritual · Lasting effect',[move,shoot,['Fight','own','during'],['Charge','own','during']],condition+'the surviving original formation retains charge-after-Advance and +1 to attack Hit and Wound rolls until the end of that own turn. It expires before the opponent’s turn. Replacing the bearer’s abilities ends persisting effects on that bearer.');
   }
  }
 }
 return result;
}

export function csmIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{return reminders(army,roster);}
export function csmCopiedIntrinsicReminders(army:ArmySelection,bearer:RosterInstance,source:RosterInstance,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(csmSelectedUpgrade(army,bearer)!=='Soul Link'||!eligibleCsmUpgrades(army,bearer.unit,bearer.id).some(u=>u.name==='Soul Link')||!roster.some(s=>s.id===bearer.id)||!csmSoulLinkSources(army,bearer).some(s=>s.id===source.id))return [];
 return reminders(army,roster,{bearer,source});
}
