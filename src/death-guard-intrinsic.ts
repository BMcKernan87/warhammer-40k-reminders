import type {ArmySelection} from './catalog';
import {DEATH_GUARD_SHEETS,deathGuardKeywords,deathGuardMusterUnits} from './death-guard-data';
import {eligibleDeathGuardUpgrades} from './death-guard-detachment-data';
import {deathGuardHasRangedWeapon,deathGuardModelLoadouts,deathGuardWeaponCount} from './death-guard-loadouts';
import {deathGuardCargoFormations,deathGuardFormations} from './death-guard-transports';
import {DG_CARDS} from './dg-profiles.generated';
import {equippedWeaponText} from './knight-card-rules';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';

type Step=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const shoot:Step=['Shooting','own','during'],fight:Step=['Fight','either','during'],move:Step=['Movement','own','during'];
const snap:Step=['Movement','opponent','end'],incoming:Step=['Shooting','opponent','during'],incomingSnap:Step=['Movement','own','end'];
const charge:Step=['Charge','either','during'],defend=[incoming,incomingSnap,fight],eachPhase=PHASES.map((p):Step=>[p,'either','during']);
const sheets=new Map(DEATH_GUARD_SHEETS.map(s=>[s.unit,s]));
const horde='Poxwalkers (Numberless Horde reinforcements)';
const distinct=(ids:string[])=>[...new Set(ids)];

