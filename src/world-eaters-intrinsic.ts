import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';
import {worldEaterHasRangedWeapon,worldEaterWeaponCount} from './world-eater-loadouts';
import {WORLD_EATERS_SHEETS,worldEatersKeywords,worldEatersMusterUnits} from './world-eaters-data';
import {WORLD_EATERS_REVISION} from './world-eaters-data.generated';
import {worldEatersCargoFormations} from './world-eaters-muster';

const sheets=new Map(WORLD_EATERS_SHEETS.map(s=>[s.unit,s]));
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];

export function worldEatersIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='World Eaters')return [];
 const allowed=new Set(worldEatersMusterUnits(army));
 const native=roster.filter(s=>sheets.has(s.unit)&&allowed.has(s.unit));
 const bodyByMember=new Map(native.map(s=>[s.id,knightJoinedBodyguard(army,s)?.id]));
 const roots=native.filter(s=>!bodyByMember.get(s.id));
 const groups=roots.map(body=>({body,members:[body,...native.filter(s=>bodyByMember.get(s.id)===body.id)]}));
 const withTags=(...tags:string[])=>groups.filter(g=>{
  const found=new Set(g.members.flatMap(m=>[...worldEatersKeywords(army,m)]));
  return tags.every(t=>found.has(t));
 }).map(g=>g.body.id);
 const marines=withTags('WORLD EATERS'),infantry=withTags('WORLD EATERS','INFANTRY'),legions=withTags('BLOOD LEGIONS');
 const result:GeneratedReminder[]=[];
 function emit(id:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:string[],source:string){
  if(!units.length)return;
  result.push({id:['11e-we-card',id,title,window,turn].join(':'),title,window,turn,timing,summary,units:[...new Set(units)],source,origin:'unit'});
 }
 const princes=native.filter(s=>s.unit==='Daemon Prince of Khorne').map(s=>s.id);
 if(princes.length)for(const phase of phases){
  emit('princes','Direct the Slaughter',phase,'either','during','Once per battle round across the army, when a friendly World Eaters unit within 12″ of a foot Daemon Prince is targeted by a Stratagem, reduce that use by 1CP (minimum 0CP). Prince sources: '+princes.join(', ')+'. Eligible formations: '+marines.join(', ')+'.',[...princes,...marines],sheets.get('Daemon Prince of Khorne')!.source);
 }
 for(const squad of native){
  const {id,unit}=squad;
  const g=groups.find(group=>group.members.some(m=>m.id===id));
  if(!g)continue;
  const formation=[...new Set([id,...g.members.map(m=>m.id)])],leading=g.body.id!==id;
  const source=sheets.get(unit)!.source;
  function add(title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,targets=[id],page?:number){
   emit(id,title,window,turn,timing,summary,targets,page?WORLD_EATERS_REVISION.pack+'#page='+page:source);
  }
  if(unit==='Angron'){
   add('Wrathful Presence','Start of battle round','either','start','Select one presence until the next round starts. The Blood God’s Favour permits up to six Blessings dice re-rolls while Angron is on the battlefield. Overwhelming Wrath can stop enemy Fall Backs. Driven by Ultimate Rage grants nearby World Eaters melee re-rolls.');
   add('Overwhelming Wrath','Movement','opponent','during','If this presence was selected, an enemy unit within 6″ selected to Fall Back must test Leadership. On failure it must Remain Stationary instead.');
   add('Driven by Ultimate Rage','Fight','either','during','If this presence was selected, friendly World Eaters units within 6″ re-roll melee Hit rolls of 1 and Wound rolls of 1.',[id,...marines],7);
  }
  if(unit==='Khârn The Betrayer'){
   if(leading){
    add('Legendary Killer','Fight','either','during','While Khârn leads this formation, re-roll Hit rolls of 1 and Wound rolls of 1 for its melee attacks.',formation);
    add('The Betrayer','Charge','own','end','If the formation is on the battlefield, unengaged and a Bodyguard model remains, make a Leadership roll for the unit. On failure, destroy one Bodyguard model.',formation,8);
   }
   for(const phase of phases)add('Berzerker Frenzy',phase,'either','end','The first time Khârn is destroyed, roll a D6 at the end of that phase. On 2+ return only Khârn with 3 wounds as close as possible to where he died, outside Engagement Range.');
  }
  if(unit==='Lord Invocatus'){
   if(leading){
    add('Fire Riders','Movement','own','during','While Invocatus leads this unit, it has Deep Strike. Its models may pass horizontally through models and terrain on Normal, Advance and Fall Back moves, cross enemy Engagement Range without ending there, and automatically pass Desperate Escape tests.',formation);
    add('Fire Riders','Charge','either','during','While Invocatus leads this formation, its models may move horizontally through models and terrain during their charge move.',formation);
   }
   add('Bloody Stampede','Charge','either','during','After this formation ends a charge move, choose an enemy engaged with Invocatus himself. Roll a D6: on 2–3 it suffers 1 mortal wound, on 4–5 D3, or on 6 D3+3.',formation);
  }
  if(unit==='Daemon Prince of Khorne'){
   if(infantry.length)for(const [window,turn] of [['Shooting','opponent'],['Movement','own']] as const)add('Lord of Murder',window,turn,window==='Movement'?'end':'during','While within 3″ of a friendly World Eaters Infantry unit, the Prince has Lone Operative. Enemy models beyond 12″ cannot see it or target it indirectly. Eligible escorts: '+infantry.join(', ')+'.',[id,...infantry]);
   add('Devastating Assault','Fight','either','during','If this Prince made a charge move this turn, its melee weapons have Devastating Wounds. Critical Wounds inflict mortal damage, limited to one model per Critical Wound.');
  }
  if(unit==='Lord on Juggernaut'){
   if(leading){
    add('Aggressive Advance','Movement','own','during','While the Lord leads this formation, each model has Move 10″ and may move horizontally through terrain when making a Normal, Advance or Fall Back move.',formation);
    add('Aggressive Advance','Charge','either','during','While the Lord leads this formation, its models may charge horizontally through terrain.',formation);
   }
   add('Crush All Who Stand Before Us','Fight','either','during','When selecting this formation to fight, you may include its models within 3″ of an enemy. Each such model may target an enemy unit within 3″ of itself that is engaged with the formation.',formation);
  }
  if(unit==='Master of Executions'){
   if(leading){
    add('Forwards, for Blood!','Movement','own','during','While this model leads the formation, you may re-roll its Advance rolls.',formation);
    if(g.body.unit==='Khorne Berzerkers')add('Forwards, for Blood!','Shooting','opponent','during','When these Berzerkers make their Blood Surge, you may re-roll the D6 for the distance moved.',formation);
   }
   const skull='When this formation destroys an enemy Character model, gain 1CP.';
   add('A Worthy Skull','Fight','either','during','When the Master himself attacks a Character unit in melee, you may re-roll the Hit and Wound rolls. '+skull,formation);
   if(g.members.some(worldEaterHasRangedWeapon)){
    add('A Worthy Skull','Shooting','own','during',skull,formation);
    add('A Worthy Skull','Movement','opponent','end','If this formation destroys an enemy Character model with Fire Overwatch, gain 1CP.',formation);
   }
  }
  if(unit==='Khorne Berzerkers'){
   add('Blood Surge','Shooting','opponent','during','After an enemy shoots and destroys a model in this formation, it may surge up to D6+2″ if unengaged, not Battle-shocked and it has not moved this phase. Choose the closest enemy. End each model engaged with it if possible, otherwise as close as possible. Do not engage another unit or move again this phase.',formation,8);
   add('Murderous Charge','Fight','either','during','If this formation made a charge move this turn, add 1 Strength to its melee attacks, including attached models.',formation,8);
  }
  if(unit==='Jakhals')add('Objective Ravaged','Command','own','end','If this formation is within range of an objective you control, retain control after leaving. This ends at the end of a phase in which the enemy’s Level of Control exceeds yours.',formation);
  if(unit==='Chaos Terminators'){
   if(g.members.some(worldEaterHasRangedWeapon))add('Bloody Fury','Shooting','own','during','Re-roll Hit rolls for this formation’s ranged attacks that target its closest eligible target.',formation,8);
   add('Bloody Fury','Charge','either','during','When declaring a charge, you may re-roll the charge roll. If you use this option, the formation must finish engaged with the closest charge target.',formation,8);
  }
  if(unit==='Eightbound')add('Beacons of Rage','Fight','either','during','Friendly World Eaters units within 6″ add 1 to melee Hit rolls against targets other than Monsters and Vehicles. Against such a target below Half-strength, also add 1 to Wound rolls.',[id,...marines]);
  if(unit==='Exalted Eightbound')add('Rend and Tear','Fight','either','during','Improve the Damage of this formation’s melee attacks by 1 when they target a Monster or Vehicle.',formation,8);
  if(unit==='Helbrute'){
   const arms=['Helbrute fist','Helbrute hammer','Power scourge'].map(name=>({name,count:worldEaterWeaponCount(squad,name)})).filter(w=>w.count>0);
   if(arms.reduce((n,w)=>n+w.count,0)===2)add('Devoted to Destruction','Fight','either','during','Add 2 Attacks to each of the two equipped melee weapons other than the close combat weapon: '+arms.map(w=>w.count+' × '+w.name).join(', ')+'.');
   add('Frenzy','Fight','either','during','Once per turn for this Helbrute, after an enemy unit that targeted it finishes attacking, it may fight even if it already fought this phase. If used, the Helbrute must fight next.',[id],8);
  }
  if(unit==='Chaos Spawn')add('To Slake its Rage','Charge','own','during','This unit may declare a charge in a turn in which it Advanced.');
  if(unit==='Chaos Land Raider'||unit==='Chaos Rhino'){
   const cargo=worldEatersCargoFormations(army,squad,roster).map(f=>f.body.id);
   if(cargo.length&&unit==='Chaos Land Raider'){
    add('Assault Ramp','Movement','own','during','After the Land Raider makes a Normal move, eligible passengers use Assault Disembark. Set every passenger wholly within 3″ of the hull and unengaged. They may charge this turn.',[id,...cargo]);
    add('Assault Ramp','Charge','own','during','Formations that used Assault Disembark after the Land Raider’s Normal move may declare a charge this turn.',[id,...cargo]);
   }
   if(cargo.length&&unit==='Chaos Rhino')add('Meet Any Challenge','Movement','opponent','during','When an enemy sets up or finishes a Normal, Advance or Fall Back move within 8″ of the Rhino, any of the eligible formations currently aboard may immediately disembark.',[id,...cargo],7);
  }
  if(unit==='Chaos Predator Destructor'){
   add('Punishing Suppression','Shooting','own','during','After this Predator shoots, choose one non-Monster, non-Vehicle enemy hit by those attacks. Its attacks suffer −1 to Hit until the start of your next turn.');
   add('Punishing Suppression','Shooting','opponent','during','If this Predator suppressed a unit in your previous Shooting phase, subtract 1 from that enemy’s Hit rolls until your next turn starts.');
   add('Punishing Suppression','Fight','either','during','A unit suppressed by this Predator has −1 to melee Hit rolls until the start of your next turn.');
  }
  if(unit==='Chaos Predator Annihilator')for(const [window,turn,timing] of [['Shooting','own','during'],['Movement','opponent','end']] as const)add('Blood-hungry Annihilator',window,turn,timing,'When making a ranged attack against the closest eligible Monster or Vehicle target within 18″, you may re-roll its Wound and Damage rolls.');
  if(unit==='Forgefiend')add('Furious Onslaught','Shooting','own','during','Re-roll Hit rolls for this model’s ranged attacks against the closest eligible target within 18″.');
  if(unit==='Maulerfiend'){
   add('The Scent of Blood','Charge','either','during','When declaring a charge, add 1 to the roll if an enemy below Starting Strength is within 9″. Use +2 instead if an enemy below Half-strength is within 9″.',[id],8);
   add('Savage Exaltation','Fight','either','during','Against an enemy below Starting Strength, add 1 to melee Hit rolls. If it is below Half-strength, also add 1 to melee Wound rolls.');
  }
  if(unit==='Heldrake')for(const phase of ['Shooting','Fight'] as const)add('Airborne Predator',phase,phase==='Fight'?'either':'own','during','Add 1 to this model’s Hit rolls when it attacks a unit that can Fly.');
  if(unit==='Khorne Lord of Skulls')add('Super-heavy War Engine','Movement','own','during','On Normal, Advance and Fall Back moves, this model may pass through non-Titanic models and terrain up to 4″ tall. It may cross enemy Engagement Range without finishing there. If it chooses to pass through taller terrain, roll a D6 after moving: on 1 it becomes Battle-shocked.');
  if(unit==='Daemon Prince of Khorne with Wings'){
   add('Bloodied Terror','Fight','either','start','Each enemy unit engaged with this Prince takes a Battle-shock test. Subtract 1 from the test for each testing unit that is below Half-strength.');
   add('Swooping Predator','Movement','own','during','When the Prince ends a Normal move, choose one enemy unit it crossed. Roll six D6 and inflict one mortal wound for each 4+.');
  }
  if(unit==='Goremongers')add('Loping Speed','Movement','opponent','during','When an enemy unit ends a move within 8″ of this formation, if it is unengaged it may make a Normal move of up to D6″.',formation,8);
  if(unit==='Slaughterbound'){
   if(leading)add('Rage Eternal','Command','own','during','While the Slaughterbound leads '+g.body.id+', return one destroyed Bodyguard model to this formation.',formation);
   add('Possessed Lord','Fight','either','start','Once per battle, this model may add 3 Attacks to its own melee weapons and give them Devastating Wounds for the phase.');
  }
  if(unit==='Defiler'){
   add('Scuttling Walker','Movement','own','during','On Normal, Advance and Fall Back moves, it may pass through non-Titanic models and terrain. It may cross enemy Engagement Range without ending there and automatically passes Desperate Escape tests.');
   add('Unleash Wrath','Movement','opponent','end','Choose an enemy unit that was set up within 12″ of the Defiler this phase. Shoot that unit if it is an eligible target, or declare a charge that must finish engaged with it. The charge grants no Charge bonus. This shooting reaction does not use Fire Overwatch.');
  }
  if(unit==='Skarbrand'){
   add('Rage Embodied','Fight','either','during','Add 1 to the Attacks characteristic of melee weapons equipped by models in friendly Blood Legions units within 6″ of Skarbrand.',[id,...legions]);
   add('Murderlust','Charge','own','during','Skarbrand may declare a charge even if he Advanced this turn.');
  }
  if(unit==='Bloodthirster'){
   add('Daemon Lord of Khorne','Fight','either','during','Friendly Blood Legions units within 6″ add 1 to melee Hit rolls.',[id,...legions]);
   add('Relentless Carnage','Fight','either','end','Choose one enemy engaged with this Bloodthirster and roll eight D6. It suffers one mortal wound per 4+.');
  }
  if(unit==='Bloodletters')add('Bane of Cowards','Movement','opponent','during','When a non-Monster, non-Vehicle enemy falls back from one or more units with this ability, its models take one set of Desperate Escape tests. Subtract 1 from those tests if the enemy unit is Battle-shocked.',formation);
  if(unit==='Bloodcrushers')add('Brass Stampede','Charge','either','during','After the formation completes a charge move, choose an engaged enemy. Roll one D6 per model in the charging formation, including any attached Lord. For each 4+ that enemy suffers D3 mortal wounds.',formation);
  if(unit==='Flesh Hounds'){
   add('Hunters from the Warp','End of opponent turn','opponent','end','If this formation is unengaged at the end of the enemy turn, it may leave the battlefield with any attached models and enter Strategic Reserves.',formation);
   for(const phase of phases)add('Collar of Khorne',phase,'either','during','When a Flesh Hound or Gore Hound would lose a wound to a Psychic Attack, ignore it on a 3+. The collar protects its own bearer only.');
  }
  if(worldEaterWeaponCount(squad,'Daemonic Icon')>0)for(const phase of phases)add('Daemonic Icon',phase,'either','during','While the Icon bearer survives, every model in this formation has Leadership 6+, including attached models. Use this value for Leadership and Battle-shock rolls.',formation);
  if(worldEaterWeaponCount(squad,'Instrument of Chaos')>0)add('Instrument of Chaos','Charge','either','during','While the bearer survives, add 1 to Charge rolls for this formation.',formation);
 }
 return result;
}
