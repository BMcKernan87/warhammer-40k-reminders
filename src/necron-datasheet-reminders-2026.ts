import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {NECRON_RETINUES,necronFormationRoots,formationBodyguardStrength,ghostArkPassengers,necronTransportFormations} from './necron-retinues';
import {CONVERGENCE_OF_DOMINION,necronBattleRoster,necronBattleFormations} from './necron-battle-units';
import {expandRoster, type RosterInstance} from './roster-instances';
import {BATTLEFIELD_RULES,type TriggerRule} from './necron-battlefield-rules';
import {weaponSummary} from './necron-weapon-cues';
import {ACTIONS,type Signal} from './battlefield-events';
import {PHASES,createBattle,type Phase} from './engine';
import {necronSource,NECRON_LOADOUTS,necronKeywords} from './necron-wargear';

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
  chargeRoll:'Charge',charged:'Charge',fight:'Fight',meleeCasualty:'Fight',meleeKill:'Fight',killed:'Fight',reanimate:'Command',
};
function referenceWindows(rule:TriggerRule):ReminderWindow[]{
  if(['macro-projector','reanimation-beam','legion','nullstone','gloom','rites','amulet','nodes','fabricator','terror'].includes(rule.id))return [...PHASES];
  if(rule.id==='command-king')return ['Start of battle round'];
  if(rule.id==='murder')return ['Shooting','Fight','Movement'];
  if(rule.id==='doomsday-still')return ['Movement'];
  if(rule.id==='tomb-shield-save')return ['Shooting','Fight'];
  if(rule.id==='tunnelling')return ['End of opponent turn'];
  if(rule.id==='warden')return ['Movement','Shooting','Charge'];
  if(rule.id==='praetorian-fallback')return ['Movement','Charge'];
  if(rule.id==='cover'||rule.id==='tomb-shadowloom')return ['Shooting'];
  if(rule.id==='harbinger'||rule.id==='lokhust-lead')return ['Shooting'];
  if(rule.id==='united')return ['Fight'];
  if(rule.id==='orikan-save')return ['Shooting','Fight'];
  if(rule.id==='will')return ['Command','Movement','Shooting','Charge','Fight'];
  if(rule.id==='orb')return ['Command','Movement','Shooting','Charge','Fight'];
  if(rule.phase)return [rule.phase];
  const signals=typeof rule.signal==='string'?[rule.signal]:rule.signal;
  if(signals.some(s=>s==='phaseStart'||s==='phaseEnd'||s==='stratagem'))return [...PHASES];
  if(signals.includes('shoot')&&signals.includes('overwatch'))return ['Shooting','Movement'];
  if(signals.includes('overwatch'))return ['Movement'];
  if(rule.id==='hex-return')return ['Shooting'];
  if(rule.id==='guardian'||rule.id==='shield'||rule.id==='orikan-save'||rule.id==='rites'||rule.id==='overlord'||rule.id==='necroadjust'||rule.id==='gloom'||rule.id==='nodes'||rule.id==='fabricator'||rule.id==='nullstone')return ['Shooting','Fight'];
  return [...new Set(signals.flatMap(s=>actionPhase[s]?[actionPhase[s]!]:['Shooting','Fight'] as Phase[]))];
}
// These abilities apply when making an attack in any phase. Fire Overwatch uses
// snap shooting, which bars Hit re-rolls and Critical Hits but permits Wound re-rolls.
const snapAttackAbilities=new Set(['implacable-eradication','optimised','crawlers','hatred','doom-scythe','nebuloscope']);
const movementDefences=new Set(['ghost-repair','szeras','guardian','orikan-save','shield','command-shield','overlord','necroadjust','tomb-shield-save','cover','timesplinter-mantle','tomb-shadowloom','harassment']);
const circumstances:Record<string,string>={
  'implacable-eradication':'When a model in this unit makes an attack.',
  legion:'Whenever this unit’s Reanimation Protocols activate, including stratagems or Resurrection Orbs.',
  'wraith-form':'After a Normal move over an enemy.',
  'warden':'If this unit Fell Back this turn.',
  'praetorian-fallback':'If this unit Fell Back this turn.',
  'skorpekh-lord':'When the Lord itself finishes a Charge move.',
  'will':'When this model’s unit is targeted by a Stratagem, one unit with this ability across your army can claim the discount.',
  'shroud':'When this model’s unit moves.',
  'murder':'When Nekrosor destroys an enemy unit.',
  'monolith':'During your Movement phase, from the second battle round.',
  'orb':'At the end of any phase.',
  'displace':'When selected to Advance in your Movement phase.',
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
  if(rule.id==='hunters')return 'Once per turn. '+text;
  if(rule.id==='optimised'){
    const selected=squad.weaponCounts?Object.entries(squad.weaponCounts).filter(([,n])=>n>0).map(([name])=>name):[squad.equipment??NECRON_LOADOUTS[squad.unit]?.primary?.[0]];
    const cues:string[]=[];
    if(selected.includes('Gauss destructor'))cues.push('Gauss destructor: re-roll Wound rolls of 1 against Monsters and Vehicles');
    if(selected.includes('Enmitic exterminator'))cues.push('Enmitic exterminator: re-roll Wound rolls of 1 against other targets');
    text=cues.join('. ')+'.';
  }
  if(rule.id==='thrall-fight')text+=' If this model subsequently returns before its unit is selected to fight, it may fight again (FAQ).';
  if(rule.id==='hard-wired')text='Against the closest eligible enemy, re-roll Hit rolls of 1; if that enemy is within range of an opponent-controlled objective, re-roll any Hit roll instead. Both conditions are required for full re-rolls (FAQ).';
  if(rule.id==='doom-scythe')return 'When this model targets an enemy unit with its heavy death ray, the opponent chooses. If it stands firm, successful unmodified ranged Hit rolls of 5+ against that unit score Critical Hits for the rest of the phase. If it ducks for cover, its models subtract 1 from all attack Hit rolls until the start of your next Shooting phase.';
  if(rule.id==='trazyn')return 'At the start of your Command phase, while Trazyn is on the battlefield, you may destroy one eligible friendly host on the battlefield. Ignore its destruction triggers. Place Trazyn in its position at full wounds. If the host was leading an attached unit, Trazyn now leads that unit.';
  if(rule.id==='ghost-repair')return 'Once per turn for this Ark, immediately after an enemy unit finishes its attacks, choose one friendly Warriors formation within 3″ that lost wounds to those attacks. Activate its Reanimation Protocols. Each Warriors formation can benefit from Repair Barge only once per turn across all Arks.';
  if(rule.id==='hex-hits')return 'Whenever this Hexmark uses Fire Overwatch, its snap shots hit on unmodified 2+; hits are not critical hits and Hit rolls cannot be re-rolled.';
  if(rule.id==='hex-overwatch')return 'Once per turn across your army, one unit with Inescapable Death may use Fire Overwatch for 0 CP, even if you already used it on a different unit this phase.';
  if(rule.id==='hex-return')return 'Once per turn across your army: after an enemy finishes ranged attacks that targeted a friendly Necron unit within 3″ of this Hexmark model, one eligible Hexmark within 3″ of that friendly target may shoot the attacker only, if it is an eligible target.';
  if(rule.id==='doomsday-still')return 'Your Movement phase: if this model remains stationary, its doomsday cannon gains Devastating Wounds until turn end.';
  if(rule.id==='timesplinter-mantle')text='This formation has Stealth (Benefit of Cover against ranged attacks if every model has Stealth); incoming melee attacks suffer −1 to Hit.';
  if(rule.id==='szeras')text='While the friendly Battleline unit is within the aura, improve the AP of its outgoing attacks by 1 and worsen AP of incoming attacks by 1. The aura starts at 3″; both effects apply when their respective conditions occur.';
  if(rule.id==='atomic')text='Increase the range of Mechanical Augmentation by 3″ for the rest of the battle, up to 12″.';
  if(rule.id==='orb')text+=' Across your army, you can resurrect at most one unit each turn. A given unit can benefit from an Orb only once that turn.';
  if(rule.id==='vault')text+=' Available powers: Antimatter Meteor (Blast, Devastating Wounds, Indirect Fire); Cosmic Fire (Ignores Cover, Devastating Wounds, Torrent); Time’s Arrow (Anti-Character 4+, Devastating Wounds, Precision). These keywords apply only to the chosen weapons.';
  if(rule.id==='command-king')return 'Start of the battle round, before either turn: choose one Triarch ability until next round. See its conditional phase reminders.';
  if(rule.gear&&['gloom','fabricator','plasmacyte','amulet','orb'].includes(rule.id))text+=' Apply only while the relevant equipped bearer survives or the applicable use remains available.';
  return [side+limit+intro,text].filter(Boolean).join(' ').trim();
}
type Formation=ReturnType<typeof necronFormationRoots>[number];
// These cards say "this unit" or "a model in this unit". The distinction matters
// when a support or retinue joins. An ability explicitly naming its model stays personal.
const unitEffects=new Set([
  'chronometron','timesplinter-mantle','warden','will','shroud','crawlers','legion',
  'wraith-form','implacable-eradication','guardian','whirling','plasmacyte','hard-wired',
  'tomb-evasion','tunnelling','praetorian-fallback','charge-reroll','flesh-hunger',
]);

