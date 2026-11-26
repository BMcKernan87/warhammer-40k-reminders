import type {ArmySelection} from './catalog';
import {PHASES} from './engine';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {equippedWeaponText} from './knight-card-rules';
import {knightWeaponCount} from './knight-loadouts';
import {knightJoinedBodyguard} from './leader-eligibility';
import type {RosterInstance} from './roster-instances';
import {VOTANN_CARDS} from './votann-card-data.generated';
import {VOTANN_SHEETS} from './votann-data.generated';
import {votannCargoOption} from './votann-transports';

type Stage=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const shoot:Stage=['Shooting','own','during'],snap:Stage=['Movement','opponent','end'],fight:Stage=['Fight','either','during'];
const theirShots:Stage=['Shooting','opponent','during'],theirSnap:Stage=['Movement','own','end'];
const charge:Stage=['Charge','either','during'],move:Stage=['Movement','own','during'],deploy:Stage=['Pre-battle','either','during'];
const defended=[theirShots,theirSnap,fight];
const phases=(timing:GeneratedReminder['timing']):Stage[]=>PHASES.map(phase=>[phase,'either',timing]);
const sheets=new Map(VOTANN_SHEETS.map(s=>[s.unit,s]));
const unique=<T>(values:T[])=>[...new Set(values)];
const lone='While unjoined, enemy models more than 12″ away cannot see this unit or use indirect fire against it.';
const scout='During pre-battle abilities, if wholly in your deployment zone, make a Scout move of up to 9″ and end more than 8″ horizontally from enemies. From Strategic Reserves you may instead enter wholly within your deployment zone.';

