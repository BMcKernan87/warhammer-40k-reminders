import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {validSupportAttachment} from './necron-muster-legality';
import {NECRON_RETINUES,necronFormationRoots,eligibleRetinueBodies,retinueCrypteks,formationBodyguardStrength,ghostArkPassengers} from './necron-retinues';
import {expandRoster, type RosterInstance} from './roster-instances';
import {BATTLEFIELD_RULES,type TriggerRule} from './necron-battlefield-rules';
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
  if(['macro-projector','reanimation-beam','legion','nullstone','gloom','rites','amulet'].includes(rule.id))return [...PHASES];
  if(rule.id==='command-king')return ['Command'];
  if(rule.id==='murder')return ['Shooting','Fight'];
  if(rule.id==='doomsday-still')return ['Movement'];
  if(rule.id==='tomb-shield-save')return ['Shooting','Fight'];
  if(rule.id==='tunnelling')return ['End of opponent turn'];
  if(rule.id==='terror'||rule.id==='cover')return ['Shooting'];
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
const circumstances:Record<string,string>={
  legion:'Whenever this unit’s Reanimation Protocols activate, including stratagems or Resurrection Orbs.',
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
  if(rule.id==='thrall-fight')text+=' If this model subsequently returns before its unit is selected to fight, it may fight again (FAQ).';
  if(rule.id==='hard-wired')text='Against the closest eligible enemy, re-roll Hit rolls of 1; if that enemy is within range of an opponent-controlled objective, re-roll any Hit roll instead. Both conditions are required for full re-rolls (FAQ).';
  if(rule.id==='doomsday-still')return 'Your Movement phase: if this model remains stationary, its doomsday cannon gains Devastating Wounds until turn end.';
  if(rule.id==='timesplinter-mantle')text='This formation has Stealth (Benefit of Cover against ranged attacks if every model has Stealth); incoming melee attacks suffer −1 to Hit.';
  if(rule.id==='szeras')text='Improve the Battleline unit’s outgoing AP by 1 or worsen incoming AP by 1. The aura starts at 3″.';
  if(rule.id==='atomic')text='Increase the range of Mechanical Augmentation by 3″ for the rest of the battle, up to 12″.';
  if(rule.id==='orb')text+=' A given unit can be affected by a Resurrection Orb at most once per turn (FAQ).';
  if(rule.id==='vault')text+=' Available powers: Antimatter Meteor (Blast, Devastating Wounds, Indirect Fire); Cosmic Fire (Ignores Cover, Devastating Wounds, Torrent); Time’s Arrow (Anti-Character 4+, Devastating Wounds, Precision). These keywords apply only to the chosen weapons.';
  if(rule.id==='command-king')return 'Start of the battle round, before either turn: choose one Triarch ability until next round. See its conditional phase reminders.';
  if(rule.gear&&['gloom','fabricator','plasmacyte','amulet','orb'].includes(rule.id))text+=' Apply only while the relevant equipped bearer survives or the applicable use remains available.';
  return [side+limit+intro,text].filter(Boolean).join(' ').trim();
}
export function necronDatasheetReminders2026(army:ArmySelection):GeneratedReminder[]{
  if(army.faction!=='Necrons')return [];
  const roster=expandRoster(army);
  const output:GeneratedReminder[]=[];
  const ids=new Set<string>();
  const formations=necronFormationRoots(army,roster);
  for(const squad of roster){
    const body=roster.find(s=>s.id===squad.attachedTo&&validSupportAttachment(army,squad));
    for(const rule of BATTLEFIELD_RULES){
      // Include the decision in Movement as well as its consequence in Shooting.
      if(!rule.units.includes(squad.unit)||(rule.gear&&!rule.gear(squad))||(rule.scope==='leading'&&!body))continue;
      if(rule.id==='guardian'&&!roster.some(leader=>leader.attachedTo===squad.id&&validSupportAttachment(army,leader)&&['Overlord','Overlord with translocation shroud','Imotekh the Stormlord','Trazyn the Infinite'].includes(leader.unit)))continue;
      if(rule.id==='warden'&&!body)continue;
      if(rule.id==='murder'&&!roster.some(other=>other.id!==squad.id&&necronKeywords['DESTROYER CULT'].has(other.unit)))continue;
      if(rule.id==='spyder-swarm'&&!roster.some(other=>other.unit==='Canoptek Scarab Swarms'))continue;
      if(rule.id==='ghost-repair'&&!roster.some(other=>other.unit==='Necron Warriors'))continue;
      if(rule.id==='szeras'&&!roster.some(other=>other.unit==='Necron Warriors'||other.unit==='Immortals'))continue;
      if(rule.id==='fabricator'&&!roster.some(other=>other.id!==squad.id&&necronKeywords.VEHICLE.has(other.unit)))continue;
      if(rule.id==='nodes'&&!roster.some(other=>other.id!==squad.id&&necronKeywords.INFANTRY.has(other.unit)))continue;
      if((rule.id==='invasion'||rule.id==='monolith')&&!roster.some(other=>necronKeywords.INFANTRY.has(other.unit)))continue;
      if(rule.id==='trazyn'&&!roster.some(other=>other.id!==squad.id&&['Overlord','Overlord with translocation shroud','Chronomancer','Geomancer','Hexmark Destroyer','Plasmancer','Psychomancer','Royal Warden','Technomancer'].includes(other.unit)))continue;

      let suffix=existingIds[rule.id]??rule.id;
      if(rule.id==='harbinger'&&body?.unit==='Immortals')suffix='plasmancer-immortals';
      if(rule.id==='rites'&&body?.unit==='Canoptek Wraiths')suffix='technomancer-wraiths';
      for(const window of referenceWindows(rule)){
        if(window==='Movement'&&rule.id.startsWith('weapons-')&&necronKeywords.TITANIC.has(squad.unit))continue;
        const base='11e-necron-'+(rule.id==='nekrosor-aura'&&window==='Fight'?'nekrosor-fight-aura':suffix);
        const id=ids.has(base)?base+'-'+squad.id+'-'+window:base;
        ids.add(id);
        output.push({id,title:squad.id+' · '+rule.title+((rule.scope==='leading'||rule.id==='chronometron'||rule.id==='timesplinter-mantle'||rule.id==='warden')&&body?' → '+body.id:''),
          window,timing:window==='Movement'&&(rule.id.startsWith('weapons-')||['sentinel','hex-hits','hex-overwatch'].includes(rule.id))?'end':rule.signal==='phaseEnd'?'end':rule.signal==='phaseStart'?'start':'during',
          summary:(window==='Movement'&&(rule.id.startsWith('weapons-')||['sentinel','hex-hits','hex-overwatch'].includes(rule.id))?'Opponent’s Movement phase, end of phase; Fire Overwatch snap shooting. ':'')+referenceText(rule,squad,roster),source:necronSource(squad.unit),origin:'unit',
          units:(rule.scope==='leading'||rule.id==='chronometron'||rule.id==='timesplinter-mantle'||rule.id==='warden')&&body?[squad.id,body.id,...(formations.find(f=>f.id===body.id)?.members.filter(m=>m.retinueTo===body.id).map(m=>m.id)??[])]:[squad.id]});
      }
    }
  }
  for(const s of roster.filter(s=>NECRON_RETINUES.has(s.unit)&&s.retinueTo&&eligibleRetinueBodies(army,s.id).some(b=>b.id===s.retinueTo))){
    const body=s.retinueTo!,crypteks=retinueCrypteks(army,body);
    output.push({id:'11e-necron-retinue-'+s.id,title:s.id+' · '+(s.unit==='Cryptothralls'?'Cryptek Retinue':'Canoptek Retinue')+' → '+body,window:'Pre-battle',timing:'start',summary:'Declare Battle Formations: join this Bodyguard for the battle; its Starting Strength becomes '+formationBodyguardStrength(army,body)+'.',source:necronSource(s.unit),origin:'unit',units:[s.id,body]});
    if(s.unit==='Cryptothralls')for(const window of ['Shooting','Fight'] as const)output.push({id:'11e-necron-cryptothralls-bound-'+s.id+(window==='Fight'?'-fight':''),title:s.id+' · Bound Creation → '+crypteks.map(l=>l.id).join(', '),window,timing:'during',summary:'While these Cryptothralls and the Cryptek remain in the same formation, the Cryptek model has Feel No Pain 4+.',source:necronSource(s.unit),origin:'unit',units:[s.id,body,...crypteks.map(l=>l.id)]});
  }
  const arks=roster.filter(s=>s.unit==='Ghost Ark');
  if(arks.length)output.push({id:'11e-necron-ghost-ark-embark',title:'Ghost Ark · Dedicated Transport',window:'Pre-battle',timing:'start',summary:'Declare Battle Formations: each Ghost Ark must begin with at least one eligible whole unit embarked, or be destroyed without destruction triggers. Capacity: 10 Warriors and one Necrons Infantry Character. Eligible formation candidates: '+(ghostArkPassengers(army).map(s=>s.id).join(', ')||'none')+'. Do not assign the same unit to multiple transports.',source:necronSource('Ghost Ark'),origin:'unit',units:arks.map(s=>s.id)});
  output.push(...extraNecronPhaseReminders(army,roster));
  return output;
}

