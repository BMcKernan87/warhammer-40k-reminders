import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';
import {CHAOS_KNIGHT_STRATAGEMS,CHAOS_KNIGHT_TRAITS,CHAOS_KNIGHT_UPGRADES} from './chaos-knight-detachments.generated';

const source='https://wahapedia.ru/wh40k11ed/factions/chaos-knights/';
const norm=(s:string)=>s.trim().replace(/[‑–]/g,'-').replaceAll('’',"'").toLowerCase();
const byUnit=new Map(CHAOS_KNIGHT_TRAITS.map(r=>[norm(r.unit),r]));
const trait=(s:RosterInstance)=>byUnit.get(norm(s.unit));
const attacks=['Shooting','Fight'] as const,phases=['Command','Movement','Shooting','Charge','Fight'] as const;
type Turn='own'|'opponent'|'either';
type ChaosArmy=ArmySelection&{chaosWarDogCharacterIds?:string[]};
export function resolvedWarDogCharacterIds(army:ChaosArmy,roster:readonly RosterInstance[]=expandRoster(army)):string[]{
 if(army.faction!=='Chaos Knights'||!army.detachments2026?.includes('Houndpack Lance'))return [];
 const dogs=roster.filter(s=>trait(s)?.dog).map(s=>s.id);
 if(dogs.length===3)return dogs;
 if(dogs.length<3||!Array.isArray(army.chaosWarDogCharacterIds))return [];
 const valid=[...new Set(army.chaosWarDogCharacterIds.filter(id=>dogs.includes(id)))];
 return valid.length<=3?valid:[];
}
export function eligibleChaosKnightUpgrades(army:ChaosArmy,unit:string,id?:string){
 if(army.faction!=='Chaos Knights')return [];
 const selected=new Set(army.detachments2026?.map(norm)),name=norm(unit);
 const dog=byUnit.get(name)?.dog;
 const promoted=!!id&&resolvedWarDogCharacterIds(army).includes(id);
 return CHAOS_KNIGHT_UPGRADES.filter(u=>selected.has(norm(u.detachment)) && (
  u.repeatable?u.units.includes(name):dog?promoted&&(u.units.includes(name)||u.anyChaosCharacter):u.units.includes(name)
 ));
}
function chaosGroups(army:ChaosArmy,roster:readonly RosterInstance[]){
 const native=roster.filter(s=>trait(s)?.native);
 const titan=native.filter(s=>trait(s)?.walker),dogs=native.filter(s=>trait(s)?.dog);
 const promoted=new Set(resolvedWarDogCharacterIds(army,roster));
 const characters=native.filter(s=>trait(s)?.character||promoted.has(s.id));
 const damned=roster.filter(s=>trait(s)?.damned);
 const abhorrent=native.filter(s=>trait(s)?.abhorrent);
 return {native,titan,dogs,characters,damned,abhorrent,dogCharacters:dogs.filter(s=>promoted.has(s.id)),
  multi:dogs.length>=2?dogs:[],tyrant:native.filter(s=>s.unit==='Knight Tyrant'),
  pairedDogs:titan.length?dogs:[],
  partners:titan.length?[...titan,...dogs]:[],
  sacrifice:native.length?damned.filter(s=>s.unit!=='Accursed Cultists'):[],
  vengeance:native.length?damned:[],
  longLeash:dogs.length?abhorrent:[]};
}
type Scope=keyof ReturnType<typeof chaosGroups>;
type Effect={scope:Scope;cue:string};
const stratEffects:Record<typeof CHAOS_KNIGHT_STRATAGEMS[number]['id'],Effect>={
 '000011013002':{scope:'tyrant',cue:'When the Tyrant suffers a mortal wound, it gains Feel No Pain 5+ against mortal wounds.'},
 '000011013003':{scope:'tyrant',cue:'When selecting the Tyrant to Fall Back, allow it to shoot after that move.'},
 '000011013004':{scope:'tyrant',cue:'After the Tyrant shoots, suppress one unit it hit until your next Command phase. Its attacks suffer −1 to Hit.'},
 '000010752005':{scope:'pairedDogs',cue:'Choose a Titanic Knight and up to three War Dogs within 6″. This phase only those War Dogs can pass through terrain and models on Normal, Advance and Fall Back moves, crossing but not ending in engagement range. Their Desperate Escape tests pass automatically.'},
 '000010752003':{scope:'partners',cue:'Choose a Titanic Knight and up to two War Dogs that have not attacked, and an enemy eligible for each. This phase those Knights must direct every attack at that enemy if eligible and gain Sustained Hits 1 against it.'},
 '000010752004':{scope:'native',cue:'After enemy target selection, worsen the AP of incoming attacks against the targeted Knight by 1 until that attacking unit finishes.'},
 '000010752006':{scope:'native',cue:'Immediately after Falling Back, this Knight can shoot and declare a charge for the rest of this turn.'},
 '000010752002':{scope:'native',cue:'Immediately after allocating a mortal wound to the Knight, give its models Feel No Pain 5+ against mortal wounds for the remainder of this phase.'},
 '000010752007':{scope:'native',cue:'After enemy shooting costs the Knight at least one wound, it can surge up to D6″.'},
 '000010313003':{scope:'multi',cue:'Select at least two War Dogs engaged with the same enemy. This phase they may fight only that enemy and score Critical Hits on unmodified rolls of 5+.'},
 '000010313002':{scope:'dogCharacters',cue:'Once per turn select a War Dog Character. Each enemy within 6″ takes Battle-shock. Each friendly battle-shocked War Dog within 6″ takes a Leadership test and recovers on a pass.'},
 '000010313005':{scope:'dogs',cue:'When a War Dog is destroyed before being selected to attack that phase, before Deadly Demise it may shoot or fight only its destroyer if eligible. Resolve Deadly Demise after those attacks and any consolidation.'},
 '000010313007':{scope:'dogs',cue:'Place an unengaged War Dog wholly within 12″ of a battlefield edge into Strategic Reserves.'},
 '000010313006':{scope:'dogs',cue:'After an enemy ends a Normal, Advance or Fall Back move within 8″, your War Dog can make a Normal move up to 6″.'},
 '000010313004':{scope:'dogs',cue:'Immediately after the War Dog Falls Back, it may shoot and declare a charge until turn end.'},
 '000011017004':{scope:'dogs',cue:'When an enemy targets a War Dog in objective range, worsen its ranged attacks’ AP by 1 against that War Dog until that enemy finishes attacking.'},
 '000011017002':{scope:'dogs',cue:'When an enemy unit targets this War Dog in the Fight phase, it gains Feel No Pain 5+.'},
 '000011017003':{scope:'dogs',cue:'After your War Dog shoots, that shooting does not prevent it from starting an action.'},
 '000009766002':{scope:'vengeance',cue:'When an enemy destroys a friendly Chaos Knights unit, mark that enemy for the rest of the battle. Your Damned units gain Lethal Hits against it.'},
 '000009766003':{scope:'sacrifice',cue:'Choose a Damned unit other than Accursed Cultists and a friendly Chaos Knight within 9″. Roll D3+3. The Damned suffer that many mortal wounds and the Knight heals that many wounds.'},
 '000009766004':{scope:'damned',cue:'Choose a Damned unit and one visible enemy within 12″. The hunted enemy gains 6″ detection range.'},
 '000010305003':{scope:'native',cue:'After an enemy selects its targets, worsen the AP of its attacks into the targeted Knight by 1 until it finishes attacking.'},
 '000010305002':{scope:'native',cue:'A Knight that is not Empowered makes a Malefic Surge. Each unit can be targeted only once per battle round.'},
 '000010305004':{scope:'characters',cue:'Immediately after the Character makes a Malefic Surge, secure one objective in its range that you control. It remains yours until the opponent exceeds your control at a phase end.'},
 '000010305005':{scope:'native',cue:'Before shooting, choose this Knight. After it shoots, one enemy it hit takes Battle-shock. On failure its Move and Charge rolls are reduced by 2 until the end of the opponent’s next turn.'},
 '000010305006':{scope:'native',cue:'Before shooting, give this Knight’s ranged weapons Ignores Cover for the phase.'},
 '000010305007':{scope:'native',cue:'After enemy target selection the targeted Knight gains a 4+ invulnerable save for the phase.'},
 '000010309007':{scope:'characters',cue:'After its Normal move select an enemy the Character crossed, excluding Monsters and Vehicles. Roll six D6. Each 4+ inflicts one mortal wound. If a model is destroyed, the enemy must take Battle-shock.'},
 '000010309006':{scope:'characters',cue:'Just before a consolidation the Character gains 3″ additional consolidation distance for this phase when it can finish engaged.'},
 '000010309005':{scope:'characters',cue:'Before the Character attacks, designate an enemy Monster or Vehicle. Re-roll Hit and Wound rolls of 1 against it for the phase. If it is Titanic, re-roll any Hit and Wound rolls instead.'},
 '000010309004':{scope:'characters',cue:'After enemy target selection subtract 1 from Damage for attacks allocated to models in the targeted Character unit for this phase.'},
 '000010309003':{scope:'characters',cue:'When the Character is destroyed, its Deadly Demise inflicts mortal wounds on 4+ in place of the normal 6.'},
 '000010309002':{scope:'characters',cue:'Select a Character in range of an objective you control. Keep that objective at control 5 or your higher actual control until the enemy exceeds it at a phase end.'},
 '000008517003':{scope:'native',cue:'Before a Knight that charged this turn fights, improve its melee AP by 1 this phase. If it destroys an enemy after resolving those attacks, every enemy within 6″ takes Battle-shock.'},
 '000008517006':{scope:'native',cue:'Select up to two War Dogs or one Titanic Knight. Its Normal, Advance, Fall Back and Charge moves can cross models and terrain for this phase. Pass Desperate Escape automatically. Only charges can end in enemy engagement range. Super-heavy Walker does not apply during these moves.'},
 '000008517005':{scope:'longLeash',cue:'Choose an Abhorrent Knight and up to two War Dogs. Those dogs count as within its aura ranges until the start of your next Command phase.'},
 '000008517004':{scope:'native',cue:'After enemy target selection, gain Feel No Pain 6+ for this phase, improved to 5+ against battle-shocked attackers.'},
 '000008517007':{scope:'native',cue:'After enemy target selection the Knight gains Stealth and its attackers suffer −1 to Hit in melee.'},
 '000008517002':{scope:'native',cue:'Once per battle round immediately after an enemy fails Battle-shock within 12″ of the Knight, roll six D6. Each 4+ inflicts a mortal wound on that enemy and heals up to one wound on one model in your unit.'}
};

