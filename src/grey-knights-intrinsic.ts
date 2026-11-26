import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {greyKnightsFormationHasDeepStrike} from './gk-datasheet-core';
import {GREY_KNIGHTS_SHEETS,greyKnightsKeywords,greyKnightsMusterUnits} from './grey-knights-data';
import {GREY_KNIGHTS_REVISION} from './grey-knights-data.generated';
import {greyKnightsHasRangedWeapon,greyKnightsWeaponCount} from './grey-knights-loadouts';
import {greyKnightsCargoFormations,greyKnightsFormations} from './grey-knights-transports';
import {expandRoster,type RosterInstance} from './roster-instances';

type Step=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing'],GeneratedReminder['timing']?];
const shoot:Step=['Shooting','own','during'],fight:Step=['Fight','either','during'],move:Step=['Movement','own','during'];
const snap:Step=['Movement','opponent','end'],incoming:Step=['Shooting','opponent','during'];
// Passive defenses apply to normal arrivals/reactions throughout both Movement
// phases. Preserve the old own-Movement/end completion identity.
const incomingMove:Step=['Movement','own','during','end'],incomingArrival:Step=['Movement','opponent','during'];
const rangedDefence=[incoming,incomingMove,shoot,incomingArrival],defence=[incoming,incomingMove,fight,shoot,incomingArrival];
const charge:Step=['Charge','either','during'],eachPhase=PHASES.map((p):Step=>[p,'either','during']);
const cards=new Map(GREY_KNIGHTS_SHEETS.map(s=>[s.unit,s]));
const unique=(ids:string[])=>[...new Set(ids)];

