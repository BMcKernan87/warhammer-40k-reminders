import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {thousandSonsKeywords,thousandSonsMusterUnits} from './thousand-sons-data';
import {thousandSonsFormations} from './thousand-sons-transports';
import {thousandSonsRitualCasters} from './thousand-sons-rituals';
import {thousandSonsHasRangedWeapon,thousandSonsModelLoadouts,thousandSonsWeaponCount} from './thousand-sons-loadouts';
import {TS_CARDS} from './ts-profiles.generated';
import {TS_STRATAGEMS} from './thousand-sons-detachments.generated';
import {eligibleThousandSonsUpgrades} from './thousand-sons-detachment-data';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];
const source='https://wahapedia.ru/wh40k11ed/factions/thousand-sons/';
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const attacks=['Shooting','Fight'] as const;
const inferno=['Inferno bolt pistol','Inferno boltgun','Inferno combi-bolter','Inferno combi-weapon'];
const effects:Record<typeof TS_STRATAGEMS[number]['id'],string>={
 '000010198002':'After enemy target selection, subtract 1 from Hit rolls against the chosen Thousand Sons or Scintillating Legions formation until phase end.',
 '000010198003':'Through phase end, an enemy model engaged with the chosen Thousand Sons unit can attack it only if there are no eligible Scintillating Legions targets for that attack.',
 '000010198006':'Select one unengaged Thousand Sons Psyker or Scintillating Legions unit and one visible enemy within 12″ of it. That enemy suffers −1 to its Charge rolls when it declares a charge.',
 '000010198004':'After an enemy ends a Normal move, Advance or Fall Back within 8″ of these unengaged Scintillating Legions, they may make a Normal move up to D6″.',
 '000010198005':'After enemy target selection, the non-Monster Legions unit can be targeted by ranged attacks only by models within 18″ until phase end.',
 '000010198007':'Move up to two non-Monster Scintillating Legions units or one Legions Monster to Strategic Reserves. Each must be more than 6″ horizontally from every enemy.',
 '000010194007':'Before the Psyker formation shoots, give its ranged Psychic weapons +9″ range and re-roll their Hit and Wound rolls until phase end.',
 '000010194005':'Choose a Psyker unit in range of an objective you control. Retain control until the enemy has higher control there at the end of a phase.',
 '000010194006':'After a Thousand Sons caster Channels the Warp and takes its Psychic test, before resolving that Ritual, re-roll all the test dice including the additional D6.',
 '000010194002':'After enemy target selection, incoming Psychic weapons gain Hazardous and all models in the targeted formation gain Feel No Pain 4+ against Psychic attacks through phase end.',
 '000010194003':'After a Psyker model fails a saving throw, change that attack’s Damage to 0. When several saves were rolled together, choose one attack with a failed save.',
 '000010194004':'Select a Kindred Sorcery ability for this Psyker unit alone until your next Command phase starts. It replaces its current ability, and may be one already chosen this battle.',
 '000009742007':'After the enemy selects this Psyker unit as a shooting target, it gains Stealth. Wholly within the Flow of Magic it also reduces its detection range by 3″.',
 '000009742002':'If this Psyker is in range of a controlled objective wholly within the Flow of Magic, retain control until the enemy has higher control there at a phase end.',
 '000009742005':'In your Move Units step choose a unit in Strategic Reserves.',
 '000009742004':'After the Psyker unit Falls Back, it may shoot or charge this turn. If wholly within the Flow when targeted, it can do both.',
 '000009742003':'After enemy target selection, roll for each model destroyed before it fights. On 4+ it fights after the attacker finishes and is then removed. Add 1 if the unit is wholly within the Flow of Magic.',
 '000009742006':'Before a Psyker unit wholly within the Flow of Magic shoots, its ranged weapons gain Ignores Cover. After shooting, choose one enemy hit to deny it Cover for the rest of the phase.',
 '000010965002':'When a friendly Infantry or Mounted Psyker formation suffers a mortal wound, it gains Feel No Pain 5+ against mortal wounds.',
 '000010965004':'When the friendly Infantry or Mounted Psyker unit is selected to Advance or Fall Back, that move does not stop it from starting an action.',
 '000010965003':'Choose one enemy engaged with the Psyker unit. Roll six D6, inflicting one mortal wound on it for each 4+.',
 '000010206007':'After an enemy ends its charge engaged with these Rubric Marines, attacks stronger than the unit’s Toughness suffer −1 to Wound against it until turn end.',
 '000010206005':'After enemy shooting destroys a friendly Thousand Sons Psyker model within 6″ of the selected Rubricae, the Rubricae may shoot after that enemy finishes its attacks. They may target only the unit that destroyed the Psyker, if eligible.',
 '000010206006':'After the enemy targets the Rubric Marines Psyker formation, subtract 1 Damage from attacks allocated to non-Psyker models in that formation through phase end.',
 '000010206003':'For this turn the Rubricae formation can ignore Move and Advance roll modifiers and its ranged weapons gain Assault.',
 '000010206002':'After these Rubricae Fall Back, they may shoot and charge this turn.',
 '000010206004':'Before the Psyker formation shoots, its fitted inferno bolt weapons gain Psychic and have Strength 5 until the end of the phase.',
 '000010969003':'When these Robots start an action within 12″ of a friendly Thousand Sons Psyker unit, the action does not prevent them from shooting.',
 '000010969002':'Choose one objective controlled by the Robots. Secure that objective.',
 '000010969004':'After enemy shooting targets the Robots within 12″ of a friendly Thousand Sons Psyker unit, subtract 1 from Wound rolls for ranged attacks stronger than their Toughness.',
 '000010973004':'When this Mutant Monster is selected to move, it gains Mobile.',
 '000010973003':'When the Mutant Infantry or Mounted unit Advances or Falls Back, that move does not prevent it from starting an action this turn.',
 '000010973002':'When the Mutant Infantry or Mounted unit Advances or Falls Back, its ranged attacks gain Assault this turn and the move does not prevent it from shooting or charging.',
 '000010210006':'Before a Thousand Sons Vehicle unit within 6″ of a friendly Thousand Sons Psyker shoots, its Vehicle models’ ranged weapons gain Psychic and +1 to Wound through phase end.',
 '000010210002':'After enemy target selection, worsen incoming AP against this Vehicle unit by 1 until the attacking unit has finished.',
 '000010210003':'If your Psyker is in range of an objective you control, mutate it. You retain control until the enemy has higher control at the end of a phase. While you control it, roll when an enemy ends a Normal move, Advance, Fall Back or charge in range. Each 4+ inflicts D3 mortal wounds on that unit.',
 '000010210005':'Choose a Vehicle unit within 6″ of a friendly Thousand Sons Psyker unit. Until your next Command phase starts it may ignore modifiers to model profiles, weapon WS/BS and rolls or tests, except saving throw modifiers.',
 '000010210004':'After a Vehicle Falls Back, select it and a friendly Thousand Sons Psyker unit within 6″. The Vehicle may shoot and charge this turn.',
 '000010210007':'After an enemy finishes a charge engaged with this Vehicle, roll six D6. Each 5+ deals one mortal wound to that enemy, then it must test for Battle-shock.',
 '000010202002':'Once per battle round, when a non-Monster Thousand Sons Character model is destroyed, add a one-model Tzeentch Chaos Spawn unit at phase end, as close as possible to the destroyed model and outside enemy Engagement Range.',
 '000010202004':'After this Mutant unit is selected to fight, its models can pile in and consolidate up to 6″ this phase. Models within 3″ of an enemy model can fight its unit if it is engaged with theirs.',
 '000010202005':'Choose a friendly Tzaangors unit below Starting Strength within 12″ of the selected Psyker model. Return up to D3+1 destroyed non-Character models to it.',
 '000010202006':'After this Mutant Advances it can shoot or declare a charge this turn. The choice may be made later in the turn.',
 '000010202007':'In your Move Units step set up the arriving Mutant unit from Strategic Reserves. It cannot charge this turn. This does not permit a first-turn arrival after Ambushing Hunters when going second.',
 '000010202003':'After enemy target selection, give models in the Tzaangors unit a 4+ invulnerable save through phase end.',
};