export function chaosKnightDetachmentReminders(army:ChaosArmy,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Chaos Knights'||!roster.length)return [];
 const rows:GeneratedReminder[]=[];
 const groups=chaosGroups(army,roster);
 const {native,titan,dogs,characters,damned,tyrant}=groups;
 const has=(name:string)=>army.detachments2026?.includes(name);
 const walkerText='On Normal, Advance and Fall Back moves, pass through non-Titanic models and terrain sections up to 4″ high. You may cross engagement range but cannot end engaged. If the model moves through taller terrain, roll a D6 after the move. On 1 it is battle-shocked.';
 function add(key:string,title:string,window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],summary:string,targets:readonly RosterInstance[],origin:GeneratedReminder['origin']='detachment',previousWindow?:ReminderWindow){
  if(!targets.length)return;
  const units=targets.map(t=>t.id);
  rows.push({id:'11e-chaos-knight-'+key+'-'+(previousWindow??window),title,window,turn,timing,summary,source,origin,units,previousSheetEntry:previousWindow?{window:previousWindow,units}:undefined});
 }
 const dread=(key:string,title:string,window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],text:string,previousWindow?:ReminderWindow)=>
   add(key,title,window,turn,timing,text,native,'army',previousWindow);
 const choices='Choose one new Dread or roll two D6: 1 Despair, 2 Doom, 3 Darkness, 4 Dismay, 5 Delirium, 6 Dominion. Active abilities last for the battle. Duplicate random results give no extra effect.';
 dread('dread-start','Harbingers of Dread · round one','Start of battle round','either','start','At the start of round one, Deathly Terror is already active. '+choices,'Pre-battle');
 dread('dread-later','Harbingers of Dread · rounds three and five','Start of battle round','either','start','At the start of rounds three and five, before the first player takes their turn, add Dread abilities. '+choices,'Command');
 dread('terror','Deathly Terror and Despair','Command','either','during','Enemies within 9″ of a model with Deathly Terror worsen Leadership by 1. If Despair is active, its separate 9″ aura worsens Leadership by 1 as well. If Dominion is active, add 3″ to all of the bearer’s aura ranges, including datasheet and enhancement auras.');
 dread('dismay','Dismay · Battle-shock step','Command','opponent','during','If Dismay is active, each enemy below starting strength within 9″ of a bearer takes a Battle-shock test in the opponent’s Battle-shock step. Apply any aura range increase.');
 for(const window of phases)dread('delirium','Delirium · failed Battle-shock',window,'either','during','If Delirium is active, an enemy below half-strength that fails a Battle-shock test within 9″ of a bearer suffers D3 mortal wounds. Dominion increases the aura range.');
 for(const window of attacks)dread('doom','Doom · attacking a battle-shocked unit',window,window==='Shooting'?'own':'either','during','If Doom is active, the Knight adds 1 to its Wound rolls against battle-shocked targets.');
 dread('darkness','Darkness · Stealth','Shooting','opponent','during','If Darkness is active, Knights with Harbingers of Dread gain Stealth.');
 add('walker','Super-heavy Walker','Movement','own','during',walkerText,titan,'army');
 if(has('Traitoris Lance'))add('paragons','Paragons of Terror','Start of battle round','either','start','At the start of round one, after choosing or rolling your normal Dreads, choose one additional Dread. This extra choice cannot be random.',native,'detachment','Pre-battle');
 if(has('Bastions of Tyranny'))for(const window of attacks)add('annihilate','Annihilate the Unworthy',window,window==='Shooting'?'own':'either','during','Knight Tyrants add 1 to Hit rolls against battle-shocked targets.',tyrant);
 if(has('Hunting Warpack'))add('scent','Scenting Fear','Shooting','own','during','Once per battle round per army choose a visible enemy within 12″ of a War Dog. It has +6″ detection range.',dogs);
 if(has('Iconoclast Fiefdom'))for(const phase of phases)add('thralls','Wretched Thralls',phase,'either','during','Friendly Damned units can re-roll Leadership rolls.',damned);
 if(has('Infernal Lance')){
  add('surge','Malefic Surge · become Empowered','Command','own','during','Each Knight you choose takes a Leadership test and suffers D3 mortal wounds on failure. Pass or fail, it becomes Empowered until the start of your next Command phase. Spending any one Surge effect ends its Empowered state.',native);
  add('hunger','Malefic Surge · Unholy Hunger','Movement','own','during','An Empowered Knight making a Normal, Advance or Fall Back move may spend its Empowered state for +3″ Move this phase.',native);
  for(const window of attacks){
   add('power','Malefic Surge · Diabolic Power',window,window==='Shooting'?'own':'either','during','When selected to attack, spend the Knight’s Empowered state and choose Lethal Hits or Sustained Hits 1 for its weapons this phase.',native);
   add('fortitude','Malefic Surge · Unnatural Fortitude',window,'either','during','When targeted by an attack, spend the Knight’s Empowered state to gain either a 5+ invulnerable save or Feel No Pain 6+ for this phase.',native);
  }
 }
 if(has('Lords of Dread')){
  add('court','Tyrannical Court','Command','either','during','Chaos Knights Characters improve Objective Control by 2.',characters);
  if(characters.length)add('claimed-free','Tyrannical Court · Claimed for the Dark Gods','Command','own','start','Once per battle round, while your Warlord is on the battlefield, use Claimed for the Dark Gods for 0CP.',characters);
 }
 if(has('Houndpack Lance')){
  add('prey','Marked Prey','Command','own','start','Mark an enemy until the start of your next Command phase. War Dogs get Sustained Hits 1 against it when it is visible to the attacking model.',dogs);
  for(const window of attacks)add('prey-attacks','Marked Prey · attacks',window,window==='Shooting'?'own':'either','during','War Dogs attacking the visible marked enemy gain Sustained Hits 1.',dogs);
  add('marked-pack','Houndpack · muster the pack','Pre-battle','either','start','Include at least three War Dogs. All gain Battleline and three selected units also gain Character for the battle.',dogs);
 }
 if(has('Helhunt Lance')&&dogs.length>=2){
  const givers=titan.filter(s=>trait(s)?.dogAura||norm(army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]??'')==='octagram of conjuration');
  for(const window of phases)add('masters','Masters of the Pack',window,'either','during','If at least two friendly War Dogs are within this Titanic Knight’s aura affecting War Dogs, the Knight also benefits from that aura.',givers);
 }
 for(const strat of CHAOS_KNIGHT_STRATAGEMS){
  if(!has(strat.detachment))continue;
  const effect=stratEffects[strat.id],targets=groups[effect.scope];
  const title=strat.name.toLowerCase().replace(/(^|[\s‑-])\p{L}/gu,s=>s.toUpperCase())+' · '+strat.cp+'CP';
  for(const w of strat.windows)add(strat.id,title,w.phase,w.turn,strat.timing,effect.cue,targets);
 }
 for(const bearer of roster){
  const name=army.upgrades2026?.[bearer.id]??army.upgrades2026?.[bearer.unit];
  if(!name||!eligibleChaosKnightUpgrades(army,bearer.unit,bearer.id).some(u=>norm(u.name)===norm(name)))continue;
  const cue=(window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],text:string,targets=[bearer],previousWindow?:ReminderWindow)=>
    add('enh-'+bearer.id+'-'+norm(name),bearer.id+' · '+name,window,turn,timing,text,targets,'detachment',previousWindow);
  switch(norm(name)){
   case 'cruel lashmaster (aura)':
    cue('Movement','own','during','When a Damned unit within 6″ of the bearer makes a Normal, Advance or Fall Back move, it has +2″ Move for the phase.',damned);break;
   case 'iconoclast idol (aura)':
    cue('Charge','opponent','end','When using Heroic Intervention on a friendly Damned unit within 6″ of the bearer, reduce its cost by 1CP.',damned);break;
   case 'pterrorshade rookery':
    cue('Shooting','own','during','When the Tyrant is selected to shoot, choose an enemy within 24″. Its detection range increases by 6″ until the bearer finishes shooting.');break;
   case 'hate-filled dominion':
    for(const phase of attacks)cue(phase,phase==='Shooting'?'own':'either','during','The bearer may re-roll a roll used to determine a weapon’s Attacks.');break;
   case 'soul-spoor auspicator':
    cue('Shooting','own','during','The upgraded Huntsman’s ranged weapons gain 6″ range.');break;
   case 'snarling rivalry':
    cue('Shooting','own','during','The upgraded Executioner has Ignores Cover on its ranged attacks.');break;
   case 'throne mechanicum of skulls':
    cue('Charge','own','during','Re-roll the bearer’s Charge rolls. Once per battle in your Charge phase, allow it to charge this turn even if it Advanced.');break;
   case 'blade of celerity':
    cue('Shooting','own','during','The bearer’s ranged weapons gain Assault.');
    cue('Fight','either','during','Once per battle in the Fight phase, the bearer can gain Fights First for this phase.');break;
   case 'putrid carapace':
    cue('Command','either','start','Once per battle, at the start of either Command phase, restore up to D6 lost wounds to the bearer.');
    for(const phase of attacks)cue(phase,'either','during','The bearer has a 2+ Save characteristic.');break;
   case 'warp-borne stalker':
    cue('Pre-battle','either','during','The bearer has Deep Strike and may use it when declaring reserves.');
    cue('End of opponent turn','opponent','end','Once per battle, move the unengaged bearer into Strategic Reserves.');
    cue('Movement','own','during','If the bearer is in reserves it can arrive using Deep Strike, subject to normal arrival rules.');break;
   case 'mirror of fates':
    for(const phase of phases)cue(phase,'either','during','Once per turn when the opponent targets their own unit with a Stratagem within 12″ of the bearer, increase that use’s cost by 1CP.');break;
   case 'blessing of the dark master':
    cue('Shooting','either','during','The bearer has Stealth. Once per battle after making a saving throw, set that attack’s Damage to 0.');
    cue('Fight','either','during','Once per battle after a saving throw, the bearer can change that attack’s Damage to 0.');break;
   case 'aspect of the beast':
    cue('Command','own','start','Choose one additional Dread ability for the bearer until the start of your next Command phase.');break;
   case "hunter's helm":
    cue('Movement','own','during','Re-roll Advance rolls for the bearer.');cue('Charge','own','during','Re-roll Charge rolls for the bearer.');break;
   case 'octagram of conjuration':
    cue('Shooting','own','during','After a friendly War Dog within 9″ of the bearer shoots, choose an enemy hit by its attacks to take Battle-shock. If two War Dogs are within range, Masters of the Pack lets the bearer benefit as well.',dogs.length>=2?[...dogs,bearer]:dogs);break;
   case 'throne tyrannicus':{
    const recipients=characters.filter(s=>s.id!==bearer.id);
    if(trait(bearer)?.dogAura)cue('Command','own','during','Select another Chaos Knights Character within 9″. Until the start of your next Command phase, it benefits from the bearer’s aura abilities that affect friendly War Dogs.',recipients);break;
   }
   case "preyslayer's mantle":
    cue('Movement','own','during',walkerText);break;
   case 'final howl (aura)':
    for(const phase of attacks)cue(phase,phase==='Shooting'?'own':'either','during','Friendly War Dogs within 6″ of the bearer re-roll Wound rolls of 1.',dogs);break;
   case 'loping predator':
    cue('Shooting','own','during','The bearer’s ranged weapons gain Assault.');break;
   case 'panoply of the cursed knight':
    for(const phase of attacks)cue(phase,'either','during','Worsen the AP of incoming attacks against the bearer by 1.');break;
   case "nightmare's master":
    cue('Fight','either','start','Every enemy unit engaged with the bearer takes a Battle-shock test.');break;
   case "tyrant's shadow":
    cue('Command','own','end','Select an objective you control within the bearer’s range. Keep control until the opponent exceeds it at the end of a phase. The objective projects Deathly Terror as a Chaos Knights model until you lose control.');break;
   case 'malevolent heraldry':
    cue('Start of battle round','either','start','In round one, while the bearer is on the battlefield, when randomly determining your army’s Dreads, re-roll either die or both.',[bearer],'Pre-battle');
    cue('Start of battle round','either','start','In rounds three and five, if the bearer is on the battlefield and you randomly determine new Dreads, re-roll either or both dice.',[bearer],'Command');break;
   case 'veil of medrengard':
    cue('Shooting','either','during','The bearer has a 4+ invulnerable save against ranged attacks.');
    cue('Fight','either','during','The bearer has a 5+ invulnerable save against melee attacks.');break;
   case 'knight diabolus':
    cue('Fight','either','during','Improve melee WS by 1. While the bearer uses Diabolic Power, its melee weapons also gain Lance.');break;
   case 'blasphemous engine':
    cue('Pre-battle','either','during','Add 2 to the bearer’s Wounds characteristic.');
    cue('Command','own','during','When this bearer makes a Malefic Surge, it can re-roll its Leadership test for mortal wounds. This also applies if it surges from Profane Symbiosis.');break;
   case 'fleshmetal fusion':
    for(const phase of attacks)cue(phase,'either','during','The bearer has +1 Toughness. While using Unnatural Fortitude, add 1 to armour saves against Damage 1 attacks.');break;
   case 'bestial aspect':
    cue('Movement','own','during','While using Unholy Hunger, the bearer can ignore any or all modifiers to its Move or Advance rolls.');
    cue('Shooting','own','during','The bearer’s ranged weapons gain Assault.');break;
  }
 }
 return rows;
}
