import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {TYRANID_SHEETS} from './tyranid-data.generated';
import {TYRANID_CARDS} from './tyranid-card-profiles.generated';
import {tyranidMusterUnits} from './tyranid-data';
import {tyranidKeywords} from './tyranid-keywords';
import {tyranidHasRangedWeapon,tyranidModelLoadouts,tyranidWeaponCount} from './tyranid-loadouts';
import {tyranidFormations} from './tyranid-transports';
import {TYRANID_PACK,tyranidSynapseSources} from './tyranid-synapse';
import {expandRoster,type RosterInstance} from './roster-instances';

type Step=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing'],GeneratedReminder['timing']?];
const shoot:Step=['Shooting','own','during'],fight:Step=['Fight','either','during'],move:Step=['Movement','own','during'];
const snap:Step=['Movement','opponent','end'],incoming:Step=['Shooting','opponent','during'],incomingSnap:Step=['Movement','own','during','end'],incomingArrival:Step=['Movement','opponent','during'],returnFire:Step=['Shooting','own','during'];
const eachPhase=PHASES.map((p):Step=>[p,'either','during']),endPhase=PHASES.map((p):Step=>[p,'either','end']);
// Keep the old own-Movement/end completion identity while showing defenses
// throughout the phase, including normal arrival/reaction attacks before Overwatch.
const rangedDefence=[incoming,incomingSnap,returnFire,incomingArrival] as const;
const defence=[...rangedDefence,fight] as const;
const cards=new Map(TYRANID_SHEETS.map(s=>[s.unit,s]));
const unitPassives=new Set(['Vanguard Predator','Guardian Organism','Warp Field','Foul Spores','Adaptive Instincts','Adaptable Predators','Alpha Invader','Alpha Warrior']);
const key=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const auditedDefences=new Set(['Foul Spores','Warp Field','Resilient Organism','Encephalic Diffusion','Psychological Saboteur · Enemy attacks']);

