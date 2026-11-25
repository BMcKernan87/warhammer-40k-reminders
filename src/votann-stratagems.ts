import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {knightWeaponCount} from './knight-loadouts';
import {knightJoinedBodyguard} from './leader-eligibility';
import {expandRoster,type RosterInstance} from './roster-instances';
import {VOTANN_SHEETS} from './votann-data.generated';
import {VOTANN_STRATAGEMS} from './votann-detachments.generated';
import {votannHasRangedWeapon} from './votann-loadouts';
import {votannCargoOption} from './votann-transports';

type StratagemId=typeof VOTANN_STRATAGEMS[number]['id'];
const source='https://wahapedia.ru/wh40k11ed/factions/leagues-of-votann/';
const sheets=new Map(VOTANN_SHEETS.map(s=>[s.unit,s]));
const fury='Before shooting, add 1 Strength to this unit’s ranged attacks this phase. Spend 1 YP to give them Sustained Hits 1 as well.';
const fallBack='Immediately after this unit Falls Back, it can still shoot and declare a charge this turn.';
const pileIn='Before this unit fights, it may pile in or consolidate up to 6″ this phase.';
const defensiveCrests='After the enemy selects this unit as a target, its models have a 4+ invulnerable save for the phase.';
const effects:Record<StratagemId,string>={
 '000011057004':'When the Sagitaur is targeted, ranged attacks whose Strength exceeds its Toughness suffer −1 to Wound.',
 '000011057002':'Choose up to two Sagitaurs and one enemy. Both vehicles can re-roll Hit and Wound rolls of 1 with ranged attacks into that enemy.',
 '000011057003':'In battle round 2 or later, choose up to two Sagitaurs in Strategic Reserves. Each may make an ingress move.',
 '000010448003':'Before this Hekaton moves, it can pass horizontally through terrain during a Normal move or Advance this phase.',
 '000010448005':'This unit can shoot this phase even if it Fell Back this turn.',
 '000010448007':'After enemy shooting hits friendly Infantry, a supporting vehicle within 6″ can shoot back at that enemy if it is an eligible target.',
 '000010448006':'With Hostile Acquisition active, after enemy shooting hits this vehicle, it can make a Normal move up to D6″.',
 '000010448002':'Disembark one embarked unit wholly within 6″ of its transport. It may otherwise act normally this turn but cannot charge.',
 '000010448004':'After a vehicle shoots, pick one enemy it hit. Friendly Infantry models re-roll ranged Hit rolls of 1 into that enemy for the rest of the phase.',
 '000010444002':'Before the Beserks fight, their attacks may re-roll Wound rolls of 1 this phase. Spend 2 YP to re-roll any Wound roll instead.',
 '000010444006':'With Hostile Acquisition active, when enemy shooting targets this Infantry unit, attacks against it suffer −1 to Wound through the end of the phase.',
 '000010444005':'After the Earthshakers shoot, an enemy they hit loses 2″ Move until your next Shooting phase starts. Spend 2 YP to also subtract 2 from its Charge rolls.',
 '000010444003':pileIn,
 '000010444007':'Move one unengaged eligible unit from the battlefield into Strategic Reserves.',
 '000010444004':'Before moving, spend up to 2 YP. Each YP adds 1″ Move this turn. The Beserks may also charge this turn after Advancing, including when you spend no YP.',
 '000011061003':'When this Hernkyn unit is selected to shoot, give its ranged attacks Lethal Hits.',
 '000011061004':'After an enemy finishes a move within 8″ of these unengaged Pioneers, they may make a Normal move of up to D3+3″.',
 '000011061002':'Choose an enemy visible to this Hernkyn unit and within 12″ of it. Friendly Leagues of Votann attacks into that enemy gain Ignores Cover.',
 '000009824002':defensiveCrests,
 '000009824007':fury,
 '000009824004':'Before this unit fights, its attacks into Monsters and Vehicles gain 1 Damage for the phase.',
 '000009824006':'In the Move Units step, a unit in reserves using Deep Strike may arrive more than 6″ horizontally from every enemy. It cannot charge this turn.',
 '000009824003':pileIn,
 '000009824005':fallBack,
 '000010452005':'After these Steeljacks finish charging, choose an engaged enemy other than a Monster or Vehicle. Roll a D6 per friendly model in the unit, adding two dice for 2 YP. Each 4+ inflicts a mortal wound, to a maximum of six.',
 '000010452002':'Before the Thunderkyn shoot, ignore any combination of modifiers to Ballistic Skill, Hit rolls, Wound rolls and AP on their attacks this phase.',
 '000010452007':'These Steeljacks can make a Normal move that ends as close as possible to the nearest objective marker.',
 '000010452003':'After this unit shoots, it can make a Normal move if it Remained Stationary in your Movement phase this turn.',
 '000010452006':'After an enemy Falls Back, the unit may shoot at that enemy if it is an eligible target. Apply −1 to Hit to these attacks.',
 '000010452004':'After shooting, choose a non-Monster, non-Vehicle enemy the unit hit. Until your next Shooting phase starts, roll one die per enemy model each time that unit moves normally, Advances or Falls Back. Each 1 causes a mortal wound, up to six per move.',
 '000011065004':'When these Hearthguard use Deep Strike for an ingress move, set them up more than 6″ horizontally from every enemy, including in the enemy deployment zone. They cannot charge this turn.',
 '000011065002':'When the enemy targets these Hearthguard, their models have a 4+ invulnerable save against the incoming attacks.',
 '000011065003':'When these Hearthguard are selected to shoot, their ranged attacks gain 1 Strength. Spend 1 YP to add Sustained Hits 1.',
 '000010709004':fallBack,
 '000010709002':'Before the unit is selected to shoot or fight, give its weapons Precision for this phase.',
 '000010709006':'An unengaged Infantry unit wholly within 6″ of a transport it fits in may embark.',
 '000010709007':'Place one unengaged Hernkyn unit into Strategic Reserves, or spend 2 YP to choose up to two such units.',
 '000010709003':'Before this Infantry unit fights, re-roll Hit and Wound rolls of 1 this phase. Spend 3 YP to re-roll any Wound roll while retaining the Hit re-rolls of 1.',
 '000010709005':'Before this Infantry unit shoots, re-roll Hit and Wound rolls of 1 this phase. Spend 3 YP to re-roll any Hit roll while retaining the Wound re-rolls of 1.',
 '000010436006':'Before this unit shoots, its attacks may re-roll Hit and Wound rolls of 1 for the phase.',
 '000010436005':'Before this unit shoots, give its ranged weapons Sustained Hits 1 for the phase, or spend 3 YP for Sustained Hits 2.',
 '000010436003':'Before this unit fights, select one engaged enemy. Improve melee AP against it by 1 this phase, or spend 3 YP to improve it by 2.',
 '000010436004':fallBack,
 '000010436007':'With Fortify Takeover active, after enemy shooting targets this unit, it may shoot back at the attacking unit if that enemy is an eligible target.',
 '000010436002':'With Fortify Takeover active, after enemy target selection, worsen incoming AP by 1 for the duration of that enemy unit’s attacks.',
 '000010440003':'Before moving, choose this Hernkyn unit. If it Advances this phase, replace its Advance roll with +6″ to its Move.',
 '000010440004':'Before the Hernkyn unit shoots, its attacks may re-roll Wound rolls against assailed targets this phase. Spend 2 YP to re-roll them against any target.',
 '000010440005':'Before shooting, attacks may re-roll Hit rolls against assailed targets this phase. A Hernkyn unit can use those re-rolls against any target.',
 '000010440007':'After enemy target selection, the unit gains Stealth and its models gain cover against ranged attacks for the phase.',
 '000010440006':'After an enemy ends a Normal move, Advance or Fall Back within 8″ of the unit, it can make a Normal move up to D6″, or up to 6″ for 2 YP. It cannot embark as part of this move.',
 '000010440002':'With Fortify Takeover active, spend any number of YP. If 6 YP or fewer remain, your army uses Hostile Acquisition instead until your next turn starts.',
};

