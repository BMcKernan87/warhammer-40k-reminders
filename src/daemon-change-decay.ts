import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {PHASES} from './engine';
import type {RosterInstance} from './roster-instances';
import {knightWeaponCount} from './knight-loadouts';
import {daemonFortification,daemonHasRangedWeapon,type DaemonRuleContext} from './daemon-datasheet-context';

type Step=[ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const shoot:Step=['Shooting','own','during'],fight:Step=['Fight','either','during'],move:Step=['Movement','own','during'];
const snap:Step=['Movement','opponent','end'],incoming:Step=['Shooting','opponent','during'],incomingSnap:Step=['Movement','own','end'];
const wounds:Step[]=[shoot,incoming,fight,snap,incomingSnap];
const defences:Step[]=[incoming,fight,incomingSnap];
const eachPhase:Step[]=PHASES.map(phase=>[phase,'either','during']);

export function daemonChangeAndDecay(c:DaemonRuleContext):void {
 const {squad,add,body}=c,unit=squad.unit,root=c.formationId(squad);
 const ids=(rows:readonly RosterInstance[])=>[...new Set(rows.map(c.formationId))];
 const allies=(god:string)=>c.roster.filter(s=>c.god(s)===god);
 const cue=(name:string,steps:Step[],summary:string,targets?:string[])=>{
   for(const [window,turn,timing] of steps)add(name,window,turn,timing,summary,targets);
 };
 const led=(name:string,steps:Step[],summary:string)=>{
   if(body)cue(name,steps,'While leading '+root+', '+summary,[root]);
 };
 switch(unit){
 case 'Kairos Fateweaver':
   add('One Head Looks Forward','Command','own','end','At the end of your Command phase, if Kairos is on the battlefield, take a Leadership test for him. Gain 1 CP if he passes.');
   cue('One Head Looks Back',eachPhase,'Once per turn, when the opponent targets one of their own units within 12″ of Kairos with a Stratagem, you may increase its cost by 1 CP.');
   break;
 case 'The Changeling':
   cue('Formless Horror',defences,'Before an enemy unit selects this model as an attack target, it takes a Battle-shock test. On a failure it is Battle-shocked and cannot target this model this phase.');
   add('Mischief and Confusion','Shooting','opponent','start','Choose one visible enemy unit within 12″. On D6 2–5 it has −1 to Hit for this phase. On a 6 it cannot shoot this phase.');
   break;
 case 'The Blue Scribes':
   cue('P’tarix’s Sorcerous Syphon (Aura)',defences,'Enemy models in units within 12″ subtract 1 from Wound rolls for psychic attacks.');
   add('Xirat’p’s Sorcerous Barrages (Psychic)','Movement','own','end','At phase end, roll a D6 separately for every enemy within 6″. On 2–3 it suffers one mortal wound, on 4–5 it suffers D3 and on 6 it suffers D6.');
   break;
 case 'Lord of Change':{
   const targets=ids(allies('Tzeentch').filter(daemonHasRangedWeapon));
   cue('Daemon Lord of Tzeentch (Aura)',[shoot,snap],'Tzeentch daemon models in friendly units within 6″ get +1 Strength on ranged attacks. Eligible formations: '+targets.join(', ')+'.',targets);
   add('Master of Magicks (Psychic)','Shooting','own','during','In your Shooting phase, give this model’s Bolt of Change one option for the phase: Ignores Cover, Lethal Hits or Sustained Hits D3.');
   break;
 }
 case 'Flamers':cue('Bounding Leaps',[move,shoot],root+' may shoot in a turn in which it Fell Back.',[root]);break;
 case 'Exalted Flamer':
   led('Blazing Warpfire (Psychic)',[move,shoot],'the formation’s ranged weapons gain Assault.');
   add('Flames of Change (Psychic)','Shooting','own','during','After this model shoots in your Shooting phase, choose one enemy unit it hit that is neither a Monster nor a Vehicle. On a 4+ subtract 2″ from that unit’s Move and 2 from its Advance and Charge rolls through the end of your opponent’s next turn.');
   break;
 case 'Screamers':
   add('Slashing Dive','Movement','own','during','After a Normal move in your Movement phase, select one enemy unit crossed by the formation. Roll one die per model in your unit. Each 4+ causes one mortal wound.',[root]);break;
 case 'Burning Chariot':
   add('Eldritch Flames (Psychic)','Shooting','own','during','After this model shoots in your Shooting phase, select one enemy unit it hit. That enemy loses the Benefit of Cover until phase end.');break;
 case 'Changecaster':
   led('Changecaster',[shoot],'the formation’s ranged weapons have Sustained Hits 1.');
   add('Storm of Mutating Sorcery (Psychic)','Shooting','own','during','After this model shoots in your Shooting phase, select one enemy Infantry unit it hit to take a Battle-shock test.');break;
 case 'Fateskimmer':
   led('Fateskimmer',[fight],'the formation’s melee weapons have Lethal Hits.');
   add('Rider of the Immaterial Winds','End of opponent turn','opponent','end','Once per battle at the end of the opponent’s turn, if '+root+' is unengaged you may remove that whole unit to Strategic Reserves.',[root]);break;
 case 'Fluxmaster':
   cue('Fluxmaster',defences,'This unit has Stealth against ranged attacks and melee attacks targeting it take −1 to Hit. Formation: '+root+'.',[root]);
   cue('Altered Reality (Psychic)',wounds,'Once per battle round, after a Hit roll, Wound roll or saving throw is made for the Fluxmaster itself, you may change its result to an unmodified 6.');
   break;
 case 'Blue Horrors':
 case 'Pink Horrors':{
   const pink=unit==='Pink Horrors',condition=pink?'Only after the last Pink Horror is gone: ':'';
   const transition=pink?' A dead Pink adds two Blue Horrors. A dead Blue adds one Brimstone Horror. Split may take the unit above its original starting strength.':' A dead Blue adds one Brimstone Horror.';
   cue('Split',wounds,'After an attacking unit finishes its attacks, if this unit survives, roll one D6 for each eligible Horror that was destroyed. On 4+ it splits.'+transition+' This also works for casualties from the unit’s own Hazardous weapon, but other non-attack damage cannot trigger Split.',[root]);
   if(pink)cue('Switch to Blue Horrors',wounds,'When the last Pink Horror is gone, use the Blue Horrors datasheet. Keep the original starting strength. When returning models using another rule, return no Pinks and do not exceed that starting strength.',[root]);
   cue('Sullen Malevolence (Aura)',eachPhase,condition+'while at least one Blue Horror survives, enemy models in units within 6″ worsen Leadership by 1.',[root]);
   add('Exploding Horrors','Fight','either','during',condition+'when selected to fight, pick one engaged enemy and one or more Brimstone Horrors. Roll once per chosen Brimstone. Each 4+ destroys that Brimstone and deals one mortal wound to that enemy.',[root]);
   cue('Split models · weapons',[shoot,snap],(pink?'Blue and Brimstone Horrors gained from Split':'Brimstone Horrors gained from Split')+' fire their own coruscating flames instead of the starting model’s profile. Their flames have Pistol and Psychic.',[root]);
   break;
 }
 case 'Great Unclean One':{
   const nurgle=ids(allies('Nurgle')),bearers=ids(c.roster.filter(s=>s.unit==='Plaguebearers'));
   cue('Daemon Lord of Nurgle (Aura)',defences,'Friendly Nurgle daemon units within 6″ add 1 to their models’ Toughness. Eligible formations: '+nurgle.join(', ')+'.',nurgle);
   add('Nurgle’s Rot (Psychic)','Movement','own','end','At the end of your Movement phase, select an enemy within 12″. Its models have −1 Toughness until your next Movement phase starts.');
   if(knightWeaponCount(squad,'Doomsday bell')&&bearers.length)add('Reverberating Summons','Fight','either','during','Each time this model’s doomsday bell destroys a model, you may return one destroyed Plaguebearer model to one friendly Plaguebearers unit within 12″. Eligible formations: '+bearers.join(', ')+'.',bearers);
   break;
 }
 case 'Plaguebearers':add('Infected Outbreak','Command','own','end','At the end of your Command phase, an objective this unit is in range of and you control stays yours until the opponent’s Level of Control exceeds yours at a phase end.',[root]);break;
 case 'Nurglings':add('Mischief Makers','Fight','either','during','When an enemy unit engaged with one or more Nurglings units is selected to fight, its melee attacks take −1 to Hit for the phase. Titanic enemies are exempt.');break;
 case 'Beasts Of Nurgle':for(const phase of PHASES)add('Grotesque Regeneration',phase,'either','end','At the end of each phase, every wounded surviving Beast of Nurgle in this unit heals all its lost wounds.');break;
 case 'Plague Drones':{
   const nurgle=ids(allies('Nurgle'));
   cue('Death’s Heads',[shoot,['Fight','own','during']],'After the Drones shoot in your Shooting phase, choose one enemy unit they hit. Until your turn ends, friendly Nurgle daemon units may re-roll Wound rolls against it. Eligible formations: '+nurgle.join(', ')+'.',nurgle);break;
 }
 case 'Epidemius':{
   const nurgle=ids(allies('Nurgle'));
   led('Blessed by the Plague God',defences,'every model in the formation has a 4+ invulnerable save.');
   add('Tally of Pestilence','Command','own','start','If your Nurgle daemon models have destroyed at least seven enemy models since the tally last reset, gain 1 CP at the start of your Command phase and reset the tally. Contributors: '+nurgle.join(', ')+'.',nurgle);break;
 }
 case 'Rotigus':{
   const nurgle=ids(allies('Nurgle'));
   add('Virulent Blessing (Psychic)','Fight','either','start','Select one visible enemy unit within 24″. For the phase, when a friendly Nurgle daemon model’s attack is allocated to a model in that unit, add 1 to its Damage. Eligible formations: '+nurgle.join(', ')+'.',nurgle);
   cue('Deluge of Nurgle (Aura)',eachPhase,'Models in enemy units within 6″ subtract 2 from Move and 1 from OC.');break;
 }
 case 'Horticulous Slimux':
   led('Beast Handler',[['Charge','either','during']],'you may re-roll Charge rolls for that formation.');
   add('Beast Handler · Heroic Intervention','Charge','opponent','end','Once per battle, this unit may use Heroic Intervention for 1 CP less, independently of another unit’s use this phase, before or after it.',[root]);
   if(c.army.faction==='Chaos Daemons')add('Seed the Garden of Nurgle','Movement','own','end','If this model is within Area Terrain at the end of your Movement phase, that terrain is in your army’s Shadow of Chaos for the rest of the battle.');
   break;
 case 'Poxbringer':
   led('Poxbringer',[shoot,fight],'a successful unmodified Hit roll of 5+ is critical.');
   cue('Feculent Despair (Aura, Psychic)',eachPhase,'Each enemy unit within 6″ subtracts 1 from its Battle-shock tests.');break;
 case 'Sloppity Bilepiper':
   led('Jolly Gutpipes',[move],'add 1″ to model Move and re-roll its Advance rolls.');
   add('Disease of Mirth (Aura)','Fight','either','start','At Fight phase start, every enemy unit within 6″ other than Monsters and Vehicles must take a Battle-shock test.');break;
 case 'Spoilpox Scrivener':
   led('Keep Counting!',[fight],'the formation’s melee weapons have Sustained Hits 1.');
   led('Meet Your Quota!',eachPhase,'every model in that formation gains +1 OC.');break;
 case 'Feculent Gnarlmaw':{
   const nurgle=ids(allies('Nurgle'));
   cue('Shroud of Flies (Aura)',[incoming,incomingSnap],'Friendly Nurgle daemon units within 6″ have Stealth, granting cover against ranged attacks. Eligible formations: '+nurgle.join(', ')+'.',nurgle);
   daemonFortification(c,'Diseased Cover');break;
 }
 }
}