export function tyranidIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Tyranids')return [];
 const current={...army,instances:[...roster]},legal=new Set(tyranidMusterUnits(army)),native=roster.filter(s=>cards.has(s.unit)&&legal.has(s.unit));
 if(!native.length)return [];
 const groups=tyranidFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit))),declared=expandRoster(army),originalGroups=tyranidFormations(army,declared);
 const living=(s:RosterInstance)=>{const count=s.models??cards.get(s.unit)?.sizes[0]??0;return Number.isInteger(count)&&count>0;};
 const sameIdentity=(a:RosterInstance,b:RosterInstance)=>a.id===b.id&&a.unit===b.unit&&a.attachedTo===b.attachedTo&&a.retinueTo===b.retinueTo&&Boolean(a.keepUnattached)===Boolean(b.keepUnattached);
 function validDefensiveSource(s:RosterInstance){
  if(!living(s)||roster.filter(m=>m.id===s.id).length!==1)return false;
  const original=originalGroups.find(g=>!g.root.attachedTo&&!g.root.retinueTo&&g.members.some(m=>sameIdentity(s,m)));
  if(!original)return false;
  const ids=new Set(original.members.map(m=>m.id));
  for(const member of original.members){
   if(!living(member)||member.retinueTo||declared.filter(m=>m.id===member.id).length!==1)return false;
   const active=roster.filter(m=>m.id===member.id);
   if(active.length>1||active.length===1&&!sameIdentity(active[0],member))return false;
  }
  const extra=(m:RosterInstance)=>!ids.has(m.id)&&(ids.has(m.attachedTo??'')||ids.has(m.retinueTo??''));
  return !declared.some(extra)&&!roster.some(extra);
 }
 const groupOf=(s:RosterInstance)=>groups.find(g=>g.members.some(m=>m.id===s.id));
 const all=groups.flatMap(g=>g.members.map(s=>s.id));
 const rangedGroups=groups.filter(g=>g.members.some(tyranidHasRangedWeapon));
 const guns=rangedGroups.flatMap(g=>g.members.map(s=>s.id));
 const snapGuns=rangedGroups.filter(g=>!g.members.some(s=>tyranidKeywords(current,s).has('TITANIC'))).flatMap(g=>g.members.map(s=>s.id));
 const hits=(s:RosterInstance)=>(TYRANID_CARDS[s.unit]?.weapons??[]).some(w=>w.phase==='Shooting'&&!w.abilities.includes('torrent')&&tyranidWeaponCount(s,w.name)>0);
 const hitGuns=groups.filter(g=>g.members.some(hits)).flatMap(g=>g.members.map(s=>s.id));
 const result:GeneratedReminder[]=[];
 for(const squad of native){
  const {id,unit}=squad,group=groupOf(squad);if(!group)continue;
  const formation=group.members.map(s=>s.id),original=originalGroups.find(g=>g.members.some(s=>s.id===id));
  const leading=group.root.id!==id||!!original&&original.root.id!==id,bodyguardSource=group.root.id===id&&group.members.length>1;
  const ranged=group.members.some(tyranidHasRangedWeapon),hitRanged=group.members.some(hits),titanic=group.members.some(s=>tyranidKeywords(current,s).has('TITANIC'));
  function add(title:string,steps:readonly Step[],summary:string,recipients=[id],source=cards.get(unit)!.source){
   const expiry=bodyguardSource&&unitPassives.has(title)?' The original '+unit+' source must survive; if its last model dies to an attack, this benefit lasts until the attacking unit finishes its attacks.':'';
   if(!recipients.length||auditedDefences.has(title)&&!validDefensiveSource(squad))return;
   for(const [window,turn,timing,identityTiming=timing] of steps)result.push({id:['11e-tyranid-native',id,title,window,turn,identityTiming].join(':'),title,window,turn,timing,summary:summary+expiry,units:[...new Set([id,...recipients])],source,origin:'unit'});
  }
  const source=' The originally attached source must survive; its own leading benefit continues after its Bodyguard is destroyed. If the source dies to an attack, retain the benefit until that attacking unit finishes.';
  const led=(title:string,steps:readonly Step[],summary:string)=>{if(leading)add(title,steps,summary+source,formation);};
  const attack=(title:string,summary:string,snapSummary?:string,hitOnly=false)=>{
   add(title,[fight],summary,formation);
   if(hitOnly?hitRanged:ranged)add(title,[shoot],summary,formation);
   if(snapSummary&&ranged&&!titanic)add(title,[snap],snapSummary,formation);
  };
  switch(unit){
   case 'Hive Tyrant':
   case 'Winged Hive Tyrant':
    add('Will of the Hive Mind',eachPhase,'Once per battle round, one model in your army with this ability may reduce a friendly Tyranids formation’s Stratagem cost by 1CP when it is targeted within 12″ of that source model. This is one shared use per battle round across all Hive Tyrants and Winged Hive Tyrants, measured from the actual surviving model.',all);
    if(unit==='Hive Tyrant'){
     add('Onslaught',[move,shoot],'While within 6″ of this surviving Hive Tyrant model, ranged weapons in friendly Tyranids formations have Assault and Lethal Hits. After Advancing, use assault shooting only with Assault weapons, and do not then start an action that phase. Lethal Hits cannot trigger during snap shooting.',guns);
    }else add('Paroxysm',[['Fight','either','start']],'Choose one visible enemy unit within 12″ of this Winged Hive Tyrant and roll a D6. On 1, this Psyker suffers D3 mortal wounds; on 2+, reduce the Attacks of that enemy unit’s weapons by 1 for this Fight phase.');
    break;
   case 'The Swarmlord':
    add('Hive Commander',[['Command','own','start']],'While this Swarmlord is on the battlefield, gain 1CP at the start of your Command phase, subject to the normal limit on additional CP.');
    // Publisher v1.3 p18 replaces the stale CSV Warlord-only, unlimited aura.
    add('Malign Presence',eachPhase,'Once per turn, when your opponent targets one of their units within 12″ of this Swarmlord model with a Stratagem, you may increase that use’s CP cost by 1CP. This current rule does not require the Swarmlord to be your Warlord.',[id],TYRANID_PACK);
    add('Domination of the Hive Mind',eachPhase,'A friendly Tyranids formation within 9″ of this surviving Swarmlord model is within your army’s Synapse Range. This gives the Synapse Battle-shock and melee Strength benefits, but does not give nearby models the SYNAPSE keyword.',all);break;
   case 'Old One Eye':
    if(leading)attack('Alpha Leader','Re-roll attack Hit rolls for this attached formation.'+source,undefined,true);
    add('Unstoppable Monster',[['Command','either','start']],'At the start of each player’s Command phase, this Old One Eye model regains up to D3 lost wounds. Other Carnifex models do not receive this healing.');break;
   case 'Broodlord':
    if(leading)attack('Vicious Insight','Weapons equipped by this attached formation have Devastating Wounds.'+source,'This formation’s snap shots retain Devastating Wounds: snap shooting prevents Critical Hits, not Critical Wounds.'+source);
    add('Hypnotic Gaze',[['Fight','either','start']],'Select one enemy unit within Engagement Range of this Broodlord model. Subtract 1 from that enemy unit’s attack Hit rolls until this Fight phase ends.');break;
   case 'Tervigon':{
    const termagants=groups.filter(g=>g.members.some(s=>s.unit==='Termagants')).flatMap(g=>g.members.map(s=>s.id));
    add('Spawn Termagants',[['Command','own','during']],'Select one surviving friendly Termagants formation within 6″ of this Tervigon model and return up to D3+3 destroyed Termagant models to it. Each Termagants unit can be selected only once per phase; this does not return its attached Character or create a replacement destroyed unit.',termagants);
    add('Brood Progenitor',[shoot],'While a friendly Termagants formation is within 6″ of this Tervigon model, its ranged weapons have Lethal Hits. This applies to its attached models too, while the source and range condition hold. Lethal Hits cannot trigger during snap shooting.',termagants);break;
   }
   case 'Genestealers':
    attack('Vanguard Predator','Re-roll attack Hit rolls of 1. If the target is within range of an objective marker, also re-roll Wound rolls of 1.','Snap shots cannot re-roll Hit rolls; if the target is within range of an objective marker, re-roll Wound rolls of 1.');break;
   case 'Termagants':
    add('Skulking Horrors',[['Movement','opponent','during']],'After an enemy unit ends a move within 8″ of this formation in the opponent’s Movement phase, if this formation is unengaged it may make a Normal move up to D6″.',formation);break;
   case 'Hormagaunts':
    add('Bounding Leap',[move,['Charge','own','during']],'This entire formation may declare a charge after Advancing this turn, including its attached models while an original Hormagaunt source survives.',formation);break;
   case 'Ripper Swarms':
    add('Chitinous Horrors',endPhase,'While an enemy unit is within Engagement Range of these Ripper Swarms, halve the Objective Control characteristic of models in that enemy unit. Apply the normal order of characteristic modifiers when comparing control.');break;
   case 'Tyrant Guard':{
    const leaders=group.members.filter(s=>s.id!==id&&tyranidKeywords(current,s).has('CHARACTER'));
    add('Guardian Organism',eachPhase,'While an original Tyrant Guard model survives, each Character model leading this formation has Feel No Pain 5+. This protects the actual Character models, not every Tyrant Guard model.',leaders.map(s=>s.id));break;
   }
   case 'Hive Guard':
    add('Defensive Stance',[snap],'When this formation is selected for Fire Overwatch, its snap shots hit on unmodified 5+, improved to unmodified 4+ while this formation is within range of an objective you control. Other snap-shooting restrictions still apply, including no Hit re-rolls or Critical Hits.',formation);break;
   case 'Lictor':
    add('Pheromone Trail',[snap],'Once per battle round, one model in your army with Pheromone Trail may be targeted with Rapid Ingress for 0CP. Normal restrictions still apply: it must be in Strategic Reserves, and Rapid Ingress cannot be used in the first battle round.');
   case 'Deathleaper':
   case 'Neurolictor':
    add('Feeder Tendrils',[fight],'Each time this model destroys an enemy Character model, gain 1CP, subject to the normal limit on additional CP.');
    if(unit==='Deathleaper'){
     add('Fear of the Unseen',eachPhase,'Enemy models in a unit within 6″ of this Deathleaper model worsen their Leadership characteristic by 1. Measure from Deathleaper, not from a different friendly formation.');
     add('Fear of the Unseen · Battle-shock',[['Command','opponent','during']],'In the opponent’s Battle-shock step, each enemy unit within 6″ of Deathleaper that is below its Starting Strength must take a Battle-shock test. Its models also have worsened Leadership while within the aura.');
    }
    if(unit==='Neurolictor'){
     add('Neural Disruption',[['Command','own','during']],'Choose one enemy unit within 12″ of this Neurolictor; that enemy takes a Battle-shock test.');
     add('Psychological Saboteur · Enemy attacks',[incoming,['Movement','own','during'],returnFire,incomingArrival,fight],'A Battle-shocked enemy unit within 12″ of this Neurolictor subtracts 1 from its attack Hit rolls. This modifier does not alter fixed snap-shot Hit rolls.');
     add('Psychological Saboteur',[fight],'Friendly Tyranids models add 1 to Wound rolls when attacking a Battle-shocked enemy within 12″ of this Neurolictor.',all);
     add('Psychological Saboteur',[shoot],'Friendly Tyranids models add 1 to ranged Wound rolls against a Battle-shocked enemy within 12″ of this Neurolictor.',guns);
     add('Psychological Saboteur',[snap],'Friendly Tyranids snap shots add 1 to Wound rolls against a Battle-shocked enemy within 12″ of this Neurolictor. Snap shooting does not prevent Wound modifiers.',snapGuns);
    }break;
   case 'Maleceptor':
    add('Encephalic Diffusion',[incoming,returnFire,incomingArrival,fight],'Enemy units within 6″ of this Maleceptor subtract 1 from attack Hit rolls. If that enemy is Below Half-strength, also subtract 1 from its Wound rolls. Measure from this source model.');
    add('Encephalic Diffusion',[incomingSnap],'Enemy units within 6″ of this Maleceptor subtract 1 from attack Hit rolls during permitted normal arrival or reaction shooting. If the enemy unit is Below Half-strength, also subtract 1 from its Wound rolls. Snap shots retain the conditional Wound modifier, but their fixed Hit rolls are unchanged. Measure from this source model.');break;
   case 'Zoanthropes':
    if(tyranidModelLoadouts(squad).some(m=>key(m.model)==='neurothrope'))add('Spirit Leech',eachPhase,'While this formation’s original Neurothrope model survives, whenever an enemy within 6″ of this formation fails a Battle-shock test, that enemy suffers D3 mortal wounds and one model in this formation regains up to D3 lost wounds. The healing can affect an attached model, but the Neurothrope is the specific source.',formation);
    add('Warp Field',defence,'Models in friendly Tyranids formations within 6″ of this Zoanthrope formation have a 6+ invulnerable save. Apply it only when an attack is allocated to an eligible model; this does not replace a better available save.',all);break;
   case 'Venomthropes':
    // Publisher v1.3 PDF p20 expressly grants Stealth without the old MONSTER exception.
    add('Foul Spores',rangedDefence,'Friendly Tyranids formations within 6″ of this Venomthrope formation have Stealth, granting the Benefit of Cover against ranged attacks. Monster formations and formations containing a Hive Tyrant are eligible.',all,TYRANID_PACK);break;
   case 'Pyrovores':
    add('Burning Spray',[shoot],'After this formation shoots in your Shooting phase, choose one enemy it hit. That enemy cannot receive the Benefit of Cover for the rest of this Shooting phase. This is not triggered by Overwatch.',guns);break;
   case 'Haruspex':
    add('Grisly Spectacle',[fight],'After this Haruspex finishes attacks when selected to fight, if those attacks destroyed one or more enemy units, every enemy unit within 6″ of it takes a Battle-shock test. For an attached enemy unit, apply the current whole-formation destruction rule.');break;
   case 'Raveners':
    add('Death From Below',[['End of opponent turn','opponent','end']],'At the end of the opponent’s turn, if this formation is unengaged, you may remove the entire formation and put it into Strategic Reserves. Its attached models remain part of the same formation.',formation);break;
   case 'Gargoyles':
    add('Winged Swarm',[shoot],'After this formation shoots in your Shooting phase, if it is unengaged it may make a Normal move up to 6″. If it moves this way, the formation cannot declare a charge for the rest of this turn.',formation);
    add('Winged Swarm',[['Charge','own','during']],'This formation cannot declare a charge this turn if it used Winged Swarm after shooting.',formation);break;
   case 'Harpy':
    add('Spore Mine Cysts',[['Fight','opponent','end']],'Choose one option at the end of the opponent’s Fight phase: select a visible enemy within 24″, excluding Lone Operative units, and roll six D6, causing 1 mortal wound per 3+; or create a new D3-model Spore Mines unit within 6″ of this Harpy and more than 8″ horizontally from enemies. Only one model in your army may use the spawning option per turn. These are separate options; spawning does not also inflict the six-dice attack.');break;
   case 'Hive Crone':
    add('Airborne Predator',[shoot],'This Hive Crone adds 1 to ranged attack Hit rolls against a unit that can Fly. The modifier does not change fixed snap-shot accuracy.');break;
   case 'Mucolid Spores':
   case 'Spore Mines':
    add('Bio-minefield',[['Movement','opponent','during']],'Enemy units cannot begin or finish an Advance move within 6″ of this mine unit. This does not prohibit an otherwise legal Normal move or a charge.');
    add('Floating Death',eachPhase,'After this unit or an enemy unit finishes any move, resolve this separately for each surviving mine model within 3″ of an enemy unit. Choose one such enemy, destroy that mine model, then roll a D6. '+(unit==='Mucolid Spores'?'On 2–5, the enemy suffers D3 mortal wounds; on 6, it suffers D6.':'On 2–5, the enemy suffers 1 mortal wound; on 6, it suffers D3.')+' On 1, it suffers no mortal wounds.');break;
   // Tyrannocyte Aerial Seeding and passengers are emitted by tyranidTransportReminders.
   case 'Carnifexes':
    add('Blistering Assault',[incoming],'After an enemy unit finishes shooting in the opponent’s Shooting phase, if any model in this formation lost a wound to those attacks, this formation may make a surge move up to D6+2″. Follow surge restrictions; no casualty is required, and this is movement rather than return fire.',formation);break;
   case 'Biovores':
    add('Seed Spore Mines',[shoot],'Once per turn, one Biovores unit in your army may use this when selected to shoot in your Shooting phase, instead of firing any ranged weapons. Create one Spore Mines unit with one model per surviving Biovore, wholly within 48″ of this unit and more than 8″ horizontally from enemies. Using this ability does not remove Hidden. Spawned mines are new units, not equipment tokens.');break;
   case 'Trygon':
    add('Subterranean Tunnels',[move],'When this Trygon arrives using Deep Strike in your Movement phase, it may instead emerge more than 6″ horizontally from every enemy unit. If it uses this closer arrival, it cannot declare a charge for the rest of this turn. This option is not available during Rapid Ingress.');
    add('Subterranean Tunnels',[['Charge','own','during']],'This Trygon cannot declare a charge this turn if it used its more-than-6″ Subterranean Tunnels arrival.');break;
   case 'Mawloc':
    add('Terror From The Deep',[move,snap],'Whenever this Mawloc is set up using Deep Strike, roll a D6 for each enemy unit within 12″. On 2–4, it suffers D3 mortal wounds; on 5+, it suffers 3 mortal wounds and takes a Battle-shock test. Results below 5 do not force that test. This requires Deep Strike and does not trigger when arriving through a Subterranean Assault Tunnel Marker.');break;
   case 'Exocrine':
    add('Symbiotic Targeting',[shoot],'After this Exocrine shoots in your Shooting phase, select one enemy it hit. Friendly Tyranids models re-roll attack Hit rolls of 1 against that enemy until this Shooting phase ends. The mark does not persist into another phase and cannot grant snap-shot Hit re-rolls.',hitGuns);break;
   case 'Tyrannofex':
    add('Resilient Organism',defence,'Once per battle, after an attack is allocated to this Tyrannofex, you may change that attack’s Damage characteristic to 0. This does not prevent wounds that were not caused by an allocated attack.');break;
   case 'Toxicrene':
    add('Grasping Tendrils',[['Movement','opponent','during']],'When a non-Titanic enemy unit engaged with one or more friendly units with this ability is selected to Fall Back, you may roll one D6. On 3+, that enemy must Remain Stationary instead. Do not roll separately for each nearby Toxicrene.');
    add('Hypertoxic Miasma',[['Movement','own','end']],'Roll a D6 for each enemy unit within 6″ of this Toxicrene. On 2–3, it suffers 1 mortal wound; on 4–5, D3; on 6, D6. On 1, it suffers none.');break;
   case 'Sporocyst':
    add('Seed Mucolids',[shoot],'Once per turn, one Sporocyst in your army may use this when selected to shoot in your Shooting phase, instead of firing any ranged weapons. Create one Mucolid Spores unit of one model, wholly within 18″ of this source and more than 8″ horizontally from enemies.');
    add('Hive Defences',[snap],'You may target this Sporocyst with Fire Overwatch for 0CP even if a different unit already used that Stratagem this turn. This Sporocyst can be targeted only once per turn. Its attacks are still snap shots.');break;
   case 'Harridan':
    add('Frenzied Metabolism',[shoot],'When this Harridan is selected to shoot, it may add 1 to its attack Wound rolls until the phase ends. After those attacks, roll a D6; on 2+, the Harridan suffers D3 mortal wounds. As a Titanic model, it cannot use Fire Overwatch.');break;
   case 'Hierophant':
    attack('Apex-beast','This Hierophant adds 1 to attack Hit rolls against a Battle-shocked enemy. This does not change fixed snap-shot Hit rolls.',undefined,true);
    add('Stalking Forward',[move],'During Normal, Advance and Fall Back moves, this Hierophant can cross models other than Titanic models and terrain features up to 4″ high as though they were absent. Other movement and legal ending-position restrictions still apply.');break;
   case 'Parasite Of Mortrex':
    if(tyranidWeaponCount(squad,'Barbed ovipositor'))add('Parasitic Infection',[fight],'For each Infantry model destroyed by an attack from this Parasite’s actual barbed ovipositor, after its attacks finish you may create a new D3-model Ripper Swarms unit within 3″ of the Parasite. That new unit may be engaged with the destroyed model’s unit, but cannot be within Engagement Range of any other enemy. Other melee weapons do not trigger this ability.');
    add('It Itches!',[['Fight','either','start']],'Choose one enemy unit within Engagement Range of this Parasite model; that enemy takes a Battle-shock test.');break;
   case 'Barbgaunts':
    add('Disruption Bombardment',[shoot],'After this formation shoots in your Shooting phase, choose one enemy Infantry unit it hit. Until the end of the opponent’s next turn, reduce that unit’s Move by 2″ and subtract 2 from its Advance and Charge rolls.');
    add('Disruption Bombardment · Disrupted movement',[['Movement','opponent','during'],['Charge','opponent','during']],'An enemy Infantry unit marked by this Barbgaunt formation has −2″ Move and −2 to Advance and Charge rolls until the end of the opponent’s next turn.');break;
   case 'Neurogaunts':{
    const conduits=tyranidSynapseSources(army,roster).filter(s=>s.squad.unit!=='Neurogaunts');
    add('Neurocytes',eachPhase,'This Neurogaunt formation gains SYNAPSE only while within Synapse Range of a friendly Tyranids unit other than Neurogaunts. A Neuroloid token merely making it count as within army Synapse Range does not satisfy this condition and does not create a new Synapse conduit. Conditional relay sources in this roster: '+conduits.map(s=>s.squad.id).join(', ')+'.',conduits.length?formation:[]);break;
   }
   case 'Neurotyrant':
    if(leading)attack('Node Lash','Add 1 to attack Hit rolls for this formation; against a Battle-shocked enemy, also add 1 to Wound rolls.'+source,'When this formation fires snap shots against a Battle-shocked enemy, add 1 to Wound rolls. The Hit modifier does not alter snap-shot accuracy.'+source,true);
    add('Psychic Terror',[['Command','either','during']],'If at least one Neurotyrant with Psychic Terror survives on the battlefield when you use Shadow in the Warp, subtract 1 from every enemy unit’s resulting Battle-shock test. This extra penalty applies once, regardless of how many Neurotyrants you have.');
    add('Neuroloids',[['Command','own','during']],'Select up to two friendly Tyranids formations within 18″ of this Neurotyrant’s formation. They count as within army Synapse Range until the start of your next Command phase. The tokens do not grant SYNAPSE, do not turn Neurogaunts into new conduits, and add no physical models or transport spaces.',all);break;
   case 'Psychophage':
    add('Bio-stimulus',[shoot],'After this Psychophage shoots in your Shooting phase, mark one enemy unit it hit. Friendly Tyranids melee attacks against that enemy improve AP by 1 until this turn ends. Each enemy can receive this mark only once per turn.',all);
    add('Bio-stimulus · Marked prey',[fight],'Until the end of the turn in which this Psychophage marked an enemy after shooting, friendly Tyranids melee attacks against that enemy improve AP by 1.',all);
    add('Feeding Frenzy',[fight],'This Psychophage adds 1 to melee Hit rolls against an enemy below its Starting Strength. If that enemy is also Below Half-strength, add 1 to Wound rolls as well.');break;
   case 'Screamer-killer':
    add('Death Scream',[shoot],'After this Screamer-killer shoots in your Shooting phase, select one enemy unit it hit. That enemy takes a Battle-shock test with −1 to the test.');break;
   case 'Tyranid Warriors With Melee Bio-weapons':
    add('Adaptive Instincts',[fight],'Once per turn for this formation, when it is selected to fight or an enemy targets it in the Fight phase, choose either +1 Strength to this formation’s melee attacks or +1 Toughness to this formation. Choose one benefit, not both.',formation);break;
   case 'Tyranid Warriors With Ranged Bio-weapons':
    add('Adaptable Predators',[move,shoot,['Charge','own','during']],'This entire formation may shoot and declare a charge after Falling Back this turn, including its attached models while an original ranged Warrior source survives.',formation);break;
   case 'Von Ryan’s Leapers':
    add('Pouncing Leap',[['Charge','opponent','during']],'You may use Heroic Intervention on this formation regardless of other uses of that Stratagem this phase. Reduce this use’s cost by 1CP; it does not prevent using Heroic Intervention on other units that phase. All other targeting and charge restrictions still apply.',formation);break;
   case 'Winged Tyranid Prime':
    if(leading)attack('Alpha Warrior','Weapons equipped by this formation have Sustained Hits 1. This cannot trigger during snap shooting.'+source,undefined,true);
    add('Death Blow',[fight],'If this Winged Prime is destroyed by a melee attack before it has fought this phase, roll a D6. On 4+, keep the destroyed Prime temporarily; after the attacker’s unit finishes its attacks, that Prime may fight and is then removed. Other models in the formation do not gain this death attack.');break;
   case 'Norn Emissary':
   case 'Norn Assimilator':
    add('Singular Purpose',[['Pre-battle','either','during']],'At the start of the first battle round, choose one enemy unit or one objective for this Norn. For the rest of the battle, the enemy choice grants Hit and Wound re-rolls against that enemy; the objective choice instead grants Feel No Pain 5+ and Objective Control 15 while this Norn is within range of that objective. Choose one purpose for this model.');
    attack('Singular Purpose · Enemy quarry','Only if this Norn chose an enemy unit as its Singular Purpose, re-roll Hit and Wound rolls for attacks against that chosen enemy.','Only if this Norn chose an enemy unit as its Singular Purpose, re-roll Wound rolls for snap shots against that enemy. Snap-shot Hit rolls cannot be re-rolled.');
    add('Singular Purpose · Chosen objective',eachPhase,'Only if this Norn chose an objective as its Singular Purpose, it has Feel No Pain 5+ and Objective Control 15 while within range of that chosen objective. This does not grant the enemy-quarry re-rolls.');
    if(unit==='Norn Emissary')add('Unnatural Resilience',eachPhase,'This Norn Emissary has Feel No Pain 4+ specifically against mortal wounds. Use the best applicable Feel No Pain roll; do not roll several Feel No Pain abilities for one lost wound.');
    else{
     add('Harpoon Barbs',[['Movement','opponent','during']],'Once per turn, when an enemy unit engaged with this Norn Assimilator is selected to Fall Back, roll a D6. On 2+, that unit suffers D6 mortal wounds. This does not by itself stop its Fall Back move.');
     if(tyranidWeaponCount(squad,'Toxinjector harpoon'))add('Harpooned',[['Charge','own','during']],'When this Norn declares a charge, if an enemy Monster or Vehicle within 12″ was hit by its toxinjector harpoon this turn, it may gain +2 to Charge rolls until phase end. If it uses this ability, its charge must finish engaged with that marked Monster or Vehicle.');
    }break;
   case 'Hyperadapted Raveners':
    attack('Alpha Invader','Weapons equipped by this entire formation have Sustained Hits 1, including while the Hyperadapted Raveners are unattached. Torrent attacks and snap shots cannot trigger it.',undefined,true);
    add('Hypersensory Array',[snap,['Charge','opponent','during']],'Once per battle round for this unit, use either Rapid Ingress or Heroic Intervention on this formation with a 1CP discount, regardless of other uses of that chosen Stratagem this phase. This use does not block uses on other units. The two Stratagems share this ability’s one-use limit; Rapid Ingress remains prohibited in battle round one.',formation);break;
   case 'Tyranid Prime with Lash Whip':
    attack('Alpha Warrior','Weapons equipped by this Prime’s entire formation have Sustained Hits 1, including while it is unattached. Torrent attacks and snap shots cannot trigger it.',undefined,true);
    add('Aggressive Leader-beast',[incoming],'After an enemy unit finishes shooting in the opponent’s Shooting phase, if those attacks destroyed a model in this formation, the formation may make a surge move up to D6″. Follow surge restrictions. A lost wound without a destroyed model does not trigger this rule.',formation);break;
   case 'The Red Terror':
    if(tyranidWeaponCount(squad,'Gaping maw'))add('Swallow Whole',[fight],'For this Red Terror’s actual gaping maw attacks against an Infantry, Mounted or Beast unit, a successful unmodified Wound roll is a Critical Wound. Each time that weapon destroys an Infantry, Mounted or Beast model, this Red Terror regains up to D3+2 lost wounds. Its scything talons do not gain these effects.');
    add('Subterranean Hunter',[['Fight','either','end']],'At the end of either Fight phase, if this Red Terror unit is unengaged, you may remove it and place it in Strategic Reserves.');break;
  }
 }
 return result;
}
