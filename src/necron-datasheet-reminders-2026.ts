import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster, type RosterInstance} from './roster-instances';
import {BATTLEFIELD_RULES,type TriggerRule} from './necron-battlefield-rules';
import {ACTIONS,type Signal} from './battlefield-events';
import {PHASES,createBattle,type Phase} from './engine';
import {necronSource,NECRON_LOADOUTS} from './necron-wargear';

// Stable IDs keep previously saved references to the first squad working.
const existingIds:Record<string,string>={
  'obelisk-node':'geomancer-obelisk','nekrosor-aura':'nekrosor-ranged-aura','macro-mandible':'macrocytes-accelerator',crawlers:'tomb-crawlers-sentinels',geomancer:'geomancer-tectonic',
  displace:'transcendent-displacement',will:'overlord-my-will',orb:'overlord-orb',lightning:'plasmancer-lightning',
  legion:'warriors-legion','ghost-repair':'ghost-ark-repair','spyder-swarm':'spyder-swarm',gravitic:'obelisks-pulse',
  trazyn:'trazyn-hosts','command-king':'silent-king-triarch','implacable-eradication':'immortals-eradication',
  hunters:'deathmarks-hunters','thrall-fight':'cryptothralls-vigour','flesh-hunger':'flayed-flesh',
  drain:'nightbringer-drain',matter:'void-dragon-absorption',
};
const actionPhase:Partial<Record<Signal,Phase>>={
  normal:'Movement',crossed:'Movement',advance:'Movement',fallback:'Movement',stationary:'Movement',arrival:'Movement',
  shoot:'Shooting',shot:'Shooting',shotHit:'Shooting',deathRay:'Shooting',tesla:'Shooting',
  chargeRoll:'Charge',charged:'Charge',fight:'Fight',meleeCasualty:'Fight',meleeKill:'Fight',reanimate:'Command',
};
function referenceWindows(rule:TriggerRule):ReminderWindow[]{
  if(rule.id==='tunnelling')return ['End of opponent turn'];
  if(rule.id==='terror')return ['Shooting'];
  if(rule.phase)return [rule.phase];
  const signals=typeof rule.signal==='string'?[rule.signal]:rule.signal;
  if(signals.some(s=>s==='phaseStart'||s==='phaseEnd'||s==='stratagem'))return [...PHASES];
  if(signals.includes('shoot')&&signals.includes('overwatch'))return ['Shooting'];
  if(signals.includes('overwatch'))return ['Movement','Charge'];
  return [...new Set(signals.flatMap(s=>actionPhase[s]?[actionPhase[s]!]:['Shooting','Fight'] as Phase[]))];
}
const circumstances:Record<string,string>={
  hunters:'During the opponent’s Reinforcements step, after a visible enemy arrives within 18″.',
  'wraith-form':'After a Normal move over an enemy.',
  'ghost-repair':'After enemy attacks cost a Warriors squad within 3″ one or more wounds. Each Warriors squad can be selected once per turn.',
  'reanimation-beam':'When friendly Reanimation Protocols activate within 3″.',
  'macro-projector':'When friendly Reanimation Protocols activate within 3″ of the bearer.',
  'hex-return':'In the opponent’s Shooting phase, after the attacker shoots a Necrons unit within 3″.',
  'flesh-hunger':'When attacking a below-half-strength enemy in melee.',
  'crawlers':'When shooting an enemy within 12″.',
  'doomsday-shoot':'If the Ark remained stationary in your Movement phase.',
  'guardian':'While a Noble leads the unit and the attack’s Strength exceeds the unit’s Toughness.',
  'hard-wired':'When shooting the nearest eligible target.',
  'szeras':'When a Necrons Battleline unit within the augmentation aura attacks or is targeted.',
  'harassment':'When a non-Monster, non-Vehicle enemy within 3″ makes attacks.',
  'gloom':'When a friendly unit within 6″ suffers mortal wounds or a Psychic attack.',
  'chronometron':'After this unit shoots in your Shooting phase while unengaged.',
  'hatred':'Against an enemy below half-strength.',
  'monolith':'From the second battle round.',
  'nekrosor-aura':'When a friendly non-Monster, non-Titanic Necrons unit within 6″ attacks the closest eligible target or attacks with Destroyer Cult models.',
  'nodes':'When a Necrons Infantry unit within 6″ would lose a wound.',
  'fabricator':'When a Necrons Vehicle within 6″ of the bearer would lose a wound.',
  'nullstone':'When a friendly Necrons unit within 6″ suffers mortal wounds or a Psychic attack.',
  'atomic':'If Szeras destroyed one or more enemy models during this Fight phase.',
  'command-king':'At the start of the battle round.',
  'overlord':'When an attack is allocated to this model.',
  'command-shield':'When the attack’s Strength is greater than the Barge’s Toughness.',
};
function referenceText(rule:TriggerRule,squad:RosterInstance,roster:RosterInstance[]):string{
  const signals=typeof rule.signal==='string'?[rule.signal]:rule.signal;
  const trigger=signals[0];
  const intro=circumstances[rule.id]??(trigger==='phaseStart'||trigger==='phaseEnd'?'':ACTIONS[trigger]+'.');
  const side=rule.turn==='own'?'Your turn. ':rule.turn==='opponent'?'Opponent’s turn. ':'';
  const limit=rule.limit==='plasmacytes'?'One use per equipped Plasmacyte. ':rule.limit?'Once per '+rule.limit+'. ':'';
  let text=typeof rule.text==='string'?rule.text:rule.text({bearer:squad,roster,eligibleRoster:roster,battle:createBattle(),actedThisTurn:()=>false});
  if(rule.id==='optimised'){
    const selected=squad.weaponCounts?Object.entries(squad.weaponCounts).filter(([,n])=>n>0).map(([name])=>name):[squad.equipment??NECRON_LOADOUTS[squad.unit]?.primary?.[0]];
    const cues:string[]=[];
    if(selected.includes('Gauss destructor'))cues.push('Gauss destructor: re-roll Wound rolls of 1 against Monsters and Vehicles');
    if(selected.includes('Enmitic exterminator'))cues.push('Enmitic exterminator: re-roll Wound rolls of 1 against other targets');
    text=cues.join('. ')+'.';
  }
  if(rule.id==='szeras')text='Improve the Battleline unit’s outgoing AP by 1 or worsen incoming AP by 1. The aura starts at 3″.';
  if(rule.id==='atomic')text='Increase the range of Mechanical Augmentation by 3″ for the rest of the battle, up to 12″.';
  if(rule.id==='orb')text+=' Only one unit can resurrect in a turn.';
  return [side+limit+intro,text].filter(Boolean).join(' ').trim();
}
export function necronDatasheetReminders2026(army:ArmySelection):GeneratedReminder[]{
  if(army.faction!=='Necrons')return [];
  const roster=expandRoster(army);
  const output:GeneratedReminder[]=[];
  const ids=new Set<string>();
  for(const squad of roster){
    for(const rule of BATTLEFIELD_RULES){
      if(!rule.units.includes(squad.unit)||(rule.gear&&!rule.gear(squad))||(rule.scope==='leading'&&!squad.attachedTo))continue;
      if(rule.id==='guardian'&&!roster.some(leader=>leader.attachedTo===squad.id&&['Overlord','Overlord with translocation shroud','Imotekh the Stormlord','Trazyn the Infinite'].includes(leader.unit)))continue;
      const body=roster.find(s=>s.id===squad.attachedTo);
      let suffix=existingIds[rule.id]??rule.id;
      if(rule.id==='harbinger'&&body?.unit==='Immortals')suffix='plasmancer-immortals';
      if(rule.id==='rites'&&body?.unit==='Canoptek Wraiths')suffix='technomancer-wraiths';
      for(const window of referenceWindows(rule)){
        const base='11e-necron-'+(rule.id==='nekrosor-aura'&&window==='Fight'?'nekrosor-fight-aura':suffix);
        const id=ids.has(base)?base+'-'+squad.id+'-'+window:base;
        ids.add(id);
        output.push({id,title:squad.id+' · '+rule.title+(rule.scope==='leading'&&body?' → '+body.id:''),
          window,timing:rule.signal==='phaseEnd'?'end':rule.signal==='phaseStart'?'start':'during',
          summary:referenceText(rule,squad,roster),source:necronSource(squad.unit),origin:'unit',
          units:rule.scope==='leading'&&body?[squad.id,body.id]:[squad.id]});
      }
    }
  }
  for(const s of roster.filter(s=>s.unit==='Cryptothralls'&&roster.some(leader=>leader.attachedTo===s.id&&['Chronomancer','Geomancer','Orikan the Diviner','Plasmancer','Psychomancer','Technomancer'].includes(leader.unit)))){
    output.push({id:'11e-necron-cryptothralls-bound-'+s.id,title:s.id+' · Bound Creation',window:'Shooting',timing:'during',
      summary:'A Cryptek model in the same unit as these Cryptothralls has Feel No Pain 4+.',
      source:necronSource(s.unit),origin:'unit',units:[s.id]});
  }
  return output;
}
