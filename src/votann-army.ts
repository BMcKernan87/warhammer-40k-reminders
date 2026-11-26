import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import type {RosterInstance} from './roster-instances';
import {knightJoinedBodyguard} from './leader-eligibility';
import {VOTANN_SHEETS} from './votann-data.generated';
import {votannHasRangedWeapon} from './votann-loadouts';

const source='https://wahapedia.ru/wh40k11ed/factions/leagues-of-votann/';
const units=new Map(VOTANN_SHEETS.map(sheet=>[sheet.unit,sheet]));
type Turn=NonNullable<GeneratedReminder['turn']>;
type Formation={id:string;members:RosterInstance[]};

export function votannArmyReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[] {
  if (army.faction!=='Leagues of Votann') return [];
  const native=roster.filter(s=>units.has(s.unit));
  const roots=new Map(native.map(s=>[s.id,knightJoinedBodyguard(army,s)?.id]));
  const formations:Formation[]=native.filter(s=>!roots.get(s.id)).map(root=>({
    id:root.id,members:[root,...native.filter(member=>roots.get(member.id)===root.id)],
  }));
  if (!formations.length) return [];
  const has=(f:Formation,tag:string)=>f.members.some(s=>s.unit.toUpperCase()===tag||units.get(s.unit)?.keywords?.includes(tag));
  const chosen=(name:string)=>army.detachments2026?.includes(name);
  const shots=formations.filter(f=>f.members.some(votannHasRangedWeapon));
  const out:GeneratedReminder[]=[];
  function add(key:string,title:string,window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],
    summary:string,targets=formations,origin:GeneratedReminder['origin']='army') {
    if (targets.length) out.push({id:['11e-votann',key,window,turn].join(':'),title,window,turn,timing,summary,
      units:targets.map(f=>f.id),source,origin});
  }
  function attack(key:string,title:string,summary:string,targets=formations,origin:GeneratedReminder['origin']='army',snap=true) {
    const shooters=targets.filter(f=>shots.includes(f));
    add(key,title,'Shooting','own','during',summary,shooters,origin);
    if(snap)add(key,title,'Movement','opponent','end','If this unit makes eligible snap shots, '+summary,shooters,origin);
    add(key,title,'Fight','either','during',summary,targets,origin);
  }
  const mercenary=chosen('Mercenary Oathband');
  add('opening','Prioritised Efficiency · opening stance','Pre-battle','either','end',
    'Begin the battle with Hostile Acquisition. '+(mercenary?'The stance changes only when you use Ruthless Reinvestment.':'Keep this opening stance until the start of your first Command phase.'));
  add('earn','Prioritised Efficiency · gain Yield points','Command','either','end',
    'Gain 1 YP for holding an objective in your deployment zone. From round two, add 1 each for holding an objective outside it, holding at least two outside it, and holding more objectives than your opponent. Resolve this income before choosing your stance in your turn. Spend only available YP.');
  add('stance',mercenary?'Ruthless Reinvestment · optional stance change':'Prioritised Efficiency · determine stance','Command','own','end',
    mercenary?'After gaining Yield points, you may pay 3 YP to switch between Hostile Acquisition and Fortify Takeover. Otherwise keep your current stance.':
      'After gaining Yield points, use Hostile Acquisition on 0–6 YP or Fortify Takeover on 7+ YP, until your next Command phase starts.',
    formations,mercenary?'detachment':'army');
  add('advance','Hostile Acquisition · Advance','Movement','own','during','While this stance is active, you may re-roll this unit’s Advance roll.');
  add('charge','Hostile Acquisition · charge','Charge','own','during','While this stance is active, you may re-roll this unit’s Charge roll.');
  attack('hit','Prioritised Efficiency · attack modifier',
    'In Hostile Acquisition, add 1 to Hit when the enemy is in range of an objective. In Fortify Takeover, add 1 to Hit when the attacking unit is in range of a friendly-controlled objective.',formations,'army',false);
  const defenders=formations.filter(f=>!has(f,'VEHICLE'));
  const fortify='While Fortify Takeover is active, subtract 1 from the enemy’s Wound roll against this non-Vehicle unit if the attack’s Strength exceeds its Toughness.';
  add('fortify','Fortify Takeover · defend','Shooting','opponent','during',fortify,defenders);
  add('fortify','Fortify Takeover · defend','Movement','own','end','Against enemy snap shots: '+fortify,defenders);
  add('fortify','Fortify Takeover · defend','Fight','either','during',fortify,defenders);
  if (chosen('Hearthband')) {
    const improved=formations.filter(f=>['KÂHL','ÛTHAR THE DESTINED','EINHYR HEARTHGUARD'].some(tag=>has(f,tag)));
    attack('methodical','Methodical Annihilation','Against the closest eligible target or a target within engagement of the attacker’s unit, re-roll Wound rolls of 1.',formations,'detachment');
    attack('methodical-ap','Methodical Annihilation · improved AP','Against the closest eligible target or one within engagement of the attacker’s unit, improve AP by 1.',improved,'detachment');
  }
  if (chosen('Needgaârd Oathband')) {
    for (const phase of ['Command','Movement','Shooting','Charge','Fight'] as const)
      add('leverage','Martial Leverage · enemy destroyed',phase,'either','during','Whenever an enemy unit is destroyed, gain 1 YP.',formations,'detachment');
  }
  if (chosen('Persecution Prospect')) add('guerrilla','Guerrilla Adepts','Shooting','own','during',
    'When selecting a unit to shoot, you may commit all its attacks to one eligible enemy other than a Monster or Vehicle. A hit makes that target assailed until your next Shooting phase starts. If already assailed, it is also pinned for that duration (−2″ Move and −2 to Charge rolls).',shots,'detachment');
  if (chosen('Dêlve Assault Shift')) add('fury','Fury From the Dêlve','Pre-battle','either','during',
    'Beserks gain Battleline and Deep Strike. A joined formation can use Deep Strike only when every model qualifies.',formations.filter(f=>has(f,'CTHONIAN BESERKS')),'detachment');
  if (chosen('Brandfast Oathband')) {
    const carriers=formations.filter(f=>has(f,'TRANSPORT'));
    const infantry=shots.filter(f=>has(f,'INFANTRY'));
    if (carriers.length)
      add('relay','Firebase Control · Sustained Hits 1','Shooting','own','during',
        'While a friendly Votann Infantry unit is wholly within 6″ of a friendly Transport, its ranged weapons gain Sustained Hits 1. Transports in this army: '+carriers.map(f=>f.id).join(', ')+'.',infantry,'detachment');
  }
  if (chosen('Hearthfyre Arsenal')) {
    add('optimal-yield','Optimal Application · objective income','Command','own','end',
      'Gain 1 YP for each controlled objective outside your deployment zone with at least one of the named Iron-master or Strategist models in range. Gain at most 2 YP this way per turn.',
      formations.filter(f=>f.members.some(s=>['Brôkhyr Iron-master','Memnyr Strategist'].includes(s.unit))),'detachment');
    add('optimal-fire','Optimal Application · targeted fire','Shooting','own','during',
      'When this unit is selected to shoot, you may pay 1 YP to re-roll Hit rolls of 1 for the phase.',
      shots.filter(f=>['BRÔKHYR','IRONKIN STEELJACKS','ARKANYST EVALUATOR'].some(tag=>has(f,tag))),'detachment');
  }
  if (chosen('Armoured Trailblazers')) add('spearhead','Sagitaur Spearhead · Scouts 6″','Pre-battle','either','during',
    'During pre-battle abilities, this Sagitaur can make a Scout move up to 6″ if it starts wholly in your deployment zone. End more than 8″ horizontally from enemy models.',
    formations.filter(f=>has(f,'SAGITAUR')),'detachment');
  for (const [phase,turn] of [['Shooting','own'],['Movement','opponent']] as const) {
    const timing=phase==='Movement'?'end':'during';
    if (phase==='Shooting'&&chosen('Farseekers')) add('hunt','Eye of the Hunt',phase,turn,timing,'Add 1 to Hit on ranged attacks targeting an enemy within 12″.',
      shots.filter(f=>has(f,'HERNKYN')),'detachment');
    if (chosen('Hearthguard Covenant')) add('avatars','Avatars of the Ancestors',phase,turn,timing,
      'Re-roll ranged Wound rolls of 1 against targets within 9″.',shots.filter(f=>['KÂHL','EINHYR CHAMPION','EINHYR HEARTHGUARD','ÛTHAR THE DESTINED'].some(tag=>has(f,tag))),'detachment');
  }
  return out;
}
