import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {SORORITAS_SHEETS} from './sororitas-data.generated';
import {sororitasKeywords,sororitasMusterUnits} from './sororitas-army-data';
import {sororitasHasRangedWeapon,sororitasWeaponCount} from './sororitas-loadouts';
import {sororitasReactionShooting} from './sororitas-reactions';
import {sororitasFormations,sororitasSplitCargoFormations} from './sororitas-transports';
import {expandRoster,type RosterInstance} from './roster-instances';

type Step=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const shoot:Step=['Shooting','own','during'],fight:Step=['Fight','either','during'];
const move:Step=['Movement','own','during'],charge:Step=['Charge','either','during'];
const snap:Step=['Movement','opponent','end'],incoming:Step=['Shooting','opponent','during'];
const incomingSnap:Step=['Movement','own','end'];
const eachPhase=PHASES.map((p):Step=>[p,'either','during']);
const startPhase=PHASES.map((p):Step=>[p,'either','start']);
const endPhase=PHASES.map((p):Step=>[p,'either','end']);
const cards=new Map(SORORITAS_SHEETS.map(s=>[s.unit,s]));
const unique=(ids:string[])=>[...new Set(ids)];
const bodyguardEffects=new Set(['Extremis Trigger Word','Storm of Retribution','Righteous Awareness','Embodied Prophecy','Sworn Protectors','Righteous Paragons','Impetuous Fervour','Ministorum Sermon','Rituale Nullificatus','Virtue of Intolerance']);

