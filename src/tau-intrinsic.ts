import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {TAU_SHEETS} from './tau-data.generated';
import {TAU_CARDS} from './tau-card-profiles.generated';
import {tauMusterUnits} from './tau-data';
import {tauKeywords} from './tau-keywords';
import {tauHasRangedWeapon,tauModelLoadouts,tauWeaponCount} from './tau-loadouts';
import {tauCargoFormations,tauFormations} from './tau-transports';
import {tauGuidedFormations} from './tau-greater-good';
import {tauReactionShooting} from './tau-reactions';
import {expandRoster,type RosterInstance} from './roster-instances';

type Step=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing'],GeneratedReminder['timing']?];
const shoot:Step=['Shooting','own','during'],fight:Step=['Fight','either','during'],move:Step=['Movement','own','during'];
const snap:Step=['Movement','opponent','end'],incoming:Step=['Shooting','opponent','during'],incomingMove:Step=['Movement','own','during','end'],incomingArrival:Step=['Movement','opponent','during'],returnFire:Step=['Shooting','own','during'];
const eachPhase=PHASES.map((p):Step=>[p,'either','during']),startPhase=PHASES.map((p):Step=>[p,'either','start']);
const endPhase=PHASES.map((p):Step=>[p,'either','end']),rangedDefence=[incoming,incomingMove,returnFire,incomingArrival] as const,defence=[...rangedDefence,fight] as const;
const cards=new Map(TAU_SHEETS.map(s=>[s.unit,s]));
const unique=(ids:string[])=>[...new Set(ids)],key=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const bodyguardPassives=new Set(['Breach and Clear','Advanced Armour','Sunforge','Fireknife','Weapon Support System','Starscythe','Battlesuit Support System','Bounty Hunters']);