function isDestroyerModel(army:ArmySelection,s:RosterInstance):boolean{
  if(necronKeywords['DESTROYER CULT'].has(s.unit))return true;
  if(!army.detachments2026?.includes('Cursed Legion'))return false;
  const upgrade=army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit];
  return (upgrade==='Murdermind'&&necronKeywords.CRYPTEK.has(s.unit))||
    (upgrade==='Destroyer Ankh'&&['Overlord','Overlord with translocation shroud','Catacomb Command Barge'].includes(s.unit));
}

// Roster eligibility is known; range, remaining models and other battlefield conditions remain in the text.
function datasheetTargets(ruleId:string,bearer:RosterInstance,formations:Formation[],army:ArmySelection):string[]|undefined{
  const withMember=(test:(s:RosterInstance)=>boolean)=>formations.filter(f=>f.members.some(test)).map(f=>f.id);
  switch(ruleId){
    case 'invasion':
      return necronTransportFormations(army,formations.flatMap(f=>f.members)).filter(f=>f.members.some(s=>necronKeywords.INFANTRY.has(s.unit))).map(f=>f.id);
    case 'monolith': case 'nodes':
      return withMember(s=>necronKeywords.INFANTRY.has(s.unit));
    case 'ghost-repair':
      return withMember(s=>s.unit==='Necron Warriors');
    case 'spyder-swarm':
      return withMember(s=>s.unit==='Canoptek Scarab Swarms');
    case 'szeras':
      return withMember(s=>necronKeywords.BATTLELINE.has(s.unit));
    case 'macro-mandible':
      return withMember(s=>necronKeywords.CANOPTEK.has(s.unit));
    case 'fabricator':
      return withMember(s=>necronKeywords.VEHICLE.has(s.unit));
    case 'orb':
      if(bearer.unit==='Catacomb Command Barge')return withMember(s=>necronKeywords.INFANTRY.has(s.unit)||necronKeywords.MOUNTED.has(s.unit));
      break;
    case 'nekrosor-aura':
      return formations.filter(f=>!f.members.some(s=>necronKeywords.MONSTER.has(s.unit)||necronKeywords.TITANIC.has(s.unit))).map(f=>f.id);
    case 'murder':
      return formations.filter(f=>!f.members.some(s=>s.id===bearer.id)&&f.members.some(s=>isDestroyerModel(army,s))).map(f=>f.id);
    case 'trazyn':
      return formations.flatMap(f=>f.members.filter(s=>necronKeywords.INFANTRY.has(s.unit)&&necronKeywords.CHARACTER.has(s.unit)&&!necronKeywords['EPIC HERO'].has(s.unit)&&s.unit!=='Skorpekh Lord').map(s=>s.id));
  }
}