export function thousandSonsDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Thousand Sons')return [];
 const has=(d:string)=>army.detachments2026?.includes(d);
 const avail=new Set(thousandSonsMusterUnits(army)),active=roster.filter(s=>avail.has(s.unit));
 const tags=new Map(active.map(s=>[s.id,thousandSonsKeywords(army,s)]));
 const tag=(s:RosterInstance,k:string)=>tags.get(s.id)?.has(k)===true;
 const forms=thousandSonsFormations(army,active).map(f=>({...f,ranged:f.members.some(thousandSonsHasRangedWeapon)}));
 type Form=typeof forms[number];
 const kw=(f:Form,k:string)=>f.members.some(s=>tag(s,k));
 const sons=forms.filter(f=>kw(f,'THOUSAND SONS')),legions=forms.filter(f=>kw(f,'SCINTILLATING LEGIONS'));
 const psykers=sons.filter(f=>kw(f,'PSYKER')),rubricae=sons.filter(f=>kw(f,'RUBRICAE')),vehicles=sons.filter(f=>kw(f,'VEHICLE'));
 const mutants=forms.filter(f=>kw(f,'TZEENTCH')&&kw(f,'MUTANT')),goats=sons.filter(f=>f.members.some(s=>s.unit==='Tzaangors'));
 const robots=sons.filter(f=>f.members.some(s=>s.unit==='Sekhetar Robots')),mortalGoats=mutants.filter(f=>kw(f,'INFANTRY')||kw(f,'MOUNTED'));
 const casters=thousandSonsRitualCasters(army,active);
 const roots=(list:readonly Form[])=>list.map(f=>f.root);
 const names=(list:readonly Form[])=>roots(list).map(s=>s.id).join(', ');
 const group=(s:RosterInstance)=>forms.find(f=>f.members.some(m=>m.id===s.id))!;
 const selected=(s:RosterInstance)=>army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??s.enhancement;
 const mantle=(f:Form)=>has('Hexwarp Thrallband')&&f.members.some(s=>selected(s)==='Noctilith Mantle'&&eligibleThousandSonsUpgrades(army,s.unit,s.id).some(u=>u.name==='Noctilith Mantle'));
 const profiles=(s:RosterInstance,p:'Shooting'|'Fight')=>(TS_CARDS[s.unit]?.weapons??[]).filter(w=>w.phase===p&&thousandSonsWeaponCount(s,w.name)>0);
 const psychicWeapons=(s:RosterInstance,p:'Shooting'|'Fight')=>profiles(s,p).filter(w=>w.abilities.some(a=>a.toLowerCase()==='psychic')||(has('Sekhetar Cohort')&&s.unit==='Sekhetar Robots'));
 const hasPsychic=(f:Form,p:'Shooting'|'Fight')=>f.members.some(s=>psychicWeapons(s,p).length);
 const roles=(s:RosterInstance,k:string)=>[...new Set(thousandSonsModelLoadouts(s).filter(m=>thousandSonsKeywords(army,s,m.model).has(k)).map(m=>m.model))];
 const rows:GeneratedReminder[]=[];
 const emit=(key:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:readonly RosterInstance[],sourceRuleId?:string)=>{
  if(units.length)rows.push({id:'11e-ts-'+key+'-'+window+'-'+turn,title,window,turn,timing,summary,units:[...new Set(units.map(s=>s.id))],origin:'detachment',source,sourceRuleId});
 };
 const card=(key:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,fs:Form[])=>emit(key,title,window,turn,timing,summary,roots(fs));
 if(has('Changehost of Deceit')&&legions.length&&psykers.length)
  card('illusions','Infernal Pacts · Daemonic Illusions','Shooting','opponent','during','While within 6″ of and visible to a friendly Scintillating Legions unit, the Psyker formation’s models have a 4+ invulnerable save against ranged attacks. Aura sources: '+names(legions)+'.',psykers);
 if(has('Hexwarp Thrallband')){
  for(const p of phases)card('flow','Flow of Magic · determine areas',p,'either','start','Your deployment zone is always in the Flow. No Man’s Land and the enemy deployment zone enter the Flow for this phase separately if you control at least half the objectives in the respective area.',sons);
  for(const p of attacks){
   const affected=sons.filter(f=>hasPsychic(f,p)),automatic=affected.filter(mantle),others=affected.filter(f=>!mantle(f));
   card('flow-wounds','Flow of Magic · Psychic attacks',p,p==='Fight'?'either':'own','during','For a Psychic attack, re-roll Wound rolls of 1. If the attacking model is wholly within the Flow of Magic, instead add 1 to its Wound roll.',others);
   card('mantle-wounds','Noctilith Mantle · Psychic attacks',p,p==='Fight'?'either':'own','during','The bearer’s formation on the battlefield counts as wholly within the Flow. Its models gain +1 to Wound on Psychic attacks instead of re-rolling Wound rolls of 1.',automatic);
  }
 }
 if(has('Grand Coven')){
  const wielders=sons.filter(f=>hasPsychic(f,'Shooting')||hasPsychic(f,'Fight'));
  const menu=(wielders.some(f=>hasPsychic(f,'Shooting'))?'Imbued Manifestation adds 6″ to ranged Psychic weapon range. ':'')+'Psychic Maelstrom grants +1 to Wound with Psychic weapons. Wrath of the Immaterium grants Devastating Wounds to Psychic weapons.';
  card('kindred','Kindred Sorcery','Command','own','during','Choose one ability until your next Command phase starts. Each can be selected once per battle. '+menu,wielders);
  for(const p of attacks)card('kindred-attacks','Kindred Sorcery · active weapon effect',p,p==='Fight'?'either':'own','during',(p==='Shooting'?'Imbued Manifestation increases range by 6″. ':'')+'If chosen, Psychic Maelstrom adds 1 to Wound or Wrath of the Immaterium grants Devastating Wounds. Apply only the active choice to fitted Psychic weapons.',wielders.filter(f=>hasPsychic(f,p)));
 }
 if(has('Warpmeld Pact')){
  emit('goat-oc','Warpmeld Pact · Tzaangors','Command','either','during','Tzaangors gain Battleline. While their unit is not Battle-shocked, its Tzaangor models gain 1 Objective Control.',goats.flatMap(f=>f.members.filter(s=>s.unit==='Tzaangors')));
  for(const p of attacks){
   card('sacrifice','Warpmeld Sacrifice',p,'either','during','After enemy target selection, you may sacrifice for −1 to incoming Wound rolls until phase end. When your unit is selected to attack, before choosing targets, it may sacrifice for +1 to its Wound rolls until phase end. Each sacrifice inflicts D3 mortal wounds on your unit at phase end.',mortalGoats.filter(f=>p==='Fight'||f.ranged));
   if(p==='Shooting')card('sacrifice-melee-only','Warpmeld Sacrifice · defend',p,'opponent','during','After an enemy selects this unit as a shooting target, it may sacrifice for −1 to incoming Wound rolls this phase. The unit suffers D3 mortal wounds at phase end.',mortalGoats.filter(f=>!f.ranged));
  }
 }
 if(has('Rubricae Phalanx'))for(const p of attacks)emit('dust','All is Dust',p,p==='Fight'?'either':'opponent','during','When an attack with unmodified Damage 1 is allocated to a Rubricae model, add 1 to its armour saving throw.',rubricae.flatMap(f=>f.members.filter(s=>tag(s,'RUBRICAE'))));
 if(has('Warpforged Cabal')){
  for(const p of attacks)card('warpfire','Warpfire Infusion',p,p==='Fight'?'either':'own','during','When the Vehicle unit is selected to attack, re-roll one Hit, one Wound or one Damage roll.'+(psykers.length?' If within 6″ of a friendly Thousand Sons Psyker model, re-roll one of each instead. Possible Psyker formations: '+names(psykers)+'.':''),vehicles.filter(f=>p==='Fight'||f.ranged));
  if(psykers.length)for(const p of phases)emit('warpfire-demise','Warpfire Infusion · Deadly Demise',p,'either','during','If a Vehicle model with Deadly Demise is destroyed within 6″ of a friendly Thousand Sons Psyker model, its Deadly Demise triggers on 5+.',vehicles.flatMap(f=>f.members.filter(s=>Boolean(TS_CARDS[s.unit]?.demise))));
 }
 if(has('Ritual of Regeneration')){
  const eligible=psykers.filter(f=>!kw(f,'MONSTER')&&f.members.some(s=>casters.some(c=>c.id===s.id)));
  const cursed=eligible.filter(f=>f.members.some(s=>selected(s)==='Curse of Life'));
  card('heal','Sorcerous Invigoration','Shooting','own','start','Once per turn for this unit, when it successfully manifests a Ritual, it heals D3 wounds.',eligible.filter(f=>!cursed.includes(f)));
 }
 if(has('Sekhetar Cohort')){
  for(const p of attacks)card('animus','Ensorcelled Animus',p,p==='Fight'?'either':'own','during','The Robots’ attacks gain Psychic.'+(p==='Fight'&&psykers.length?' Within 12″ of a friendly Thousand Sons Psyker unit their melee attacks also improve WS by 1. Aura sources: '+names(psykers)+'.':''),robots.filter(f=>p==='Fight'||f.ranged));
 }
 if(has('Servants of Change'))card('detection','All-Seeing Mutant Hordes','Shooting','own','during','While this Mutant unit shoots in your Shooting phase, increase the detection range of enemy units by 6″.',mutants.filter(f=>f.ranged));
 for(const strat of TS_STRATAGEMS){
  if(!has(strat.detachment))continue;
  for(const {phase,turn} of strat.windows){
   let targets=forms.filter(f=>f.members.some(s=>strat.units.some(n=>n===s.unit))),body=effects[strat.id],modelTargets:RosterInstance[]|undefined;
   switch(strat.id){
    case '000010198003':if(!legions.length)continue;targets=sons;body+=' Selected Legions formations: '+names(legions)+'.';break;
    case '000010198006':targets=[...psykers,...legions];break;
    case '000010198004':targets=legions;if(sons.length)body+=' If wholly within 6″ of a friendly Thousand Sons unit, move up to 6″ instead. Nearby candidates: '+names(sons)+'.';break;
    case '000010194007':targets=psykers.filter(f=>hasPsychic(f,'Shooting'));break;
    case '000010194004':targets=psykers.filter(f=>hasPsychic(f,'Shooting')||hasPsychic(f,'Fight'));break;
    case '000010194006':modelTargets=casters.filter(s=>tag(s,'THOUSAND SONS'));break;
    case '000010194003':
     modelTargets=active.filter(s=>tag(s,'THOUSAND SONS')&&roles(s,'PSYKER').length);
     if(modelTargets.length)body+=' Eligible models: '+modelTargets.map(s=>s.id+' ('+roles(s,'PSYKER').join(', ')+')').join('. ')+'.';break;
    case '000009742005':{
     const rub=targets.some(f=>f.root.unit==='Rubric Marines'),scarabs=targets.some(f=>f.root.unit==='Scarab Occult Terminators');
     if(rub)body+=' Rubric Marines gain Deep Strike through the end of the phase.';
     if(scarabs)body+=' Scarab Occult Terminators using Deep Strike can set up wholly within the Flow and more than 6″ horizontally from every enemy model. They cannot charge this turn.';break;
    }
    case '000009742007':case '000009742004':case '000009742003':case '000009742006':
     if(targets.some(mantle))body+=' These Noctilith Mantle formations count as wholly within the Flow while on the battlefield: '+names(targets.filter(mantle))+'.';break;
    case '000010206005':
     if(!psykers.length)continue;targets=rubricae.filter(f=>f.ranged);body+=' Possible Psyker sources: '+names(psykers)+'.';break;
    case '000010206006':targets=psykers.filter(f=>f.root.unit==='Rubric Marines'&&f.members.some(s=>thousandSonsModelLoadouts(s).some(m=>!thousandSonsKeywords(army,s,m.model).has('PSYKER'))));break;
    case '000010206004':
     targets=psykers.filter(f=>f.members.some(s=>inferno.some(w=>thousandSonsWeaponCount(s,w)>0)));
     if(targets.length)body+=' Equipped profiles: '+targets.map(f=>f.root.id+' — '+inferno.filter(w=>f.members.some(s=>thousandSonsWeaponCount(s,w)>0)).join(', ')).join('. ')+'.';break;
    case '000010969003':case '000010969004':
     if(!psykers.length)continue;targets=robots;body+=' Possible Psyker formations: '+names(psykers)+'.';break;
    case '000010973002':
     if(targets.length&&!targets.some(f=>f.ranged))body='When this Mutant Infantry or Mounted unit Advances or Falls Back, that move does not prevent it from declaring a charge this turn.';break;
    case '000010210006':case '000010210005':case '000010210004':
     if(!psykers.length)continue;targets=vehicles.filter(f=>strat.id!=='000010210006'||f.ranged);body+=' Psyker formations: '+names(psykers)+'.';break;
    case '000010202002':modelTargets=active.filter(s=>tag(s,'THOUSAND SONS')&&tag(s,'CHARACTER')&&!tag(s,'MONSTER'));break;
    case '000010202005':
     if(!goats.length)continue;modelTargets=active.filter(s=>tag(s,'THOUSAND SONS')&&roles(s,'PSYKER').length);body+=' Tzaangors recipients: '+names(goats)+'.';break;
    case '000010202007':
     targets=mutants;
     if(targets.some(f=>kw(f,'MONSTER')))body+=' Monsters must remain more than 8″ horizontally from every enemy.';
     if(targets.some(f=>!kw(f,'MONSTER')))body+=' Other Mutants must remain more than 6″ horizontally from every enemy.';break;
   }
   if(phase==='Shooting'&&turn==='own'&&['000009742006','000010210006','000010969003'].includes(strat.id))targets=targets.filter(f=>f.ranged);
   const title=strat.name.toLowerCase().replace(/(^|[\s‑-])\p{L}/gu,c=>c.toUpperCase())+' · '+strat.cp+'CP';
   emit('strat-'+strat.id,title,phase,turn,strat.timing,body,modelTargets??roots(targets),strat.id);
  }
 }
 for(const bearer of active){
  const pick=selected(bearer),up=pick&&eligibleThousandSonsUpgrades(army,bearer.unit,bearer.id).find(u=>u.name===pick);
  if(!up)continue;
  const f=group(bearer),unit=[f.root];
  const cue=(p:ReminderWindow,turn:Turn,when:Timing,body:string,units:readonly RosterInstance[]=[bearer])=>
   emit(up.id+'-'+bearer.id,bearer.id+' · '+up.name,p,turn,when,body,units,up.id);
  switch(up.id){
   case '000010209002':case '000010193002':case '000010201002':case '000010197003':case '000010193003':case '000010209005':
    // These only modify the caster's actual Ritual sequence, printed by thousandSonsRitualReminders.
    break;
   case '000010972002':cue('Movement','own','during','At the start or end of this Shaman’s move, choose one friendly Battle-shocked Mutant within 6″. It recovers from Battle-shock.',roots(mutants));break;
   case '000010968002':
    if(robots.length){
     cue('Movement','own','during','At the start or end of this Sorcerer’s move, choose friendly Sekhetar Robots within 3″. That unit heals D3+1 wounds.',roots(robots));
     cue('Shooting','opponent','during','The bearer gains Lone Operative while within 3″ of a friendly Sekhetar Robots unit. Possible bodyguards: '+names(robots)+'.');
    }break;
   case '000010964002':for(const p of phases)cue(p,'either','end','Once per battle per army, when this bearer has been destroyed, roll a D6 at phase end. On 2+ return the model unengaged as close as possible to its former position with 3 wounds. Its unit is unattached and has Starting Strength 1.');break;
   case '000010205002':{
    const line=rubricae.filter(g=>kw(g,'BATTLELINE')),others=rubricae.filter(g=>!kw(g,'BATTLELINE'));
    const choices=[line.length>=2?'two different Rubricae Battleline units ('+names(line)+')':'',others.length?'one other Rubricae unit ('+names(others)+')':''].filter(Boolean);
    if(choices.length)cue('Pre-battle','either','start','At the start of Declare Battle Formations, choose '+choices.join(' or ')+'. The selected units gain Infiltrators, including Characters subsequently attached to them.',roots([...(line.length>=2?line:[]),...others]));break;
   }
   case '000010197002':cue('Shooting','own','start','Choose one visible enemy within 12″ of the bearer. It must take a Battle-shock test, suffering 3 mortal wounds if the test fails.');break;
   case '000009741002':
    for(const p of attacks)if(hasPsychic(f,p))cue(p,p==='Fight'?'either':'own','during','The formation’s equipped Psychic weapons gain 1 Strength, or 2 Strength instead while the whole formation is within the Flow of Magic.',unit);break;
   case '000010205003':for(const p of phases)cue(p,'either','during','Rubricae units within 9″ of the bearer may re-roll Battle-shock tests.',roots(rubricae));break;
   case '000009741003':
    for(const p of attacks)if(f.members.some(s=>psychicWeapons(s,p).some(w=>w.abilities.some(a=>a.toLowerCase()==='hazardous'))))
     cue(p,p==='Fight'?'either':'own','during','When this formation is wholly within the Flow of Magic, re-roll failed Hazardous tests for its equipped Psychic weapons.',unit);
    if(bearer.unit==='Daemon Prince of Tzeentch')cue('Shooting','opponent','during','While this formation is wholly within the Flow, the bearer may extend the range of Glamour of Tzeentch from 6″ to 12″.',roots(sons.filter(g=>kw(g,'INFANTRY'))));
    break;
   case '000010209003':if(vehicles.length)cue('Shooting','opponent','during','The bearer gains Lone Operative while within 3″ of a friendly Thousand Sons Vehicle. Possible Vehicles: '+names(vehicles)+'.');break;
   case '000010201003':if(f.root!==bearer)for(const p of attacks)cue(p,p==='Fight'?'either':'opponent','during','While this Shaman leads its formation, subtract 1 from incoming Hit rolls against that formation.',unit);break;
   case '000010972003':cue('Fight','either','during','The upgraded Spawn unit improves its melee AP by 1 and its melee attacks gain Cleave 1.',unit);break;
   case '000010964003':if(psykers.includes(f)&&!kw(f,'MONSTER')&&f.members.some(s=>casters.some(c=>c.id===s.id)))cue('Shooting','own','start','Once per turn when this formation successfully manifests a Ritual, Sorcerous Invigoration heals D3 wounds. If the bearer heals as a result, it can add 3 to the number of wounds healed.',unit);break;
   case '000010968003':cue('Movement','own','during','At the start or end of the Sorcerer’s move, choose friendly Sekhetar Robots within 6″ of its formation. Their ranged attacks gain +1 Ballistic Skill until your next turn starts.',roots(robots.filter(g=>g.ranged)));break;
   case '000010209004':cue('Command','own','during','Choose one friendly Thousand Sons Vehicle model within 6″ of the bearer. It regains up to D3 wounds.',roots(vehicles));break;
   case '000010197004':cue('Pre-battle','either','end','After both armies deploy, redeploy up to three friendly Thousand Sons units. They may go into Strategic Reserves regardless of existing Reserves.',roots(sons));break;
   case '000010205004':
    if(f.root!==bearer)for(const p of attacks)cue(p,p==='Fight'?'either':'own','during','While the bearer leads, add 1 to the Hit rolls of Rubricae models in its formation.',f.members.filter(s=>tag(s,'RUBRICAE')&&(p==='Fight'||thousandSonsHasRangedWeapon(s))));break;
   case '000009741004':if(psychicWeapons(bearer,'Shooting').length)cue('Shooting','own','during','While the whole formation is within the Flow of Magic, add 3 Attacks to ranged Psychic weapons equipped by the bearer.');break;
   case '000010193004':
    cue('Command','own','during','Once per battle per army, place this unengaged formation in Strategic Reserves. It gains Deep Strike until your next Shooting phase starts and must return in your next Movement phase.',unit);
    cue('Movement','own','during','If the Crystal was used, this formation must make an ingress move in this Movement phase, including in turn one. Use its temporary Deep Strike.',unit);break;
   case '000010201004':cue('Pre-battle','either','during','The bearer alone gains Scouts 6″. It can also lead Tzaangors. A formation can scout only if all its models have Scouts.');break;
   case '000010201005':for(const p of phases)cue(p,'either','during','The Shaman bearer has 5 Wounds and Feel No Pain 4+.');break;
   case '000010193005':for(const p of attacks)if(psychicWeapons(bearer,p).length)cue(p,p==='Fight'?'either':'own','during','Add 1 Strength and 1 Damage to the bearer’s equipped Psychic weapons.');break;
   case '000009741005':
    cue('Shooting','own','start','While on the battlefield this formation is wholly within your Flow of Magic. No models in it may use Rituals.',unit);break;
   case '000010197005':for(const p of phases)cue(p,'either','start','Once per battle, the bearer gains a 2+ invulnerable save until the end of the phase.');break;
   case '000010205005':if(profiles(bearer,'Fight').length)cue('Fight','either','during','The bearer’s melee weapons gain Sustained Hits D3 and Devastating Wounds.');break;
  }
 }
 return rows;
}
