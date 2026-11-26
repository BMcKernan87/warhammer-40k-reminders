import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {DRUKHARI_SHEETS} from './drukhari-data';
import {drukhariCard,drukhariModelLoadouts,drukhariWeaponCount,drukhariHasRangedWeapon} from './drukhari-loadouts';
import {drukhariMusterUnits} from './drukhari-muster-data';
import {drukhariKeywords} from './drukhari-keywords';
import {drukhariFormations,drukhariCargoFormations,drukhariSplitCargoFormations} from './drukhari-transports';
import {drukhariHasUpgrade} from './drukhari-upgrades';
import {expandRoster,type RosterInstance} from './roster-instances';

type Step=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const shoot:Step=['Shooting','own','during'],fight:Step=['Fight','either','during'],move:Step=['Movement','own','during'];
const snap:Step=['Movement','opponent','end'],incoming:Step=['Shooting','opponent','during'],incomingSnap:Step=['Movement','own','end'],returnFire:Step=['Shooting','own','during'];
const eachPhase=PHASES.map((phase):Step=>[phase,'either','during']),endPhase=PHASES.map((phase):Step=>[phase,'either','end']);
const defence=[incoming,incomingSnap,returnFire,fight] as const;
const pack='https://assets.warhammer-community.com/eng_wh40k_faction_pack_drukhari-p7mpvgnmnn-clii96hzh6.pdf';
const armySource='https://wahapedia.ru/wh40k11ed/factions/drukhari/#Power-from-Pain';
const sheets=new Map(DRUKHARI_SHEETS.map(s=>[s.unit,s]));
const key=(s:string)=>s.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const weaponKey=(s:string)=>key(s.split(/\s+[-–—]\s+/)[0]);
const sourceExpiry=' This benefit requires its original ability source to survive. If the last source model dies to an attack, it continues until the attacking unit finishes its attacks.';
const leaderExpiry=' The original Leader must survive; its leading benefit continues after its original Bodyguard is destroyed. If the Leader dies to an attack, keep the benefit until the attacking unit finishes.';

/** Muster, transport and deployment modules implement these source entries. */
export const DRUKHARI_DELEGATED_INTRINSIC:Readonly<Record<string,readonly string[]>>={
 Venom:['Aerialists'],Starweaver:['Rapid Embarkation'],
 'Hand of the Archon':['ARCHON’S RETINUE'],
 'Death Jester':['TRAVELLING PLAYERS'],Shadowseer:['TRAVELLING PLAYERS'],
 'Troupe Master':['TRAVELLING PLAYERS'],Solitaire:['PATH OF DAMNATION'],
 'Corsair Voidreavers':['Mistshield'],'Corsair Voidscarred':['Mistshield'],
};