const printedScouts:Record<string,number>={'Canoptek Macrocytes':8,'Tomb Blades':9,'Triarch Stalker':8};
export function naturalScoutReminders(army:ArmySelection):GeneratedReminder[]{
  if(army.faction!=='Necrons')return [];
  const out:GeneratedReminder[]=[];
  for(const formation of necronFormationRoots(army)){
    const distance=printedScouts[formation.body.unit];
    if(!distance)continue;
    const allScout=formation.members.every(s=>printedScouts[s.unit]===distance||
      (s.unit==='Geomancer'&&s.attachedTo===formation.id&&formation.body.unit==='Canoptek Macrocytes'));
    if(!allScout)continue;
    out.push({id:'11e-scout-'+formation.id,title:formation.id+' · Scouts '+distance+'″',window:'Pre-battle',timing:'during',
      summary:'Resolve Pre-battle Abilities. From Strategic Reserves, you may set up wholly within your deployment zone. If already wholly within that zone, you may Scout up to '+distance+'″, finishing more than 8″ horizontally from every enemy unit.',
      source:necronSource(formation.body.unit),origin:'unit',units:[formation.id]});
  }
  return out;
}

export function necronDatasheetReminders2026(army:ArmySelection,roster:RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
  if(army.faction!=='Necrons')return [];
  const output:GeneratedReminder[]=[];
  const ids=new Set<string>();
  const battleRoster=necronBattleRoster(army,roster);
  const formations=necronBattleFormations(army,roster);
  // A joined retinue is part of its original Bodyguard until battle end. Its
  // surviving models keep that Bodyguard's unit abilities (core 19.04), but do
  // not inherit dead original models' weapons, personal saves or wargear.
  const liveIds=new Set(battleRoster.map(s=>s.id));
  const retainedBodies=formations.filter(f=>!liveIds.has(f.originalBody.id)&&f.members.some(m=>m.retinueTo===f.originalBody.id)).map(f=>f.originalBody);
  for(const squad of [...battleRoster,...retainedBodies]){
    const retainedBody=!liveIds.has(squad.id);
    const formation=formations.find(f=>f.members.some(m=>m.id===squad.id)||(retainedBody&&f.originalBody.id===squad.id));
    const body=formation?.leading.some(m=>m.id===squad.id)?formation.originalBody:undefined;
    for(const rule of BATTLEFIELD_RULES){
      // Include the decision in Movement as well as its consequence in Shooting.
      if(!rule.units.includes(squad.unit)||(rule.gear&&!rule.gear(squad))||(rule.scope==='leading'&&!body))continue;
      if(retainedBody&&(!unitEffects.has(rule.id)||rule.gear))continue;
      if(rule.id==='guardian'&&!formation?.leading.some(leader=>['Overlord','Overlord with translocation shroud','Imotekh the Stormlord','Trazyn the Infinite'].includes(leader.unit)))continue;
      const targets=datasheetTargets(rule.id,squad,formations,army);
      if(targets?.length===0)continue;

      let suffix=existingIds[rule.id]??rule.id;
      if(rule.id==='harbinger'&&body?.unit==='Immortals')suffix='plasmancer-immortals';
      if(rule.id==='rites'&&body?.unit==='Canoptek Wraiths')suffix='technomancer-wraiths';
      const affectsFormation=rule.scope==='leading'||unitEffects.has(rule.id)||(rule.id==='orb'&&squad.unit!=='Catacomb Command Barge');
      const joined=affectsFormation&&formation&&(formation.members.length>1||retainedBody)?formation:undefined;
      const affected=targets??(retainedBody?formation!.members.map(m=>m.id):joined?[squad.id,...joined.members.filter(m=>m.id!==squad.id).map(m=>m.id)]:[squad.id]);
      const windows=referenceWindows(rule);
      if((snapAttackAbilities.has(rule.id)||movementDefences.has(rule.id))&&!windows.includes('Movement'))windows.push('Movement');
      for(const window of windows){
        if(window==='Movement'&&rule.id.startsWith('weapons-')&&necronKeywords.TITANIC.has(squad.unit))continue;
        const weapon=rule.id.startsWith('weapons-');
        let summary=weapon?weaponSummary(squad,window==='Fight'?'fight':'shoot',window==='Movement'):referenceText(rule,squad,battleRoster);
        if(!summary)continue;
        const snapAttack=window==='Movement'&&snapAttackAbilities.has(rule.id);
        const movementDefence=window==='Movement'&&movementDefences.has(rule.id);
        if(snapAttack&&rule.id==='crawlers')summary='Against an enemy within 12″, models in this unit can ignore Wound roll modifiers. Snap shots already use unmodified Hit rolls irrespective of Ballistic Skill.';
        if(snapAttack&&rule.id==='hatred')summary='Against an enemy below half-strength, this Lord can re-roll its Wound rolls. Snap shooting prevents Hit re-rolls.';
        if(snapAttack&&rule.id==='doom-scythe')summary='When the heavy death ray targets an enemy, the opponent must choose. Standing firm cannot turn snap shots into Critical Hits. Ducking for cover gives the enemy’s attacks −1 to Hit until the start of your next Shooting phase.';
        if(movementDefence&&rule.id==='harassment')summary='While a non-Monster, non-Vehicle enemy unit is within 3″ of this surviving Macrocytes unit, subtract 1 from that enemy’s attack Hit rolls, including normal reactive shooting. Snap shooting, including Fire Overwatch, ignores this Hit modifier.';
        if(movementDefence)summary=(rule.id==='harassment'?'When an enemy makes a permitted normal reaction attack during Movement. ':rule.id==='szeras'?'When a Battleline formation makes or receives out-of-phase attacks, including Fire Overwatch. ':'When an enemy attacks in the Movement phase, including Fire Overwatch at the end of your Movement phase. ')+summary;
        if(rule.scope==='leading')summary+=' The original Leader or Support source must survive; its while-leading ability continues after the original Bodyguard is destroyed. If an attack destroys that source, retain the effect until the attacking unit finishes its attacks.';
        if(retainedBody)summary+=' The surviving joined retinue is still part of the original '+squad.unit+' Bodyguard unit. This unit ability ends when its last Bodyguard model is destroyed; if an attack destroys that model, retain the effect until the attacking unit finishes its attacks.';
        const overwatch=window==='Movement'&&(weapon||snapAttack||['sentinel','hex-hits','hex-overwatch','tachyon'].includes(rule.id));
        const base='11e-necron-'+(rule.id==='nekrosor-aura'&&window==='Fight'?'nekrosor-fight-aura':suffix);
        // Each Starstele is an independent aura/cover source. Do not carry a
        // previous purchase-wide completion onto its individual source rows.
        const id=squad.unit===CONVERGENCE_OF_DOMINION||ids.has(base)?base+'-'+squad.id+'-'+window:base;
        ids.add(id);
        const candidates=targets?' Eligible '+(rule.id==='trazyn'?'models':'formations')+': '+targets.join(', ')+'.':
          joined?' While joined: '+joined.members.map(m=>m.id).join(', ')+'.':'';
        output.push({id,title:squad.id+' · '+rule.title+(joined&&joined.id!==squad.id?' → '+joined.id:''),
          window,timing:overwatch||rule.signal==='phaseEnd'?'end':['monolith','geomancer','lightning','spyder-swarm'].includes(rule.id)?'during':rule.signal==='phaseStart'?'start':'during',
          summary:(overwatch?'End of the opponent’s Movement phase, when using Fire Overwatch. ':'')+summary+candidates,source:necronSource(squad.unit),origin:'unit',
          turn:overwatch?'opponent':movementDefence?'either':rule.turn,
          previousSheetEntry:rule.id==='command-king'?{window:'Command',units:affected}:rule.id==='nekrosor-aura'?{window,units:[squad.id]}:undefined,units:affected});
      }
    }
  }
  for(const s of roster.filter(s=>NECRON_RETINUES.has(s.unit)&&s.retinueTo)){
    const formation=formations.find(f=>f.members.some(m=>m.id===s.id));
    if(!formation||formation.originalBody.id===s.id||formation.originalBody.id!==s.retinueTo)continue;
    const body=formation.originalBody.id,crypteks=formation.leading.filter(c=>necronKeywords.CRYPTEK.has(c.unit));
    output.push({id:'11e-necron-retinue-'+s.id,title:s.id+' · '+(s.unit==='Cryptothralls'?'Cryptek Retinue':'Canoptek Retinue')+' → '+body,window:'Pre-battle',timing:'start',summary:'Declare Battle Formations: join this Bodyguard for the battle; its Starting Strength becomes '+formationBodyguardStrength(army,body)+'.',source:necronSource(s.unit),origin:'unit',units:[s.id,body]});
    if(s.unit==='Cryptothralls'&&crypteks.length){
      const recipients=crypteks.map(c=>c.id);
      for(const window of PHASES)output.push({id:'11e-necron-cryptothralls-bound-'+s.id+(window==='Shooting'?'':'-'+window.toLowerCase()),
        title:s.id+' · Bound Creation → '+recipients.join(', '),window,timing:'during',
        summary:'While in the same unit as these Cryptothralls, the Cryptek model has Feel No Pain 4+. When that model would lose a wound, use one applicable Feel No Pain roll. Other models retain their own saves.',
        source:necronSource(s.unit),origin:'unit',units:recipients,previousSheetEntry:{window,units:[s.id,body,...recipients]}});
    }
  }
  const arks=roster.filter(s=>s.unit==='Ghost Ark');
  if(arks.length)output.push({id:'11e-necron-ghost-ark-embark',title:'Ghost Ark · Dedicated Transport',window:'Pre-battle',timing:'start',summary:'Declare Battle Formations: each Ghost Ark must begin with at least one eligible whole unit embarked, or be destroyed without destruction triggers. Capacity: 10 Warriors and one Necrons Infantry Character. Eligible formation candidates: '+(ghostArkPassengers(army).map(s=>s.id).join(', ')||'none')+'. Do not assign the same unit to multiple transports.',source:necronSource('Ghost Ark'),origin:'unit',units:arks.map(s=>s.id)});
  output.push(...extraNecronPhaseReminders(army,roster));
  output.push(...lastingNecronPhaseReminders(army,roster));
  return output;
}