export function votannFormationHasDeepStrike(army:ArmySelection,members:readonly RosterInstance[]):boolean {
 if(army.faction!=='Leagues of Votann')return false;
 return members.some(s=>{
  if(s.unit==='Cthonian Beserks'&&army.detachments2026?.includes('Dêlve Assault Shift'))return true;
  const upgrade=army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit];
  if((s.unit==='Brôkhyr Iron-master'||s.unit==='Memnyr Strategist')&&army.detachments2026?.includes('Hearthfyre Arsenal')&&upgrade==='Fârstrydr Node')return true;
  if(!knightWeaponCount(s,'Teleport Crest'))return false;
  if(s.unit==='Einhyr Hearthguard')return true;
  if(s.unit!=='Kâhl'&&s.unit!=='Einhyr Champion')return false;
  const bodyguard=knightJoinedBodyguard(army,s);
  return !!bodyguard&&members.some(m=>m.id===bodyguard.id);
 });
}

const shootingRequired=new Set<StratagemId>([
 '000011057002','000010448005','000010448004','000010444005','000011061003','000009824007',
 '000010452002','000010452003','000010452004','000010452006','000011065003','000010709005',
 '000010436006','000010436005','000010436007','000010440004','000010440005',
]);
const displayName=(s:string)=>s.toLowerCase().replace(/(^|[\s-])\p{L}/gu,letter=>letter.toUpperCase());
export function votannStratagemReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Leagues of Votann')return [];
 const native=roster.filter(s=>sheets.has(s.unit));
 const groups=new Map<string,RosterInstance[]>();
 for(const squad of native){
  const root=knightJoinedBodyguard(army,squad)?.id??squad.id;
  groups.set(root,[...(groups.get(root)??[]),squad]);
 }
 const formations=[...groups].map(([id,members])=>({
  root:members.find(s=>s.id===id)!,members,
  ranged:members.some(votannHasRangedWeapon),
  deepStrike:votannFormationHasDeepStrike(army,members),
  tags:new Set(members.flatMap(s=>sheets.get(s.unit)?.keywords??[])),
 }));
 type Formation=typeof formations[number];
 const rangedInfantry=formations.filter(f=>f.members.some(s=>sheets.get(s.unit)?.keywords?.includes('INFANTRY')&&votannHasRangedWeapon(s)));
 const returnFire=formations.filter(f=>f.ranged&&['Sagitaur','Kapricus Defenders','Kapricus Carrier','Hekaton Land Fortress'].includes(f.root.unit));
 const transports=formations.filter(f=>f.tags.has('TRANSPORT'));
 const cargoOptions=transports.flatMap(carrier=>formations.flatMap(passenger=>{
  if(carrier===passenger)return [];
  const fit=votannCargoOption(army,carrier.root,passenger.root);
  return fit?[{carrier,passenger,split:fit.split}]:[];
 }));
 const recipientIds=(list:readonly Formation[])=>list.map(f=>f.root.id);
 const arrival=formations.filter(f=>f.deepStrike);
 const result:GeneratedReminder[]=[];
 if(arrival.length)result.push({
  id:'11e-votann-deep-strike-ingress',title:'Deep Strike · ingress',window:'Movement',turn:'own',timing:'during',
  summary:'When making an ingress move, these formations can set up anywhere more than 8″ horizontally from every enemy, including within the enemy deployment zone.',
  source:'https://wahapedia.ru/wh40k11ed/the-rules/core-rules/#Deep-Strike',origin:'unit',units:recipientIds(arrival),
 });
 function eligible(id:StratagemId,f:Formation,phase:ReminderWindow){
  if(shootingRequired.has(id)&&!f.ranged)return false;
  switch(id){
   case '000010709002':return phase!=='Shooting'||f.ranged;
   case '000009824006':case '000011065004':return f.deepStrike;
   case '000010448007':return returnFire.length>0;
   case '000010448004':return rangedInfantry.length>0;
   case '000010448002':return cargoOptions.some(x=>x.carrier===f);
   case '000010709006':return cargoOptions.some(x=>x.passenger===f);
   case '000010440006':return !f.tags.has('VEHICLE')&&!f.tags.has('ARTILLERY');
   default:return true;
  }
 }
 function context(id:StratagemId,targets:readonly Formation[]){
  if(id==='000010448007'){
   const regular=returnFire.filter(f=>f.root.unit!=='Hekaton Land Fortress');
   const hekatons=returnFire.filter(f=>f.root.unit==='Hekaton Land Fortress');
   const choices=[regular.length?'Choose '+recipientIds(regular).join(' or '):'',hekatons.length?'spend 2 YP to choose '+recipientIds(hekatons).join(' or '):''].filter(Boolean);
   return ' '+choices.join(', or ')+'.';
  }
  if(id==='000010448004')return ' Eligible supporting units include '+recipientIds(rangedInfantry).join(', ')+'.';
  if(id==='000010448002'||id==='000010709006'){
   const pairs=cargoOptions.filter(x=>targets.includes(id==='000010448002'?x.carrier:x.passenger));
   return ' Eligible pairs include '+pairs.map(({passenger,carrier,split})=>passenger.root.id+(split?' (split half)':'')+' and '+carrier.root.id).join('. ')+'.';
  }
  return '';
 }
 for(const strat of VOTANN_STRATAGEMS){
  if(!army.detachments2026?.includes(strat.detachment))continue;
  const options=new Set<string>(strat.units);
  const possible=formations.filter(f=>f.members.some(s=>options.has(s.unit)));
  for(const {phase,turn} of strat.windows){
   const targets=possible.filter(f=>eligible(strat.id,f,phase));
   if(!targets.length)continue;
   result.push({
    id:'11e-votann-strat-'+strat.id+'-'+phase,sourceRuleId:strat.id,title:displayName(strat.name)+' · '+strat.cp+'CP',
    window:phase,turn,timing:strat.timing,summary:effects[strat.id]+context(strat.id,targets),
    units:recipientIds(targets),source,origin:'detachment',
   });
  }
 }
 return result;
}