export function tauIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='T’au Empire')return [];
 const current={...army,instances:[...roster]},legal=new Set(tauMusterUnits(army)),native=roster.filter(s=>cards.has(s.unit)&&legal.has(s.unit)&&(s.models??1)>0);
 if(!native.length)return [];
 const groups=tauFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 const declared=expandRoster(army),originalGroups=tauFormations(army,declared);
 function leadingDefence(s:RosterInstance){
  const original=originalGroups.find(g=>g.root.id!==s.id&&g.members.some(m=>m.id===s.id));
  if(!original||original.members.some(m=>!legal.has(m.unit)||m.retinueTo||m.keepUnattached||declared.filter(d=>d.id===m.id).length!==1))return;
  const ids=new Set(original.members.map(m=>m.id)),survivors:RosterInstance[]=[];
  for(const member of original.members){
   const current=roster.filter(m=>m.id===member.id);
   if(current.length>1)return;
   const live=current[0];
   if(!live)continue;
   if(live.unit!==member.unit||live.attachedTo!==member.attachedTo||live.retinueTo!==member.retinueTo||Boolean(live.keepUnattached)!==Boolean(member.keepUnattached))return;
   if(live.models!==undefined&&live.models<=0)continue;
   survivors.push(live);
  }
  // Core 19.04 retains an original surviving Leader's benefit, not a reused
  // identity or a model subsequently attached to a different formation.
  if(!survivors.some(m=>m.id===s.id)||roster.some(m=>!ids.has(m.id)&&(ids.has(m.attachedTo??'')||ids.has(m.retinueTo??''))))return;
  return survivors.map(m=>m.id);
 }
 const groupOf=(s:RosterInstance)=>groups.find(g=>g.members.some(m=>m.id===s.id));
 const all=groups.flatMap(g=>g.members.map(s=>s.id));
 const ownRanged=(s:RosterInstance)=>tauHasRangedWeapon(s)||!!TAU_CARDS[s.unit]?.core?.some(c=>c.startsWith('Firing Deck '))&&tauCargoFormations(army,s,roster).some(g=>g.members.some(m=>(TAU_CARDS[m.unit]?.weapons??[]).some(w=>w.phase==='Shooting'&&!w.abilities.includes('one shot')&&tauWeaponCount(m,w.name)>0)));
 const gunTargets=groups.filter(g=>g.members.some(ownRanged)).flatMap(g=>g.members.map(s=>s.id));
 const reactionTargets=groups.filter(g=>g.members.some(s=>tauHasRangedWeapon(s)&&tauReactionShooting(army,s,roster).length)).flatMap(g=>g.members.map(s=>s.id));
 const krootGroups=groups.filter(g=>g.members.some(s=>tauKeywords(current,s).has('KROOT')));
 const kroot=krootGroups.flatMap(g=>g.members.map(s=>s.id));
 const krootInfantry=krootGroups.filter(g=>g.members.some(s=>tauKeywords(current,s).has('INFANTRY'))).flatMap(g=>g.members.map(s=>s.id));
 const krootCharacters=native.filter(s=>['KROOT','CHARACTER'].every(k=>tauKeywords(current,s).has(k))).map(s=>s.id);
 const guided=tauGuidedFormations(army,roster).flatMap(g=>g.members.map(s=>s.id));
 const result:GeneratedReminder[]=[];
 function emit(id:string,title:string,steps:readonly Step[],summary:string,units:string[],source:string){
  // Movement defenses apply throughout the phase. Keep their old end-phase
  // completion keys while giving the newly covered turn its own identity.
  if(units.length)for(const [window,turn,timing,identityTiming=timing] of steps)result.push({id:['11e-tau-native',id,title,window,turn,identityTiming].join(':'),title,window,turn,timing,summary,units:unique(units),source,origin:'unit'});
 }
 for(const squad of native){
  const {id,unit}=squad,group=groupOf(squad);if(!group)continue;
  const formation=group.members.map(s=>s.id),original=originalGroups.find(g=>g.members.some(s=>s.id===id));
  const leading=group.root.id!==id||!!original&&original.root.id!==id;
  const bodyguardSource=group.root.id===id&&group.members.length>1,hasRanged=group.members.some(tauHasRangedWeapon),titanic=group.members.some(s=>tauKeywords(current,s).has('TITANIC'));
  const fitted=(name:string)=>tauWeaponCount(squad,name)>0,reactions=tauReactionShooting(army,squad,roster);
  function add(title:string,steps:readonly Step[],summary:string,recipients=[id]){
   const expiry=bodyguardSource&&bodyguardPassives.has(title)?' This bodyguard-sourced benefit lasts only while an original '+unit+' model survives; if the last source dies to an attack, retain it until that attacking unit finishes its attacks.':'';
   if(recipients.length)emit(id,title,steps,summary+expiry,[id,...recipients],cards.get(unit)!.source);
  }
  const source=' The originally attached source model must survive. Its own leading benefit continues after the bodyguard is destroyed; if the source dies to an attack, retain the benefit until that attacking unit finishes.';
  const led=(title:string,steps:readonly Step[],summary:string)=>{if(leading)add(title,steps,summary+source,formation);};
  const ranged=(title:string,summary:string,snapSummary?:string,recipients=formation)=>{
   if(!hasRanged)return;
   add(title,[shoot],summary,recipients);
   if(snapSummary&&!titanic)add(title,[snap],snapSummary,recipients);
   if(reactions.length)add(title,[incoming],'Only when making normal reaction shots through '+reactions.join('; or ')+': '+summary,recipients);
  };
  const attacks=(title:string,summary:string,snapSummary?:string,recipients=formation)=>{add(title,[fight],summary,recipients);ranged(title,summary,snapSummary,recipients);};
  const gearBearer=(item:string)=>{
   const ordinal=new Map<string,number>();
   return tauModelLoadouts(squad).flatMap(m=>{const n=(ordinal.get(m.model)??0)+1;ordinal.set(m.model,n);return m.items.some(i=>key(i)===key(item))?[m.model+' '+n]:[];}).join(', ');
  };

  if(fitted('Guardian drone'))add('Guardian Drone',rangedDefence,'While the Guardian Drone bearer survives ('+gearBearer('Guardian drone')+'), subtract 1 from Wound rolls for ranged attacks targeting this formation. If that bearer dies to an attack, retain the benefit until that attacking unit finishes its attacks. The drone is an equipment token, not a separate model.',group.members.filter(s=>(s.models??1)>0).map(s=>s.id));
  if(fitted('Marker drone'))add('Marker Drone',[move,['Shooting','own','start'],shoot],'While the Marker Drone bearer survives ('+gearBearer('Marker drone')+'), this formation has Markerlight and may act as an Observer even after Advancing. For the Greater Good still requires its own faction ability and Observer selection at the start of your Shooting phase.',formation);
  if(fitted('Shield drone'))add('Shield Drone',[['Pre-battle','either','during']],'Each equipped Shield Drone adds 1 to its bearer’s Wounds characteristic. Apply the bonus only to the actual equipped model ('+gearBearer('Shield drone')+'); drone tokens do not add models, Starting Strength or transport spaces.');
  if(fitted('Shield generator'))add('Shield Generator',defence,'Only the surviving models equipped with Shield Generators have the wargear’s 4+ invulnerable save: '+gearBearer('Shield generator')+'. The save is not shared with other models in the formation.');
  if(fitted('Weapon support system')&&tauHasRangedWeapon(squad))ranged('Weapon Support System','Only the equipped bearers ('+gearBearer('Weapon support system')+') may ignore any or all Hit roll modifiers for their ranged attacks. It does not ignore Ballistic Skill modifiers.',undefined,[id]);
  if(fitted('Battlesuit support system')){
   const ghost=unit==='Ghostkeel Battlesuit';
   add('Battlesuit Support System',[move,shoot],ghost?'This Ghostkeel may shoot after Falling Back. Equipping this support system removes its Smoke keyword.':'This formation is eligible to shoot after Falling Back, but this wargear permits only models actually equipped with a Battlesuit Support System to make ranged attacks. An independently applicable unit-wide permission can allow other models to shoot. Equipped bearers: '+gearBearer('Battlesuit support system')+'.',formation);
  }
  switch(unit){
   case 'Commander In Coldstar Battlesuit':
    led('Coldstar Commander',[move,shoot],'Every model in this formation has Move 12″ and its ranged weapons have Assault. After Advancing, an unengaged formation may use assault shooting with Assault weapons only; if it does, it cannot then start an action that phase.');break;
   case 'Commander In Enforcer Battlesuit':{
    const recipients=leadingDefence(squad);
    if(recipients)add('Enforcer Commander',rangedDefence,'Worsen the Armour Penetration of ranged attacks targeting this formation by 1.'+source,recipients);break;
   }
   case 'Ethereal':
    led('Failure Is Not an Option',eachPhase,'Models in this formation have Feel No Pain 5+.');
    add('Coordinated Leadership',[['Command','own','end']],'Roll one D6; on 4+, gain 1CP, subject to the normal limit on additional CP. This ability may be used even while the Ethereal is embarked in a Transport, as confirmed by the faction FAQ.');
    if(fitted('Hover drone'))add('Hover Drone',[move],'Only this equipped Ethereal model has Fly and Move 10″. Other models in its attached formation keep their own movement characteristics; the drone does not make every passenger or bodyguard model fly.');break;
   case 'Cadre Fireblade':
    if(leading)ranged('Volley Fire','Add 1 to the Attacks of ranged weapons equipped by every model in this formation, including the Fireblade’s own weapons and guns granted to their bearers by drones.'+source,'Add 1 to the Attacks of ranged weapons equipped by every model in this formation, including drone-granted guns, when firing snap shots.'+source);
    ranged('Crack Shot','On a Critical Wound from a ranged attack made by this Fireblade, that attack has AP −3. This includes a gun granted to the Fireblade itself by a Gun Drone, but not weapons borne by other models.','On a Critical Wound from this Fireblade’s ranged snap shot, that attack has AP −3. Snap shooting prevents Critical Hits, not Critical Wounds.',[id]);break;
   case 'Commander Farsight':
    if(leading)attacks('Way of the Short Blade','Add 1 to Wound rolls for attacks made by this formation against an enemy within 9″.'+source,'Add 1 to Wound rolls for this formation’s snap shots against enemies within 9″.'+source);
    add('Puretide’s Teachings',eachPhase,'Once per battle round, when this formation is targeted with a Stratagem, reduce the cost of that use by 1CP. Farsight must still be a surviving source of this ability.',formation);break;
   case 'Commander Shadowsun':
    add('Advanced Guardian Drone',rangedDefence,'Subtract 1 from Wound rolls for ranged attacks targeting Shadowsun herself. Her Advanced Guardian Drone protects its bearer, not nearby friendly units.');
    add('Agile Combatant',[move,shoot],'Shadowsun remains eligible to shoot in a turn when she Fell Back.');
    add('Command-link Drone',eachPhase,'While a friendly T’au Empire formation is within 6″ of Shadowsun, each time it is targeted with a Stratagem, roll one D6; on 5+, gain 1CP. Shadowsun is within her own aura. Apply the normal limit on additional CP.',all);
    add('Hero of the Empire',[shoot],'Friendly T’au Empire formations within 6″ of Shadowsun re-roll ranged attack Hit rolls of 1. Shadowsun is within her own aura. This does not apply to snap shooting.',gunTargets);
    add('Hero of the Empire',[incoming],'When another rule permits normal reaction shooting, friendly T’au Empire formations within 6″ of Shadowsun re-roll ranged attack Hit rolls of 1.',reactionTargets);break;
   case 'Darkstrider':
    if(leading)ranged('Structural Analyser','Add 1 to Wound rolls for this formation’s ranged attacks.'+source,'Add 1 to Wound rolls for this formation’s ranged snap shots.'+source);
    add('Jammer Array',[['Movement','opponent','during'],['Movement','own','end']],'Enemy units arriving from Reserves cannot be set up within 12″ of Darkstrider himself. Measure from the actual source model, not every model in its bodyguard.');break;
   case 'Strike Team':
    add('Suppression Volley',[shoot],'After this formation shoots in your Shooting phase, select one enemy Infantry unit it hit. Until the start of your next turn, while an original Strike Team model remains on the battlefield, that enemy is suppressed and subtracts 1 from its attack Hit rolls.',formation);
    add('Suppression Volley · Suppressed enemy attacks',[incoming,returnFire,fight,incomingArrival],'An enemy Infantry unit suppressed by this Strike Team subtracts 1 from its attack Hit rolls until the start of your next turn, while an original Strike Team model remains on the battlefield. This includes permitted normal enemy shooting in their Movement phase. This does not modify fixed snap-shot Hit rolls.',formation);
    // Both Fire Warrior cards use the same conditional Shas’ui weapon.
   case 'Breacher Team':
    add('DS8 Support Turret',[move],'If this formation Remains Stationary in your Movement phase, its surviving Shas’ui is equipped with the support turret weapon until the start of your next turn. The turret is a token and is not an additional model; an attached Leader does not become its bearer.',formation);
    if(unit==='Breacher Team')ranged('Breach and Clear','Re-roll Wound rolls for ranged attacks made by models in this formation against an enemy within range of an objective marker.','Re-roll Wound rolls for this formation’s ranged snap shots against an enemy within range of an objective marker.');break;
   case 'Kroot Carnivores':
    add('Fieldcraft',[['Command','own','end']],'If this formation is within range of an objective you control, it remains yours after you leave until the opponent’s Level of Control is greater than yours at the end of a phase.',formation);break;
   case 'Krootox Riders':
    if(reactions.length)add('Kroot Packmates',[incoming],reactions[0]+'. Eligible nearby friendly Infantry formations: '+groups.filter(g=>g.members.some(s=>krootInfantry.includes(s.id))).map(g=>g.root.id).join(', ')+'.',krootInfantry);break;
   case 'Kroot Hounds':
    if(krootInfantry.length){
     add('Loping Pounce',[['Command','own','start']],'If these Hounds are within 6″ of one or more friendly Kroot Infantry formations now, they may charge after Advancing until this turn ends.',krootInfantry);
     add('Loping Pounce',[move,['Charge','own','during']],'Only if the 6″ Kroot Infantry condition was met at the start of this Command phase, these Hounds may charge after Advancing this turn.');
    }
    if(krootCharacters.length)add('Hunting Hounds',endPhase,'While these Hounds are within 12″ of a surviving friendly Kroot Character model, each Hound has Objective Control 1. Measure from the actual Character model, not its entire attached unit.',krootCharacters);break;
   case 'Stealth Battlesuits':{
    add('Forward Observers',[shoot],'If this formation was chosen as an Observer at the start of your Shooting phase, until this phase ends, Guided ranged attacks against the enemy it marked as Spotted re-roll Hit rolls of 1 and Wound rolls of 1. Any eligible non-Observer formation may benefit; this does not pair the Stealth unit to only one Guided unit.',guided);
    if(fitted('Homing beacon')){
     const arriving=groups.filter(g=>g.root.id!==group.root.id&&!g.members.some(s=>{const tags=tauKeywords(current,s);return tags.has('AIRCRAFT')||tags.has('FORTIFICATION');})).flatMap(g=>g.members.map(s=>s.id));
     add('Homing Beacon',[snap],'Once per battle, while the Homing Beacon bearer is on the battlefield, use Rapid Ingress for 0CP. Set the entire arriving formation within 3″ of the bearer’s unit and more than 8″ from all enemies. Normal reserve-arrival restrictions still apply, including no first-round arrival without a separate exception. Aircraft cannot use Rapid Ingress. The beacon token is then expended.',arriving);
    }break;
   }
   case 'Ghostkeel Battlesuit':
    add('Stealth Drones',defence,'Twice per battle, after an attack is allocated to this Ghostkeel, change that attack’s Damage characteristic to 0. Each use expends one Stealth Drone token; the two uses are shared across all phases and turns for this Ghostkeel. These tokens are not separate models; this ability does not prevent wounds that were not caused by an allocated attack.');break;
   case 'Riptide Battlesuit':
    add('Battlesuit Support System',[move,shoot],'This Riptide remains eligible to shoot after Falling Back.');
    ranged('Weapon Support System','This Riptide may ignore any or all Hit roll modifiers for its ranged attacks. It does not ignore Ballistic Skill modifiers.',undefined,[id]);
    add('Nova Charge',[shoot],'Once per battle, when this Riptide is selected to shoot in your Shooting phase, choose one ranged weapon it actually has equipped. Only that selected weapon has Devastating Wounds until this phase ends. It does not give every gun the ability and cannot be activated during Overwatch.');break;
   case 'Pathfinder Team':
    add('Target Uploaded',[shoot],'When this formation attacks the enemy that it marked as its own Spotted unit this Shooting phase, improve that attack’s Ballistic Skill by 1 and give it Ignores Cover. This is the Pathfinders’ own Observer benefit; it does not require them to be Guided or apply against a different Observer’s Spotted target.',formation);
    if(fitted('Grav-inhibitor drone'))add('Grav-inhibitor Drone',[['Charge','opponent','during']],'While the equipped drone bearer survives ('+gearBearer('Grav-inhibitor drone')+'), subtract 2 from Charge rolls for enemies that declare a charge against this formation. This reduction is not cumulative with any other reduction to that Charge roll.',formation);
    if(fitted('Pulse accelerator drone'))ranged('Pulse Accelerator Drone','While the equipped drone bearer survives ('+gearBearer('Pulse accelerator drone')+'), add 6″ to the Range of pulse carbines equipped by models in this formation. Other weapon profiles do not receive this bonus.','While its drone bearer survives, add 6″ to the Range of this formation’s pulse carbines during snap shooting; the bonus is specific to those weapons.');
    if(fitted('Recon drone'))add('Recon Drone',[['Pre-battle','either','during']],'The surviving Recon Drone bearer is equipped with a drone burst cannon and its entire formation has Infiltrators, including attached models. Deploy the whole formation more than 8″ horizontally from enemy models and the enemy deployment zone. The drone token adds no model or transport space.',formation);break;
   case 'Piranhas':
    add('Drone Harassment Tactics',[['Movement','own','end']],'Select one enemy unit within 12″ of this Piranha unit. That enemy must take a Battle-shock test.');break;
   case 'Devilfish':{
    const passengers=tauCargoFormations(army,squad,roster).flatMap(g=>g.members.map(s=>s.id));
    add('Rapid Deployment',[move],'Actual passengers may disembark after this Devilfish Advances. They must make a shock disembark move: set each model wholly within 3″ of this transport and obey normal set-up restrictions. Those passengers cannot declare a charge this turn.',passengers);
    add('Rapid Deployment',[['Charge','own','during']],'Any formation that used a shock disembark move after this Devilfish Advanced cannot declare a charge this turn.',passengers);break;
   }
   case 'Razorshark Strike Fighter':
    ranged('Ground Strike Fighter','Add 1 to Hit for this model’s ranged attacks against an enemy unit that cannot Fly. This Hit modifier does not change snap-shot accuracy.',undefined,[id]);break;
   case 'Sun Shark Bomber':
    add('Pulse Bombs',[['Fight','opponent','end']],'Select one visible enemy unit within 24″, excluding Lone Operative units. Roll six D6; each 4+ causes one mortal wound. Resolve this at the end of the opponent’s Fight phase, before the Aircraft returns to reserves at the end of that turn.');break;
   case 'Vespid Stingwings':
    add('Airborne Agility',[['End of opponent turn','opponent','end']],'If this formation is unengaged at the end of the opponent’s turn, you may remove it from the battlefield and place it in Strategic Reserves.');
    if(fitted('Oversight drone'))ranged('Oversight Drone','Once per battle, when this formation is selected to shoot and the equipped Oversight Drone bearer survives, give its models’ ranged weapons Ignores Cover until this phase ends. Expend the drone token.','Once per battle, when selected to fire Overwatch and the Oversight Drone bearer survives, give this formation’s ranged weapons Ignores Cover until this Movement phase ends. Expend the drone token.');break;
   case 'Firesight Team':
    add('Precise Targeting',[shoot],'Ranged attacks made by this Firesight Team against any Spotted enemy unit may re-roll the Hit roll. The Spotted designation ends with your Shooting phase, so this does not provide an Overwatch or later-phase re-roll.');break;
   case 'Sky Ray Gunship':
    ranged('Velocity Tracker','Re-roll Hit rolls for this model’s ranged attacks against a target that can Fly.',undefined,[id]);
    ranged('Targeting Array','Each time this model is selected to shoot, you may re-roll one Hit roll or one Wound roll while resolving those attacks. It is one re-roll for that shooting activation, not one per weapon.','When selected to fire snap shots, you may re-roll one Wound roll. Snap-shot Hit rolls cannot be re-rolled, so Targeting Array cannot re-roll a Hit roll during Overwatch.',[id]);break;
   case 'Hammerhead Gunship':
    attacks('Armour Hunter','Add 1 to Hit for this model’s attacks against a Monster or Vehicle unit. This applies to ranged and melee attacks, but not snap-shot Hit rolls.',undefined,[id]);
    ranged('Targeting Array','Each time this model is selected to shoot, you may re-roll one Hit roll or one Wound roll while resolving those attacks. It is one re-roll for that shooting activation, not one per weapon.','When selected to fire snap shots, you may re-roll one Wound roll. Snap-shot Hit rolls cannot be re-rolled, so Targeting Array cannot re-roll a Hit roll during Overwatch.',[id]);break;
   case 'Broadside Battlesuits':
    add('Advanced Armour',eachPhase,'Models in this formation have Feel No Pain 4+ against mortal wounds only. This does not protect against ordinary attack damage.',formation);break;
   case 'Stormsurge':
    add('Heavy Walker',[move],'When this Stormsurge makes a Normal, Advance or Fall Back move, it can move over models other than Titanic models and terrain features 4″ or less in height as if they were not there.');
    ranged('Support System','This Stormsurge may ignore any or all Hit roll modifiers for ranged attacks. It does not ignore Ballistic Skill modifiers.',undefined,[id]);
    ranged('Titan-killer','Re-roll Hit rolls for this Stormsurge’s ranged attacks against a Titanic or Towering unit.',undefined,[id]);break;
   case 'Tidewall Droneport':
    ranged('Droneport','When this Droneport is selected to shoot, its drone defender weapon targets and resolves its attacks against every enemy unit that is an eligible target. Resolve each target separately.','When this Droneport is selected to shoot through Fire Overwatch, use the legal target restrictions of Fire Overwatch; drone defender attacks still use snap shooting.',[id]);
    // All three Tidewall cards share their Fortification and cover rules.
   case 'Tidewall Shieldline':
   case 'Tidewall Gunrig':
    add('Fortification',[shoot,snap,incoming],'An enemy unit engaged only with one or more friendly Fortifications can still be targeted with ranged attacks. Subtract 1 from Hit rolls for those attacks unless made with Pistols; this modifier does not alter snap shots. The attacking unit must otherwise be allowed to shoot.',gunTargets);
    add('Fortification · Fall Back',[['Movement','opponent','during']],'An enemy unit engaged only with friendly Fortifications does not take Desperate Escape tests merely for Falling Back while Battle-shocked. Models that move across enemy models still take the applicable tests.');
    add('Tidewall Cover',[shoot,incoming,['Movement','opponent','during','end'],incomingMove],'Any model that is not fully visible to every model in the attacking unit because of this Tidewall has the Benefit of Cover against that ranged attack. This cover depends on actual visibility through the fortification; it is not a blanket aura.');
    if(unit==='Tidewall Shieldline'&&fitted('Tidewall defence platform'))add('Tidewall Defence Platform',[['Pre-battle','either','during']],'This Shieldline has Wounds 15 and transport capacity 22 with its equipped defence platform. The platform is equipment of the same single model, not a second Shieldline model.');break;
   case 'Ta’unar Supremacy Armour':
    add('Coordinated Strike',[shoot],'While this Ta’unar is Guided, re-roll ranged Hit rolls of 1 against Spotted targets. The current army rule permits several Guided units to attack the same Spotted enemy; it does not create a fixed Observer–Guided pair.');
    add('Super-heavy Walker',[move],'When this unit makes a Normal, Advance or Fall Back move, its models can move through other models except Titanic models and horizontally through terrain sections 4″ or less in height. Before moving, you may give its models Mobile until that move ends; if you do, roll one D6 after the move and on 1 this unit is Battle-shocked. Mobile allows movement through dense terrain.');break;
   case 'Tiger Shark':
    add('Strafing Run',[shoot],'After this Tiger Shark shoots in your Shooting phase, select one enemy unit it hit that cannot Fly. That enemy takes a Battle-shock test.');
    if(fitted('Transport bay'))add('Transport Bay',[['Pre-battle','either','during']],'This equipped bay gives the Tiger Shark the Transport keyword and capacity for 12 Tactical Drones models. Equipped drone tokens are not Tactical Drones models and cannot be embarked as cargo.');break;
   case 'AX-1-0 Tiger Shark':{
    const weapons=['Twin heavy rail cannon','Seeker missile'].filter(fitted);
    if(weapons.length)ranged('Titan Hunter','This model’s equipped '+weapons.join(' and ')+' have Anti-Titanic 3+ when their target is within that weapon’s half range. Check each weapon’s own range.','This model’s equipped '+weapons.join(' and ')+' have Anti-Titanic 3+ against a target within that weapon’s half range, including snap shooting. Anti applies to the Wound roll, not the Hit roll.',[id]);break;
   }
   case 'Manta':{
    const cargo=tauCargoFormations(army,squad,roster).flatMap(g=>g.members.map(s=>s.id));
    add('Aggressive Deployment',[shoot],'After this Manta shoots in your Shooting phase, choose one enemy it hit. Until this phase ends, actual models that disembarked from this Manta this turn may re-roll Wound rolls for attacks against that enemy. Use only that transport’s real disembarked passengers.',cargo);
    add('Air Caste Colossus',eachPhase,'Each time this Manta is targeted with a Stratagem, spend three times that Stratagem’s stated CP cost. Apply this to the Manta itself, not separately to embarked passenger units.');break;
   }
   case 'Kroot Farstalkers':
    add('Bounty Hunters',[['Pre-battle','either','start']],'At the start of the battle, select one enemy unit as this particular Farstalker formation’s bounty.',formation);
    attacks('Bounty Hunters','Attacks by models in this formation against its selected bounty have Lethal Hits and Precision. Check the particular enemy unit selected for this squad.','Snap shots against this formation’s selected bounty retain Precision. They cannot score Critical Hits, so Lethal Hits provides no benefit during snap shooting.');
    if(fitted('Pech’ra'))ranged('Pech’ra','While the actual Pech’ra bearer survives, ranged weapons equipped by all models in this formation have Ignores Cover.','While the Pech’ra bearer survives, this formation’s ranged snap shots have Ignores Cover.');break;
   case 'Crisis Sunforge Battlesuits':
    ranged('Sunforge','Re-roll Wound rolls and Damage rolls for ranged attacks made by this formation against Monster or Vehicle units. Both re-rolls apply; do not substitute an older choice of one.','Re-roll Wound rolls and Damage rolls for this formation’s ranged snap shots against Monster or Vehicle units.');break;
   case 'Crisis Fireknife Battlesuits':
    ranged('Fireknife','Re-roll ranged Hit rolls of 1, or re-roll the Hit roll instead when targeting an enemy unit at its Starting Strength. Snap-shot Hit rolls cannot be re-rolled.');
    ranged('Weapon Support System','Models in this formation may ignore any or all Hit roll modifiers for their ranged attacks. This does not ignore Ballistic Skill modifiers.');break;
   case 'Crisis Starscythe Battlesuits':
    ranged('Starscythe','Improve ranged attacks’ AP by 1 unless their target is a Monster or Vehicle.','Improve ranged snap shots’ AP by 1 unless their target is a Monster or Vehicle.');
    add('Battlesuit Support System',[move,shoot],'This entire formation remains eligible to shoot after Falling Back, including an attached Commander. This is a unit-wide datasheet ability and does not require every model to equip its own support system.',formation);break;
   case 'Kroot Trail Shaper':
    add('Trail Finding',[['Movement','opponent','during']],'After an enemy unit ends a move within 8″ of this formation during the opponent’s Movement phase, if this formation is unengaged it may make a Normal move of up to D6″.',formation);
    add('Kroot Ambush',[['Pre-battle','either','during']],'After both players have deployed, redeploy this Shaper’s entire formation and one other friendly Kroot formation. Either can be placed in Strategic Reserves regardless of the starting reserve allowance. The attached bodyguard and other Shapers are one formation, not additional separate redeployment targets.',kroot);break;
   case 'Kroot War Shaper':
    add('War Leader',eachPhase,'Once per battle round, one unit from your army with War Leader can use it when its own formation is targeted with a Stratagem, reducing that use’s CP cost by 1CP. This is one use across all War Leader units that round, and the War Shaper must remain a source of the ability.',formation);
    add('Root of Honour',startPhase,'Once per battle, select one friendly Battle-shocked Kroot formation within 12″ of this War Shaper. That formation is no longer Battle-shocked.',kroot);break;
   case 'Kroot Flesh Shaper':
    led('Ritual Butchery',[fight],'Melee weapons equipped by models in this formation have Sustained Hits 1.');
    led('Rites of Feasting',eachPhase,'Models in this formation have Feel No Pain 6+, improved to Feel No Pain 5+ for the rest of the battle after this formation destroys an enemy unit in the Fight phase.');
    if(leading)add('Rites of Feasting · An enemy unit is destroyed',[fight],'If this formation destroys one or more enemy units in the Fight phase, its Rites of Feasting improves from Feel No Pain 6+ to 5+ for the rest of the battle while its Flesh Shaper remains a source of that ability.',formation);break;
   case 'Kroot Lone-Spear':{
    const others=kroot.filter(x=>x!==id),otherGuns=others.filter(x=>gunTargets.includes(x)),otherReactions=others.filter(x=>reactionTargets.includes(x));
    ranged('Advanced Scouting','Each time this Lone-Spear’s ranged attack hits an enemy unit, until this turn ends, attacks by other friendly Kroot models against that enemy may re-roll Hit rolls. The Lone-Spear does not grant itself this benefit.','A hit from this Lone-Spear’s ranged snap shot marks that enemy until the end of the current turn. Other friendly Kroot models may re-roll attack Hit rolls against it, but not during their own snap shooting.',[id,...otherGuns]);
    add('Advanced Scouting · Marked quarry',[fight],'Other Kroot models may re-roll melee Hit rolls against an enemy hit by this Lone-Spear’s ranged attacks earlier this turn. The mark expires at the end of that same turn; the Lone-Spear itself is excluded.',others);
    add('Advanced Scouting · Marked quarry',[incoming],'If this Lone-Spear hit the enemy with Overwatch earlier in this opponent’s turn, other Kroot models making permitted normal reaction shots against that enemy may re-roll Hit rolls until this turn ends.',otherReactions);
    add('Fire and Fade',[shoot],'After this Lone-Spear shoots in your Shooting phase, if unengaged, it may make a Normal move up to 6″. If it does, it cannot declare a charge for the rest of this turn.');
    add('Fire and Fade',[['Charge','own','during']],'If this Lone-Spear used Fire and Fade after shooting, it cannot declare a charge this turn.');break;
   }
   case 'Krootox Rampagers':
    add('Kroot Linebreakers',[['Charge','either','during']],'After this unit ends a Charge move, select one enemy it is engaged with. Roll one D6 for each surviving Rampager model actually within Engagement Range of that enemy; each 4+ causes D3 mortal wounds. If those mortal wounds destroy any enemy models, that enemy takes a Battle-shock test.');break;
   case 'The Twin Lance':
    ranged('Exemplars of Mont’ka','Ranged attacks against the closest eligible target have Sustained Hits 1 and Ignores Cover. Check the closest eligible target for each attacking model.','Ranged snap shots against the closest eligible target have Ignores Cover. Sustained Hits cannot trigger because snap shots cannot score Critical Hits.');
    add('Neocapacitor Shields',[['Charge','opponent','start']],'Select one visible enemy within 12″ that is neither a Monster nor a Vehicle. It must take a Battle-shock test and subtracts 1 from Charge rolls until this turn ends.');
    add('Retro-thrusters',[['Fight','either','end']],'If this Twin Lance unit was eligible to fight this phase, it may make either a Normal move of up to 6″ or a Fall Back move. The 6″ limit applies to the Normal move option; apply the normal rules to the chosen move.');break;
  }
 }
 return result;
}