// Core 01.02.02: an effect with a stated duration survives loss of its source.
// These are conditional follow-ups to a prior use, never new activations. Keep
// their source identity from the mustered army and charge locks on the original
// surviving formation, even if its Cryptek or original Bodyguard has died.
function lastingNecronPhaseReminders(army:ArmySelection,roster:RosterInstance[]):GeneratedReminder[]{
 const out:GeneratedReminder[]=[];
 const original=expandRoster(army),originalFormations=necronBattleFormations(army),formations=necronBattleFormations(army,roster);
 const sameMember=(start:RosterInstance,current:RosterInstance)=>start.id===current.id&&start.unit===current.unit&&start.attachedTo===current.attachedTo&&start.retinueTo===current.retinueTo;
 const survivingFormation=(start:Formation)=>formations.find(f=>f.originalBody.id===start.originalBody.id&&f.members.some(m=>start.members.some(originalMember=>sameMember(originalMember,m))));
 for(const s of original){
  const current=roster.find(m=>m.id===s.id);
  if(current&&!sameMember(s,current))continue;
  const emit=(key:string,title:string,window:ReminderWindow,summary:string,units:string[]=[s.id],turn:GeneratedReminder['turn']='either',timing:GeneratedReminder['timing']='during')=>out.push({
   id:'11e-necron-extra-'+key+'-'+s.id+'-'+window,title:s.id+' · '+title,window,timing,turn,summary,source:necronSource(s.unit),origin:'unit',units});
  if(s.unit==='Chronomancer'||s.unit==='Tomb Blades'){
   const start=originalFormations.find(f=>f.members.some(m=>m.id===s.id));
   const surviving=start&&survivingFormation(start);
   if(surviving){
    const ability=s.unit==='Chronomancer'?'Chronometron':'Evasion Engrams';
    emit('shoot-move-charge',ability+' · charge restriction','Charge','In your Charge phase, this formation cannot declare a charge if it took the optional Normal move after shooting this turn. The restriction lasts until turn end, even if the ability’s source is subsequently destroyed.',[surviving.id],'own');
   }
  }
  if(s.unit==='Geomancer'){
   emit('tectonic-move','Tectonic Reverberations · pinned move','Movement','If this Geomancer previously pinned an enemy and the effect has not expired, models in that enemy unit subtract 2″ from Move, including when making a permitted reactive move. The pin lasts until the start of your next Movement phase, even if the Geomancer is destroyed.');
   emit('tectonic-charge','Tectonic Reverberations · pinned charge','Charge','If this Geomancer previously pinned an enemy and the effect has not expired, that enemy unit subtracts 2 from its Charge rolls until the start of your next Movement phase, even if the Geomancer is destroyed.');
  }
  if(s.unit==='Obelisk'){
   emit('gravitic-move','Gravitic Pulse · selected unit moves','Movement','If this Obelisk selected an enemy at the start of this phase, halve that unit’s Move characteristic and Advance rolls until turn end. If that unit can Fly, roll a D6 after each move it finishes; on 4+ it takes D3 mortal wounds. This movement damage lasts until the start of your next Movement phase. Both effects persist if the Obelisk is destroyed.',[s.id],'opponent');
   emit('gravitic-charge','Gravitic Pulse · charge','Charge','In the opponent’s turn, if this Obelisk selected an enemy at the start of their Movement phase, halve the Charge roll of that unit until turn end. If it can Fly and completes its Charge move, roll a D6. On 4+ it takes D3 mortal wounds. The movement damage lasts until the start of your next Movement phase; destroying the Obelisk does not end either effect.',[s.id],'opponent');
   emit('gravitic-fight','Gravitic Pulse · Fight moves','Fight','In the opponent’s Fight phase, if this Obelisk previously selected an enemy that can Fly, roll a D6 after each pile-in or consolidation move it finishes. Each 4+ deals D3 mortal wounds. The movement damage lasts until the start of your next Movement phase, even if the Obelisk is destroyed.',[s.id],'opponent');
  }
  if(s.unit==='Doom Scythe'){
   emit('atavistic-shoot','Atavistic Instigation · duck for cover','Shooting','If an enemy unit previously ducked for cover when this Doom Scythe’s heavy death ray targeted it, its models subtract 1 from attack Hit rolls until the start of your next Shooting phase, even if the Doom Scythe is destroyed. This also affects permitted reactions; snap shooting ignores the Hit modifier.');
   emit('atavistic-fight','Atavistic Instigation · duck for cover','Fight','If an enemy previously ducked for cover when this Doom Scythe’s heavy death ray targeted it, its melee attacks suffer −1 to Hit until the start of your next Shooting phase, even if the Doom Scythe is destroyed.');
   emit('atavistic-movement','Atavistic Instigation · duck for cover','Movement','If an enemy previously ducked for cover when this Doom Scythe’s heavy death ray targeted it, subtract 1 from its normal reactive attack Hit rolls until the start of your next Shooting phase, even if the Doom Scythe is destroyed. Snap shooting, including Fire Overwatch, ignores this Hit modifier.');
  }
  if(s.unit==='Monolith'){
   // Eligibility is checked when the Gate is used. Its turn-long consequence
   // stays on that original formation after the Monolith or Infantry source dies.
   const recipients=originalFormations.filter(f=>f.members.some(m=>necronKeywords.INFANTRY.has(m.unit)))
    .flatMap(f=>{const surviving=survivingFormation(f);return surviving?[surviving.id]:[];});
   if(recipients.length){
    const candidates=' Original eligible formations: '+recipients.join(', ')+'. Only the formation that actually used this Monolith’s gate is affected.';
    emit('eternity-gate-charge','Eternity Gate · charge restriction','Charge','In your Charge phase, if this formation used this Monolith’s gate to make an ingress move this turn, it cannot make a Charge move until turn end, even if the Monolith is destroyed or the formation loses its Infantry keyword.'+candidates,recipients,'own');
    emit('eternity-gate-shooting','Eternity Gate · shooting','Shooting','In your Shooting phase, a formation that used this Monolith’s gate this turn may shoot, including when set up away from a battlefield edge. This ingress permission is not lost if the Monolith is destroyed or the formation loses its Infantry keyword; all other shooting restrictions still apply.'+candidates,recipients,'own');
   }
  }
  // Activation rows use living sources and current eligibility. After a source
  // or keyword-bearer casualty retain only the previously applied phase effect.
  if(!current&&s.unit==='Triarch Stalker')emit('relay-lasting','Targeting Relay · selected target','Shooting','If this Triarch Stalker already selected an enemy it hit after resolving its attacks in this Shooting phase, that selected enemy cannot have the Benefit of Cover until this phase ends, even if the Stalker is destroyed. This does not select a new target.',[s.id],'own');
  if(s.unit==='Nekrosor Ammentar'){
   const currentTargets=new Set(current?datasheetTargets('murder',current,formations,army):[]);
   const targets=originalFormations.filter(f=>!f.members.some(m=>m.id===s.id)&&f.members.some(m=>isDestroyerModel(army,m)))
    .flatMap(f=>{const surviving=survivingFormation(f);return surviving&&!currentTargets.has(surviving.id)?[surviving.id]:[];});
   if(targets.length)for(const window of ['Movement','Shooting','Fight'] as const)emit('murder-lasting','Prophet of Destruction · selected formation',window,'If this Nekrosor already selected one of these formations within 9″ after destroying an enemy unit in this phase, models in that selected formation re-roll Wound rolls of 1 until this phase ends, even if Nekrosor is destroyed or that formation loses its Destroyer Cult keyword. Only the formation actually selected gains the effect; no new selection is granted.',targets);
  }
  if(!current&&s.unit==='Trazyn the Infinite'&&originalFormations.some(f=>f.leading.some(m=>m.id===s.id)))for(const window of PHASES)emit('ancient-collector-lasting','Ancient Collector · secured objective',window,'If this Trazyn already secured an objective with Ancient Collector while leading his formation at the end of your Command phase, that objective stays under your control until the opponent’s Level of Control is greater than yours at the end of a phase. Losing Trazyn or his formation does not clear that prior effect. Check only previously secured objectives; this does not secure a new one.',[s.id],'either','end');
 }
 return out;
}