export function deathGuardIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Death Guard')return [];
 const allowed=new Set(deathGuardMusterUnits(army)),native=roster.filter(s=>sheets.has(s.unit)&&allowed.has(s.unit));
 const groups=deathGuardFormations(army,roster).filter(g=>g.members.every(m=>allowed.has(m.unit)));
 const potentialHorde=army.detachments2026?.includes('Shamblerot Vectorium');
 if(potentialHorde){
  const summoned:RosterInstance={id:horde,unit:'Poxwalkers',models:10};
  native.push(summoned);groups.push({root:summoned,members:[summoned]});
 }
 const has=(s:RosterInstance,key:string)=>deathGuardKeywords(army,s).has(key);
 const tagged=(tag:string,filter?:(members:RosterInstance[])=>boolean)=>groups.filter(g=>g.members.some(m=>has(m,tag))&&(!filter||filter(g.members))).map(g=>g.root.id);
 const dg=tagged('DEATH GUARD'),guns=tagged('DEATH GUARD',ms=>ms.some(deathGuardHasRangedWeapon));
 const infantry=tagged('DEATH GUARD',ms=>ms.some(m=>has(m,'INFANTRY')));
 const legions=tagged('PLAGUE LEGIONS');
 const mort=native.find(s=>s.unit==='Mortarion');
 const result:GeneratedReminder[]=[];
 function emit(key:string,unit:string,title:string,steps:readonly Step[],summary:string,ids:string[]){
  if(!ids.length)return;
  for(const [window,turn,timing] of steps)result.push({id:['11e-dg-card',key,title,window,turn,timing].join(':'),title,window,turn,timing,summary,origin:'unit',units:distinct(ids),source:sheets.get(unit)!.source});
 }
 function collective(unit:string,title:string,steps:readonly Step[],summary:string,targets:string[]=[]){
  const bearers=native.filter(m=>m.unit===unit).map(m=>m.id);
  if(bearers.length)emit(unit,unit,title,steps,summary,[...bearers,...targets]);
 }
 collective('Lord of Contagion','Unholy Resilience',PHASES.map(p=>[p,'either','end']),'The first time a model with this ability is destroyed this battle round, roll one D6 at phase end. On 2+ return that model with 3 wounds, as close as possible to where it died and outside enemy Engagement Range. Each model may return only once per battle.');
 collective('Daemon Prince of Nurgle','Fevered Strategist',eachPhase,'Once per battle round across all these Princes, when a friendly Death Guard unit within 12″ of the Prince is targeted by a Stratagem, one Prince can reduce the cost by 1CP.',dg);
 collective('Foul Blightspawn','Blinding Spray',[fight],'In this Fight phase choose one Blightspawn in your army to give its own formation Fights First until phase end. Each Blightspawn can be chosen once per battle.',groups.filter(g=>g.members.some(s=>s.unit==='Foul Blightspawn')).map(g=>g.root.id));
 collective('Nurglings','Mischief Makers',[fight],'When an enemy unit engaged with one or more of these Nurglings units is selected to fight, its models subtract 1 from melee Hit rolls for this phase. Titanic units are exempt.');
 for(const squad of native){
  const {id,unit}=squad,group=groups.find(g=>g.members.some(m=>m.id===id));
  if(!group)continue;
  const formation=group.members.map(m=>m.id),leading=group.root.id!==id;
  const hasGun=deathGuardHasRangedWeapon(squad),groupGuns=group.members.some(deathGuardHasRangedWeapon);
  const fitted=(name:string)=>deathGuardWeaponCount(squad,name)>0;
  const canRetaliate=mort&&groupGuns&&group.members.some(m=>has(m,'DEATH GUARD'));
  function retaliation(title:string,summary:string){
   if(canRetaliate)add(title,[incoming],'If Mortarion chooses this formation within 6″ for Inflamed Reprisal, '+summary,[...formation,mort!.id]);
  }
  function add(title:string,steps:readonly Step[],summary:string,targets=[id]){
   if(targets.length)emit(id,unit,title,steps,summary,[id,...targets]);
  }
  const led=(title:string,steps:readonly Step[],summary:string)=>{if(leading)add(title,steps,summary,formation);};
  if(fitted('Icon of despair'))add('Icon of Despair',eachPhase,'While the Icon bearer survives, models in enemy units within 6″ of that bearer worsen Leadership by 1.');
  if(fitted('Daemonic icon'))add('Daemonic Icon',eachPhase,'While the Icon bearer survives, the models in its unit have Leadership 6+.',formation);
  if(fitted('Instrument of Chaos'))add('Instrument of Chaos',[charge],'While the Instrument bearer survives, add 1 to Charge rolls for its unit.',formation);
  switch(unit){
   case 'Plague Marines':
    add('Infused with the Blessings of Nurgle',[shoot],'After this formation shoots in your Shooting phase, choose one enemy unit it hit. That unit is Afflicted until your next turn starts.',formation);break;
   case 'Helbrute':{
    if(hasGun)retaliation('Diseased Malice','add 1 to Wound rolls for its return fire against an Afflicted attacker.');
    add('Diseased Malice',hasGun?[shoot,snap,fight]:[fight],'This Helbrute adds 1 to Wound rolls for attacks that target an Afflicted unit.');
    const arms=deathGuardModelLoadouts(squad).flatMap(b=>b.items).filter(w=>['Helbrute fist','Helbrute hammer','Power scourge'].includes(w));
    if(arms.length===2)add('Froth-spattered Frenzy',[fight],'The two fitted melee arms each gain 2 Attacks: '+arms.join(' and ')+'. The close combat weapon keeps its printed Attacks.');
    break;
   }
   case 'Chaos Rhino':case 'Chaos Land Raider':{
    const cargo=deathGuardCargoFormations(army,squad,roster);
    if(unit==='Chaos Rhino'){
     const teams=cargo.filter(g=>g.members.some(deathGuardHasRangedWeapon)).map(g=>g.root.id);
     add('Fire Support',[shoot],'After the Rhino shoots in your Shooting phase, choose one enemy unit it hit. For the rest of this phase, a model that disembarked from this Rhino this turn may re-roll its Wound rolls for attacks against that unit.',teams);
    }else{
     const teams=cargo.map(g=>g.root.id);
     add('Assault Ramp',[move],'Passengers disembarking after this Land Raider makes a Normal move Assault Disembark wholly within 3″ and outside Engagement Range. They remain eligible to charge.',teams);
     add('Assault Ramp',[['Charge','own','during']],'Passengers that Assault Disembarked after this Land Raider’s Normal move can charge this turn.',teams);
    }break;
   }
   case 'Chaos Spawn':
    add('Lethal Ichor',[fight],'After a unit finishes its melee attacks, roll one D6 per melee attack allocated to these Spawn, up to six dice for that attacking unit. On each 4+ the attacker suffers one mortal wound.');break;
   case 'Chaos Predator Annihilator':
    add('Metalophagic Infection',[shoot],'After this Predator shoots, select one enemy Monster or Vehicle unit hit by its attacks. Roll one D6, adding 1 if that unit is Afflicted. On 5+ it suffers D3 mortal wounds.');break;
   case 'Daemon Prince of Nurgle':
    add('Death Guard Defenders',[incoming,incomingSnap],'While within 3″ of friendly Death Guard Infantry, this Prince has Lone Operative. Enemy models outside 12″ cannot see it or target it with Indirect Fire.',infantry);
    add('Miasma of Pestilence',[incoming,incomingSnap],'Models in friendly Death Guard units within 6″ of this Prince gain the Benefit of Cover when targeted by ranged attacks.',dg);break;
   case 'Typhus':
    led('The Destroyer Hive',[fight],'While Typhus leads this formation, enemy melee attacks targeting it take −1 to Hit.');
    add('Eater Plague',[shoot],'Choose a visible enemy within 18″ of Typhus. An unattached Lone Operative must also be within 12″. Roll one D6. On 1 Typhus’s unit suffers D3 mortal wounds. On 2–5 the enemy suffers D6, and on 6 it suffers D3+3.'+(group.root.unit==='Poxwalkers'?' Each non-Monster, non-Vehicle enemy model destroyed this way lets this formation return one destroyed Poxwalker.':''),formation);break;
   case 'Lord of Contagion':
    led('Vector of Disease',[fight],'While this Lord leads the formation, its melee weapons have Sustained Hits 1 and Lance. Critical Hits grant one extra hit, and the weapons add 1 to Wound rolls if the unit charged this turn.');break;
   case 'Malignant Plaguecaster':
    if(leading)retaliation('Gift of Contagion','its attacks have Sustained Hits 1 when the attacker is Afflicted.');
    led('Gift of Contagion',groupGuns?[shoot,fight]:[fight],'While this model leads the formation, its attacks against an Afflicted unit have Sustained Hits 1. Each Critical Hit scores one additional hit.');
    add('Pestilent Fallout',[shoot],'After this model shoots, choose one enemy Infantry unit hit by its Plague Wind. Models in that unit have −2″ Move until the end of your opponent’s next turn.');
    add('Pestilent Fallout',[['Movement','opponent','during']],'Models in the Infantry unit enfeebled by this Plaguecaster’s Plague Wind have −2″ Move until the end of this turn.');break;
   case 'Poxwalkers':
    add('Curse of the Walking Pox',[fight],(id===horde?'Once a Numberless Horde unit has arrived, ':'')+'after the unit resolves its attacks, return one destroyed Poxwalker for each enemy model destroyed by a Poxwalker model’s attack. Monster and Vehicle models do not count.',formation);break;
   case 'Foetid Bloat-drone':
    add('Hovering Death',hasGun?[move,shoot,['Charge','own','during']]:[move,['Charge','own','during']],'After Falling Back this turn, this drone may '+(hasGun?'shoot and declare a charge.':'declare a charge.'));break;
   case 'Noxious Blightbringer':
    led('Sickening Vitality',[move,charge],'While the Blightbringer leads this formation, its models gain 1″ Move and the formation may re-roll Advance and Charge rolls.');
    add('Tocsin of Misery',[['Command','opponent','during']],'In the opponent’s Battle-shock step, enemy units below Starting Strength within 9″ of this model must test Battle-shock. A Psyker unit subtracts 1 from that test.');break;
   case 'Foul Blightspawn':
    add('Putrefying Stink',[['Movement','opponent','during']],'Enemy models cannot start or finish an Advance move within 9″ of this Blightspawn.');break;
   case 'Biologus Putrifier':
    if(leading)retaliation('Foul Infusion','its weapons have Lethal Hits and its attacks score Critical Hits on unmodified 5+.');
    led('Foul Infusion',groupGuns?[shoot,fight]:[fight],'While the Putrifier leads the formation, its weapons have Lethal Hits and attacks score Critical Hits on unmodified 5+. Torrent weapons score no Critical Hits.');
    add('Extraction of Fresh Disease',[fight],'The first time this formation destroys an enemy unit with a melee attack, the Putrifier model gains 6 Objective Control for the rest of the battle.',formation);break;
   case 'Plague Surgeon':{
    const item=army.upgrades2026?.[id]??army.upgrades2026?.[unit]??squad.enhancement;
    const needle=item==='Needle of Nurgle'&&eligibleDeathGuardUpgrades(army,unit,id).some(u=>u.name===item);
    led('Tainted Narthecium',[['Command','own','during']],'While the Surgeon leads this formation, return '+(needle?'up to D3 destroyed Bodyguard models using the Needle of Nurgle.':'one destroyed Bodyguard model.'));
    add('Inflamed Infections',[['Fight','either','start']],'Choose one enemy unit engaged with the Surgeon. For this phase, attacks made by the Surgeon against it score Critical Hits on unmodified 5+, or 4+ if the enemy unit is below Half-strength.');break;
   }
   case 'Tallyman':
    if(leading)retaliation('Malicious Calculations','the Tallyman’s formation may ignore the −1 BS from return fire and any other BS or Hit modifiers.');
    led('Malicious Calculations',groupGuns?[shoot,fight]:[fight],'While the Tallyman leads the formation, its models may ignore any or all modifiers to their attacks’ BS or WS and any or all Hit-roll modifiers.');
    add('Sevenfold Chant',[['Command','own','during']],'If this Tallyman is on the battlefield, roll 2D6. On 7+ gain 1CP.');break;
   case 'Deathshroud Terminators':{
    const leaders=group.members.filter(m=>m.id!==group.root.id&&has(m,'CHARACTER')).map(m=>m.id);
    add('Silent Bodyguard',[...defend,shoot,snap],'While leading this Deathshroud unit, the attached Character has Feel No Pain 4+. Roll for wounds that Character would lose.',leaders);
    add('Death Approaches',[move],'When this formation uses Deep Strike in your Movement phase, set it up more than 6″ horizontally from every Afflicted enemy and more than 8″ from every other enemy.',formation);break;
   }
   case 'Blightlord Terminators':
    if((squad.models??sheets.get(unit)!.sizes[0])>=5||group.members.some(m=>m.id!==group.root.id&&has(m,'CHARACTER'))){
     add('Blistering Fusillade',[shoot,snap],'If the formation’s Starting Strength is at least five or a Character leads it, its ranged attacks against Afflicted units gain 1 Strength and improve AP by 1.',formation);
     retaliation('Blistering Fusillade','its ranged attacks gain 1 Strength and improve AP by 1 against an Afflicted attacker.');
    }break;
   case 'Myphitic Blight-hauler':
    add('Tank Hunters',[shoot],'In your Shooting phase, this unit adds 1 to its Hit and Wound rolls against Monsters and Vehicles.');break;
   case 'Plagueburst Crawler':
    add('Spore-laced Shock Waves',[shoot],'Each time the Plagueburst mortar selects a target, roll one D6 for that unit and each other enemy unit within 3″ of it. Add 1 for each unit’s own roll if it is Afflicted. On 6+ that unit suffers D3 mortal wounds after this Crawler resolves all attacks against the target.');break;
   case 'Mortarion':{
    const returnFire=groups.filter(g=>guns.includes(g.root.id)).flatMap(g=>g.members.flatMap(m=>{
     const card=DG_CARDS[m.unit];
     const text=card&&equippedWeaponText(m,card,'Shooting',false,deathGuardWeaponCount);
     return text?[m.id+' — '+text]:[];
    }));
    add('Host of Plagues',[['Movement','own','end']],'At the end of your Movement phase roll one D6 for each enemy within 6″ of Mortarion, adding 1 to its roll if Afflicted. On 3+ that enemy unit suffers D3 mortal wounds.');
    add('Diseased Influence',[['Movement','either','during']],'Once per turn across Mortarion’s three Lord of the Death Guard abilities: after an enemy ends a Normal, Advance or Fall Back move within 8″ of an unengaged friendly Death Guard unit within 6″ of Mortarion, that friendly unit may make a Normal move up to 5″.',tagged('DEATH GUARD',ms=>ms.every(m=>!has(m,'FORTIFICATION'))));
    add('Boon of Death',[fight],'Once per turn across Mortarion’s three Lord of the Death Guard abilities: when a friendly Death Guard unit within 6″ is targeted by an attack, protect it until phase end. Each time an unfought model in it dies to a melee attack, on 2+ it fights after the attacker finishes, then is removed.',dg);
    add('Inflamed Reprisal',[incoming],'Once per turn across Mortarion’s three Lord of the Death Guard abilities: when a friendly Death Guard unit within 6″ is targeted, it may shoot after the attacker finishes. It can target only that attacker if eligible and worsens its Ballistic Skill by 1.'+(returnFire.length?' Equipped weapon abilities for return fire: '+returnFire.join(' '):''),guns);break;
   }
   case 'Lord of Virulence':
    if(leading)retaliation('Virulent Aura','its ranged attacks can re-roll Wound rolls.');
    led('Virulent Aura',[shoot,snap],'While the Lord leads the formation, its ranged attacks may re-roll Wound rolls.');
    add('Blight Bombardment',[['Shooting','own','start']],'Select one visible enemy within 30″ of the Lord. Friendly Death Guard models can re-roll ranged Hit rolls of 1 against it for this phase. With Blast weapons they may instead re-roll the Hit roll.',guns);break;
   case 'Chaos Predator Destructor':
    add('Hail of Corrosive Disease',[shoot],'After this Predator shoots, select one enemy unit it hit that is neither a Monster nor a Vehicle. Friendly Death Guard units improve ranged AP by 1 against it until phase end. An enemy may be affected only once per phase.',guns);break;
   case 'Miasmic Malignifier':
    add('Deployment',[['Pre-battle','own','during']],'Set up the two parts of this Fortification within 1″ of each other. They count as one model for all rules.');
    add('Putrescent Fog',[['Movement','opponent','during'],['Movement','own','end']],'Enemy Reinforcements cannot be set up within 12″ of this model, including units arriving by Rapid Ingress.');
    add('Diseased Cover',[shoot,snap,incoming,incomingSnap],'A model receives the Benefit of Cover against a ranged attack if this Fortification prevents any model in the attacking unit from seeing all of that model.');
    add('Fortification',[shoot,snap],'An enemy engaged only with friendly Fortifications can still be targeted by ranged attacks. Unless firing a Pistol, subtract 1 from the Hit roll. Snap shots retain their fixed Hit requirement.');
    add('Fortification',[['Movement','opponent','during']],'A Battle-shocked enemy falling back from only your Fortifications takes Desperate Escape tests only for models moving over enemy models.');break;
   case 'Daemon Prince of Nurgle with Wings':
    add('Horrifying Visage',[charge],'After this Prince ends a Charge move, choose one engaged enemy unit. It must test Battle-shock at −1.');
    add('Enfeebling Miasma',[['Movement','opponent','during']],'When an enemy unit within 6″ is selected to Fall Back, its models must take Desperate Escape tests unless it is a Monster or Vehicle unit. A Battle-shocked unit subtracts 1 from each test.');break;
   case 'Icon Bearer':
    led('Unclean Icon',eachPhase,'While the Icon Bearer leads this formation, its models gain 1 Objective Control.');
    add('Blessed Icon of Disease',PHASES.map(p=>[p,'either','start']),'Once per battle at the start of any phase, choose one Battle-shocked friendly Death Guard unit within 12″ of this Icon Bearer. It is no longer Battle-shocked.',dg);break;
   case 'Lord of Poxes':
    led('Shroud of Disease',[incoming,incomingSnap],'While this Lord leads the formation, it can only be targeted by ranged attacks from attacking models within 18″.');break;
   case 'Foetid Bloat-drone with Heavy Blight Launcher':
    add('Explosive Blight',[shoot],'If an attack by this drone destroys an enemy unit, before removing the last enemy model roll a D6, adding 1 if that unit was Afflicted. On 5+ every enemy unit within 6″ of that model is Afflicted until your next turn starts.');break;
   case 'Rotigus':
    add('Virulent Blessing',[['Fight','either','start']],'Choose one visible enemy within 24″. For this phase, add 1 Damage when a Plague Legions model’s attack is allocated to a model in that enemy unit.',legions);
    add('Deluge of Nurgle',eachPhase,'While within 6″ of Rotigus, enemy models subtract 2″ from Move and 1 from Objective Control.');break;
   case 'Great Unclean One':
    add('Daemon Lord of Nurgle',defend,'Models in friendly Plague Legions units within 6″ of this Greater Daemon gain 1 Toughness.',legions);
    add('Nurgle’s Rot',[['Movement','own','end']],'Choose one enemy unit within 12″. Its models have −1 Toughness until your next Movement phase starts.');
    if(fitted('Doomsday bell'))add('Reverberating Summons',[fight],'Each time an enemy model is destroyed by this Great Unclean One’s Doomsday bell, you may return one destroyed Plaguebearer model to one friendly Plaguebearers unit within 12″ of the bearer.',native.filter(s=>s.unit==='Plaguebearers').map(s=>s.id));break;
   case 'Plaguebearers':
    add('Infected Outbreak',[['Command','own','end']],'At the end of your Command phase a controlled objective in range stays yours even after you leave, until your opponent’s Level of Control is higher than yours at a phase end.');break;
   case 'Plague Drones':
    add('Death’s Heads',[shoot],'After this unit shoots, mark one enemy it hit. Friendly Plague Legions units can re-roll Wound rolls against it until turn end.',legions);
    add('Death’s Heads',[['Fight','own','during']],'If these Plague Drones marked an enemy in your Shooting phase, friendly Plague Legions units can re-roll Wound rolls against it this turn.',legions);break;
   case 'Beasts of Nurgle':
    add('Grotesque Regeneration',PHASES.map(p=>[p,'either','end']),'Each wounded surviving Beast of Nurgle in this unit regains all lost wounds at each phase end.');break;
   case 'Defiler':
    add('Scuttling Walker',[move],'On Normal, Advance and Fall Back moves, the Defiler may pass through terrain and non-Titanic models. It may cross enemy Engagement Range but must finish outside it. It automatically passes Desperate Escape tests.');
    add('Barrage of Filth',[shoot],'After this Defiler shoots, select one enemy unit it hit. That unit cannot gain the Benefit of Cover until this Shooting phase ends.');break;
  }
 }
 return result;
}