export function greyKnightsIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Grey Knights')return [];
 const legal=new Set(greyKnightsMusterUnits(army)),native=roster.filter(s=>cards.has(s.unit)&&legal.has(s.unit));
 if(!native.length)return [];
 const groups=greyKnightsFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit)));
 const groupOf=(s:RosterInstance)=>groups.find(g=>g.members.some(m=>m.id===s.id));
 const declared=expandRoster(army),originalGroups=greyKnightsFormations(army,declared);
 const sameMember=(start:RosterInstance,current:RosterInstance)=>start.id===current.id&&start.unit===current.unit&&start.attachedTo===current.attachedTo&&start.retinueTo===current.retinueTo&&Boolean(start.keepUnattached)===Boolean(current.keepUnattached);
 function defensiveFormation(s:RosterInstance){
  const original=originalGroups.find(g=>g.members.some(m=>sameMember(m,s)));
  if(!original||original.root.attachedTo||original.root.retinueTo)return;
  if(original.members.some(m=>!legal.has(m.unit)||(m.models??1)<=0||m.retinueTo||(m.attachedTo&&m.keepUnattached)||declared.filter(d=>d.id===m.id).length!==1))return;
  const ids=new Set(original.members.map(m=>m.id)),survivors:RosterInstance[]=[];
  // An invalid original join must not turn into a valid standalone source just
  // because formation resolution rejected that join or the Bodyguard died.
  if(declared.some(m=>!ids.has(m.id)&&(ids.has(m.attachedTo??'')||ids.has(m.retinueTo??''))))return;
  for(const member of original.members){
   const current=roster.filter(m=>m.id===member.id);
   if(current.length>1)return;
   const live=current[0];
   if(!live)continue;
   if(!sameMember(member,live))return;
   if((live.models??1)>0)survivors.push(live);
  }
  if(!survivors.some(m=>m.id===s.id)||roster.some(m=>!ids.has(m.id)&&(ids.has(m.attachedTo??'')||ids.has(m.retinueTo??''))))return;
  return {survivors,leading:original.root.id!==s.id,bodyguardSurvives:survivors.some(m=>m.id===original.root.id)};
 }
 const vehicles=native.filter(s=>greyKnightsKeywords(army,s).has('VEHICLE')).map(s=>s.id);
 const defensiveVehicles=native.filter(s=>greyKnightsKeywords(army,s).has('VEHICLE')&&defensiveFormation(s)).map(s=>s.id);
 const gk=groups.filter(g=>g.members.some(s=>cards.has(s.unit))).map(g=>g.root.id);
 const gunners=native.filter(greyKnightsHasRangedWeapon).map(s=>s.id);
 const result:GeneratedReminder[]=[];
 function emit(key:string,title:string,steps:readonly Step[],summary:string,units:string[],source:string){
  if(units.length)for(const [window,turn,timing,identityTiming=timing] of steps)result.push({id:['11e-gk-card',key,title,window,turn,identityTiming].join(':'),title,window,turn,timing,summary,units:unique(units),source,origin:'unit'});
 }
 const masters=native.filter(s=>s.unit==='Grand Master'||s.unit==='Grand Master In Nemesis Dreadknight');
 if(masters.length)emit('grand-masters','Warrior Strategist',eachPhase,'Once per battle round across these Grand Masters, when one of their own units is targeted by a Stratagem, one Grand Master can reduce the cost of that use by 1CP.',masters.flatMap(s=>[s.id,groupOf(s)?.root.id??s.id]),cards.get(masters[0].unit)!.source);
 for(const squad of native){
  const {id,unit}=squad,group=groupOf(squad);if(!group)continue;
  const formation=group.members.map(m=>m.id),leading=group.root.id!==id,hasGun=greyKnightsHasRangedWeapon(squad);
  const fidelity=army.detachments2026?.includes('Hallowed Conclave')&&greyKnightsKeywords(army,squad).has('INFANTRY')&&hasGun;
  const fitted=(name:string)=>greyKnightsWeaponCount(squad,name)>0;
  function add(title:string,steps:readonly Step[],summary:string,targets=[id],source=cards.get(unit)!.source){
   if(targets.length)emit(id,title,steps,summary,[id,...targets],source);
  }
  const led=(title:string,steps:readonly Step[],summary:string)=>{if(leading)add(title,steps,summary,formation);};
  const ledDefence=(title:string,steps:readonly Step[],summary:string)=>{
   const original=defensiveFormation(squad);
   if(original?.leading)add(title,steps,summary+' The original Librarian must survive; if it is destroyed by an attack, retain this benefit until that attacking unit finishes its attacks.'+(original.bodyguardSurvives?'':' This surviving original Leader retains its own leading benefit after its Bodyguard is destroyed.'),original.survivors.map(m=>m.id));
  };
  const lastShots=(title:string,summary:string,targets=[id])=>{if(fidelity)add(title,[incoming],'Only if destroyed models in this formation qualify to shoot after the attacker through Unending Fidelity: '+summary,targets);};
  if(fitted("Ancient's banner"))add('Ancient’s Banner',eachPhase,'While the Ancient’s Banner bearer survives, models in its formation gain 1 Objective Control.',formation);
  if(fitted("Apothecary's narthecium"))add('Apothecary’s Narthecium',[['Command','own','during']],'If the Narthecium bearer is alive, return one destroyed non-Character model to its formation in your Command phase.',formation);
  switch(unit){
   case 'Grand Master Voldus':{
    const protectedFormation=defensiveFormation(squad)?.survivors.map(m=>m.id);
    if(protectedFormation){
     const lifetime=' Voldus must survive; if destroyed by an attack, retain this benefit until that attacking unit finishes its attacks.';
     add('Sanctuary',rangedDefence,'Voldus’s unit has Stealth. Models in the whole formation receive the Benefit of Cover against ranged attacks.'+lifetime,protectedFormation,GREY_KNIGHTS_REVISION.pack+'#page=10');
     add('Sanctuary',[fight],'Subtract 1 from the Hit roll of each melee attack targeting Voldus’s formation.'+lifetime,protectedFormation,GREY_KNIGHTS_REVISION.pack+'#page=10');
    }
    add('Hammer Aflame',[fight],'When this formation is selected to fight, choose one enemy unit engaged with it. Roll one D6. On 2–3 it suffers one mortal wound, on 4–5 it suffers D3, and on 6 it suffers D3+3.',formation);break;
   }
   case 'Grand Master':
    add('Might of Titan',[['Fight','either','start']],'Once per battle at Fight phase start, add 3 to the Grand Master model’s melee Attacks and Strength for this phase.');break;
   case 'Brother-captain':
    led('Hammerhand',[fight],'While the Brother-captain leads this formation, its melee weapons have Lethal Hits. Critical Hits automatically wound.');
    lastShots('Eye of Judgement','the Brother-captain may re-roll Wound rolls for its own attacks.');
    add('Eye of Judgement',hasGun?[shoot,snap,fight]:[fight],'This Brother-captain may re-roll Wound rolls for its own attacks.');break;
   case 'Brotherhood Champion':
    led('Clarion of Haste',[move,['Charge','own','during']],'While the Champion leads this formation, it may declare a charge in a turn when it Advanced.');
    add('Inspiring Exemplar',[fight],'Each time the Champion itself destroys an enemy Character model in the Fight phase, gain 1CP and give its Nemesis force weapon one additional Attack for the rest of the battle.');break;
   case 'Castellan Crowe':{
    if(leading){
     const flames=group.members.filter(m=>greyKnightsWeaponCount(m,'Purifying Flame')>0);
     add('Champion of the Order of Purifiers',[shoot,snap],'While Crowe leads this formation, add 1 Attack to each Purifying Flame weapon: '+flames.map(m=>m.id+' ('+greyKnightsWeaponCount(m,'Purifying Flame')+')').join(', ')+'.',flames.map(m=>m.id));
     lastShots('Champion of the Order of Purifiers','while Crowe’s leading benefit applies, add 1 Attack to the Purifying Flame weapon of each qualifying destroyed model; only that model shoots.',flames.map(m=>m.id));
    }
    lastShots('Foresight','Crowe may re-roll his own Hit rolls against a Character unit. These are normal attacks; the snap-shooting Hit-roll restrictions do not apply.');
    add('Foresight',hasGun?[shoot,fight]:[fight],'Crowe may re-roll Hit rolls for his own attacks against a Character unit.');break;
   }
   case 'Strike Squad':
    add('Sanctifying Ritual',[['Command','own','end']],'If this formation is within range of an objective you control, it remains yours after you leave until the opponent’s Level of Control is higher than yours at a phase end.',formation);break;
   case 'Brotherhood Terminator Squad':
    add('Force Edge',[fight],'Improve AP by 1 for melee attacks made by any model in this formation against an enemy that is neither a Monster nor a Vehicle.',formation);break;
   case 'Purifier Squad':
    lastShots('Sanctity of Purpose','those Purifier formation models re-roll Wound rolls of 1, or may re-roll all Wound rolls against a target within range of an objective marker.',formation);
    add('Sanctity of Purpose',[shoot,snap,fight],'Models in the formation re-roll Wound rolls of 1. If the target is within range of an objective marker, they may instead re-roll the Wound roll.',formation);break;
   case 'Paladin Squad':
    add('Attuned Onslaught',[charge,fight],'If this formation charged this turn, add 1 Damage to the melee weapons of its Paladin Squad models until the turn ends. This applies to the squad’s own models.');break;
   case 'Interceptor Squad':{
    const echo=army.detachments2026?.includes('Immaterial Interdiction');
    add('Personal Teleporters',[shoot],'After shooting in your Shooting phase, if this formation is unengaged, it may make a Normal move of up to 6″. If it does, it cannot declare a charge this turn.'+(echo?' A unit using Echojump cannot also use Personal Teleporters.':''),formation);
    add('Personal Teleporters',[['Charge','own','during']],'If this formation moved using Personal Teleporters in your Shooting phase, it cannot declare a charge this turn.',formation);break;
   }
   case 'Purgation Squad':
    add('Righteous Persecution',[shoot],'After shooting, select one enemy unit this formation hit that is neither a Monster nor a Vehicle. It is pinned until your next turn starts, giving its models −2″ Move and the unit −2 to Charge rolls.',formation);
    add('Righteous Persecution',[['Movement','opponent','during'],['Charge','opponent','during']],'The enemy pinned by this formation has −2″ Move and −2 to Charge rolls until your next turn starts.',formation);break;
   case 'Nemesis Dreadknight':
    add('Indomitable Spirit',hasGun?[move,shoot,['Charge','own','during']]:[move,['Charge','own','during']],'If this Dreadknight Advanced or Fell Back this turn, it remains eligible to '+(hasGun?'shoot and declare a charge.':'declare a charge.'));break;
   case 'Land Raider':case 'Land Raider Crusader':case 'Land Raider Redeemer':case 'Grey Knights Thunderhawk Gunship':{
    const aerial=unit==='Grey Knights Thunderhawk Gunship';
    const cargo=greyKnightsCargoFormations(army,squad,roster).filter(g=>!aerial||greyKnightsFormationHasDeepStrike(army,g.members)).map(g=>g.root.id);
    const title=aerial?'Aerial Assault':'Assault Ramp';
    add(title,[move],'After this transport makes a Normal move, '+(aerial?'a passenger formation with Deep Strike':'a passenger formation')+' may disembark wholly within 3″ and outside enemy Engagement Range and remain eligible to charge.',cargo);
    add(title,[['Charge','own','during']],(aerial?'A Deep Strike passenger formation':'Passengers')+' that disembarked from this transport after its Normal move can declare a charge this turn.',cargo);
    if(aerial&&fitted('Thunderhawk cluster bombs'))add('Thunderhawk Cluster Bombs',[move],'After this Thunderhawk ends a Normal move, you may pick one enemy unit it moved over. Roll six D6. Each 3+ deals one mortal wound.');
    break;
   }
   case 'Razorback':{
    const cargo=greyKnightsCargoFormations(army,squad,roster).map(g=>g.root.id);
    add('Fire Focus',[shoot],'After this Razorback shoots, mark an enemy unit it hit. Until the turn ends, models that disembarked from this particular Razorback this turn improve AP by 1 on attacks against that enemy. Each enemy can be affected once per turn.',cargo);
    add('Fire Focus',[['Fight','own','during']],'Models that disembarked from this Razorback this turn improve melee AP by 1 against the enemy marked by that vehicle’s Fire Focus.',cargo);break;
   }
   case 'Rhino':
    add('Truesilver Aegis',eachPhase,'Models in a friendly Grey Knights unit wholly within 6″ of this Rhino have Feel No Pain 6+ against mortal wounds.',gk);break;
   case 'Stormraven Gunship':
    if(defensiveFormation(squad))add('Armoured Resilience',defence,'Each time an attack is allocated to this Stormraven model, subtract 1 from that attack’s Damage. This personal protection does not extend to other models or its passengers.');break;
   case 'Brotherhood Techmarine':
    if(defensiveFormation(squad))add('Techmarine',rangedDefence,'While this surviving Techmarine model is within 3″ of a friendly Grey Knights Vehicle unit with a surviving model, only the Techmarine has Lone Operative; this does not grant it to Bodyguard or other attached models. The targeting protection becomes active only when every surviving model in its formation has Lone Operative, including after its Bodyguard is destroyed. Enemy models outside 12″ cannot see the protected unit or target it with Indirect Fire. Eligible nearby Vehicle candidates: '+defensiveVehicles.join(', ')+'.',defensiveVehicles);
    add('Blessing of the Omnissiah',[['Command','own','during']],'Select one friendly Grey Knights Vehicle model within 3″ of this Techmarine. It regains up to D3 lost wounds and adds 1 to its attack Hit rolls until your next Command phase starts. Each model may be selected once per turn.',vehicles);
    add('Blessing of the Omnissiah',[shoot,fight],'A Vehicle model blessed by this Techmarine adds 1 to its attack Hit rolls until your next Command phase starts.',vehicles);
    add('Guardians of the Machine',[['Charge','opponent','during']],'When an enemy ends a charge engaged with a friendly Grey Knights Vehicle and within 6″ of this Techmarine’s unit, you may target the Techmarine’s eligible unit with Heroic Intervention for 1CP less. Other units can use it before or after this use in the same phase.',vehicles.length?[...formation,...vehicles]:[]);break;
   case 'Venerable Dreadnought':
    add('Guidance of the Ancients',[shoot],'After this Dreadnought shoots in your Shooting phase, choose one enemy unit it hit. Friendly Grey Knights models add 1 to their attack Hit rolls against that unit for the rest of this phase.',gunners);break;
   case 'Grand Master In Nemesis Dreadknight':
    add('Surge of Wrath',[fight],'Against a Monster or Vehicle unit, the Grand Master in Nemesis Dreadknight may re-roll melee Hit, Wound and Damage rolls.');break;
   case 'Brotherhood Librarian':
    ledDefence('Sanctic Hood',eachPhase,'While the Librarian leads this formation, its models have Feel No Pain 4+ against Psychic Attacks, including mortal wounds caused by Psychic attacks.');
    ledDefence('Haloed in Soulfire',rangedDefence,'While the Librarian leads this formation, an attacking model can target it with a ranged attack only from within 18″.');break;
   case 'Brotherhood Chaplain':
    led('Zealous Path',[charge],'While the Chaplain leads this formation, it may re-roll Charge rolls.');
    add('Litanies of Sanctity',PHASES.map(p=>[p,'either','start']),'Once per battle at the start of any phase, choose one Battle-shocked friendly Grey Knights unit within 12″ of this Chaplain. It is no longer Battle-shocked.',gk);break;
   case 'Stormhawk Interceptor':
    add('Interceptor',[shoot],'Add 1 to this Stormhawk’s ranged attack Hit rolls against a unit that can Fly.');break;
   case 'Stormtalon Gunship':
    add('Strafing Run',[shoot],'Add 1 to this Stormtalon’s ranged attack Hit rolls against a unit that cannot Fly.');break;
  }
 }
 return result;
}