// Source-checked printed core abilities and bespoke phase cues. Only the listed
// datasheets are reconciled here; absence from these tables is not a coverage claim.
const ctans=['C’tan Shard of the Deceiver','C’tan Shard of the Nightbringer','C’tan Shard of the Void Dragon','Transcendent C’tan'];
const deepStrike=new Set([...ctans,'Nekrosor Ammentar','Hexmark Destroyer','Deathmarks','Ophydian Destroyers','Triarch Praetorians','Monolith','Obelisk','Night Scythe']);
const invulnerable=new Set([...ctans,'Canoptek Wraiths','Overlord','Imotekh the Stormlord','Orikan the Diviner','Illuminor Szeras','Skorpekh Lord','Lokhust Lord','Catacomb Command Barge','The Silent King','Ghost Ark','Tesseract Vault','Annihilation Barge','Triarch Stalker','Canoptek Doomstalker','Doomsday Ark']);
const fnp:Record<string,number>={...Object.fromEntries(ctans.map(u=>[u,5])),'Canoptek Reanimator':4,'Illuminor Szeras':4};
const demise:Record<string,string>={...Object.fromEntries(ctans.map(u=>[u,'D6'])),'The Silent King':'D6+3','Monolith':'D6','Obelisk':'D6','Tesseract Vault':'D6+3','Ghost Ark':'D3','Night Scythe':'D3','Doomsday Ark':'D3','Canoptek Doomstalker':'D3','Catacomb Command Barge':'1','Annihilation Barge':'1','Canoptek Spyders':'1','Triarch Stalker':'D3','Doom Scythe':'D3','Seraptek Heavy Construct':'D6+2'};
const damaged:Record<string,number>={'The Silent King':6,'Monolith':7,'Obelisk':8,'Tesseract Vault':8,'Doomsday Ark':5,'Canoptek Doomstalker':4,'Night Scythe':4,'Doom Scythe':4,'Seraptek Heavy Construct':9};
function extraNecronPhaseReminders(army:ArmySelection,roster:RosterInstance[]):GeneratedReminder[]{
 const out:GeneratedReminder[]=[];
 const formations=necronFormationRoots(army,roster);
 const formation=(s:RosterInstance)=>formations.find(f=>f.members.some(m=>m.id===s.id));
 const combat=['Shooting','Fight'] as const;
 for(const s of roster){
  const emit=(key:string,title:string,window:ReminderWindow,summary:string,timing:'start'|'during'|'end'='during',units:string[]=[s.id])=>out.push({id:'11e-necron-extra-'+key+'-'+s.id+'-'+window,title:s.id+' · '+title,window,timing,summary,source:necronSource(s.unit),origin:'unit',units});
  const f=formation(s);
  if(deepStrike.has(s.unit)&&f?.id===s.id&&f.members.every(m=>deepStrike.has(m.unit))){
   emit('deep-strike','Deep Strike','Pre-battle','This formation can be declared in reserves under the normal mission limits.','start',[f.id]);
   emit('deep-strike','Deep Strike','Movement','When making a legal ingress move, every model can set up more than 8″ horizontally from all enemies, including inside the enemy deployment zone.', 'during',[f.id]);
  }else if(deepStrike.has(s.unit)&&f?.id===s.id)emit('deep-strike','Deep Strike · formation restriction','Movement','All surviving models must have Deep Strike before this formation can use its special ingress placement.');
  if(invulnerable.has(s.unit)||s.unit==='Seraptek Heavy Construct')for(const window of combat){const save=s.unit==='Seraptek Heavy Construct'?'5+':'4+';emit('invulnerable',save+' invulnerable save',window,'For attacks allocated to models from this datasheet, choose the '+save+' invulnerable save when preferable to the modified armour save. This is not a blanket save for attached models.');}
  if(fnp[s.unit])for(const window of PHASES)emit('fnp','Feel No Pain '+fnp[s.unit]+'+',window,'For each wound this model would lose, roll D6; on '+fnp[s.unit]+'+ it is not lost. Apply only to models with this ability.');
  if(demise[s.unit])for(const window of PHASES)emit('demise','Deadly Demise '+demise[s.unit],window,'When '+(s.unit==='The Silent King'?'Szarekh (not a Menhir)':'this model')+' is destroyed, after any emergency disembarkation and fight-on-death, roll D6. On 6 each unit within 6″ suffers '+demise[s.unit]+' mortal wounds; roll separately for each unit if random.');
  if(damaged[s.unit]){
   const threshold=damaged[s.unit];
   for(const window of combat)if(s.unit!=='Tesseract Vault'||window==='Shooting')emit('damaged','Damaged profile',window,'While '+(s.unit==='The Silent King'?'Szarekh':'this model')+' has 1–'+threshold+' wounds remaining: '+(s.unit==='Tesseract Vault'?'select at most one C’tan Powers weapon rather than two.':s.unit==='The Silent King'?'halve Szarekh’s weapon Attacks and subtract 1 from this unit’s Hit rolls.':'subtract 1 from this model’s Hit rolls.'));
   if(['Monolith','Obelisk','Tesseract Vault','Seraptek Heavy Construct'].includes(s.unit))emit('damaged-oc','Damaged profile · OC','Command','While this model has 1–'+threshold+' wounds remaining, subtract '+(s.unit==='Seraptek Heavy Construct'?5:4)+' from its OC. Re-evaluate when scoring.');
  }
  if(s.unit==='Seraptek Heavy Construct')emit('super-heavy','Super-heavy Walker','Movement','Normal, Advance and Fall Back moves may pass through non-Titanic models and terrain sections up to 4″ tall. Optionally gain Mobile for that move; if chosen, roll D6 after moving and become battle-shocked on 1.');
  if(s.unit==='Hexmark Destroyer')emit('lone','Lone Operative','Shooting','If unattached, enemy models outside 12″ cannot see or target this unit with indirect fire.');
  if(s.unit==='Illuminor Szeras'&&roster.some(m=>m.id!==s.id))emit('illuminor','Illuminor','Shooting','While within 3″ of another friendly Necron unit, Szeras gains Lone Operative (12″ visibility and indirect fire restriction).');
  if(s.unit==='Nekrosor Ammentar'){
   emit('fights-first','Fights First','Fight','If every surviving model in this unit has Fights First, resolve it in the Fights First step when eligible.');
   if(roster.some(m=>m.id!==s.id&&necronKeywords['DESTROYER CULT'].has(m.unit)))emit('disciples','Protective Disciples','Shooting','While within 3″ of another friendly Destroyer Cult unit, gain Lone Operative (12″ visibility and indirect fire restriction).');
  }
  if(s.unit==='C’tan Shard of the Deceiver')emit('grand-illusion','Grand Illusion','Pre-battle','After both armies deploy, select up to three friendly Necron formations to redeploy; they can enter Strategic Reserves regardless of the normal reserve quantity limit.','end',formations.map(m=>m.id));
  if(s.unit==='C’tan Shard of the Deceiver'||s.unit==='Flayed Ones')emit('stealth','Stealth','Shooting','When every surviving model in the unit has Stealth, ranged attacks against it grant the Benefit of Cover, unless ignored.');
  if(s.unit==='Flayed Ones')emit('infiltrators','Infiltrators','Pre-battle','During deployment, if all models have this ability, deploy more than 8″ horizontally from the enemy deployment zone and every enemy unit.','start');
  if(s.unit==='Night Scythe'){
   emit('quantum-invader','Quantum Invader','Movement','This model may arrive during the Reinforcements step of your first, second or third Movement phase regardless of mission rules.');
   emit('hover','Hover','Movement','When taking to the skies, do not subtract 2″ from the maximum distance.');
  }
  if(s.unit==='Ophydian Destroyers')emit('tunnelling-ingress','Tunnelling Horrors · ingress','Movement','If Tunnelling Horrors was used last turn, this unit must make an ingress move now, including on your first turn.');
  if(s.unit==='Canoptek Scarab Swarms')for(const window of ['Command','Movement','Charge','Fight'] as const)emit('chittering','Chittering Swarm',window,'Engaged enemy models lose 1 OC (minimum 1). '+(roster.some(m=>necronKeywords.CRYPTEK.has(m.unit))?'While within 6″ of a friendly Cryptek model, Scarab models have OC 1.':''));
  if(s.unit==='Catacomb Command Barge')emit('carrier','Carrier Wave (Aura)','Command','Friendly Necron models in units within 6″ of this Barge gain +1 OC. Check when scoring.');
  if(s.unit==='The Silent King'){
   emit('leadership','The Silent King · Leadership','Command','Friendly Necron units within 6″ of Szarekh improve Leadership by 1.');
   emit('march','Relentless March (Aura)','Movement','If selected this battle round, friendly non-Monster Necron units within 6″ of Szarekh gain +2″ Move.');
   emit('blades','Phaeron of the Blades (Aura)','Charge','If selected this battle round, friendly non-Monster Necron units within 6″ of Szarekh may re-roll charge rolls.');
   emit('blades','Phaeron of the Blades (Aura)','Fight','If selected this battle round, eligible friendly non-Monster units within 6″ of Szarekh add 1 to melee Strength.');
   for(const window of combat)emit('stars','Phaeron of the Stars (Aura)',window,'If selected this battle round, friendly non-Monster Necron units within 6″ of Szarekh re-roll Hit and Wound rolls of 1.');
   for(const window of combat)emit('menhirs','Triarchal Menhirs',window,'If Szarekh is destroyed, all remaining Triarchal Menhirs are also destroyed.');
  }
 }
 return out;
}