export function votannDatasheetReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Leagues of Votann')return [];
 const native=roster.filter(s=>Object.hasOwn(VOTANN_CARDS,s.unit));
 const bodies=new Map(native.map(s=>[s.id,knightJoinedBodyguard(army,s)]));
 const root=(s:RosterInstance)=>bodies.get(s.id)?.id??s.id;
 const formations=native.filter(s=>root(s)===s.id);
 const members=(id:string)=>native.filter(s=>root(s)===id);
 const has=(s:RosterInstance,tag:string)=>sheets.get(s.unit)?.keywords?.includes(tag)??false;
 const any=(formation:RosterInstance,test:(member:RosterInstance)=>boolean)=>members(formation.id).some(test);
 const ids=(squads:readonly RosterInstance[])=>unique(squads.map(root));
 const output:GeneratedReminder[]=[];
 for(const s of native){
  const {id,unit}=s,stats=VOTANN_CARDS[unit],core=stats.core??[],formation=root(s),body=bodies.get(id),group=members(formation);
  const gear=(item:string)=>knightWeaponCount(s,item)>0;
  const add=(name:string,stages:readonly Stage[],summary:string,targets=[formation])=>{
   if(!targets.length)return;
   for(const [window,turn,timing] of stages)output.push({id:['11e-votann-card',id,name,window,turn,timing].join(':'),
    title:id+' · '+name,window,turn,timing,summary,units:targets,source:stats.source,origin:'unit'});
  };
  const mention=(targets:readonly string[])=>' Eligible formations: '+targets.join(', ')+'.';
  const protects=(text:string)=>add('Weavefield Crest',defended,text);
  const joinedCrest=!!body&&gear('Teleport Crest');
  if(gear('Teleport Crest')&&(joinedCrest||unit==='Einhyr Hearthguard')){
   // A Hesyr and a leader can both carry the same crest. Declare one
   // reserve permission for the complete legal formation.
   const granting=group.filter(m=>knightWeaponCount(m,'Teleport Crest')&&(m.unit==='Einhyr Hearthguard'||bodies.get(m.id)));
   if(granting[0]?.id===id)add('Teleport Crest',[deploy],'Every model in '+formation+' has Deep Strike from the crest. You can declare the whole formation in Strategic Reserves and use Deep Strike when it makes an ingress move.');
  }
  if(gear('Rampart Crest')&&body)add('Rampart Crest',defended,'While this bearer leads '+formation+', all models in the formation have a 5+ invulnerable save.');
  if(gear('Weavefield Crest')){
   if(unit==='Einhyr Champion')add('Weavefield Crest',defended,'Use a 4+ invulnerable save when allocating attacks to the Einhyr Champion itself.',[id]);
   else protects('While its crest bearer survives, every model in '+formation+' has a 5+ invulnerable save.');
  }
  if(stats.save)add('Invulnerable save',defended,'When allocating an attack to a model from '+id+', you may use its '+stats.save+'+ invulnerable save.',[id]);
  const fnp=core.find(a=>a.startsWith('Feel No Pain'));
  if(fnp)add(fnp,phases('during'),'For each wound a model from '+id+' would lose, roll D6. On '+fnp.slice(-2)+' it keeps the wound. Use only one Feel No Pain roll per wound.',[id]);
  if(stats.demise)add('Deadly Demise '+stats.demise,phases('during'),'When this model is destroyed, resolve emergency disembarkation first if applicable, then roll D6. On a 6, each unit within 6″ suffers '+stats.demise+' mortal wound'+(stats.demise==='1'?'':'s')+'. Roll random damage separately for each unit.',[id]);
  if(stats.damage)add('Damaged',[shoot,fight],'At 1–'+stats.damage.threshold+' wounds, subtract 1 from this model’s Hit rolls. MultiCOG Targeting permits it to ignore this modifier for its ranged attacks.',[id]);
  if(id===formation&&group.every(m=>VOTANN_CARDS[m.unit].core?.includes('Scouts 9"')))add('Scouts 9″',[deploy],scout);
  if(id===formation&&group.every(m=>VOTANN_CARDS[m.unit].core?.includes('Infiltrators')))add('Infiltrators',[deploy],'Deploy this formation anywhere more than 8″ horizontally from all enemy models and the opponent’s deployment zone.');
  if(id===formation&&group.every(m=>VOTANN_CARDS[m.unit].core?.includes('Stealth')))add('Stealth',[theirShots,theirSnap],'This formation gets the Benefit of Cover against ranged attacks.');
  if(core.includes('Lone Operative')&&group.length===1)add('Lone Operative',[theirShots,theirSnap],lone);
  for(const stage of [shoot,snap,fight]){
   const melee=stage===fight,description=equippedWeaponText(s,stats,melee?'Fight':'Shooting',stage===snap);
   if(description)add(melee?'Melee weapon profiles':'Ranged weapon profiles',[stage],(stage===snap?'When firing Overwatch, use snap shooting. ':'')+description,[id]);
  }
  switch(unit){
   case 'Ûthar the Destined':
    add('Ancestral Fortune',[shoot,snap,fight,theirShots,theirSnap],'Once per turn, spend 1 Yield Point to turn one of Ûthar’s own Hit, Wound or saving rolls into an unmodified 6.',[id]);break;
   case 'Kâhl':
    if(body)add('Kindred Hero',[shoot,fight],'While the Kâhl leads '+formation+', weapons equipped by every model in that formation have Lethal Hits: a critical hit can wound automatically.');break;
   case 'Einhyr Champion':
    if(body)add('Exemplar of the Einhyr',[move,charge],'While the Champion leads '+formation+', add 1 to that unit’s Advance and Charge rolls.');
    add('Mass Driver Accelerators',[charge],'After this Champion finishes a Charge move, you may pick one enemy unit within its Engagement Range. Roll D6. On 2–5 inflict D3 mortal wounds. On 6 inflict D3+3.',[id]);break;
   case 'Grimnyr':
    add('CORV attendants',phases('during'),'If this unit’s Grimnyr model is destroyed, remove its surviving CORVs as destroyed as well.',[id]);
    if(body)add('Fortify (Psychic)',phases('during'),'While this unit leads '+formation+', each model in the formation gets Feel No Pain 5+. Roll once per wound it would lose.');break;
   case 'Brôkhyr Iron-master':{
    add('E-COG attendants',phases('during'),'If this unit’s Iron-master model is destroyed, its surviving E-COGs are destroyed. The Ironkin Assistant remains in play.',[id]);
    const supported=formations.filter(p=>any(p,m=>has(m,'VEHICLE')||has(m,'IRONKIN STEELJACKS')));
    if(!body&&supported.length)add('Brôkhyr Guild Support',[theirShots,theirSnap],'While this unjoined unit is within 3″ of a friendly Votann Vehicle or Ironkin Steeljacks unit, it gains Lone Operative. '+lone+mention(ids(supported)),[id,...ids(supported)]);
    add('Multispectral Visor',[shoot,snap],'Models in '+formation+' re-roll ranged Wound rolls of 1.');
    const repairs=formations.filter(p=>any(p,m=>has(m,'VEHICLE')||has(m,'EXOFRAME')||has(m,'IRONKIN STEELJACKS')));
    const targets=ids(repairs);
    add('Forgewrought Expertise',[['Movement','own','end']],'At the end of your Movement phase, repair one friendly eligible unit within 3″. One of its models regains 3 wounds while the Ironkin Assistant survives, otherwise D3. Each unit can be repaired only once per turn.'+mention(targets),targets);break;
   }
   case 'Hearthkyn Warriors':
    add('Luck Has. Need Keeps. Toil Earns',[['Command','own','end']],'If this unit is in range of an objective you control at the end of your Command phase, you retain it after leaving. The effect ends when the enemy’s Level of Control there exceeds yours at the end of any phase.');
    add('Panspectral Scanning',[shoot],'When a model in '+formation+' makes a ranged attack, re-roll a Hit roll of 1.');break;
   case 'Einhyr Hearthguard':
    add('Decisive Destruction',[shoot],'Re-roll ranged Hit rolls of 1 against the closest eligible target.');break;
   case 'Cthonian Beserks':
    add('Cyberstimms',[fight],'When a model in this formation is destroyed by a melee attack before it has fought this phase, roll D6, adding 1 during Fortify Takeover. On 4+, it fights after the attacker finishes its attacks, then is removed.');
    if(gear('Mole grenade launcher'))add('Subterranean Explosives',[shoot],'After this unit shoots in your Shooting phase, select one enemy hit by one or more of its mole grenade launchers, excluding Monsters and Vehicles. That unit cannot be targeted with Fire Overwatch until the start of your next Shooting phase.');break;
   case 'Hernkyn Pioneers':
    add('Outflanking Mag-riders',[['End of opponent turn','opponent','end']],'At the end of your opponent’s turn, if this unit is unengaged and wholly within 9″ of one or more battlefield edges, you may remove it into Strategic Reserves.');
    if(gear('Multiwave Comms Array'))add('Multiwave Comms Array',phases('during'),'Each time you target this unit with a Stratagem while the bearer survives, roll D6. On a 5+ gain 1CP.');
    if(gear('Rollbar Searchlight'))add('Rollbar Searchlight',[shoot],'Models in this bearer’s unit may ignore any or all modifiers to their ranged Hit rolls.');
    break;
   case 'Sagitaur':{
    const passengers=formations.filter(p=>votannCargoOption(army,s,p)),targets=ids(passengers);
    add('Blistering Advance',[move],'After the Sagitaur Advances, already embarked passengers can make a shock disembark move. Set each model wholly within 3″. The passengers cannot declare a charge for the rest of the turn.'+mention(targets),targets);break;
   }
   case 'Brôkhyr Thunderkyn':
    add('Breaching Fire',[shoot],'After this unit shoots in your Shooting phase, pick one enemy unit it hit. That enemy loses the Benefit of Cover until the start of your next Shooting phase.');break;
   case 'Hekaton Land Fortress':
    add('MultiCOG Targeting',[shoot],'This Hekaton may ignore any or all modifiers to its Ballistic Skill and Hit roll when resolving its ranged attacks.',[id]);break;
   case 'Hernkyn Yaegirs':
    add('Pragmatic Hunters',[['Movement','opponent','during']],'After an enemy ends a move within 8″ in the opponent’s Movement phase, this formation may make a Normal move up to D6″ if unengaged.');break;
   case 'Buri Aegnirssen':
    add('Grudge-fuelled Fortitude',phases('end'),'The first time Buri is destroyed, roll D6 at the end of that phase. On 2+, return him with all wounds as close as possible to where he was destroyed and outside Engagement Range of all enemies.',[id]);
    add('Unhinged Vengeance',[theirShots],'After an enemy unit shoots in the opponent’s Shooting phase, if those attacks cost Buri any wounds, he may surge up to D6+2″. He must be unengaged, free of Battle-shock and have made no move this phase. Engage the closest enemy if possible, otherwise finish as close as possible to it. No other enemy may be engaged and he cannot move again this phase.',[id]);break;
   case 'Memnyr Strategist':
    add('Predictive Guidance',[snap,['Charge','opponent','during']],'Once per battle round for this unit, when it is targeted by Fire Overwatch or Heroic Intervention, reduce the CP cost of that use by 1.');break;
   case 'Arkanyst Evaluator':{
    const nearby=formations.filter(p=>p.id!==formation&&p.unit!=='Arkanyst Evaluator'&&any(p,m=>has(m,'INFANTRY'))&&!VOTANN_CARDS[p.unit].core?.includes('Lone Operative'));
    if(nearby.length)add('Science Guild Support',[theirShots,theirSnap],'While within 3″ of another friendly Votann Infantry unit without Lone Operative, gain Lone Operative. Another Arkanyst Evaluator cannot supply this protection. '+lone+mention(ids(nearby)),[id,...ids(nearby)]);break;
   }
   case 'Ironkin Steeljacks with Heavy Volkanite Disintegrators':
    add('Purge Response',[snap],'When this unit fires Overwatch, unmodified 5+ hits, improved to 4+ during Fortify Takeover. Snap shots still cannot score critical hits.');break;
   case 'Ironkin Steeljacks with Melee Weapons':
    add('Merciless Eradication',[['Movement','either','during']],'When an engaged enemy unit other than a Monster or Vehicle Falls Back, every model in that unit must test for Desperate Escape. Subtract 1 from each test if the enemy unit is Battle-shocked.');break;
   case 'Cthonian Earthshakers':
    if(gear('Tremor shells'))add('Destabilising Quakes',[shoot],'After this unit shoots in your Shooting phase, select one enemy hit by tremor shells. It must take a Battle-shock test with −1 to the result.');
    if(gear('Breacher ordnance'))add('Geomantic Hunters',[shoot],'Twice per battle for this unit, when selected to shoot in your Shooting phase, it may re-roll Wound rolls with breacher ordnance until the phase ends.');break;
   case 'Kapricus Defenders':
    add('Opportunistic Manoeuvre',[shoot],'After this unit shoots in your Shooting phase, it can make a Normal move up to D6″. If it moves this way it cannot charge this turn.');break;
   case 'Kapricus Carrier':{
    add('Scanner Uplinks',[shoot],'After this model shoots in your Shooting phase, select one enemy unit it hit other than a Monster or Vehicle. Until the start of your next turn, subtract 1 from the Hit rolls of attacks made by that unit.',[id]);
    const passengers=formations.filter(p=>votannCargoOption(army,s,p));
    const options=passengers.map(p=>{
     const profiles=VOTANN_CARDS[p.unit].weapons.filter(w=>w.phase==='Shooting'&&!w.abilities.some(a=>a.toLowerCase()==='one shot')&&knightWeaponCount(p,w.name)>0);
     return p.id+' ('+unique(profiles.map(w=>w.name.split(/\s+[–—-]\s+/)[0])).join(', ')+')';
    });
    if(options.length)add('Firing Deck 5',[shoot],'When this Carrier is selected to shoot, pick up to five embarked Yaegir models whose units have not yet been selected to shoot this phase. The Carrier fires one ranged weapon other than One Shot from each selected model. Embarked units cannot shoot for the rest of the turn. Possible equipped passenger weapons: '+options.join(', ')+'.',[id,...ids(passengers)]);break;
   }
   case 'Berehk Stornbröw':
    add('Break the Foe',[fight],'Melee weapons carried by every model in '+formation+' have Sustained Hits 1. Each critical hit scores one extra hit.');
    add('Relentless Avalanche',[['Charge','opponent','during']],'When the Heroic Intervention conditions are met, you can target this formation even if the Stratagem has already been used this phase. This use costs 1CP less and leaves other units eligible for later uses this phase.');break;
  }
  if(gear('Panspectral Scanner'))add('Panspectral Scanner',[shoot],'Models in this bearer’s unit re-roll ranged Hit rolls of 1.');
  if(gear('Preymark Crest'))add('Preymark Crest',[shoot,snap,fight],'When a model in the crest bearer’s unit attacks an enemy in range of any objective marker, a critical wound grants Precision to that attack. You may allocate it to the group containing a visible enemy Character.');
  if(gear('Smoke Launcher'))add('Smoke Launcher',[theirShots,theirSnap],'Only Kapricus models equipped with a launcher gain the Smoke keyword. While a bearer survives, this unit can be targeted by rules requiring a Smoke unit.');
 }
 const shared=(unit:string,name:string,steps:readonly Stage[],summary:string,recipients?:string[])=>{
  const owners=native.filter(s=>s.unit===unit);
  if(!owners.length)return;
  const targets=recipients??ids(owners);
  for(const [window,turn,timing] of steps)output.push({id:['11e-votann-shared',unit,name,window,turn].join(':'),title:name,window,turn,timing,
   summary:summary+' Eligible sources: '+owners.map(s=>s.id).join(', ')+'.',units:targets,source:VOTANN_CARDS[unit].source,origin:'unit'});
 };
 shared('Ûthar the Destined','Grim Efficiency',phases('during'),'Once per battle round, when a friendly Votann unit within 12″ of Ûthar is targeted by a Stratagem, reduce that use’s cost by 1CP.',ids(formations));
 shared('Kâhl','Seized Opportunity',phases('during'),'Once per phase across the army, when a formation containing a Kâhl destroys an enemy unit, one Kâhl from the army may use this ability to gain 1 Yield Point.');
 shared('Memnyr Strategist','Computational Mastermind',[['Command','own','end']],'Before determining the acquisition mode at the end of your Command phase, for each objective you control in range of at least one Memnyr Strategist model, choose to spend or gain 1 Yield Point. Multiple Strategists at an objective do not multiply this benefit.');
 shared('Arkanyst Evaluator','Resource Transmutation',[shoot],'Once per turn across the army, when one Evaluator is selected to shoot in your Shooting phase, spend 1 Yield Point to give its own ranged weapons Sustained Hits 1 until phase end. After it shoots, if those attacks destroyed at least one enemy unit, you may gain up to 2 Yield Points.');
 for(const grimnyr of native.filter(s=>s.unit==='Grimnyr')){
  for(const [window,turn,timing] of phases('start'))output.push({id:['11e-votann-card',grimnyr.id,'regard',window].join(':'),title:grimnyr.id+' · Grimnyr’s Regard',window,turn,timing,
   summary:'Once per battle for this Grimnyr unit, at the start of any phase choose a friendly Battle-shocked Votann unit within 12″ of the Grimnyr model. That unit recovers from Battle-shock.',source:VOTANN_CARDS[grimnyr.unit].source,units:ids(formations),origin:'unit'});
 }
 return output;
}