// Source-checked printed core abilities and bespoke phase cues. Only the listed
// datasheets are reconciled here; absence from these tables is not a coverage claim.
const ctans=['C’tan Shard of the Deceiver','C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon','Transcendent C’tan'];
const deepStrike=new Set([...ctans,'Nekrosor Ammentar','Hexmark Destroyer','Deathmarks','Ophydian Destroyers','Triarch Praetorians','Monolith','Obelisk','Night Scythe']);
const invulnerable=new Set([...ctans,'Nekrosor Ammentar','Trazyn the Infinite','Chronomancer','Overlord with translocation shroud','Canoptek Wraiths','Overlord','Imotekh the Stormlord','Orikan the Diviner','Illuminor Szeras','Skorpekh Lord','Lokhust Lord','Catacomb Command Barge','The Silent King','Ghost Ark','Tesseract Vault','Annihilation Barge','Triarch Stalker','Canoptek Doomstalker','Doomsday Ark']);
const fnp:Record<string,number>={...Object.fromEntries(ctans.map(u=>[u,5])),'Canoptek Reanimator':4,'Illuminor Szeras':4};
const demise:Record<string,string>={...Object.fromEntries(ctans.map(u=>[u,'D6'])),'The Silent King':'D6+3','Monolith':'D6','Obelisk':'D6','Tesseract Vault':'D6+3','Ghost Ark':'D3','Night Scythe':'D3','Doomsday Ark':'D3','Canoptek Doomstalker':'D3','Catacomb Command Barge':'1','Annihilation Barge':'1','Canoptek Spyders':'1','Triarch Stalker':'D3','Doom Scythe':'D3','Seraptek Heavy Construct':'D6+2'};
const damaged:Record<string,number>={'The Silent King':6,'Monolith':7,'Obelisk':8,'Tesseract Vault':8,'Doomsday Ark':5,'Canoptek Doomstalker':4,'Night Scythe':4,'Doom Scythe':4,'Seraptek Heavy Construct':9};
function extraNecronPhaseReminders(army:ArmySelection,roster:RosterInstance[]):GeneratedReminder[]{
 const out:GeneratedReminder[]=[];
 const formations=necronBattleFormations(army,roster);
 const formation=(s:RosterInstance)=>formations.find(f=>f.members.some(m=>m.id===s.id));
 const combat=['Shooting','Fight'] as const;
 // Core 05.03, 24.24 and 24.33 apply to attacks/visibility, including Movement
 // reactions. These rows describe defences; they do not allow an attack to occur.
 const attackWindows=[...combat,'Movement'] as const;
 const rangedWindows=['Shooting','Movement'] as const;
 // Core 14.02 checks control at the end of every phase and turn, before other
 // end-of-phase/turn rules. These modifiers are not limited to Command scoring.
 const controlWindows=[...PHASES,'End of your turn','End of opponent turn'] as const;
 // Initial placement still applies to the purchased group, before its models
 // become separate units. Later rows use those individual battle sources.
 for(const s of roster.filter(s=>s.unit===CONVERGENCE_OF_DOMINION&&(s.models??1)>1))out.push({
  id:'11e-necron-extra-starsteles-'+s.id+'-Pre-battle',title:s.id+' · Starsteles',window:'Pre-battle',timing:'during',
  summary:'When first setting up this unit, place each model wholly within 12″ of another model from the unit in place of normal coherency. Each model then operates as a separate unit with Starting Strength 1. Select and resolve rules for each Starstele independently.',
  source:necronSource(s.unit),origin:'unit',units:[s.id]});
 for(const s of necronBattleRoster(army,roster)){
  const emit=(key:string,title:string,window:ReminderWindow,summary:string,timing:'start'|'during'|'end'='during',units:string[]=[s.id],turn?:GeneratedReminder['turn'],source=necronSource(s.unit))=>out.push({id:'11e-necron-extra-'+key+'-'+s.id+'-'+window,title:s.id+' · '+title,window,timing,turn,summary,source,origin:'unit',units,previousSheetEntry:key==='blades'||key==='stars'||(window==='Command'&&(key==='carrier'||key==='leadership'))?{window,units:[s.id]}:undefined});
  const f=formation(s);
  if(deepStrike.has(s.unit)&&f?.id===s.id&&f.members.every(m=>deepStrike.has(m.unit))){
   emit('deep-strike','Deep Strike','Pre-battle','This formation can be declared in reserves under the normal mission limits.','start',[f.id]);
   emit('deep-strike','Deep Strike','Movement','When making a legal ingress move, every model can set up more than 8″ horizontally from all enemies, including inside the enemy deployment zone.', 'during',[f.id]);
  }else if(deepStrike.has(s.unit)&&f?.id===s.id)emit('deep-strike','Deep Strike · formation restriction','Movement','All surviving models must have Deep Strike before this formation can use its special ingress placement.');
  if(invulnerable.has(s.unit)||s.unit==='Seraptek Heavy Construct')for(const window of attackWindows){const save=s.unit==='Seraptek Heavy Construct'?'5+':'4+';emit('invulnerable',save+' invulnerable save',window,(window==='Movement'?'When an enemy makes a permitted Movement-phase attack, including Fire Overwatch. ':'')+'For attacks allocated to models from this datasheet, choose the '+save+' invulnerable save when preferable to the modified armour save. This is not a blanket save for attached models.');}
  if(fnp[s.unit])for(const window of PHASES)emit('fnp','Feel No Pain '+fnp[s.unit]+'+',window,'For each wound this model would lose, roll D6; on '+fnp[s.unit]+'+ it is not lost. Apply only to models with this ability.');
  if(demise[s.unit])for(const window of PHASES)emit('demise','Deadly Demise '+demise[s.unit],window,'When '+(s.unit==='The Silent King'?'Szarekh (not a Menhir)':'this model')+' is destroyed, after any emergency disembarkation and fight-on-death, roll D6. On 6 each unit within 6″ suffers '+demise[s.unit]+' mortal wounds; roll separately for each unit if random.');
  if(damaged[s.unit]){
   const threshold=damaged[s.unit];
   for(const window of combat)if(s.unit!=='Tesseract Vault'||window==='Shooting')emit('damaged','Damaged profile',window,'While '+(s.unit==='The Silent King'?'Szarekh':'this model')+' has 1–'+threshold+' wounds remaining: '+(s.unit==='Tesseract Vault'?'when selected to shoot in your Shooting phase, select at most one C’tan Powers weapon rather than two.':s.unit==='The Silent King'?'halve Szarekh’s weapon Attacks and subtract 1 from this unit’s Hit rolls.':'subtract 1 from this model’s Hit rolls.'),'during',[s.id],s.unit==='Tesseract Vault'?'own':undefined);
   if(s.unit==='The Silent King')emit('damaged','Damaged profile','Movement','End of the opponent’s Movement phase, when using Fire Overwatch: while Szarekh has 1–6 wounds remaining, halve the Attacks characteristic of Szarekh’s weapons. Triarchal Menhir weapon Attacks are unchanged. Snap shooting ignores the damaged profile’s −1 Hit modifier.','end',[s.id],'opponent');
   if(['Monolith','Obelisk','Tesseract Vault','Seraptek Heavy Construct'].includes(s.unit))for(const window of controlWindows)emit('damaged-oc','Damaged profile · OC',window,'While this model has 1–'+threshold+' wounds remaining, subtract '+(s.unit==='Seraptek Heavy Construct'?5:4)+' from its OC. Use its current wounds when checking objective control at the end of each phase and turn, before resolving other end-of-phase or end-of-turn rules.','end',[s.id],'either');
  }
  if(s.unit==='Psychomancer')emit('nightmare-shroud','Nightmare Shroud (Aura)','Command','In the Battle-shock step of the opponent’s Command phase, each enemy below Starting Strength within 6″ of this model must test with −1 to its Battle-shock result.');
  if(s.unit==='Royal Warden')for(const window of PHASES)emit('engrammatic-logic','Engrammatic Logic',window,'Once per battle, at the start of either player’s phase, clear Battle-shock from one friendly Necron unit within 12″ of this model.','start');
  if(s.unit===CONVERGENCE_OF_DOMINION){
   emit('fortification-fallback','Fortification','Movement','When an enemy is engaged only with friendly Fortifications, being battle-shocked does not force Desperate Escape tests on Fall Back. Models moving over enemies must still test.');
   emit('fortification-shooting','Fortification','Shooting','You can target an enemy engaged only with your Fortifications. Subtract 1 from ranged Hit rolls against it unless the attack uses a Pistol or equivalent Close-quarters weapon.');
  }
  if(s.unit==='Seraptek Heavy Construct')emit('super-heavy','Super-heavy Walker','Movement','Normal, Advance and Fall Back moves may pass through non-Titanic models and terrain sections up to 4″ tall. Optionally gain Mobile for that move; if chosen, roll D6 after moving and become battle-shocked on 1.');
  if(s.unit==='Trazyn the Infinite'&&f?.leading.some(m=>m.id===s.id))emit('ancient-collector','Ancient Collector','Command','End of your Command phase: while the originally attached Trazyn survives, including after the original Bodyguard is destroyed, if this formation is within range of an objective you control, retain that objective until the opponent exceeds your Level of Control at the end of a phase.','end',[...new Set([s.id,...f.members.map(m=>m.id)])]);
  if(s.unit==='Hexmark Destroyer')for(const window of rangedWindows)emit('lone','Lone Operative',window,'If unattached, enemy models outside 12″ cannot see or target this unit with indirect fire, including when resolving permitted reactions such as Fire Overwatch.');
  if(s.unit==='Illuminor Szeras'&&roster.some(m=>m.id!==s.id))for(const window of rangedWindows)emit('illuminor','Illuminor',window,'While within 3″ of another friendly Necron unit, Szeras gains Lone Operative (12″ visibility and indirect fire restriction), including against permitted reactions such as Fire Overwatch.');
  if(s.unit==='Nekrosor Ammentar'){
   emit('fights-first','Fights First','Fight','If every surviving model in this unit has Fights First, resolve it in the Fights First step when eligible.');
   if(roster.some(m=>m.id!==s.id&&isDestroyerModel(army,m)))for(const window of rangedWindows)emit('disciples','Protective Disciples',window,'While within 3″ of another friendly Destroyer Cult unit, gain Lone Operative (12″ visibility and indirect fire restriction), including against permitted reactions such as Fire Overwatch.');
   const hunters=formations.filter(root=>root.members.some(m=>m.unit==='Deathmarks')&&!root.members.some(m=>necronKeywords.MONSTER.has(m.unit)||necronKeywords.TITANIC.has(m.unit))).map(root=>root.id);
   if(hunters.length)emit('nekrosor-hunters','Infectious Murder-madness · Hyperspace Hunters','Movement','When an enemy arrives from reserves in the opponent’s Movement phase, Deathmarks making normal Hyperspace Hunters attacks while within 6″ of the surviving Nekrosor gain Sustained Hits 1 against the closest eligible enemy: each Critical Hit scores one additional hit. Each Deathmarks unit must meet the aura and target conditions separately. Snap shooting, including Fire Overwatch, cannot score Critical Hits and gains no extra hits from this aura.','during',hunters,'opponent','https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf');
  }
  if(s.unit==='C’tan Shard of the Deceiver')emit('grand-illusion','Grand Illusion','Pre-battle','After both armies deploy, select up to three friendly Necron formations to redeploy; they can enter Strategic Reserves regardless of the normal reserve quantity limit.','end',formations.map(m=>m.id));
  if(s.unit==='C’tan Shard of the Deceiver'||s.unit==='Flayed Ones')for(const window of rangedWindows)emit('stealth','Stealth',window,'When every surviving model in the unit has Stealth, ranged attacks against it grant the Benefit of Cover, unless ignored. This also applies to permitted Movement-phase attacks, including Fire Overwatch.');
  if(s.unit==='Flayed Ones')emit('infiltrators','Infiltrators','Pre-battle','During deployment, if all models have this ability, deploy more than 8″ horizontally from the enemy deployment zone and every enemy unit.','start');
  if(s.unit==='Night Scythe'){
   // The current card retains "Reinforcements step" wording. Core 09.02/20.04
   // resolves reserve arrivals as ingress moves in the Move Units step.
   emit('quantum-invader','Quantum Invader','Movement','In the Move Units step of your first, second or third Movement phase, this model may make an ingress move regardless of mission rules.','during',[s.id],'own');
   emit('hover','Hover','Movement','When taking to the skies, do not subtract 2″ from the maximum distance.');
  }
  if(s.unit==='Canoptek Wraiths'&&army.detachments2026?.includes('Canoptek Court'))emit('wraith-form-reactive','Wraith Form · Reactive Subroutines','Movement','In the opponent’s Movement phase, if Reactive Subroutines lets this formation make a Normal move over an enemy, Wraith Form can trigger. Choose one crossed enemy and roll one D6 per surviving model in this formation, with each 4+ causing a mortal wound.','during',[f?.id??s.id]);
  if(s.unit==='Ophydian Destroyers')emit('tunnelling-ingress','Tunnelling Horrors · ingress','Movement','If Tunnelling Horrors was used last turn, this unit must make an ingress move now, including on your first turn.');
  if(s.unit==='Canoptek Scarab Swarms')for(const window of controlWindows)emit('chittering','Chittering Swarm',window,'While an enemy unit is within Engagement Range of this surviving Scarab unit, subtract 1 from the OC of every model in that enemy unit (minimum 1), including models not themselves in Engagement Range. '+(roster.some(m=>necronKeywords.CRYPTEK.has(m.unit))?'While this Scarab unit is within 6″ of a surviving friendly Cryptek model, its Scarab models have OC 1. ':'')+'Apply the current conditions when checking objective control at the end of each phase and turn. Battle-shocked models retain OC “–”.','end',[s.id],'either');
  if(s.unit==='Catacomb Command Barge')for(const window of controlWindows)emit('carrier','Carrier Wave (Aura)',window,'While a friendly Necron unit is within 6″ of this surviving Barge, every model in that unit gains +1 OC. Measure the unit’s range when checking objective control at the end of each phase and turn. Battle-shocked models retain OC “–”.','end',formations.map(root=>root.id),'either');
  if(s.unit==='The Silent King'){
   for(const window of PHASES)emit('leadership','The Silent King · Leadership',window,'While a friendly Necron unit is within 6″ of the surviving Szarekh model, improve that unit’s Leadership by 1. Use that characteristic for Leadership and Battle-shock rolls whenever a rule calls for them, including outside the Command phase.','during',formations.map(root=>root.id),'either');
   // The official September 30 v1.3 replacement for Bringer of Unity applies to all Necrons.
   emit('march','Relentless March (Aura)','Movement','If selected this battle round, friendly Necron units within 6″ of Szarekh gain +2″ Move, including friendly Monsters.','during',formations.map(root=>root.id),undefined,'https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf');
   const nonMonsters=formations.filter(root=>!root.members.some(m=>necronKeywords.MONSTER.has(m.unit))).map(root=>root.id);
   emit('blades','Phaeron of the Blades (Aura)','Charge','If selected this battle round, friendly non-Monster Necron units within 6″ of Szarekh may re-roll charge rolls.','during',nonMonsters);
   emit('blades','Phaeron of the Blades (Aura)','Fight','If selected this battle round, eligible friendly non-Monster units within 6″ of Szarekh add 1 to melee Strength.','during',nonMonsters);
   for(const window of attackWindows)emit('stars','Phaeron of the Stars (Aura)',window,'If selected this battle round, when friendly non-Monster Necron units within 6″ of the surviving Szarekh model make permitted attacks, re-roll Wound rolls of 1. Hit rolls of 1 can also be re-rolled except when using snap shooting. Snap shooting, including Fire Overwatch, cannot re-roll Hit rolls or score Critical Hits.','during',nonMonsters);
   for(const window of PHASES)emit('menhirs','Triarchal Menhirs',window,'If Szarekh is destroyed, all remaining Triarchal Menhirs are also destroyed.');
  }
 }
 return out;
}