export function sororitasIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Adepta Sororitas')return [];
 const legal=new Set(sororitasMusterUnits(army));
 const native=roster.filter(s=>cards.has(s.unit)&&legal.has(s.unit));
 if(!native.length)return [];
 const groups=sororitasFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 const groupOf=(s:RosterInstance)=>groups.find(g=>g.members.some(m=>m.id===s.id));
 const sororitas=groups.filter(g=>g.members.some(s=>sororitasKeywords(army,s).has('ADEPTA SORORITAS')));
 const recipients=sororitas.flatMap(g=>g.members.map(s=>s.id));
 const armed=sororitas.filter(g=>g.members.some(s=>sororitasHasRangedWeapon(s))).flatMap(g=>g.members.map(s=>s.id));
 const result:GeneratedReminder[]=[];
 function emit(key:string,title:string,steps:readonly Step[],summary:string,units:string[],source:string){
  if(units.length)for(const [window,turn,timing] of steps)result.push({id:['11e-sororitas-native',key,title,window,turn,timing].join(':'),title,window,turn,timing,summary,units:unique(units),source,origin:'unit'});
 }
 const commanders=native.filter(s=>s.unit==='Canoness'||s.unit==='Canoness with Jump Pack');
 if(commanders.length)emit('canonesses','Sacred Command',eachPhase,'Once per battle round across all units with Sacred Command, when one of their own formations is targeted with a Stratagem, one Canoness can reduce that use’s cost by 1CP. The shared allowance covers both Canoness datasheets.',commanders.flatMap(s=>groupOf(s)?.members.map(m=>m.id)??[s.id]),cards.get(commanders[0].unit)!.source);
 for(const squad of native){
  const {id,unit}=squad,group=groupOf(squad);if(!group)continue;
  const formation=group.members.map(s=>s.id),leading=group.root.id!==id;
  const hasGun=group.members.some(s=>sororitasHasRangedWeapon(s));
  const fitted=(name:string)=>sororitasWeaponCount(squad,name)>0;
  const reactions=sororitasReactionShooting(army,squad,roster);
  const maySplit=roster.some(s=>sororitasSplitCargoFormations(army,s,roster).some(g=>g.root.id===group.root.id));
  const hasBodyguardSource=group.root.id===id&&group.members.length>1;
  function add(title:string,steps:readonly Step[],summary:string,targets=[id]){
   const bodyguard=hasBodyguardSource&&bodyguardEffects.has(title)?' This bodyguard-sourced ability is available only while an original '+unit+' model remains. If the last is destroyed by an attack, retain its effect until that attacking unit finishes its attacks; previously applied effects with a stated duration keep that duration.':'';
   if(targets.length)emit(id,title,steps,summary+bodyguard+(maySplit?' If split for an Immolator, resolve this for the actual half involved; a Leader, Support, named model or wargear ability benefits only the half containing its living source.':''),[id,...targets],cards.get(unit)!.source);
  }
  const led=(title:string,steps:readonly Step[],summary:string)=>{if(leading)add(title,steps,summary,formation);};
  const ranged=(title:string,summary:string,snapSummary?:string,targets=formation)=>{
   if(!hasGun)return;
   add(title,[shoot],summary,targets);
   if(snapSummary)add(title,[snap],snapSummary,targets);
   if(reactions.length)add(title,[incoming],'Only when this formation makes normal reaction shots through '+reactions.join('; or ')+': '+summary,targets);
  };
  const attacks=(title:string,summary:string,snapSummary?:string,targets=formation)=>{
   add(title,[fight],summary,targets);ranged(title,summary,snapSummary,targets);
  };
  if(fitted('Sacred banner'))add('Sacred Banner',[move,charge],'While the Sacred Banner bearer survives, this formation may re-roll Advance and Charge rolls.',formation);
  if(fitted('Salvationist medikit'))add('Salvationist Medikit',[['Command','own','during']],'If this squad’s Salvationist Medikit bearer is on the battlefield, return up to D3 destroyed non-Character models to its formation.',formation);
  switch(unit){
   case 'Arco-flagellants':
    add('Extremis Trigger Word',[fight],'When this formation is selected to fight, you may invoke its trigger word. Until phase end, its equipped arco-flails have 6 Attacks and Hazardous. Apply this only to arco-flails.',formation);break;
   case 'Penitent Engines':
    add('Endless Suffering',[move,['Charge','own','during']],'This unit remains eligible to declare a charge in a turn in which it Advanced.');break;
   case 'Saint Celestine':
    add('Healing Tears',[['Command','own','during']],'While Celestine herself survives, return one destroyed Geminae Superia to this unit in your Command phase. This restores one of her two escorts.');
    add('Lifewards',eachPhase,'While at least one Geminae Superia survives, only Celestine herself has Feel No Pain 4+ from Lifewards. Her escorts and attached Bodyguard do not gain this protection.');
    add('Miraculous Intervention',endPhase,'The first time Celestine herself is destroyed, roll one D6 at the end of that phase. On 2+, return Celestine at full wounds, as close as possible to where she was destroyed and outside enemy Engagement Range.');break;
   case 'Canoness':
    add('The Emperor’s Grace',startPhase,'Once per battle at the start of any phase, this Canoness may give herself a 2+ invulnerable save until that phase ends.');
    if(fitted('Null rod'))add('Null Rod',eachPhase,'While this Canoness’s Null Rod bearer survives, every model in its formation has Feel No Pain 4+ against mortal wounds and Psychic Attacks.',formation);
    if(fitted('Rod of office'))attacks('Rod of Office','While this Canoness’s Rod of Office bearer survives, models in its formation re-roll Hit rolls of 1.',undefined,formation);
    break;
   case 'Canoness with Jump Pack':
    add('Divine Deliverance',[['Fight','either','start']],'Once per battle at Fight phase start, this Canoness may add 3 Attacks to her own melee weapons and give them Devastating Wounds until phase end.');break;
   case 'Imagifier':
    add('Litany of Deeds',eachPhase,'When a friendly Adepta Sororitas unit or model is destroyed within 12″ of this Imagifier and that death grants Miracle dice, you may re-roll each such die before adding it to the pool. This includes extra dice from Saintly Example.',recipients);
    led('Stanchion of Holy Martyrs',[incoming,incomingSnap,shoot,fight],'While this originally attached Imagifier survives, models in its formation have a 2+ Save and a 4+ invulnerable save.');break;
   case 'Hospitaller':
    led('Medicus Ministorum',eachPhase,'While this originally attached Hospitaller survives, every model in its formation has Feel No Pain 5+.');
    led('Sacred Healing',[['Command','own','during']],'While this originally attached Hospitaller survives, return one destroyed non-Character model to its formation in your Command phase. You may first discard one Miracle die to return up to D3+1 destroyed non-Character models instead. Discarding a die here is not an Act of Faith.');break;
   case 'Dialogus':
    add('Laud Hailer',startPhase,'Once per battle at the start of any phase, choose one friendly Battle-shocked Adepta Sororitas unit within 12″ of this Dialogus; it is no longer Battle-shocked.',recipients);break;
   case 'Battle Sisters Squad':
    add('Defenders of the Faith',[['Command','own','end']],'At the end of your Command phase, if this formation is within range of an objective you control, that objective remains yours until the opponent has a higher Level of Control there at the end of a phase.',formation);break;
   case 'Seraphim Squad':
    add('Angelic Ascent',[shoot],'After this formation shoots in your Shooting phase, if unengaged, it may make a Normal move of up to 6″. If it does, it cannot declare a charge this turn.',formation);
    add('Angelic Ascent',[['Charge','own','during']],'If this formation moved using Angelic Ascent in your Shooting phase, it cannot declare a charge this turn.',formation);break;
   case 'Repentia Squad':
    add('Overseer of Redemption',[fight],'While this squad’s Repentia Superior survives, only its Sisters Repentia models may re-roll melee Hit and Wound rolls. The Superior and attached Characters do not gain these re-rolls.');break;
   case 'Retributor Squad':
    ranged('Storm of Retribution','Models in this formation re-roll ranged Hit rolls of 1 and Wound rolls of 1. Against an enemy unit that destroyed an Adepta Sororitas unit from your army this battle, also add 1 to both Hit and Wound rolls.','When this formation fires Overwatch, re-roll ranged Wound rolls of 1. Against an enemy unit that destroyed an Adepta Sororitas unit from your army this battle, also add 1 to Wound rolls. Snap shooting cannot re-roll or modify Hit rolls.');break;
   case 'Dominion Squad':
    add('Righteous Awareness',[['Movement','opponent','during']],'In the opponent’s Movement phase, when an enemy unit ends a move within 8″ of this formation, if this formation is unengaged it may make a Normal move of up to D6″.',formation);break;
   case 'Sororitas Rhino':
    add('Self Repair',[['Command','own','start']],'At the start of your Command phase, this Rhino regains one lost wound.');break;
   case 'Immolator':
    add('Purge and Cleanse',[shoot],'After this Immolator shoots in your Shooting phase, choose one enemy unit it hit. That enemy cannot receive the Benefit of Cover for the rest of this phase.');break;
   case 'Exorcist':
    add('Devastating Refrain',[shoot],'After this Exorcist shoots in your Shooting phase, each enemy unit hit by one or more of its Indirect Fire weapon attacks must take a Battle-shock test. If such an attack destroys a model with Deadly Demise, that model inflicts its Deadly Demise mortal wounds on 5+ instead of 6.');break;
   case 'Ministorum Priest':
    led('Righteous Smiting',[fight],'While this originally attached Ministorum Priest survives, models in its formation add 1 to melee Wound rolls.');
    add('Zealot',[fight],'Once per battle in the Fight phase, this Priest may improve the Strength and Attacks of its own melee weapons by 3 until phase end.');break;
   case 'Triumph Of Saint Katherine':
    add('Relics of the Matriarchs',[['Start of battle round','either','start']],'At the start of each battle round, choose up to two relic auras; if the Triumph has 1–6 wounds remaining, choose only one. Choices: The Fiery Heart (+2″ Move, +1 Advance and Charge); Censer of the Sacred Rose (Battle-shock re-rolls); Simulacrum of the Ebon Chalice (up to two Acts of Faith per phase); Simulacrum of the Argent Shroud (ranged Wound rolls of 1 re-rolled); Icon of the Valorous Heart (Feel No Pain 6+); Petals of the Bloody Rose (melee AP improved by 1). Chosen auras affect friendly Adepta Sororitas units within 6″ until the next battle round starts.',recipients);
    add('The Fiery Heart',[move,charge],'Only if this relic was selected for the battle round: friendly Adepta Sororitas formations within 6″ of this Triumph add 2″ to Move and 1 to Advance and Charge rolls.',recipients);
    add('Censer of the Sacred Rose',eachPhase,'Only if this relic was selected for the battle round: friendly Adepta Sororitas formations within 6″ of this Triumph may re-roll Battle-shock tests.',recipients);
    add('Icon of the Valorous Heart',eachPhase,'Only if this relic was selected for the battle round: models in friendly Adepta Sororitas formations within 6″ of this Triumph have Feel No Pain 6+.',recipients);
    add('Simulacrum of the Argent Shroud',[shoot,snap],'Only if this relic was selected for the battle round: models in friendly Adepta Sororitas formations within 6″ of this Triumph re-roll ranged Wound rolls of 1, including in Overwatch.',armed);
    {const reaction=groups.filter(g=>sororitasReactionShooting(army,g.root,roster).length).flatMap(g=>g.members.map(s=>s.id));
     add('Simulacrum of the Argent Shroud',[incoming],'Only while making permitted normal reaction shots through Praise the Fallen or Blazing Ire, and if this relic was selected: models in friendly Adepta Sororitas formations within 6″ of this Triumph re-roll ranged Wound rolls of 1.',reaction);}
    add('Petals of the Bloody Rose',[fight],'Only if this relic was selected for the battle round: models in friendly Adepta Sororitas formations within 6″ of this Triumph improve their melee weapons’ AP by 1.',recipients);break;
   case 'Junith Eruita':
    add('The Pulpit of Saint Holline’s Basilica',[incoming,incomingSnap,shoot],'Junith’s formation has Stealth, granting the Benefit of Cover against ranged attacks.',formation);
    add('The Pulpit of Saint Holline’s Basilica',[fight],'Subtract 1 from Hit rolls for melee attacks targeting Junith’s formation.',formation);
    add('Fiery Conviction',[['Command','own','start']],'If Junith is on the battlefield at the start of your Command phase, choose either to discard one Miracle die and gain 1CP, or to take a Leadership test for Junith and gain 1CP if she passes.');break;
   case 'Zephyrim Squad':
    add('Embodied Prophecy',[fight],'When this formation is selected to fight, choose Sustained Hits 1 or Lethal Hits for its models’ melee weapons until phase end. If this formation made a Charge move this turn, choose both abilities instead.',formation);break;
   case 'Mortifiers':
    add('Anguish of the Unredeemed',[fight],'When a Mortifier model is destroyed by a melee attack before it has fought this phase, roll one D6. On 2+, it fights after the attacking unit finishes, then is removed.');
    if(fitted('Anchorite sarcophagus')){
     add('Anchorite Sarcophagus',[move],'Only the Mortifier model equipped with an Anchorite Sarcophagus has Move 7″.');
     add('Anchorite Sarcophagus',[incoming,incomingSnap,shoot,fight],'Only the Mortifier model equipped with an Anchorite Sarcophagus has a 3+ Save.');
    }break;
   case 'Palatine':
    if(leading)attacks('Fury of the Righteous','While this originally attached Palatine survives, weapons equipped by models in its formation have Lethal Hits. Critical Hits may automatically wound.');
    add('Rapturous Blows',[fight],'When the Palatine’s formation is selected to fight, you may discard one Miracle die. Until phase end, each melee attack made by this Palatine that scores a wound inflicts one additional mortal wound on its target. Discarding this die is not an Act of Faith.');break;
   case 'Morvenn Vahl':
    if(leading)attacks('Abbess Sanctorum','While this originally attached Morvenn Vahl survives, models in her formation may re-roll Hit and Wound rolls.','While Morvenn Vahl survives, models in her originally attached formation may re-roll Wound rolls when firing Overwatch. Snap shooting cannot re-roll Hit rolls.');
    attacks('Righteous Repugnance','When Vahl’s formation is selected to shoot or fight, you may discard one Miracle die. Until phase end, add 3 Attacks to Vahl’s Fidelis and Lance of Illumination. Discarding this die is not an Act of Faith.','When Vahl’s formation is selected to fire Overwatch, you may discard one Miracle die to add 3 Attacks to Vahl’s Fidelis until phase end. This is not an Act of Faith.',[id]);
    attacks('Righteous Repugnance · Miracle die','Each time Morvenn Vahl herself destroys an enemy unit, gain one Miracle die.','Each time Morvenn Vahl herself destroys an enemy unit with Overwatch, gain one Miracle die.',[id]);break;
   case 'Aestred Thurga And Agathae Dolan':
    if(leading){
     attacks('Auto-Tapestry of the Emperor’s Judgement','While Aestred Thurga herself survives in this originally attached unit, weapons equipped by models in the formation have Devastating Wounds.','While Aestred Thurga herself survives in this originally attached unit, its models’ ranged weapons have Devastating Wounds, including while firing Overwatch.');
     attacks('Recount the Deeds of the Saints','While Agathae Dolan survives in this originally attached unit, gain one Miracle die each time its formation destroys an enemy unit.','While Agathae Dolan survives in this originally attached unit, gain one Miracle die if its Overwatch destroys an enemy unit.');
    }
    add('Recount the Deeds of the Saints · Agathae is destroyed',eachPhase,'When Agathae Dolan herself is destroyed, gain D3 Miracle dice. This model-death trigger is separate from the army rule’s die for losing the entire formation.');break;
   case 'Celestian Sacresants':
    if(group.members.some(s=>s.id!==id&&sororitasKeywords(army,s).has('ADEPTA SORORITAS')&&sororitasKeywords(army,s).has('CHARACTER')))
     add('Sworn Protectors',[incoming,incomingSnap,shoot,fight],'While an Adepta Sororitas Character leads this formation, subtract 1 from Wound rolls for attacks targeting it.',formation);
    break;
   case 'Dogmata':
    add('Executioner of Heretics',eachPhase,'While an enemy unit is within 6″ of this Dogmata, worsen its models’ Leadership by 1. Apply this when it takes Leadership and Battle-shock tests.');
    led('Unflinching Determination',eachPhase,'While this originally attached Dogmata survives, add 1 to the Objective Control of every model in its formation.');break;
   case 'Paragon Warsuits':
    attacks('Righteous Paragons','Models in this formation add 1 to Hit and Wound rolls when attacking a Monster or Vehicle unit.','When firing Overwatch at a Monster or Vehicle unit, add 1 to Wound rolls. Snap shooting ignores Hit modifiers.');break;
   case 'Castigator':
    add('Rites of Castigation',[shoot],'After this Castigator shoots in your Shooting phase, choose an enemy unit it hit. Until the end of this turn, ranged attacks by friendly Adepta Sororitas formations improve their AP by 1 against that enemy. An enemy can be affected by Rites of Castigation only once per turn.',armed);break;
   case 'Sisters Novitiate Squad':
    attacks('Impetuous Fervour','Models in this formation re-roll Hit rolls of 1. Against an enemy within range of an objective marker, they may re-roll any Hit roll instead.');break;
   case 'Daemonifuge':
    add('Holy Judgement',[['Shooting','own','start']],'If Ephrael Stern survives, choose one enemy unit within 12″ of and visible to her. It takes a Battle-shock test, subtracting 2 if it is a Chaos unit. On failure, that enemy suffers three mortal wounds.');
    add('Mysterious Saviours',[['Charge','opponent','during']],'You may target Daemonifuge with Heroic Intervention for 1CP less, regardless of other uses of that Stratagem this phase. This use does not prevent using it on other units before or after.');break;
   case 'Sanctifiers':
    if(group.members.some(s=>sororitasKeywords(army,s).has('MINISTORUM PRIEST')))
     add('Ministorum Sermon',[fight],'While this formation contains a Ministorum Priest, its models’ melee weapons have Sustained Hits 1.',formation);
    break;
   case 'Celestian Insidiants':
    add('Rituale Nullificatus',eachPhase,'Models in this formation have Feel No Pain 4+ against Psychic Attacks and mortal wounds.',formation);
    add('Virtue of Intolerance · Choose quarry',[['Pre-battle','either','during']],'At the start of the battle, choose one enemy unit as this formation’s quarry, even if this formation is embarked in a transport. Record that enemy.',formation);
    attacks('Virtue of Intolerance','Against this formation’s recorded quarry, its models’ attacks have Precision and may re-roll Hit rolls.','When this formation fires Overwatch at its recorded quarry, its attacks have Precision. Snap shooting cannot re-roll Hit rolls.');
    if(fitted('Denuncia oratory'))add('Denuncia Oratory',eachPhase,'While the Denuncia Oratory bearer survives, each time this formation’s quarry is destroyed, you may choose a new enemy unit as its quarry.',formation);break;
   case 'Intranzia Fraye':
    add('Righteous Denunciation',[['Fight','either','start']],'At the start of each Fight phase, every enemy unit within 6″ of Intranzia Fraye takes a Battle-shock test with −1 to the result.');
    add('Judged for Execution',[['Movement','own','end']],'At the end of your Movement phase, choose one enemy within 18″ of and visible to Intranzia Fraye. Until your next Command phase starts, attacks by friendly Adepta Sororitas models against that enemy have Lethal Hits.');
    add('Judged for Execution',[shoot,fight],'Attacks by your Adepta Sororitas models against the enemy marked by Intranzia Fraye have Lethal Hits until your next Command phase starts.',native.map(s=>s.id));
    {const targets=native.filter(s=>sororitasHasRangedWeapon(s)&&sororitasReactionShooting(army,s,roster).length).map(s=>s.id);
     add('Judged for Execution',[incoming],'Only while making permitted normal reaction shots through Praise the Fallen or Blazing Ire: your Adepta Sororitas models’ attacks against Intranzia Fraye’s marked enemy have Lethal Hits until your next Command phase starts.',targets);}
    break;
  }
 }
 return result;
}
