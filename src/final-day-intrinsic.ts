import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {finalDayHasRangedWeapon} from './final-day-loadouts';
import {gscAlliedMusterUnits,gscAllyFaction} from './gsc-allies';
import {GSC_ALLIED_CORE,GSC_ALLIED_SHEETS} from './gsc-allies-data.generated';
import {gscTransportOptions} from './gsc-army-transports';
import {gscFormations} from './gsc-transports';
import {expandRoster,type RosterInstance} from './roster-instances';

const core='https://wahapedia.ru/wh40k11ed/the-rules/core-rules/';
const pack='https://assets.warhammer-community.com/eng_14-10_wh40k_faction_pack_tyranids-an12izciwp-np2hnkcsje.pdf';
const rippers='https://wahapedia.ru/wh40k11ed/factions/tyranids/Ripper-Swarms';
const cards=new Map(GSC_ALLIED_SHEETS.map(sheet=>[sheet.unit,sheet.source]));
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];

export function finalDayIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 const allowed=new Set(gscAlliedMusterUnits(army));
 const tyranids=roster.filter(s=>allowed.has(s.unit)&&gscAllyFaction(s.unit)==='Tyranids');
 if(!tyranids.length)return [];
 const ids=new Set(tyranids.map(s=>s.id));
 const groups=gscFormations(army,roster).filter(g=>g.members.every(s=>ids.has(s.id)));
 const roots=groups.map(g=>g.body.id);
 const gunners=groups.filter(g=>g.members.some(finalDayHasRangedWeapon)).map(g=>g.body.id);
 const output:GeneratedReminder[]=[];
 function emit(key:string,name:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:string[],source:string){
  if(!units.length)return;
  output.push({id:['11e-final-day',key,window,turn].join(':'),title:name,window,turn,timing,origin:'unit',summary,units:[...new Set(units)],source});
 }
 function allHave(rule:string):string[]{
  return groups.filter(g=>g.members.every(s=>GSC_ALLIED_CORE[s.unit]?.includes(rule))).map(g=>g.body.id);
 }
 const deep=allHave('Deep Strike');
 emit('deep-strike','Deep Strike','Movement','own','during','On an ingress move in the Move Units step, place the whole unit more than 8″ horizontally from all enemy units, including inside their deployment zone.',deep,core);
 emit('deep-strike','Deep Strike · Rapid Ingress','Movement','opponent','end','From battle round two, a unit using Rapid Ingress may use its Deep Strike placement more than 8″ horizontally from all enemies.',deep,core);
 emit('infiltrators','Infiltrators','Pre-battle','either','during','During deployment, set up every model more than 8″ horizontally from both the enemy deployment zone and all enemy units.',allHave('Infiltrators'),core);
 emit('fights-first','Fights First','Fight','either','during','If eligible, fight in the Fights First alternation, starting with the player whose turn it is. The ability requires every surviving model to have it.',allHave('Fights First'),core);
 for(const [window,turn] of [['Shooting','opponent'],['Movement','own']] as const){
  const timing=window==='Movement'?'end':'during';
  emit('stealth','Stealth',window,turn,timing,'The unit receives the Benefit of Cover against ranged attacks, including Fire Overwatch, while all its models have Stealth.',allHave('Stealth'),core);
  emit('lone-operative','Lone Operative',window,turn,timing,'Enemy models further than 12″ cannot see this unit or target it with Indirect Fire. The range is measured from the attacking model.',allHave('Lone Operative'),core);
 }
 const lictors=tyranids.filter(s=>s.unit==='Lictor').map(s=>s.id);
 emit('pheromone','Pheromone Trail','Movement','opponent','end','Once per battle round across all Lictors, choose one in Strategic Reserves for Rapid Ingress at 0CP. Use a legal battlefield edge from round two. It has no Deep Strike placement.',lictors,cards.get('Lictor')!);
 const tyrants=tyranids.filter(s=>s.unit==='Winged Hive Tyrant').map(s=>s.id);
 for(const phase of phases){
  emit('hive-mind','Will of the Hive Mind',phase,'either','during','Once per battle round across these Hive Tyrants, when a friendly Tyranids unit within 12″ of the chosen Tyrant is targeted by a Stratagem, reduce that use by 1CP, to a minimum of 0CP. Sources: '+tyrants.join(', ')+'. Eligible formations: '+roots.join(', ')+'.',tyrants.length?[...tyrants,...roots]:[],pack+'#page=20');
 }
 const tendrils=tyranids.filter(s=>['Lictor','Deathleaper','Neurolictor'].includes(s.unit)).map(s=>s.id);
 emit('feeder-tendrils','Feeder Tendrils','Fight','either','during','Gain 1CP each time one of these models destroys an enemy Character model.',tendrils,cards.get('Lictor')!);
 const pods=tyranids.some(s=>s.unit==='Tyrannocyte')?gscTransportOptions(army,[...roster]):[];
 for(const squad of tyranids){
  const {id,unit}=squad,source=cards.get(unit)!;
  const group=groups.find(g=>g.members.some(s=>s.id===id));
  if(!group)continue;
  const formation=[...new Set([id,...group.members.map(member=>member.id)])];
  function add(name:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units=[id],reference=source){
   emit(id+':'+name,name,window,turn,timing,summary,units,reference);
  }
  const save=unit==='Von Ryan’s Leapers'?'6+':['Deathleaper','Neurolictor','Winged Hive Tyrant'].includes(unit)?'4+':undefined;
  if(save){
   for(const [window,turn] of [['Shooting','opponent'],['Fight','either'],['Movement','own']] as const){
    add('Invulnerable save',window,turn,window==='Movement'?'end':'during','When allocating an attack to this model, it may use a '+save+' invulnerable save instead of its armour save.');
   }
  }
  if(GSC_ALLIED_CORE[unit]?.some(a=>a.startsWith('Deadly Demise'))){
   for(const window of phases){
    add('Deadly Demise D3',window,'either','during','When this model is destroyed, resolve any emergency disembarkation first, then roll one D6. On a 6, each unit within 6″ takes D3 mortal wounds. Roll damage separately for each unit.');
   }
  }
  if(unit==='Trygon'||unit==='Mawloc'){
   add('Damaged','Fight','either','during','At 1–5 wounds remaining, subtract 1 from this model’s Hit rolls.');
   if(finalDayHasRangedWeapon(squad))add('Damaged','Shooting','own','during','At 1–5 wounds remaining, subtract 1 from this model’s Hit rolls.');
  }
  if(unit==='Deathleaper'){
   add('Fear of the Unseen','Command','opponent','during','Worsen the Leadership of enemy models in units within 6″ by 1. In the enemy Battle-shock step, each such unit below its Starting Strength must test.');
   add('Fear of the Unseen','Command','own','during','Enemy models in units within 6″ have Leadership worsened by 1, including for a Battle-shock test forced in this phase.');
   for(const phase of ['Movement','Shooting','Charge','Fight'] as const)add('Fear of the Unseen',phase,'either','during','Worsen Leadership by 1 for enemy models in units within 6″ whenever their unit takes a Leadership or Battle-shock test.');
  }
  if(unit==='Raveners')add('Death From Below','End of opponent turn','opponent','end','If the entire formation is unengaged, it may leave the battlefield for Strategic Reserves.',formation);
  if(unit==='Gargoyles'){
   add('Winged Swarm','Shooting','own','during','After the formation shoots, if unengaged it may make a Normal move of up to 6″. Moving this way prevents it from declaring a charge this turn.',formation);
   add('Winged Swarm','Charge','own','during','If this formation used its post-shooting move, it cannot declare a charge this turn.',formation);
  }
  if(unit==='Tyrannocyte'){
   const passengers=pods.find(p=>p.transport.id===id)?.passengers??[];
   add('Aerial Seeding','Pre-battle','either','during','Start this transport in Strategic Reserves. Exclude it and its embarked units from limits on the number of reserve units. Their points still count towards the starting points allowance.',[id],pack+'#page=20');
   const disembark='Immediately disembark all passengers after setting up the Tyrannocyte. Place them more than 8″ from every enemy model as well as wholly within 3″ of the hull. Those passengers cannot charge this turn. No unit can embark in it afterwards.';
   add('Aerial Seeding','Movement','own','during','It may arrive during the Move Units step of your first, second or third Movement phase regardless of mission restrictions. '+disembark,[id,...passengers],pack+'#page=20');
   add('Aerial Seeding','Movement','opponent','end','If this transport arrives by Rapid Ingress from battle round two, '+disembark.charAt(0).toLowerCase()+disembark.slice(1),[id,...passengers],pack+'#page=20');
  }
  if(unit==='Trygon'){
   add('Subterranean Tunnels','Movement','own','during','When using Deep Strike in your Movement phase, you may set up more than 6″ horizontally from all enemies. Using the tunnel prevents this model from declaring a charge this turn.',[id],pack+'#page=20');
   add('Subterranean Tunnels','Charge','own','during','If this model entered by its 6″ tunnel this turn, it cannot declare a charge.',[id],pack+'#page=20');
  }
  if(unit==='Mawloc'){
   const terror='After this model sets up using Deep Strike, roll one D6 for each enemy unit within 12″. On 2–4 it suffers D3 mortal wounds. On 5+ it suffers 3 mortal wounds and takes a Battle-shock test. A 1 has no effect.';
   add('Terror From The Deep','Movement','own','during',terror);
   add('Terror From The Deep','Movement','opponent','end','When arriving by Rapid Ingress with Deep Strike: '+terror);
  }
  if(unit==='Winged Hive Tyrant')add('Paroxysm','Fight','either','start','Choose a visible enemy unit within 12″ and roll a D6. On 1 the Tyrant suffers D3 mortal wounds. On 2+ subtract 1 from the Attacks characteristic of the enemy unit’s weapons through this phase.');
  if(unit==='Parasite Of Mortrex'){
   add('It Itches!','Fight','either','start','Choose an enemy unit engaged with the Parasite. That unit takes a Battle-shock test.');
   add('Parasitic Infection','Fight','either','during','For each enemy Infantry model its barbed ovipositor destroys, after the Parasite finishes attacking you may set up a new D3-model Ripper Swarms unit within 3″. It may engage the slain model’s unit but no other enemy. A spawned unit’s chitinous claws and teeth score one extra hit per Critical Hit.');
   for(const window of ['Command','End of your turn','End of opponent turn'] as const)add('Chitinous Horrors',window,window==='Command'?'either':window==='End of your turn'?'own':'opponent','end','If Parasitic Infection has produced Ripper Swarms, halve the Objective Control of enemy models whose unit is engaged with those Rippers.',[id],rippers);
  }
  if(unit==='Von Ryan’s Leapers')add('Pouncing Leap','Charge','opponent','end','An unengaged unit within 12″ of an enemy can use Heroic Intervention for 1CP less, even after another use this phase. This use does not consume another unit’s use. Leap to Defend costs 0CP or use Into the Fray for 1CP.',[id],pack+'#page=21');
  if(unit==='Winged Tyranid Prime'){
   if(group.body.id!==id){
    const alpha='While the Prime leads this formation, all its models’ weapons have Sustained Hits 1. Each Critical Hit scores one additional hit.';
    if(group.members.some(finalDayHasRangedWeapon))add('Alpha Warrior','Shooting','own','during',alpha,formation);
    add('Alpha Warrior','Fight','either','during',alpha,formation);
   }
   add('Death Blow','Fight','either','during','If a melee attack destroys the Prime before it has fought this phase, roll a D6. On a 4+, it fights after the attacking unit finishes its attacks, then remove the Prime.');
  }
  if(unit==='Neurolictor'){
   add('Neural Disruption','Command','own','during','Choose one enemy unit within 12″ of this model. It must take a Battle-shock test.');
   const wound='Against a Battle-shocked enemy within 12″ of the Neurolictor, add 1 to Wound rolls made by friendly Tyranids models.';
   if(gunners.length)add('Psychological Saboteur','Shooting','own','during',wound+' Eligible shooting formations: '+gunners.join(', ')+'.',[id,...gunners]);
   if(gunners.length)add('Psychological Saboteur','Movement','opponent','end','When firing Overwatch, '+wound.charAt(0).toLowerCase()+wound.slice(1)+' Eligible shooting formations: '+gunners.join(', ')+'.',[id,...gunners]);
   const hit='While a Battle-shocked enemy is within 12″ of the Neurolictor, subtract 1 from that enemy’s Hit rolls, including attacks against non-Tyranids.';
   add('Psychological Saboteur','Shooting','opponent','during',hit);
   add('Psychological Saboteur','Fight','either','during',hit+' '+wound,[id,...roots]);
  }
  if(unit==='Hyperadapted Raveners'){
   add('Alpha Invader','Fight','either','during','Every weapon in this formation, including the Bodyguard’s, has Sustained Hits 1. Each Critical Hit with its melee weapons scores one extra hit. The venom bolt auto-hits, so it never rolls a Critical Hit.',formation,pack+'#page=13');
   const discount='Once per battle round for this formation, reduce either Rapid Ingress or Heroic Intervention by 1CP. Both options share this use. Prior use of that Stratagem on another unit does not prevent this use or consume another unit’s subsequent use.';
   add('Hypersensory Array','Movement','opponent','end','From the second battle round, when the formation uses Rapid Ingress from Strategic Reserves: '+discount,formation,pack+'#page=13');
   add('Hypersensory Array','Charge','opponent','end','When this formation is unengaged within 12″ of an enemy and uses Heroic Intervention: '+discount,formation,pack+'#page=13');
  }
  if(unit==='The Red Terror'){
   add('Swallow Whole','Fight','either','during','Against an Infantry, Mounted or Beasts unit, every successful unmodified Wound roll with the gaping maw is a Critical Wound and triggers its Devastating Wounds. Recover up to D3+2 lost wounds for each Infantry, Mounted or Beasts model the maw destroys.',[id],pack+'#page=7');
   add('Subterranean Hunter','Fight','either','end','If unengaged at the end of either Fight phase, this model may return to Strategic Reserves.',[id],pack+'#page=7');
  }
 }
 return output;
}
