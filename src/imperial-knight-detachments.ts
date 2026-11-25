import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import type {RosterInstance} from './roster-instances';
import {KNIGHT_STRATAGEMS,KNIGHT_TRAITS,KNIGHT_UPGRADES} from './imperial-knight-detachments.generated';

const source='https://wahapedia.ru/wh40k11ed/factions/imperial-knights/';
const norm=(s:string)=>s.replace(/[‑–]/g,'-').replaceAll('’',"'").toLowerCase();
const traits=new Map(KNIGHT_TRAITS.map(t=>[norm(t.unit),t]));
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
const attacks=['Shooting','Fight'] as const;
type Turn='own'|'opponent'|'either';
const forgeAllies=new Set(['tech-priest dominus','tech-priest manipulus','skitarii marshal','skitarii rangers','skitarii vanguard']);
export function eligibleKnightUpgrades(army:ArmySelection,unit:string){
 if(army.faction!=='Imperial Knights')return [];
 const selected=new Set(army.detachments2026?.map(norm));
 return KNIGHT_UPGRADES.filter(u=>selected.has(norm(u.detachment))&&u.units.includes(norm(unit)));
}

function knightGroups(roster:readonly RosterInstance[]){
 const native=roster.filter(s=>traits.get(norm(s.unit))?.chivalric);
 const titanic=native.filter(s=>traits.get(norm(s.unit))!.walker);
 const armiger=native.filter(s=>s.unit.startsWith('Armiger '));
 const bondsman=native.filter(s=>traits.get(norm(s.unit))!.bondsman);
 const allies=roster.filter(s=>forgeAllies.has(norm(s.unit)));
 return {native,titanic,armiger,bondsman,allies,
  priests:allies.filter(s=>norm(s.unit).startsWith('tech-priest')),
  dominus:native.filter(s=>s.unit==='Knight Castellan'||s.unit==='Knight Valiant'),
  feet:native.filter(s=>traits.get(norm(s.unit))!.feet),
  partners:armiger.length?bondsman:[],
  bonded:bondsman.length?armiger:[],
  vengeance:titanic.length?allies:[]
 };
}
type Scope=keyof ReturnType<typeof knightGroups>;
type Strat={scope:Scope; cue:string};
// Indexed by the export ID because the two Full Tilt Stratagems have different costs, effects and targets.
const effects:Record<typeof KNIGHT_STRATAGEMS[number]['id'],Strat>={
 '000011005002':{scope:'dominus',cue:'When selected to move, the Dominus gains 2″ Move.'},
 '000011005003':{scope:'dominus',cue:'When an engaged Dominus is selected to shoot, its Blast attacks lose Blast and gain one attack.'},
 '000011005004':{scope:'dominus',cue:'After this Dominus shoots, one enemy unit it hit takes a Battle-shock roll at −1.'},
 '000010756003':{scope:'native',cue:'Before the unit attacks, it gains re-rolls of Hit and Wound rolls of 1 for the phase whenever no other friendly unit is within 9″ of it.'},
 '000010756002':{scope:'native',cue:'On destruction, Deadly Demise inflicts its mortal wounds on 4+. Add 1 to that roll for an Armiger.'},
 '000010756006':{scope:'native',cue:'After enemy target selection, incoming attacks stronger than this unit’s Toughness suffer −1 to Wound for the phase.'},
 '000010756005':{scope:'native',cue:'Before shooting, ignore the engaged Hit penalty this phase. Blast can target an enemy engaged with this unit if no other friendly unit is engaged with that enemy. Each unmodified Hit roll of 1 with such a Blast attack inflicts a mortal wound on the firing unit after its attacks.'},
 '000010756007':{scope:'armiger',cue:'Place an unengaged Armiger within 9″ of a battlefield edge into Strategic Reserves.'},
 '000010756004':{scope:'native',cue:'If the unit Advances this phase, use +6″ Move in place of its Advance roll. Armigers and Destriers use +9″ instead.'},
 '000010498002':{scope:'native',cue:'Before attacking, score Critical Hits on an unmodified 5+ against enemy units on your defensive line for the rest of this phase.'},
 '000010498006':{scope:'titanic',cue:'Before shooting with a Titanic Knight on your defensive line that Remained Stationary this turn, its ranged weapons gain Sustained Hits 2 this phase.'},
 '000010498004':{scope:'native',cue:'Before fighting with an engaged Knight on your defensive line, re-roll its Hit rolls this phase.'},
 '000010498005':{scope:'native',cue:'Choose up to two Knight units that have not been selected to move. Add 3″ to their Move this phase.'},
 '000010498007':{scope:'titanic',cue:'Choose a Titanic Knight on your defensive line. Each enemy that declares it a charge target this phase takes Battle-shock at −1.'},
 '000010498003':{scope:'native',cue:'After an enemy selects a unit on your defensive line as a target, incoming attacks stronger than that unit’s Toughness suffer −1 to Wound for the phase.'},
 '000009762004':{scope:'allies',cue:'When this Mechanicus unit is selected to Advance or Fall Back, that move does not prevent it from starting an action.'},
 '000009762003':{scope:'vengeance',cue:'After an enemy destroys a Titanic Knight, choose a friendly Adeptus Mechanicus unit. Mark the attacker for the rest of the battle. All friendly Adeptus Mechanicus units re-roll Wound rolls against it.'},
 '000009762002':{scope:'native',cue:'When the Knight suffers a mortal wound, it gains Feel No Pain 5+ against mortal wounds.'},
 '000010503006':{scope:'titanic',cue:'Immediately after the Titanic Knight Falls Back, it may shoot and declare a charge for the remainder of this turn.'},
 '000010503007':{scope:'titanic',cue:'The Titanic Knight may declare a charge this turn even if it Advanced.'},
 '000010503002':{scope:'titanic',cue:'After enemy target selection, the targeted Titanic Knight gains Feel No Pain 6+ for this phase.'},
 '000010503003':{scope:'titanic',cue:'Before attacking, add 1 to Hit and Wound rolls against Monster, Titanic or Walker units this phase.'},
 '000010503004':{scope:'titanic',cue:'Immediately before the Titanic Knight Consolidates, allow an additional 3″ of consolidation this phase if it can end engaged with an enemy.'},
 '000010503005':{scope:'titanic',cue:'Choose a Titanic Knight in range of an objective you control. Your control there is at least 5 until your opponent has greater control there at the end of a phase.'},
 '000010507003':{scope:'bonded',cue:'After a Titanic Bondsman shoots, target it and at least one Armiger under its Bondsman ability. Choose one enemy it hit. The selected Armigers improve AP by 1 when attacking that enemy this phase.'},
 '000010507005':{scope:'armiger',cue:'One Armiger gains Rapid Fire 1 on its ranged weapons this phase. Alternatively target a Titanic Bondsman and one or more Armigers affected by its ability to grant the benefit to those Armigers.'},
 '000010507002':{scope:'armiger',cue:'Choose an enemy. One Armiger adds 1 to melee Hit rolls against it this phase, or choose a Titanic Bondsman and at least one Armiger affected by it to apply the bonus to those Armigers.'},
 '000010507006':{scope:'armiger',cue:'After enemy target selection, worsen the AP of attacks targeting this Armiger by 1 for the phase.'},
 '000010507004':{scope:'armiger',cue:'One Armiger can shoot after Falling Back this phase. Alternatively target a Titanic Bondsman and one or more Armigers affected by it to grant the benefit to those Armigers.'},
 '000010507007':{scope:'armiger',cue:'Target one Armiger, or a Titanic Bondsman and one or more Armigers it affects. Place each selected Armiger that is unengaged and within 9″ of an edge into Strategic Reserves.'},
 '000011009004':{scope:'armiger',cue:'After this Armiger shoots, its shooting does not prevent it from starting an action.'},
 '000011009002':{scope:'titanic',cue:'Select a Titanic Knight and a friendly battle-shocked Armiger within 12″. Clear that Armiger’s Battle-shock.'},
 '000011009003':{scope:'partners',cue:'When the Knight uses Bondsman, it may select an Armiger within 18″. The Armiger must be free of another Bondsman ability.'},
 '000010494003':{scope:'feet',cue:'Before fighting, set Armoured Feet to 8 attacks and Titanic Feet to 12. Improve AP by 1 for those weapons this phase.'},
 '000010494004':{scope:'native',cue:'Before the unit is selected to move, add 2″ to its Move and 2 to its Advance rolls this phase.'},
 '000010494006':{scope:'native',cue:'After an enemy ends a Normal, Advance or Fall Back move within 8″, this Knight may make a Normal move of up to D6″.'},
 '000010494005':{scope:'native',cue:'Before the Knight shoots, its ranged weapons gain Lethal Hits for this phase.'},
 '000010494002':{scope:'native',cue:'Before the Knight fights, its melee weapons gain Lance for this phase.'},
 '000010494007':{scope:'native',cue:'After enemy target selection, the targeted Knight gains a 4+ invulnerable save this phase.'}
};

