import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {MECHANICUS_SHEETS} from './mechanicus-data.generated';
import {mechanicusAgentName,mechanicusMusterUnits} from './mechanicus-army-data';
import {mechanicusKeywords} from './mechanicus-keywords';
import {mechanicusHasRangedWeapon,mechanicusModelLoadouts,mechanicusWeaponCount} from './mechanicus-loadouts';
import {mechanicusCargoFormations,mechanicusFormations} from './mechanicus-transports';
import {mechanicusReactionShooting} from './mechanicus-reactions';
import {assignedAgentHasRanged} from './knight-assigned-agents';
import {expandRoster,type RosterInstance} from './roster-instances';

type Step=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const shoot:Step=['Shooting','own','during'],fight:Step=['Fight','either','during'],move:Step=['Movement','own','during'];
const snap:Step=['Movement','opponent','end'],incoming:Step=['Shooting','opponent','during'],incomingSnap:Step=['Movement','own','end'];
const returnFire:Step=['Shooting','own','during'],charge:Step=['Charge','either','during'];
const eachPhase=PHASES.map((p):Step=>[p,'either','during']),startPhase=PHASES.map((p):Step=>[p,'either','start']);
const endPhase=PHASES.map((p):Step=>[p,'either','end']),defence=[incoming,incomingSnap,returnFire,fight] as const;
const cards=new Map(MECHANICUS_SHEETS.map(s=>[s.unit,s]));
const unique=(ids:string[])=>[...new Set(ids)],key=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const bodyguardPassives=new Set(['Breaching Command','Sentinel Directives','Electro-infusion','Robotic Bodyguard','Repulsor Grid','Rad-saturation','Neurostatic Interference','Optimised Gait','Network Override']);