export function drukhariIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Drukhari')return [];
 const legal=new Set(drukhariMusterUnits(army)),selected=roster.filter(s=>sheets.has(s.unit)&&legal.has(s.unit));
 if(!selected.length)return [];
 const groups=drukhariFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 const original=expandRoster(army),originalGroups=drukhariFormations(army,original);
 const has=(s:RosterInstance,tag:string)=>drukhariKeywords(army,s,undefined,roster).has(tag);
 const ids=(gs:typeof groups)=>gs.flatMap(g=>g.members.map(s=>s.id));
 const tagged=(...tags:string[])=>groups.filter(g=>tags.every(t=>g.members.some(s=>has(s,t))));
 const nativeGroups=tagged('DRUKHARI'),nativeIds=ids(nativeGroups),allIds=ids(groups);
 const nativeGunIds=ids(nativeGroups.filter(g=>g.members.some(drukhariHasRangedWeapon)));
 const aeldariGroups=tagged('AELDARI'),aeldariIds=ids(aeldariGroups),infantryIds=ids(tagged('AELDARI','INFANTRY'));
 const result:GeneratedReminder[]=[];
 function armyRule(title:string,steps:readonly Step[],summary:string,units=allIds){
  if(!units.length)return;
  for(const [window,turn,timing] of steps)result.push({id:['11e-drukhari-army',title,window,turn,timing].join(':'),title,window,turn,timing,summary,units,source:armySource,origin:'army'});
 }
 armyRule('Power from Pain · Command token',[['Command','own','start']],'At the start of your Command phase, gain 1 Pain token for your army’s shared pool. A token spent to activate a different rule is removed from this same pool.');
 armyRule('Power from Pain · harvest suffering',eachPhase,'Gain 1 Pain token each time an enemy unit is destroyed and each time an enemy unit fails a Battle-shock test. The destroying unit need not be Drukhari. Add any separately triggered extra tokens; do not confuse these tokens with Command points.');
 armyRule('Power from Pain · attached formations',[['Pre-battle','either','during']],'Use each Pain ability at its printed trigger. Empowering a formation lasts until phase end and activates the Pain abilities of its surviving Leader and Bodyguard sources together; pay once, not once per source. A source’s destroyed models no longer confer its ability, subject to the normal end-of-attacking-unit exception. Allied Harlequins and Corsairs do not gain Pain abilities merely by joining this army.',nativeIds);

 const painAdepts=selected.filter(s=>s.unit==='Haemonculus');
 if(painAdepts.length)armyRule('Pain Adept',[['Command','own','during']],'If at least one of these Haemonculi is on the battlefield, roll one D6 in your Command phase; on 4+, gain 1 Pain token. Make one roll for the army, not one roll per Haemonculus.',painAdepts.map(s=>s.id));

 for(const squad of selected){
  const {id,unit}=squad,group=groups.find(g=>g.members.some(s=>s.id===id));if(!group)continue;
  const formation=group.members.map(s=>s.id),originalGroup=originalGroups.find(g=>g.members.some(s=>s.id===id));
  const leading=group.root.id!==id||!!originalGroup&&originalGroup.root.id!==id;
  const ranged=group.members.some(drukhariHasRangedWeapon),selfGun=drukhariHasRangedWeapon(squad);
  const permanent=group.members.some(s=>drukhariHasUpgrade(army,s,'Dark Vitality','Realspace Raiders'));
  const models=drukhariModelLoadouts(squad),fitted=(item:string)=>models.some(m=>m.items.some(i=>key(i)===key(item)))||drukhariWeaponCount(squad,item)>0;
  const bearers=(item:string)=>models.filter(m=>m.items.some(i=>key(i)===key(item))).map(m=>m.model);
  function add(title:string,steps:readonly Step[],summary:string,recipients=[id],source=sheets.get(unit)!.source){
   if(!recipients.length)return;
   for(const [window,turn,timing] of steps)result.push({id:['11e-drukhari-native',id,title,window,turn,timing].join(':'),title,window,turn,timing,summary,units:[...new Set([id,...recipients])],source,origin:'unit'});
  }
  const led=(title:string,steps:readonly Step[],summary:string)=>{if(leading)add(title,steps,summary+leaderExpiry,formation);};
  const pain=(title:string,steps:readonly Step[],trigger:string,effect:string,recipients=formation)=>add(title,steps,
   trigger+' '+(permanent?'This formation is always Empowered while its surviving Dark Vitality bearer supplies that enhancement; activate this Pain ability at this trigger without spending a Pain token. ':'If the formation is not already Empowered, you may spend 1 Pain token to Empower it until phase end. One payment activates all of its current Pain abilities; do not pay again for each source. ')+effect,recipients);
  const personalAttack=[fight,...(selfGun?[shoot]:[])] as Step[];
  const normalAttack=[fight,...(ranged?[shoot]:[])] as Step[];
  const cargo=()=>drukhariCargoFormations(army,squad,roster);
  const splitCandidates=()=>[...new Map(roster.flatMap(v=>drukhariSplitCargoFormations(army,v,roster).map(g=>[g.root.id,g] as const))).values()];
  const transportTargets=(name:string)=>[...new Set([...cargo(),...splitCandidates()].filter(g=>g.members.some(s=>s.unit===name)).flatMap(g=>g.members.map(s=>s.id)))];
  switch(unit){
   case 'Archon':
    pain('Hatred Eternal (Pain)',normalAttack,'When this formation is selected to shoot in your Shooting phase or to fight in either Fight phase:','While Empowered, its models may re-roll attack Hit rolls. This does not change snap-shot Hit rolls.');
    add('Overlord',PHASES.map((p):Step=>[p,'either','start']),'Once per battle, at the start of a phase, choose one Battle-shocked friendly Drukhari formation within 12″ of this Archon model. It is no longer Battle-shocked. Measure from the actual Archon, not every model in its formation.',nativeIds);
    add('Devious Mastermind',eachPhase,'Once per battle round, one model in your army with Devious Mastermind may reduce the CP cost of a Stratagem targeting its own formation by 1CP. Multiple Archons share this one use.',formation);
    if(fitted('Shadowfield'))add('Shadowfield',defence,'While this Archon still has its 2+ invulnerable save, no model in its formation may re-roll saving throws. When the Archon loses a wound other than a mortal wound, that Archon loses its invulnerable save for the rest of the battle. Wounds lost by another model do not break the shadowfield; a mortal wound does not break it.',formation,pack);
    if(fitted('Soul trap'))add('Soul Trap',[fight],'Add 1 to the Attacks and Strength of this actual Soul Trap bearer’s melee weapons. The first time one of its melee attacks destroys an enemy model, after resolving all of this bearer’s attacks add a further 1 to those characteristics for the rest of the battle. The extra increase does not alter the attacks currently being resolved and cannot be gained again.');
    break;
   case 'Succubus':
    pain('Lithe Agility (Pain)',[move,['Charge','own','during']],'When selecting this formation to Advance in your Movement phase, or before its Charge roll in your Charge phase:','While Empowered, re-roll its Advance and Charge rolls. Empowerment from its Wyches also activates this ability without another token.');
    led('Storm of Blades',[fight],'Melee weapons equipped by models in this formation have Sustained Hits 1.');
    add('Bloody Spectacle',[fight],'This Succubus model may re-roll melee attack Hit and Wound rolls against Character units. Separately, each time its formation destroys a Character model, gain 1CP, subject to the normal additional-CP limit.',formation);
    if(ranged)add('Bloody Spectacle',[shoot,snap],'Each time this Succubus’s formation destroys a Character model, gain 1CP, subject to the normal additional-CP limit. Its personal melee re-rolls do not affect these ranged attacks.',formation);
    break;
   case 'Lelith Hesperax':
    pain('Brides of Death (Pain)',[fight],'When this formation is selected to fight:','While Empowered, improve its models’ melee attack Strength and Armour Penetration by 1.');
    led('Blur of Blades',[['Fight','either','start']],'All models in this formation have Fights First, including Lelith and her Bodyguard.');
    add('Thrilling Spectacle',[['Fight','either','start'],fight],'Once per battle, at the start of a Fight phase, Lelith may gain a 3+ invulnerable save and set her melee weapon Attacks characteristic to 12 until that phase ends. This affects Lelith herself, not her Bodyguard.');
    break;
   case 'Haemonculus':{
    const upgraded=drukhariHasUpgrade(army,squad,'Master Regenesist','Covenite Coterie'),aura=drukhariHasUpgrade(army,squad,'Master Repugnomancer (Aura)','Covenite Coterie')||drukhariHasUpgrade(army,squad,'Master Repugnomancer','Covenite Coterie')?9:6;
    const body=originalGroup?.members.find(s=>s.id===originalGroup.root.id&&s.id!==id);
    if(body)pain('Fleshcraft (Pain)',[['Command','own','during']],'In your Command phase:','When activating Fleshcraft, return up to '+(upgraded?'D3+3':'D3+1')+' destroyed Bodyguard models from '+body.id+' to this formation, without exceeding its Starting Strength. This cannot return an attached Character. A surviving attached Haemonculus can restore its destroyed original Bodyguard; place returned models in coherency using the core revival restrictions.'+(upgraded?' Master Regenesist replaces the normal D3+1 amount.':''));
    add('Fear Incarnate (Aura)',eachPhase,'Enemy units within '+aura+'″ of this actual Haemonculus model worsen their models’ Leadership by 1. The aura ends if the Haemonculus is destroyed.'+(aura===9?' Master Repugnomancer extends the normal 6″ range.':''));
    add('Fear Incarnate (Aura)',[['Command','opponent','during']],'In the opponent’s Battle-shock step, each enemy unit below Starting Strength within '+aura+'″ of this Haemonculus model must take a Battle-shock test. It does not take two tests in the same step; its models also worsen Leadership by 1 while inside the aura.');
    break;
   }
   case 'Drazhar':
    pain('Master of Blades (Pain)',[fight],'When this formation is selected to fight:','While Empowered, add 1 to Wound rolls for its models’ melee attacks.');
    led('Onslaught',[fight],'Models in this formation may Pile In or Consolidate up to 6″ instead of 3″, following the normal movement requirements.');
    add('Silent Executioner',[fight],'Drazhar himself may re-roll attack Hit rolls against a unit below Starting Strength. If that target is Below Half-strength, he may also re-roll Wound rolls. The Bodyguard does not inherit this personal attack rule.');
    break;
   case 'Kabalite Warriors':
    pain('Sadistic Raiders (Pain)',normalAttack,'When this formation is selected to shoot in your Shooting phase or to fight:','While Empowered, re-roll attack Wound rolls of 1; against a target within range of an objective marker, re-roll the Wound roll instead.');
    if(permanent&&ranged)add('Sadistic Raiders (Pain)',[snap],'While this formation’s Dark Vitality bearer survives, it is Empowered during permitted snap shooting: re-roll Wound rolls of 1, or the Wound roll against targets within range of an objective marker. Snap shots can have Critical Wounds; their Hit rolls remain fixed.',formation);
    add('Cruel Enforcers',[['Command','own','end']],'At the end of your Command phase, if this formation is within range of an objective you control, it remains yours until the opponent’s Level of Control is greater than yours at phase end. Leaving that objective does not immediately end control.',formation);
    break;
   case 'Wyches':
    pain('Acrobatic Gladiators (Pain)',[['Charge','own','start'],['Charge','own','during']],'Activate at the start of your Charge phase:','While Empowered, this formation may declare a charge after Advancing or Falling Back this turn. This does not grant permission to charge in another phase.');
    add('No Escape',[['Movement','either','during'],fight],'When an enemy unit engaged with one or more of your Wyches formations Falls Back, every model in that enemy unit must take a Desperate Escape test. Exclude Monster and Vehicle units. If that enemy is Battle-shocked, subtract 1 from each test. Multiple No Escape sources do not cause additional sets of tests.',formation);
    break;
   case 'Incubi':{
    pain('Decapitating Strikes (Pain)',[fight],'When this formation is selected to fight:','While Empowered, its models’ melee attacks against Infantry units have Devastating Wounds.');
    add('Tormentors',[['Fight','either','start']],'Every enemy unit engaged with one or more of your Tormentors formations takes one Battle-shock test at the start of this Fight phase. Multiple such formations do not force repeated tests on the same enemy.',formation);
    add('Tormentors',[fight],'Add 1 to Hit rolls for this formation’s melee attacks against Battle-shocked enemy units.'+sourceExpiry,formation);
    const tokens=drukhariWeaponCount(squad,'Incubi Shrine token');
    if(tokens)add('Incubi Shrine Token',[fight],'This unit has '+tokens+' Incubi Shrine token'+(tokens===1?'':'s')+'. Once per battle per token, change one Hit or Wound roll made for an actual Klaivex or Incubi model to an unmodified 6, then expend that token. An attached Archon or Drazhar cannot use this token for their own attack.');
    break;
   }
   case 'Mandrakes':
    pain('Fade Away (Pain)',[['Fight','opponent','end']],'At the end of the opponent’s Fight phase, only if this formation is unengaged:','When activating Fade Away, remove this formation from the battlefield and place it in Strategic Reserves. Follow normal later-arrival restrictions.');
    add('Shade Weavers',[incoming,incomingSnap,returnFire],'An enemy model must be within 18″ of this formation to target it with a ranged attack.'+sourceExpiry,formation);
    break;
   case 'Wracks':
    pain('Experimental Enhancements (Pain)',[fight],'When this formation is selected to fight:','Choose one effect until phase end: its non-Character models’ melee weapons have Attacks 3; or those weapons have Attacks 4 and Hazardous. The attached Haemonculus’s weapons do not receive either profile. Resolve Hazard rolls for the Hazardous weapons actually used.');
    add('Torturer’s Craft',[shoot,fight],'After this formation shoots in your Shooting phase or fights in either Fight phase, select one non-Vehicle enemy unit hit by those attacks. That enemy takes a Battle-shock test. This cannot trigger after Overwatch in the opponent’s Movement phase.',formation);
    break;
   case 'Raider':{
    pain('Splinter Racks (Pain)',[shoot],'When this Raider is selected to shoot in your Shooting phase:','While Empowered and at least one unit is actually embarked, re-roll Hit rolls for this Raider’s ranged attacks with an Anti weapon. This includes an eligible Anti weapon temporarily gained through Firing Deck. It does not grant the passengers their own shooting or transfer their personal abilities.',[id]);
    add('Vanguard of the Dark City',[['Command','own','start']],'Choose one Vanguard ability for this Raider: Masters of the Shadowed Sky, Speed of the Kill, Visions of Butchery, or Aethersails. Only that selected ability applies until the start of your next Command phase. Passenger-dependent effects require the relevant physical models actually aboard.');
    const warriors=transportTargets('Kabalite Warriors'),wyches=transportTargets('Wyches'),wracks=transportTargets('Wracks');
    if(warriors.length)add('Masters of the Shadowed Sky',[['Command','own','end']],'Only if this is the Raider’s selected Vanguard ability and a Kabalite Warriors unit is actually embarked: an objective this Raider is within range of and you control at the end of your Command phase stays yours until the opponent’s Level of Control becomes greater at phase end. A declared Kabalite half counts only if that half is actually aboard.',warriors);
    if(wyches.length)add('Speed of the Kill',[move],'Only if this is the Raider’s selected Vanguard ability: actual Wyches passengers disembarking from this Raider must be set up wholly within 6″, except during Emergency Disembarkation. Keep the restrictions of the applicable disembark mode; this ability does not itself permit a charge after a Normal, Advance or ingress move.',wyches);
    if(wracks.length)add('Visions of Butchery',[fight],'Only if this is the Raider’s selected Vanguard ability and a Wracks unit is actually aboard: add 1 Attack to this Raider’s bladevanes and chainsnares for each actual Wracks model aboard. Attached Haemonculi do not count as Wracks models.',wracks);
    if(cargo().length||splitCandidates().length)add('Aethersails',[move,['Charge','own','during']],'Only if this is the Raider’s selected Vanguard ability and at least one Drukhari unit is actually embarked: re-roll this Raider’s Advance and Charge rolls. These re-rolls are for the transport, not the passengers.');
    break;
   }
   case 'Venom':
    pain('Rapid Deployment (Pain)',[move],'When this Venom is selected to Advance in your Movement phase:','While Empowered, its actual passengers may disembark after that Advance using Shock Disembark, provided they did not embark in this transport this phase. Set up each model wholly within 3″ and unengaged, following the current core restrictions; those passengers cannot declare a charge this turn. This is not permission to disembark after Falling Back.',[id,...cargo().flatMap(g=>g.members.map(s=>s.id)),...drukhariSplitCargoFormations(army,squad,roster).flatMap(g=>g.members.map(s=>s.id))]);
    break;
   case 'Reavers':
    pain('Matchless Swiftness (Pain)',[move],'When this formation is selected to Advance in your Movement phase:','While Empowered, do not make an Advance roll; add 8″ to its models’ Move characteristics until phase end instead.');
    add('Eviscerating Fly-by',[['Movement','either','during']],'After this formation ends a Normal or Advance move, choose one enemy unit it moved over, excluding Monster and Vehicle units. Roll one D6 per model in this formation; each 4+ inflicts 1 mortal wound on that enemy.',formation);
    if(fitted('Cluster caltrops'))add('Cluster Caltrops',[['Movement','either','during']],'When rolling Eviscerating Fly-by, re-roll one of its D6 for each surviving model in this formation actually equipped with cluster caltrops. This equipment does not grant extra dice or apply to other mortal-wound rules.',formation);
    if(fitted('Grav-talon'))add('Grav-talon',[fight],'Only melee weapons equipped by the actual grav-talon bearer'+(bearers('Grav-talon').length===1?' ('+bearers('Grav-talon')[0]+')':'s')+' have AP −2 and Lethal Hits. Other Reavers retain their own printed weapon profiles.');
    break;
   case 'Hellions':
    pain('Battlefield Butchery (Pain)',[fight],'When this formation is selected to fight:','While Empowered, add 1 to the Attacks and Strength of this formation’s melee weapons.');
    add('Skyboard Evasion',[['Movement','opponent','during']],'In the opponent’s Movement phase, after an enemy unit ends any move within 8″ of this formation, if this formation is unengaged it may make a Normal move up to D6″. The current range is 8″.',formation,pack);
    break;
   case 'Razorwing Jetfighter':
    pain('Nowhere to Run (Pain)',[shoot],'When this aircraft is selected to shoot in your Shooting phase:','While Empowered, after it has shot choose one non-Monster, non-Vehicle enemy unit hit by those attacks. That enemy is pinned until the start of your next turn: subtract 2″ from its models’ Move and subtract 2 from its Charge rolls.');
    add('Ground Attack Craft',[shoot],'Add 1 to Hit rolls for this aircraft’s ranged attacks against an enemy unit that cannot Fly. This does not modify the fixed Hit rolls used by snap shooting.');
    break;
   case 'Voidraven Bomber':
    pain('Nowhere to Hide (Pain)',[shoot],'When this aircraft is selected to shoot in your Shooting phase:','While Empowered, after it has shot choose one enemy unit hit by those attacks. That enemy cannot have the Benefit of Cover until phase end.');
    add('Void Mine',[['Fight','opponent','end']],'At the end of the opponent’s Fight phase, select one visible enemy model within 24″ of this aircraft, excluding models in Lone Operative units. Roll D6 for the radius, then one D6 for each enemy unit within that radius of the chosen model. Each 4+ inflicts D6 mortal wounds on that enemy unit; roll the damage separately for each affected unit.',[id],pack);
    break;
   case 'Scourges with Heavy Weapons':
    pain('Winged Strike (Pain)',[shoot],'When this formation is selected to shoot in your Shooting phase:','While Empowered, re-roll Hit rolls for its models’ ranged attacks. This does not activate during Overwatch or modify snap-shot Hit rolls.');
    add('Airborne Evasion',[shoot],'After this formation shoots in your Shooting phase, if it is unengaged it may make a Normal move up to 6″. If it does, it cannot declare a charge for the rest of this turn.',formation);
    add('Airborne Evasion · charge restriction',[['Charge','own','during']],'If this formation made its Airborne Evasion move this turn, it cannot declare a charge this turn.',formation);
    break;
   case 'Talos':
    pain('Mindless Killing Machines (Pain)',[['Fight','either','start'],fight],'Activate at the start of this Fight phase:','While Empowered, when a Talos in this formation is destroyed by a melee attack before it has fought this phase, roll D6. On 2+, leave it in play, let it fight after the attacking unit finishes its attacks, then remove it. A model that already fought does not fight again.');
    if(models.some(m=>m.items.filter(i=>key(i)==='macroscalpel').length===2))add('Devoted to Pain',[fight],'A Talos actually equipped with two macro-scalpels gives those macro-scalpels Twin-linked, allowing Wound re-rolls. Check each physical Talos separately; one scalpel on each of two models is not a pair on either model.');
    add('Torture Device',[fight,...(selfGun?[shoot,snap]:[])],'Each time this Talos formation destroys an enemy unit, gain 1 additional Pain token, in addition to the army’s normal token for the destroyed enemy unit.',formation);
    break;
   case 'Cronos':
    pain('Pain Parasite (Pain)',[fight,...(selfGun?[shoot]:[])],'When this formation is selected to shoot in your Shooting phase or to fight:','While Empowered, after its attacks are resolved, if those attacks destroyed at least one enemy model, one Cronos in this formation regains up to 3 lost wounds. If every surviving Cronos is at starting wounds and the unit is below Starting Strength, return one destroyed Cronos with 3 wounds instead. This does not heal a different unit.');
    add('Pain Engine (Aura)',eachPhase,'Each time you spend exactly 1 Pain token to Empower a friendly unit within 9″ of this Cronos formation, roll one D6'+(models.some(m=>!m.items.some(i=>key(i)==='spiritvortex'))?', adding 1 because at least one current Cronos is not equipped with a spirit vortex':'; every current Cronos has a spirit vortex, so this unit adds no bonus')+'. On 5+, gain 1 Pain token. Spending tokens on other rules or activating Pain without spending a token does not trigger this aura.',nativeIds);
    break;
   case 'Ravager':
    pain('Agonising Suppression (Pain)',[shoot],'When this Ravager is selected to shoot in your Shooting phase:','While Empowered, after it has shot choose one enemy unit hit by its attacks. That enemy is suppressed until the start of your next turn: subtract 1 from its attack Hit rolls. This does not modify fixed snap-shot Hit rolls.');
    add('Eradicate the Foe',[shoot,fight],'This Ravager may re-roll attack Hit rolls against an enemy unit at Starting Strength. Follow the core strength definition for a single-model target. This is a full Hit re-roll, not only rolls of 1.');
    break;
   case 'Lady Malys':
    pain('Archon of the Poisoned Tongue (Pain)',normalAttack,'When this formation is selected to shoot in your Shooting phase or to fight:','Choose Lethal Hits or Sustained Hits 1. Until phase end while Empowered, weapons equipped by models in this formation have the selected ability. Choose one, not both.');
    add('Precognisant',[['Pre-battle','either','during']],'After both players deploy, because your army includes Lady Malys, select up to three Drukhari formations and redeploy them. You may place those units in Strategic Reserves regardless of how many units are already there.',nativeIds);
    add('Mind Like a Steel Trap (Aura)',eachPhase,'Once per turn, when the opponent targets one of their units within 12″ of this Lady Malys model with a Stratagem, you may increase the CP cost of that use by 1CP. Measure from Lady Malys herself.',[id],pack);
    break;
   case 'Hand of the Archon':
    pain('Assassins’ Poisons (Pain)',normalAttack,'When this formation is selected to shoot in your Shooting phase or to fight:','While Empowered, its models’ weapons have Lethal Hits and Precision, except blast pistols, blasters and dark lances. Those three excluded weapon types receive neither ability from this rule.');
    if(permanent&&ranged)add('Assassins’ Poisons (Pain)',[snap],'While its Dark Vitality bearer survives, this formation is Empowered during permitted Overwatch. Eligible weapons retain Precision, excluding blast pistols, blasters and dark lances; use the visible Character allocation group when permitted. Snap shots cannot score Critical Hits, so Lethal Hits cannot trigger.',formation);
    add('Archon’s Will',[['Start of battle round','either','start']],'At the start of the first battle round only, choose one objective marker for this Hand of the Archon formation. Keep that same marker for the battle.',formation);
    add('Archon’s Will',defence,'While this formation is within range of its chosen Archon’s Will objective and is not Battle-shocked, its models have a 5+ invulnerable save.'+sourceExpiry,formation);
    add('Archon’s Will',endPhase,'While this formation is within range of its chosen Archon’s Will objective and is not Battle-shocked, its models have Objective Control 3 before other modifiers.'+sourceExpiry,formation);
    if(fitted('Stimm-needler'))add('Stimm-needler',defence,'Once per turn, the first time a saving throw is failed for any model in this formation while its actual stimm-needler bearer survives, change that attack’s Damage characteristic to 0. This is the first failed save, not any later failed save of your choice. A bearer assigned to the other split half protects only that half.',formation);
    break;
   case 'Scourges with Shardcarbines':
    pain('Swooping Descent (Pain)',[move],'In your Movement phase, before setting this formation up with Deep Strike:','While Empowered, it may set up more than 6″ horizontally from every enemy. If it is set up within 8″ of any enemy unit, it cannot declare a charge for the rest of this turn. This shorter arrival distance cannot be activated during the opponent’s Rapid Ingress.');
    add('Swooping Descent · charge restriction',[['Charge','own','during']],'If this formation arrived with Swooping Descent within 8″ of any enemy this turn, it cannot declare a charge this turn. Arriving exactly 8″ away still causes this restriction.',formation,pack);
    add('Murderous Crossfire',[shoot,snap],'After this formation has shot, select one enemy unit hit by those attacks. Until phase end, ranged attacks made by friendly Drukhari formations against that enemy improve Armour Penetration by 1. The same enemy can be affected only once per turn. This trigger can occur after permitted Overwatch; it does not require your Shooting phase.',nativeGunIds);
    break;
   case 'Death Jester':
    add('Death is Not Enough',[shoot],'After this Death Jester shoots in your Shooting phase, select one non-Monster, non-Vehicle enemy unit hit by its attacks. That enemy takes a Battle-shock test; subtract 1 from that test if those attacks destroyed at least one model in the selected unit.');
    add('Cruel Amusement',[shoot],'When this Death Jester is selected to shoot in your Shooting phase, choose Ignores Cover, Precision or Sustained Hits 3 for its shrieker cannon until phase end. This choice is not available when firing Overwatch.');
    break;
   case 'Shadowseer':
    led('Fog of Dreams (Psychic)',[incoming,incomingSnap,returnFire],'An attacking enemy model must be within 18″ of this formation to target it with a ranged attack.');
    add('Treacherous Illusion (Psychic)',[fight],'Enemy models’ melee weapons have Hazardous while targeting this Shadowseer’s formation. Resolve Hazard rolls for the Hazardous weapons the enemy actually uses.'+sourceExpiry,formation);
    break;
   case 'Solitaire':
    add('Blitz',[move],'Once per battle, before this Solitaire makes a Normal move in your Movement phase, add 2D6″ to its Move and add 3 to the Attacks of its Solitaire weapons until the end of the turn. This cannot be activated before an Advance or an out-of-phase move.');
    add('Blitz',[['Fight','own','during']],'Only in a turn when this Solitaire used Blitz: add 3 to the Attacks characteristic of its Solitaire weapons until that turn ends.');
    add('Blur of Movement',[move,['Charge','own','during']],'This Solitaire remains eligible to declare a charge after Advancing this turn.');
    break;
   case 'Troupe Master':
    led('Choreographer of War',[fight],'This formation’s models may Pile In or Consolidate up to 6″. They need not finish closer to the closest enemy model, but must finish as close as possible to the closest enemy unit; obey other movement restrictions.');
    add('Cegorach’s Favour',[fight],'The Troupe Master’s own melee attacks re-roll Hit rolls of 1 and add 1 to Wound rolls. These personal bonuses do not apply to other models in the formation.');
    break;
   case 'Skyweavers':
    add('Acrobatic Grace',[incoming,incomingSnap,returnFire],'This Skyweaver formation has Stealth, granting the Benefit of Cover against ranged attacks.'+sourceExpiry,formation);
    add('Acrobatic Grace',[fight],'Subtract 1 from Hit rolls for melee attacks targeting this Skyweaver formation.'+sourceExpiry,formation);
    break;
   case 'Troupe':
    add('Dance of Death',[['Fight','either','start'],fight],'At the start of this Fight phase choose one benefit for this formation until phase end: Hero’s Prowess re-rolls attack Hit rolls of 1; Villain’s Doom adds 1 to attack Wound rolls; Trickster’s Grace subtracts 1 from Hit rolls for attacks targeting it. Only the selected benefit applies.'+sourceExpiry,formation);
    break;
   case 'Voidweaver':
    add('Polychromatic Camouflage',[incoming,incomingSnap,returnFire],'An attacking enemy model must be within 18″ of this Voidweaver formation to target it with a ranged attack.',formation);
    break;
   case 'Corsair Voidreavers':
    add('Reavers of the Void',normalAttack,'This formation’s attack Hit rolls re-roll 1s; against a target within range of an objective marker, re-roll the Hit roll instead. These re-rolls cannot change snap-shot Hit rolls.'+sourceExpiry,formation);
    break;
   case 'Corsair Voidscarred':
    add('Piratical Raiders',[['Pre-battle','either','during']],'At the start of the battle choose one enemy unit for this Corsair formation’s Piratical Raiders ability. Its weapons have Lethal Hits and Precision when targeting that chosen enemy unit.',formation);
    add('Piratical Raiders',normalAttack,'Against the enemy unit selected for this formation at the start of the battle, its models’ weapons have Lethal Hits and Precision.'+sourceExpiry,formation);
    if(fitted('Channeller stones'))add('Channeller Stones',defence,'Once per turn, the first time a saving throw is failed for this formation while its actual Soul Weaver with channeller stones survives, change that attack’s Damage to 0. This is the first failed save, not a later save of your choice; the other Corsair specialists do not provide this ability.',formation);
    if(fitted('Faolchú'))add('Faolchú',[shoot,snap],'While its actual Faolchú bearer survives, ranged weapons equipped by models in this formation have Ignores Cover. The bird is equipment, not an extra physical model.',formation);
    break;
   case 'Kharseth':
    add('Aethersense (Psychic)',[['Movement','either','during']],'Enemy units arriving from Reserves cannot be set up within 12″ of this Kharseth model. Measure from the actual Kharseth, not the edge of its Bodyguard formation.');
    add('Fury of the Void (Psychic)',[shoot],'After Kharseth’s formation shoots in your Shooting phase, select one enemy unit hit by Kharseth’s own Dread of the Deep Void. That enemy is riven until the end of the turn. Attacks by friendly Aeldari models against it add 1 Strength; another model’s weapon does not trigger this rule.',aeldariIds);
    break;
   case 'Prince Yriel':
    led('Piratical Hero',normalAttack,'This formation’s attacks have Sustained Hits 1 and add 1 to their Hit rolls. Neither benefit changes fixed snap-shot Hit rolls or permits Critical Hits during snap shooting.');
    add('Prince of Corsairs',[['Pre-battle','either','during']],'After both players deploy, only if Yriel’s unit is on the battlefield or actually embarked in an on-battlefield Transport, select up to three Aeldari formations and redeploy them. You may place them in Strategic Reserves regardless of how many units are already there. This is not available while Yriel and any carrier are off the battlefield.',aeldariIds);
    break;
   case 'Corsair Skyreavers':
    add('Raid and Run',[['Fight','either','end']],'At the end of the Fight phase, only if this formation was eligible to fight this phase: if now unengaged it may make a Normal move up to D3+3″; otherwise it may make a Fall Back move up to D3+3″. It need not actually have fought, but having been eligible is required.',formation);
    break;
   case 'Starfangs':
    add('Hallucinogen Grenades',[['Shooting','opponent','start']],'At the start of the opponent’s Shooting phase, choose one friendly Aeldari Infantry formation visible to and within 36″ of this Starfang unit. That chosen formation has Stealth until phase end, granting the Benefit of Cover against ranged attacks.',infantryIds);
    break;
  }
  if(['Kabalite Warriors','Hand of the Archon'].includes(unit)&&fitted('Kabalite icon'))add('Kabalite Icon',endPhase,'While this formation is not Battle-shocked, add 1 to the Objective Control of the actual Kabalite icon bearer only. Other models in the formation do not gain the bonus. For a split squad, the icon belongs to only its declared half.',formation);
  if(['Kabalite Warriors','Hand of the Archon','Hellions'].includes(unit)&&fitted('Phantasm grenade launcher'))add('Phantasm Grenade Launcher',[['Pre-battle','either','during']],'While the actual phantasm grenade launcher bearer survives, its formation has Smoke'+(unit==='Hand of the Archon'?'': ' and Grenades')+'. A split squad gains this equipment’s keyword only in the half containing the bearer.',formation);
  if(['Death Jester','Shadowseer','Solitaire','Troupe Master','Troupe'].includes(unit)&&fitted('Flip belt'))add('Flip Belt',[['Movement','either','during'],['Charge','either','during'],fight],'For a Normal, Advance, Fall Back or Charge move, ignore vertical distance when measuring how far each actual flip-belt bearer moves. This does not apply to Pile In or Consolidation moves, and does not give other attached models a flip belt.',formation);
 }

 // A completed target effect has its own duration even if its original source
 // later leaves the battlefield. Static sheets keep that conditional reminder;
 // they do not claim the player has already chosen a target.
 for(const source of original.filter(s=>legal.has(s.unit))){
  const add=(title:string,steps:readonly Step[],summary:string,recipients=allIds)=>{
   if(!recipients.length)return;
   for(const [window,turn,timing] of steps)result.push({id:['11e-drukhari-lasting',source.id,title,window,turn].join(':'),title,window,turn,timing,summary:source.id+': '+summary,units:[...new Set([source.id,...recipients])],source:sheets.get(source.unit)!.source,origin:'unit'});
  };
  if(source.unit==='Razorwing Jetfighter')add('Nowhere to Run · pinned enemy',[['Movement','either','during'],['Charge','either','during']],'If this aircraft previously pinned an enemy with Nowhere to Run, that enemy has −2″ Move and −2 to Charge rolls until the start of your next turn. The already-applied effect keeps its duration if the aircraft is destroyed or returns to Strategic Reserves.');
  if(source.unit==='Ravager')add('Agonising Suppression · suppressed enemy',[incoming,returnFire,fight],'If this Ravager previously suppressed an enemy, subtract 1 from that enemy’s attack Hit rolls until the start of your next turn. Its source need not remain alive after applying the effect. Fixed snap-shot Hit rolls are unaffected.');
  if(source.unit==='Voidraven Bomber')add('Nowhere to Hide · exposed enemy',[shoot],'If this aircraft already selected an enemy through Nowhere to Hide this phase, that enemy cannot have the Benefit of Cover until phase end, including if the aircraft is later destroyed.');
  if(source.unit==='Scourges with Shardcarbines')add('Murderous Crossfire · marked enemy',[shoot,snap],'If this formation already marked an enemy after shooting this phase, friendly Drukhari ranged attacks against that enemy improve AP by 1 until phase end. An enemy can receive this effect only once per turn. The applied target effect does not end merely because the Scourges are later destroyed.',nativeGunIds);
  if(source.unit==='Kharseth')add('Fury of the Void · riven enemy',[shoot,['Fight','own','during']],'If Kharseth’s Dread of the Deep Void already made an enemy riven this turn, friendly Aeldari models add 1 Strength to attacks against it until this turn ends, even if Kharseth is later destroyed. This expires before the opponent’s turn.',aeldariIds);
  if(source.unit==='Starfangs')add('Hallucinogen Grenades · selected infantry',[incoming],'A friendly Aeldari Infantry formation selected at the start of this opponent’s Shooting phase has Stealth until phase end, granting the Benefit of Cover. That granted effect lasts for the phase even if the Starfang source is later destroyed.',infantryIds);
  if(source.unit==='Kabalite Warriors'||source.unit==='Raider')add('Persistent objective control',endPhase,'An objective already made sticky by '+(source.unit==='Raider'?'Masters of the Shadowed Sky':'Cruel Enforcers')+' remains yours until the opponent’s Level of Control over it is greater than yours at the end of a phase. This persists after the original source moves away or is destroyed.');
 }
 return result;
}