export function knightDetachmentReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Imperial Knights'||!roster.length)return [];
 const rows:GeneratedReminder[]=[];
 const selected=new Set(army.detachments2026?.map(norm));
 const has=(name:string)=>selected.has(norm(name));
 const groups=knightGroups(roster);
 const {native,titanic,armiger,bondsman,allies,priests,dominus,bonded}=groups;
 function add(key:string,title:string,window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],summary:string,targets:readonly RosterInstance[],origin:GeneratedReminder['origin']='detachment',previousWindow?:ReminderWindow){
  if(!targets.length)return;
  const units=targets.map(t=>t.id);
  const row={id:'11e-knight-'+key+'-'+(previousWindow??window),title,window,turn,timing,summary,source,origin,units,...(previousWindow?{previousSheetEntry:{window:previousWindow,units}}:{})};
  rows.push(row);
 }
 const armyCue=(key:string,title:string,window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],text:string,targets=native)=>add(key,title,window,turn,timing,text,targets,'army');
 const oathReward='The first fulfilled Oath makes your army Honoured and grants 2CP, or 3CP if you randomly determined at least one part. This award is exempt from the normal CP gain cap.';
 armyCue('oath','Code Chivalric · choose your Oath','Pre-battle','either','during','At the end of Read Mission Objectives, choose or randomly determine one Deed and one Quality independently. If you choose Lay Low the Tyrant, designate an enemy Character at the start of the battle. '+oathReward);
 for(const window of ['Fight','End of opponent turn','End of battle round'] as const){
  const condition=window==='Fight'?'At the end of either turn, check whether the enemy Character selected for Lay Low the Tyrant has been destroyed.':
    window==='End of opponent turn'?'At the end of the opponent’s turn, Reclaim the Realm is fulfilled if you control more objectives than the opponent.':
    'Reap a Great Tally is fulfilled if enemy units destroyed this round exceed the round number. Count destroyed units even if they later returned.';
  armyCue('deed','Code Chivalric · '+(window==='Fight'?'Lay Low the Tyrant':window==='End of opponent turn'?'Reclaim the Realm':'Reap a Great Tally'),window,window==='End of opponent turn'?'opponent':'either','end',condition+' '+oathReward);
 }
 for(const phase of attacks)armyCue('valour','Code Chivalric · Martial Valour',phase,phase==='Shooting'?'own':'either','during','If Martial Valour is your Quality, each time an eligible model is selected to shoot or fight it can re-roll one Hit roll and one Wound roll.');
 for(const phase of ['Movement','Charge'] as const)armyCue('eager','Code Chivalric · Eager for the Challenge',phase,'own','during','If this is your Quality, add 2″ to Move and 1 to the model’s Advance and Charge rolls.');
 armyCue('legacy','Code Chivalric · Legacy Unsullied','Command','either','during','If this is your Quality, eligible models have +2 Objective Control and their Leadership improves by 1 throughout the battle.');
 if(bonded.length)armyCue('bondsman','Use Bondsman abilities','Command','own','during','Each model with a Bondsman ability may choose a friendly Armiger within 12″ that is not already under a Bondsman ability. Its effect lasts until the start of your next Command phase. Eligible Armigers: '+armiger.map(s=>s.id).join(', ')+'.',bondsman);
 armyCue('walker','Super-heavy Walker','Movement','own','during','On a Normal, Advance or Fall Back move, move through non-Titanic models and terrain sections up to 4″ tall. You may cross engagement range but cannot end engaged. If you move through taller terrain, roll a D6 after the move. On 1 the model is battle-shocked.',titanic);
 if(has('Dominus Foebreakers'))for(const phase of attacks)add('devastation','Rain of Devastation',phase,phase==='Shooting'?'own':'either','during','Dominus attacks get +1 to Hit against a unit in a terrain area.',dominus);
 if(has('Throne-Bonded Outriders'))add('lairs','Driven from Their Lairs','Shooting','own','during','An Armiger affected by a Bondsman ability has Ignores Cover on its ranged attacks.',bonded);
 if(has('Valourstrike Lance'))for(const phase of ['Movement','Shooting'] as const)add('gallantry','Bold Gallantry',phase,'own','during','When a friendly Imperial Knights unit Advances, all friendly Imperial Knights models gain Assault on their ranged weapons until the end of the turn.',native);
 if(has('Freeblade Company')){
  add('legend-heal','Knights of Legend · repair','Command','own','start','At the start of your Command phase each Imperial Knights model heals one lost wound.',native);
  for(const phase of phases)add('legend-fnp','Knights of Legend · Feel No Pain',phase,'either','during','Imperial Knights models have Feel No Pain 6+ whenever they would lose a wound.',native);
 }
 if(has('Gate Warden Lance')){
  add('foundations','Dauntless Defenders · foundations','Start of battle round','either','start','At the start of round one choose two objectives and put a 40mm foundation marker in each. A unit is on your defensive line if a line joining any points on the two markers crosses any part of a model’s base or baseless hull.',native,'detachment','Pre-battle');
  for(const phase of attacks)add('horde','Against the Horde',phase,phase==='Shooting'?'own':'either','during','When a Knight on your defensive line attacks a visible enemy, it may ignore Hit modifiers and its weapons gain Sustained Hits 1.',native);
 }
 if(has('Spearhead-at-arms')){
  add('teachings','Knightly Teachings','Command','own','during','The first use of each distinct Bondsman ability this turn may affect up to three unbonded Armigers within 12″, or 15″ while Honoured. Later uses of that same ability use the normal limit.',groups.partners);
  add('battleline','Knightly Teachings · Battleline','Pre-battle','either','start','Your Armigers gain Battleline, including its increased datasheet copy limit.',armiger);
 }
 if(has('Questoris Companions')){
  add('heroes','Heroes of Legend','Command','own','start','At the start of your turn after fulfilling your current Oath, determine another using an unused Deed and Quality. Replace repeat random results with unused choices. Keep fulfilled Qualities. Later Oaths grant 1CP on completion. Stop when no further Oath is available.',native);
  if(roster.some(s=>KNIGHT_UPGRADES.some(u=>u.detachment==='Questoris Companions'&&u.name===(army.upgrades2026?.[s.id]??army.upgrades2026?.[s.unit]))))add('refresh','Valour’s Reward','Command','own','start','Each time an Oath is fulfilled, every expended Questoris Companions enhancement becomes available again.',native);
 }
 if(has('Questor Forgepact')){
  if(native.length)add('assist','Cogbound Alliance · Assisted Targeting','Shooting','own','during','A friendly Adeptus Mechanicus unit within 6″ of a Knight improves ranged BS by 1 and gains Heavy on its ranged attacks.',allies);
  if(priests.length)add('sacristan','Cogbound Alliance · Sacristan Pledge','Command','own','during','Each Tech-Priest may heal D3 wounds on one Knight model within 3″. A Knight can be selected only once by this ability per phase.',native);
 }
 for(const strat of KNIGHT_STRATAGEMS){
  if(!has(strat.detachment))continue;
  if(strat.id==='000011009002'&&!armiger.length)continue;
  const effect=effects[strat.id];
  const name=strat.name.toLowerCase().replace('ofthe','of the').replace(/(^|[\s‑-])\p{L}/gu,s=>s.toUpperCase());
  for(const w of strat.windows)add(strat.id,name+' · '+strat.cp+'CP',w.phase,w.turn,strat.timing,effect.cue,groups[effect.scope]);
 }
 for(const bearer of roster){
  const name=army.upgrades2026?.[bearer.id]??army.upgrades2026?.[bearer.unit];
  if(!name||!eligibleKnightUpgrades(army,bearer.unit).some(u=>norm(u.name)===norm(name)))continue;
  const self=[bearer],otherKnights=native.filter(s=>s.id!==bearer.id);
  const mentor=groups.partners.some(s=>s.id===bearer.id);
  const students=mentor&&armiger.length>=2?armiger:[];
  const cue=(window:ReminderWindow,turn:Turn,timing:GeneratedReminder['timing'],text:string,targets=self)=>
   add('upgrade-'+bearer.id+'-'+norm(name),bearer.id+' · '+name,window,turn,timing,text,targets);
  switch(norm(name)){
   case 'blessed plate':
    for(const phase of phases)cue(phase,'either','during','The bearer has +1 Toughness.');
    break;
   case 'archeotech autoloaders':
    for(const phase of attacks)cue(phase,phase==='Shooting'?'own':'either','during','The bearer can re-roll a roll to determine its weapon’s Attacks.');
    break;
   case 'magos questoris':
    cue('Command','own','during','When this Tech-Priest uses Sacristan Pledge on an eligible Knight within 3″, the Knight heals an additional 2 wounds.',native);
    break;
   case 'knight of the opus machina (aura)':
    cue('Fight','either','during','Friendly Adeptus Mechanicus units within 6″ of the bearer improve melee WS and AP by 1.',allies);
    break;
   case 'gyro-optimised actuators':
    cue('Movement','own','during','The upgraded Armiger has the Mobile keyword and can move horizontally through dense terrain features.');
    break;
   case 'ancestral overbleed':
    cue('Movement','opponent','end','Reduce the CP cost of Fire Overwatch by 1 when it targets this upgraded Armiger.');
    cue('Charge','opponent','end','Reduce the CP cost of Heroic Intervention by 1 when it targets this upgraded Armiger.');
    break;
   case "mentor's pride":
    for(const phase of attacks)cue(phase,phase==='Shooting'?'own':'either','during','While at least two Armigers are affected by the bearer’s Bondsman ability, those Armigers re-roll Hit rolls of 1.',students);
    break;
   case 'fables of nightmare':
    cue('Fight','either','during','While two or more Armigers are affected by the bearer’s Bondsman ability, those Armigers have Precision on their melee weapons.',students);
    break;
   case 'tales of heroism':
    cue('Fight','either','during','While the bearer’s Bondsman ability affects at least two Armigers, those Armigers can ignore any Hit or Wound modifiers on their melee attacks.',students);
    break;
   case 'martial tuition':
    cue('Fight','either','during','Once per turn while this bearer’s Bondsman ability affects at least two Armigers, one such Armiger can use Counter-offensive for 0CP.',students);
    break;
   case 'bringer of justice':
    cue('Fight','either','during','The bearer adds 2 to the Attacks characteristic of its melee weapons and adds 1 to its melee Hit rolls.');
    break;
   case "hunter's eye":
    cue('Shooting','own','during','The bearer’s ranged weapons gain Ignores Cover.');
    break;
   case 'mysterious guardian':
    cue('End of opponent turn','opponent','end','Once per battle per army, if the bearer’s unit is unengaged it can enter Strategic Reserves and gain Deep Strike until your next Shooting phase.');
    cue('Movement','own','during','After using Mysterious Guardian the unit must arrive by ingress this phase, including on your first turn.');
    break;
   case 'sanctuary':
    for(const phase of attacks)cue(phase,'either','during','The bearer has a 5+ invulnerable save against ranged and melee attacks.');
    break;
   case 'bearer of the iron chalice':
    cue('Movement','own','end','Select another visible Knight within 12″ of the bearer. Heal up to D3 wounds, or up to 3 while Honoured.',otherKnights);
    break;
   case 'bearer of the evanescent ion':
    cue('Movement','own','end','Give another visible Knight within 12″ of the bearer Stealth until the start of your next Movement phase.',otherKnights);
    break;
   case "bearer of the judicant's helm":
    cue('Shooting','own','start','Choose another visible Knight within 12″ of the bearer. Its ranged weapons gain Ignores Cover this phase.',otherKnights);
    break;
   case "bearer of the lancer's sigil":
    cue('Charge','own','start','Choose another visible Knight within 12″ of the bearer. Re-roll its Charge rolls for this phase.',otherKnights);
    break;
   case 'herald of triumph':
    cue('Charge','own','during','After the bearer ends a Charge move, you may expend this enhancement. Every enemy unit it engages takes a Battle-shock test at −1.');
    break;
   case 'wyrmslayer divination':
    cue('Shooting','own','during','When the bearer is selected to shoot, expend this enhancement to re-roll its Hit rolls against units that can Fly for this phase.');
    break;
   case 'pennant of silvered fury':
    cue('Fight','either','during','When the bearer is selected to fight, expend this enhancement to give its melee weapons Sustained Hits 2 this phase.');
    break;
   case 'crushing condemnation':
    cue('Fight','either','during','After the bearer fights and destroys at least one enemy unit, you may expend this enhancement. Pick a visible enemy within 12″ unengaged with friendly units. Roll six D6, inflicting one mortal wound for each 4+.');
    break;
   case 'acquisitor-at-arms':
    cue('Command','own','during','While the bearer is on the defensive line and no enemy is on it, each model under its Bondsman ability adds the bearer’s OC to its own.',mentor?armiger:[]);
    break;
   case 'augury halo':
    cue('Shooting','own','during','While the bearer is on your defensive line, its ranged attacks gain Ignores Cover.');
    break;
   case "purgation's hand":
    cue('Fight','either','during','While the bearer is on your defensive line, it re-rolls melee Hit and Wound rolls of 1.');
    break;
   case 'vengeful tread':
    cue('Charge','own','during','Once per turn the bearer can use Crushing Impact for 0CP.');
    break;
  }
 }
 return rows;
}