export function mechanicusIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Adeptus Mechanicus')return [];
 const legal=new Set(mechanicusMusterUnits(army)),native=roster.filter(s=>cards.has(s.unit)&&legal.has(s.unit));if(!native.length)return [];
 const groups=mechanicusFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 const groupOf=(s:RosterInstance)=>groups.find(g=>g.members.some(m=>m.id===s.id));
 const factionGroups=groups.filter(g=>g.members.some(s=>cards.has(s.unit)));
 const targets=factionGroups.flatMap(g=>g.members.map(s=>s.id));
 const hasGun=(s:RosterInstance)=>mechanicusHasRangedWeapon(s)||!!mechanicusAgentName(s.unit)&&assignedAgentHasRanged(s,mechanicusAgentName(s.unit));
 const gunTargets=factionGroups.filter(g=>g.members.some(hasGun)).flatMap(g=>g.members.map(s=>s.id));
 const reactionTargets=factionGroups.filter(g=>g.members.some(s=>hasGun(s)&&mechanicusReactionShooting(army,s,roster).length)).flatMap(g=>g.members.map(s=>s.id));
 const vehicles=native.filter(s=>mechanicusKeywords(army,s).has('VEHICLE')).map(s=>s.id);
 const skitarii=factionGroups.filter(g=>g.members.some(s=>mechanicusKeywords(army,s).has('SKITARII'))).flatMap(g=>g.members.map(s=>s.id));
 const result:GeneratedReminder[]=[];
 function emit(id:string,title:string,steps:readonly Step[],summary:string,units:string[],source:string){
  if(units.length)for(const [window,turn,timing] of steps)result.push({id:['11e-mechanicus-native',id,title,window,turn,timing].join(':'),title,window,turn,timing,summary,units:unique(units),source,origin:'unit'});
 }
 for(const squad of native){
  const {id,unit}=squad,group=groupOf(squad);if(!group)continue;
  const formation=group.members.map(s=>s.id),leading=group.root.id!==id,hasRanged=group.members.some(hasGun),bodyguardSource=group.root.id===id&&group.members.length>1;
  const fitted=(name:string)=>mechanicusWeaponCount(squad,name)>0,reactions=mechanicusReactionShooting(army,squad,roster);
  function add(title:string,steps:readonly Step[],summary:string,recipients=[id]){
   const scope=bodyguardSource&&bodyguardPassives.has(title)?' This bodyguard-sourced ability lasts only while an original '+unit+' model remains; if its last model dies to an attack, keep the effect until that attacking unit finishes its attacks.':'';
   if(recipients.length)emit(id,title,steps,summary+scope,[id,...recipients],cards.get(unit)!.source);
  }
  const led=(title:string,steps:readonly Step[],summary:string)=>{if(leading)add(title,steps,summary+' The originally attached source model must survive. Its leading benefit continues for the surviving formation after the bodyguard is destroyed; if the source dies to an attack, retain it until the attacking unit finishes.',formation);};
  const ranged=(title:string,summary:string,snapSummary?:string,recipients=formation)=>{
   if(!hasRanged)return;
   add(title,[shoot],summary,recipients);
   if(snapSummary)add(title,[snap],snapSummary,recipients);
   if(reactions.length)add(title,[incoming],'Only when this formation makes normal reaction shots through '+reactions.join('; or ')+': '+summary,recipients);
  };
  const attacks=(title:string,summary:string,snapSummary?:string,recipients=formation)=>{add(title,[fight],summary,recipients);ranged(title,summary,snapSummary,recipients);};
  const gearBearer=(item:string)=>{
   const ordinal=new Map<string,number>();
   return mechanicusModelLoadouts(squad).flatMap(m=>{const n=(ordinal.get(m.model)??0)+1;ordinal.set(m.model,n);return m.items.some(i=>key(i)===key(item))?[m.model+' '+n]:[];}).join(', ');
  };
  for(const item of ['Enhanced data-tether','Command uplink'])if(fitted(item))add(item==='Command uplink'?'Command Uplink':'Enhanced Data-tether',eachPhase,'Each time this formation is targeted with a Stratagem, while its '+item+' bearer survives ('+gearBearer(item)+'), roll one D6; on 5+, gain 1CP. Apply the normal limit on additional CP gained.',formation);
  if(fitted('Omnispex'))ranged('Omnispex','While this squad’s Omnispex bearer survives ('+gearBearer('Omnispex')+'), ranged weapons of every model in its formation have Ignores Cover.','While this squad’s Omnispex bearer survives, ranged weapons of every model in its formation have Ignores Cover, including snap shots.');
  if(['Ironstrider Ballistarii','Sydonian Dragoons With Taser Lances','Sydonian Dragoons With Radium Jezzails','Skorpius Dunerider','Skorpius Disintegrator'].includes(unit)||unit==='Onager Dunecrawler'&&fitted('Broad spectrum data-tether'))add('Broad Spectrum Data-tether',eachPhase,'Each time this unit is targeted with a Stratagem, roll one D6; on 5+, gain 1CP. Apply the normal limit on additional CP gained.'+(unit==='Onager Dunecrawler'?' This equipped Onager loses Smoke.':''));
  switch(unit){
   case 'Belisarius Cawl':{
    add('Canticles of the Omnissiah',[['Command','own','start']],'Select one canticle: Invocation of Machine Vengeance, Mantra of Discipline, or Shroudpsalm. Cawl has the selected ability until the start of your next Command phase. For Invocation, choose its enemy target now.');
    add('Self-repair Mechanisms',[['Command','own','start']],'Cawl regains up to D3 lost wounds.');
    add('Invocation of Machine Vengeance',[shoot],'Only if Cawl selected Invocation at this Command phase’s start: friendly Adeptus Mechanicus formations may re-roll ranged attack Hit rolls against the selected Machine Vengeance enemy until your next Command phase starts.',gunTargets);
    add('Invocation of Machine Vengeance',[fight],'Only if Cawl selected Invocation at this Command phase’s start: friendly Adeptus Mechanicus formations may re-roll melee attack Hit rolls against the selected Machine Vengeance enemy until your next Command phase starts.',targets);
    add('Invocation of Machine Vengeance',[incoming],'Only if Cawl selected Invocation and another rule permits normal reaction shooting: friendly Adeptus Mechanicus formations may re-roll attack Hit rolls against his Machine Vengeance enemy until your next Command phase starts.',reactionTargets);
    add('Mantra of Discipline',eachPhase,'Only while Cawl’s selected Mantra remains active: Cawl himself has Battleline. Friendly Adeptus Mechanicus formations within 6″ add 1 to each model’s Objective Control and add 1 to Battle-shock and Leadership tests. This canticle expires at the start of your next Command phase.',targets);
    add('Shroudpsalm',[incoming,incomingSnap,returnFire],'Only while Cawl’s selected Shroudpsalm remains active: friendly Adeptus Mechanicus formations within 6″ have Stealth and therefore the Benefit of Cover against ranged attacks. The canticle expires at the start of your next Command phase.',targets);
    add('Mechanicus Bodyguard',[incoming,incomingSnap,returnFire],'While Cawl is within 3″ of another friendly Adeptus Mechanicus unit, he has Lone Operative. Enemies more than 12″ from him cannot see him or target him with Indirect Fire.',targets);break;
   }
   case 'Thulia Ghuld':{
    const eligible=unique([id,...skitarii]);
    add('Rod of the War Forge',[['Command','own','during']],'Choose one Icon of War ability and immediately select its one friendly Skitarii or Thulia Ghuld unit within 6″. It lasts until the start of your next Command phase: Fanatical Devotion allows shooting and charging after Advancing; Adaptive Tactics allows shooting and charging after Falling Back; The Fires of Mars makes both Protector and Conqueror active for the selected unit.',eligible);
    add('Icon of War',[move,shoot,['Charge','own','during']],'Only the unit chosen for Thulia’s current Icon of War receives its effect until the start of your next Command phase. Fanatical Devotion permits shooting and charging after Advancing; Adaptive Tactics permits both after Falling Back. The Fires of Mars makes both Doctrina Imperatives active for that unit. These are three alternatives, not three simultaneous selections.',eligible);
    add('Secutor of Olympus',[['Shooting','own','start']],'Select one enemy Vehicle unit within 12″ of Thulia and roll one D6. On 2+, it suffers D3+1 mortal wounds.');
    add('Mechanicus Bodyguard',[incoming,incomingSnap,returnFire],'While Thulia is within 3″ of another friendly Adeptus Mechanicus unit, she has Lone Operative. Enemies more than 12″ from her cannot see her or target her with Indirect Fire.',targets);break;
   }
   case 'Tech-priest Dominus':
    led('Lord of the Machine Cult',eachPhase,'Models in this formation have Feel No Pain 5+. Use Feel No Pain 4+ instead while the formation has the Electro-Priests keyword; the attached Dominus benefits too. If the last Electro-Priest is gone, the surviving Dominus keeps its own 5+ leading benefit.');
    add('Data-spike',[['Fight','either','start']],'Select one enemy Vehicle unit engaged with this model’s formation and roll one D6. On 4+, that enemy suffers D6 mortal wounds and its melee weapons’ Weapon Skill is worsened by 1 until this Fight phase ends.',formation);break;
   case 'Tech-priest Enginseer':
    add('Enginseer',[incoming,incomingSnap,returnFire],'While within 3″ of a friendly Adeptus Mechanicus Vehicle unit and not leading a unit, this Enginseer has Lone Operative. Enemies more than 12″ away cannot see its protected unit or target it with Indirect Fire. An Enginseer that started attached remains a leader after the bodyguard dies.',vehicles);
    add('Omnissiah’s Blessing',[['Command','own','during']],'Select one friendly Adeptus Mechanicus model within 3″. It regains up to D3 lost wounds. If that model is a Vehicle, it also has Feel No Pain 5+ until the start of your next Command phase. Each model can be selected only once per Command phase. The blessing affects the selected physical model, not every model in its formation.',native.map(s=>s.id));
    add('Omnissiah’s Blessing · Protection',eachPhase,'A Vehicle model selected by this Enginseer’s blessing has Feel No Pain 5+ until the start of your next Command phase. Only the selected model has it.',vehicles);
    add('Vengeance for the Omnissiah · A Vehicle is destroyed',eachPhase,'If a friendly Adeptus Mechanicus Vehicle model is destroyed within 12″ of this Enginseer, its own Omnissian axe has 6 Attacks for the rest of the battle. This changes only the Enginseer’s weapon.',vehicles);
    add('Vengeance for the Omnissiah',[fight],'After a friendly Adeptus Mechanicus Vehicle model was destroyed within 12″ of this Enginseer, its own Omnissian axe has 6 Attacks for the rest of the battle.');break;
   case 'Tech-priest Manipulus':
    if(leading)attacks('Galvanic Field','While the originally attached Manipulus survives, weapons of all models in its formation have Lethal Hits. Critical Hits can wound automatically. Its own leading benefit continues after the bodyguard is gone; if it dies to an attack, retain the benefit until the attacker finishes.');
    add('Defend the Divine Work',startPhase,'Once per battle, at the start of any phase, this Manipulus can grant all models in its formation a 4+ invulnerable save until that phase ends.',formation);break;
   case 'Technoarcheologist':
    led('Seekers of Divine Arcana',eachPhase,'Add 1 to the Objective Control characteristic of every model in this formation.');
    add('Cogitative Instincts',[['Movement','opponent','during'],['Movement','own','end']],'Enemy units arriving as Reinforcements cannot be set up within 12″ horizontally of this Technoarcheologist model. Measure from its actual position, not its entire bodyguard.',[id]);break;
   case 'Skitarii Marshal':
    if(leading)attacks('Control Edict','While the originally attached Marshal survives, models in its formation may re-roll attack Hit rolls. The benefit continues for its surviving formation after the bodyguard dies; if the Marshal dies to an attack, retain it until the attacker finishes.');
    add('Servo-skull Uplink',startPhase,'Once per battle, select one friendly Battle-shocked Skitarii unit within 6″ of this Marshal. It is no longer Battle-shocked.',skitarii);break;
   case 'Cybernetica Datasmith':{
    const robot=group.members.find(s=>s.unit==='Kastelan Robots');
    if(robot&&leading){
     add('Battle Protocols',[['Pre-battle','either','start']],'At the start of the battle, this attached Kastelan unit enters Aegis Protocol: add 1 Toughness to its Kastelan Robot models. The Datasmith’s own Toughness is unchanged.',[robot.id]);
     add('Battle Protocols',[['Command','own','during']],'You may select one protocol: Protector gives Kastelan Robot models +2 ranged Attacks; Conqueror gives Kastelan Robot models +2 melee Attacks; Aegis gives Kastelan Robot models +1 Toughness. A selected protocol persists until replaced, including after this Datasmith is destroyed. Apply it only to the actual Kastelan Robot models.',[robot.id]);
     add('Protector Protocol',[shoot,snap],'If Protector is the unit’s current protocol, add 2 to the Attacks of ranged weapons equipped by its Kastelan Robot models. The Datasmith’s own weapons gain no attacks.',[robot.id]);
     if(reactions.length)add('Protector Protocol',[incoming],'If normal reaction shooting is permitted and Protector is current, add 2 to the Attacks of ranged weapons equipped by surviving Kastelan Robot models only.',[robot.id]);
     add('Conqueror Protocol',[fight],'If Conqueror is the unit’s current protocol, add 2 to the Attacks of melee weapons equipped by its Kastelan Robot models. The Datasmith’s own weapons gain no attacks.',[robot.id]);
     add('Aegis Protocol',defence,'If Aegis is the unit’s current protocol, add 1 Toughness to its Kastelan Robot models. The Datasmith’s own characteristic is unchanged; while Robots remain, use the bodyguards’ Toughness when the formation is attacked.',[robot.id]);
    }
    add('Data-severed',eachPhase,'If there are no Kastelan Robot models in this formation, it loses Vehicle and gains Infantry. Use the surviving models’ actual keywords; do not keep Vehicle just because the Datasmith began in a Robot formation.',formation);break;
   }
   case 'Kataphron Breachers':
    attacks('Breaching Command','Models in this formation re-roll Hit rolls of 1, or may re-roll all Hit rolls while within 6″ of a friendly Adeptus Mechanicus Battleline unit. This does not apply to snap shooting.');break;
   case 'Kataphron Destroyers':
    add('Sentinel Directives',[snap],'When this formation is targeted by Fire Overwatch, its snap shots hit on unmodified 5+ instead of 6. They still cannot re-roll Hit rolls or score Critical Hits.',formation);break;
   case 'Fulgurite Electro-priests':
    if(group.members.some(s=>s.id!==id&&mechanicusKeywords(army,s).has('CHARACTER')))add('Electro-infusion',defence,'While a Character model is leading this formation, subtract 1 from Wound rolls for attacks targeting it.',formation);break;
   case 'Corpuscarii Electro-priests':
    add('Electro-shock',[shoot],'After this formation shoots in your Shooting phase, select one enemy unit with neither Monster nor Vehicle that it hit. Until the end of your opponent’s next turn, that enemy has −2″ Move and −2 to Advance and Charge rolls.',formation);
    add('Electro-shock',[['Movement','opponent','during'],['Charge','opponent','during']],'An enemy shocked by this formation has −2″ Move and −2 to Advance and Charge rolls until the end of your opponent’s next turn.',formation);break;
   case 'Kastelan Robots':{
    const smith=group.members.filter(s=>s.unit==='Cybernetica Datasmith');
    add('Robotic Bodyguard',eachPhase,'While the attached Cybernetica Datasmith leads these Robots, only that Datasmith model has Feel No Pain 4+ from Robotic Bodyguard. The Robots do not receive this ability.',smith.map(s=>s.id));
    add('Repulsor Grid',[incoming,incomingSnap,returnFire],'When an enemy unit targets this formation with ranged attacks, each unmodified save roll of 6 causes 1 mortal wound to that attacker after it finishes shooting. This applies to any save roll by the formation, including an attached Datasmith’s save; it is not limited to invulnerable saves.',formation);break;
   }
   case 'Skitarii Rangers':
    add('Objective Scouted',[['Command','own','end']],'If this formation is within range of an objective you control, it remains yours after you leave until the opponent’s Level of Control is greater than yours at the end of a phase.',formation);break;
   case 'Skitarii Vanguard':
    add('Rad-saturation',endPhase,'While an enemy unit with no Vehicle keyword is within 3″ of this formation, subtract 1 from the Objective Control of each model in that enemy unit.',formation);break;
   case 'Sicarian Infiltrators':
    add('Voices in the Code',[['Fight','either','start']],'Each enemy unit engaged with one or more units with Voices in the Code takes one Battle-shock test. Several nearby Infiltrator units do not each force a separate test.');
    add('Neurostatic Interference',eachPhase,'Enemy units within 6″ subtract 1 from Battle-shock and Leadership tests. Subtract 2 instead while this Infiltrator formation is within 6″ of a friendly Adeptus Mechanicus Battleline unit.');break;
   case 'Sicarian Ruststalkers':
    add('Optimised Gait',[move,charge],'Add 1 to this formation’s Advance and Charge rolls, or add 2 instead while it is within 6″ of a friendly Adeptus Mechanicus Battleline unit.',formation);break;
   case 'Ironstrider Ballistarii':
    add('Elevated Strider',[move,shoot],'This unit remains eligible to shoot in a turn when it Advanced or Fell Back. Re-roll Desperate Escape tests taken for its models.');break;
   case 'Sydonian Dragoons With Taser Lances':
    add('Dynamic Efficiency',[move,['Charge','own','during']],'This unit remains eligible to declare a charge in a turn when it Advanced or Fell Back. Re-roll Desperate Escape tests taken for its models.');break;
   case 'Sydonian Dragoons With Radium Jezzails':
    add('Focused Hunters',[['Pre-battle','either','start']],'At the start of the battle, select one unit from the opponent’s army as this unit’s quarry.');
    attacks('Focused Hunters','Against the enemy unit selected for this particular Dragoon squad at the start of the battle, its models may re-roll attack Hit rolls for the entire battle. This does not apply to snap shooting.');break;
   case 'Onager Dunecrawler':{
    const battleline=native.filter(s=>mechanicusKeywords(army,s).has('BATTLELINE')||s.unit==='Belisarius Cawl');
    add('Emanatus Force Field',[incoming,incomingSnap,returnFire],'A friendly Adeptus Mechanicus Battleline model wholly within 6″ of this Onager has a 4+ invulnerable save against ranged attacks. Check each physical model separately: attached Characters do not gain Battleline from their bodyguard. Cawl qualifies only while his Mantra of Discipline is active.',battleline.map(s=>s.id));
    add('Scuttling Walker',[move],'When this Onager makes a Normal, Advance or Fall Back move, it may move through friendly Monster and Vehicle models and sections of terrain 4″ or less in height.');break;
   }
   case 'Skorpius Dunerider':{
    const cargo=mechanicusCargoFormations(army,squad,roster).flatMap(g=>g.members.map(s=>s.id));
    add('Fire Support',[shoot],'After this Dunerider shoots in your Shooting phase, select one enemy it hit this phase. Until this phase ends, friendly models that disembarked from this particular Dunerider this turn may re-roll Wound rolls against that enemy. Use only actual disembarked passengers.',cargo);break;
   }
   case 'Skorpius Disintegrator':{
    const clauses=[];
    if(fitted('Belleros energy cannon'))clauses.push('Add 1 to Hit for this model’s Belleros energy cannon attacks against Infantry units.');
    if(fitted('Ferrumite cannon'))clauses.push('Add 1 to Hit for this model’s Ferrumite cannon attacks against Monster or Vehicle units.');
    if(clauses.length)ranged('Blistering Salvoes',clauses.join(' '),undefined,[id]);break;
   }
   case 'Serberys Sulphurhounds':
    add('Line-breakers',[charge],'When this unit ends a charge move, select one enemy unit engaged with it. Roll one D6 per surviving model in this unit that is actually engaged with that enemy. Add 2 to each result if this unit began its charge move within 6″ of a friendly Adeptus Mechanicus Battleline unit. Each 4+ inflicts one mortal wound.');break;
   case 'Serberys Raiders':
    add('Tactica Obliqua',[['Movement','opponent','during']],'After an enemy ends a move within 8″, if this unit is unengaged it may make a Normal move of up to D6″. It may instead move up to 6″ if every model ends wholly within 6″ of one or more friendly Adeptus Mechanicus Battleline units.');break;
   case 'Pteraxii Sterylizors':
    if(fitted('Phosphor torch'))ranged('Searing Conflagration','Phosphor torch attacks against an enemy within range of an objective marker re-roll Wound rolls of 1. If this unit is also within 6″ of a friendly Adeptus Mechanicus Battleline unit, those attacks may instead re-roll the Wound roll. Only surviving Phosphor torch bearers benefit.','Phosphor torch snap shots against an enemy within range of an objective marker re-roll Wound rolls of 1, or may re-roll the Wound roll if this unit is also within 6″ of a friendly Adeptus Mechanicus Battleline unit.',[id]);break;
   case 'Pteraxii Skystalkers':
    add('Ride the Thermals',[shoot],'After shooting in your Shooting phase, if unengaged, this unit may make a Normal move of up to 6″; it may instead move up to 12″ if every model finishes wholly within 6″ of one or more friendly Adeptus Mechanicus Battleline units. If it moves, it cannot declare a charge this turn.');
    add('Ride the Thermals',[['Charge','own','during']],'If this unit used Ride the Thermals after shooting, it cannot declare a charge this turn.');break;
   case 'Archaeopter Transvector':
    add('Aerial Deployment',[move],'This Transvector may make an ingress move in your first Movement phase. It is not an Aircraft and does not automatically return to reserves at the end of the opponent’s turn. This exception does not permit first-round Rapid Ingress.');break;
   case 'Archaeopter Stratoraptor':
    ranged('Strafing Run','Add 1 to Hit for this model’s ranged attacks against a unit that cannot Fly.',undefined,[id]);break;
   case 'Archaeopter Fusilave':
    add('Bomb Rack',[['Fight','opponent','end']],'Select one visible enemy unit within 24″ of this Fusilave, excluding Lone Operative units. Roll six D6; each 4+ inflicts one mortal wound. Resolve this before the Aircraft returns to reserves at the end of the opponent’s turn.');break;
   case 'Sydonian Skatros':{
    add('Dread Snipers',[shoot],'After this Skatros shoots in your Shooting phase, select one enemy unit it hit. That unit takes a Battle-shock test.');
    const clauses=[];
    if(fitted('Radium jezzail'))clauses.push('Its Radium jezzail attacks may re-roll Wound rolls against Infantry units.');
    if(fitted('Skatros transuranic arquebus'))clauses.push('Its Skatros transuranic arquebus attacks may re-roll Wound rolls against Monster or Vehicle units.');
    if(clauses.length)ranged('Achillan Eye',clauses.join(' '),clauses.join(' '),[id]);break;
   }
   case 'Servitor Battleclade':
    add('Network Override',[move,shoot],'While this formation contains a surviving Tech-Priest model, it can perform an action in a turn when it Advanced and can shoot in a turn when it started an action. The native Tech-Priest is the physical Servitor Underseer, not each Combat or Gun Servitor; an attached Tech-Priest can also supply the condition.',formation);break;
   case 'Hastarii Exterminators':
    if(fitted('Eradication caster'))ranged('Broad-spectrum Targeting Augurs','Eradication caster attacks made by this unit’s actual bearers have Sustained Hits 1 against a target with neither Monster nor Vehicle. This does not work during snap shooting, which cannot score Critical Hits.',undefined,[id]);break;
   case 'Hastarii Fusiliers':
    if(fitted('Neutron fusil'))ranged('Monocular Targeting Helms','Neutron fusil attacks by this unit’s actual bearers have Ignores Cover against Monster or Vehicle units.','Neutron fusil snap shots by this unit’s actual bearers have Ignores Cover against Monster or Vehicle units.',[id]);break;
  }
 }
 return result;
}
