import type {ArmySelection} from './catalog';
import type {RosterInstance} from './roster-instances';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {PHASES} from './engine';
import {ASSIGNED_AGENT_DATA} from './knight-assigned-agents.generated';
import {CUSTODES_SHEETS} from './adeptus-custodes-data.generated';
import {KNIGHT_CARD_STATS as cards} from './custodes-card-data.generated';
import {knightJoinedBodyguard} from './leader-eligibility';
import {knightWeaponCount} from './knight-loadouts';
import {custodesHasRangedWeapon} from './custodes-loadouts';
import {eligibleCustodesPassengers} from './custodes-transports';
import {equippedWeaponText} from './knight-card-rules';

type Turn=NonNullable<GeneratedReminder['turn']>;
type Stage=[ReminderWindow,Turn,GeneratedReminder['timing']];
const shoot:Stage=['Shooting','own','during'],fight:Stage=['Fight','either','during'],move:Stage=['Movement','own','during'];
const snap:Stage=['Movement','opponent','end'],incoming:Stage=['Shooting','opponent','during'],incomingSnap:Stage=['Movement','own','end'];
const charge:Stage=['Charge','either','during'];
const defended=[incoming,incomingSnap,fight],eachPhase:Stage[]=PHASES.map(phase=>[phase,'either','during']);
const keyword=new Map(CUSTODES_SHEETS.map(s=>[s.unit,new Set(s.keywords)]));
interface CardAbility {name:string;windows:Stage[];summary:string}
const rule=(name:string,windows:Stage[],summary:string):CardAbility=>({name,windows,summary});
const surge='The formation must be unengaged, free of Battle-shock and have made no move this phase. Select the nearest enemy. Move each model into engagement if possible, otherwise as close as possible. Do not engage any other unit or move again this phase.';
const rules:Record<string,CardAbility[]>={
 'Shield-Captain':[rule('Vengeful Surge',[incoming],'Once per battle for this unit, after an enemy shoots in its Shooting phase, if any model in this formation lost a wound to those attacks, it may surge up to D6+2″. '+surge)],
 'Shield-Captain in Allarus Terminator Armour':[rule('Archeotech Teleport-shunter',[move],'Once per battle for this unit, if unengaged and not yet selected to move in your Movement phase, put the entire unit in Strategic Reserves. It must make an ingress move this phase.')],
 'Shield-Captain on Dawneagle Jetbike':[rule('Sweeping Advance',[['Fight','either','end']],'Once per battle for this unit, if it was eligible to fight this phase, it may move at phase end. Make a Normal move if unengaged or a Fall Back move if engaged.')],
 'Custodian Wardens':[rule('Living Fortress',defended,'Worsen the AP of attacks targeting this formation by 1.')],
 'Allarus Custodians':[rule('Slayer of Tyrants',[fight],'Add 1 to melee Wound rolls when the target unit has greater Toughness than this formation.')],
 'Vertus Praetors':[rule('Quicksilver Execution',[charge,fight],'After this formation makes a Charge move, its melee attacks have Sustained Hits 1 for the rest of that turn.')],
 'Contemptor-Achillus Dreadnought':[rule('Unyielding Ancient',defended,'Subtract 1 from Wound rolls for attacks whose Strength exceeds this unit’s Toughness.')],
 'Contemptor-Galatus Dreadnought':[rule('Unyielding Ancient',defended,'Subtract 1 from Wound rolls for attacks whose Strength exceeds this unit’s Toughness.')],
 'Caladius Grav-Tank':[rule('Destructor Optics',[shoot,snap],'Improve ranged AP by 1 against a unit that is neither a Monster nor a Vehicle.')],
 'Coronus Grav-Carrier':[rule('Repulsor Suspensor Technology',[incoming],'Once per phase for this unit, after an enemy shoots in its Shooting phase, if the carrier lost a wound to those attacks and is unengaged, it can make a Normal move up to D6″.')],
 'Telemon Heavy Dreadnought':[rule('Guardian Eternal',[incoming,incomingSnap],'Reduce the Damage of ranged attacks targeting this unit by 1.')],
 'Pallas Grav-Attack':[rule('Mobile Hunter',[shoot],'After shooting in your Shooting phase, you may make a Normal move up to D6″. If you do, this unit cannot declare a charge for the rest of the turn.')],
 'Blade Champion':[rule('Swift Onslaught',[move,charge],'This formation may re-roll Advance and Charge rolls.'),rule('Sword of the Throne',[['Start of battle round','either','start']],'At the start of the first battle round choose this Blade Champion’s mark from the enemy army. Whenever that unit is destroyed, select a new mark.'),rule('Sword of the Throne',[fight],'This Blade Champion’s own attacks gain +1 to Wound against its mark. When the mark is destroyed select a new enemy unit as its mark.')],
 'Knight-Centura':[rule('Seeker’s Instincts',[move,charge],'This formation gains 2″ Move and may re-roll its Advance and Charge rolls.'),rule('Corner the Quarry',[['Movement','either','during']],'A non-Monster, non-Vehicle enemy falling back while engaged with this formation must use Desperate Escape. If that enemy is Battle-shocked, subtract 1 from its hazard rolls.')],
 'Custodian Guard Sodality':[rule('Impenetrable Defence',[shoot,fight],'Against a target with neither Monster nor Vehicle, this formation’s attacks have Sustained Hits 1 if either this formation or the target is within range of an objective marker.')],
 'Prosecutor Squad':[rule('Purity of Execution',[shoot],'Select one visible enemy unit within 18″ in your Shooting phase. That unit is detected and its detection range increases by 3″, making its obscured models visible to enemy models within the extended distance.')],
 'Aquilon Terminators with Solarite Power Gauntlets':[rule('Dread Foe',[fight],'Improve melee AP by 1 when the target unit is neither a Monster nor a Vehicle.')],
 'Sentinel Guard Sodality':[rule('Stand Vigil',[shoot,fight],'Against a target with neither Monster nor Vehicle, this formation’s attacks have Lethal Hits if either this formation or its target is within range of an objective marker.')],
 'Witchseeker Squad':[rule('Sanctified Flames',[shoot],'After this formation shoots in your Shooting phase, select one enemy unit hit. It must make a Battle-shock roll, with −1 to that roll if it is a Psyker unit.')],
 'Gyrfalcon Jetbike Sodality':[rule('Death Blow',[charge,fight],'After this formation charges, improve its melee AP by 1 for the rest of the turn.')],
 'Vigilator Squad':[rule('Deft Parry',[fight],'Subtract 1 from Hit rolls for melee attacks targeting this formation.')],
 'Aquilon Terminators with Solarite Power Talons':[rule('Reap a Terrible Tally',[shoot,fight],'Against Infantry units, re-roll Hit rolls of 1 and Wound rolls of 1.'),rule('Reap a Terrible Tally',[snap],'When firing Overwatch against an Infantry unit, re-roll Wound rolls of 1. Snap shooting cannot re-roll Hit rolls.')],
 'Caladius Annihilator Grav-Tank':[rule('Advanced Firepower',[shoot],'When resolving ranged attacks against a Monster or Vehicle unit, re-roll one Hit roll, one Wound roll and one Damage roll.'),rule('Advanced Firepower',[snap],'Against a Monster or Vehicle during snap shooting, re-roll one Wound roll and one Damage roll. Hit rolls cannot be re-rolled.')],
 'Venatari with Kinetic Destroyers':[rule('Strike from the Skies',[shoot],'If this unit made an ingress move this turn, its ranged attacks may re-roll Hit rolls in your Shooting phase.')],
 'Orion Assault Dropship':[rule('Hover',[move],'When this unit takes to the skies during a Normal, Advance or Fall Back move, do not reduce its maximum distance by 2″.')],
 'Ares Gunship':[rule('Aircraft · Strategic Reserves',[['Pre-battle','either','during']],'Declare the Ares in Strategic Reserves. It can only make ingress moves. Rapid Ingress excludes Aircraft.'),rule('Aircraft · ingress',[move],'This Aircraft can only make an ingress move. Place it using the Strategic Reserves ingress rules.'),rule('Aircraft · return to reserves',[['End of opponent turn','opponent','end']],'At the end of each opponent’s turn, place the Ares in Strategic Reserves if it is on the battlefield.'),rule('Aircraft · aerial combat',[charge,fight],'The Ares cannot charge. Only units that Fly can charge it. Its melee attacks can only target Flying units, and only Flying models can attack it in melee.'),rule('Infernus Firebombs',[['Fight','opponent','end']],'At the end of the opponent’s Fight phase choose one visible enemy within 24″, excluding Aircraft and Lone Operatives. Until your next turn ends, ranged attacks against it ignore cover. Roll one D6 per model in that target: each 6 causes one mortal wound, capped at six.')],
};

export function custodesDatasheetReminders(army:ArmySelection,roster:readonly RosterInstance[]):GeneratedReminder[]{
 if(army.faction!=='Adeptus Custodes')return [];
 const eligible=roster.filter(s=>!!cards[s.unit]);
 const bodies=new Map(roster.map(s=>[s.id,knightJoinedBodyguard(army,s)]));
 const root=(s:RosterInstance)=>bodies.get(s.id)?.id??s.id;
 const roots=(models:readonly RosterInstance[])=>[...new Set(models.map(root))];
 const output:GeneratedReminder[]=[];
 for(const s of eligible){
   const {unit,id}=s,stats=cards[unit],form=root(s);
   const members=roster.filter(m=>root(m)===form);
   const all=(ability:string)=>members.every(m=>cards[m.unit]?.core?.includes(ability));
   const emit=(name:string,window:Stage,summary:string,targets:string[]=[form])=>{
     if(!targets.length)return;
     const [phase,turn,timing]=window;
     output.push({id:['11e-custodes-card',id,name,phase,turn].join(':'),title:id+' · '+name,window:phase,timing,turn,summary,source:stats.source,origin:'unit',units:targets});
   };
   for(const r of rules[unit]??[])for(const window of r.windows)emit(r.name,window,r.summary,r.name==='Sword of the Throne'?[id]:[form]);
   if(form===id&&all('Deep Strike'))for(const window of [['Pre-battle','either','during'],['Movement','either','during']] as Stage[])emit('Deep Strike',window,'Every model in this formation has Deep Strike. When declaring Strategic Reserves or making an ingress move, it may arrive anywhere more than 8″ horizontally from every enemy, including inside the opponent’s deployment zone.');
   if(form===id&&all('Scouts 7"'))emit('Scouts 7″',['Pre-battle','either','during'],'If this entire formation is in your deployment zone, Scout up to 7″ and finish more than 8″ horizontally from enemies. From Strategic Reserves, you may instead enter wholly within your deployment zone.');
   if(stats.save)for(const window of defended)emit('Invulnerable save',window,'When an attack is allocated to a '+unit+' model, you may use its '+stats.save+'+ invulnerable save.',[id]);
   if(stats.demise)for(const stage of eachPhase)emit('Deadly Demise '+stats.demise,stage,'When this model is destroyed, after any emergency disembarkation roll D6. On a 6 each unit within 6″ suffers '+stats.demise+' mortal wounds, rolled separately for each affected unit.',[id]);
   if(stats.damage)for(const stage of [shoot,fight])emit('Damaged '+stats.damage.threshold,stage,'With '+stats.damage.threshold+' or fewer wounds left, this model subtracts 1 from its Hit rolls.',[id]);
   for(const window of [snap,shoot,fight]){
     const phase=window===fight?'Fight':'Shooting';
     const text=equippedWeaponText(s,stats,phase,window===snap);
     if(text)emit(phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles',window,(window===snap?'When firing Overwatch: ':'')+text,[id]);
   }
   if(['Anathema Psykana Rhino','Coronus Grav-Carrier','Orion Assault Dropship'].includes(unit)){
     const passengers=eligibleCustodesPassengers(army,s,roster);
     const ids=passengers.map(p=>p.id);
     if(unit==='Orion Assault Dropship'){
       emit('Assault Dropship',move,'If one of these friendly Custodes formations makes a tactical disembark from the Orion and then Advances, that Advance leaves it eligible to charge this turn. Possible passengers: '+ids.join(', ')+'.',ids);
     }else{
       emit('Assault Vehicle',move,'After this transport finishes an Advance in your Movement phase, a formation already embarked before this phase may make a shock disembark move. Set every model wholly within 3″. The formation cannot charge for the rest of the turn. Possible passengers: '+ids.join(', ')+'.',ids);
     }
     if(unit==='Anathema Psykana Rhino'){
       const gunRows=passengers.flatMap(p=>{
         const members=roster.filter(m=>root(m)===p.id);
         const guns=members.flatMap(m=>{
           const native=cards[m.unit]?.weapons.filter(w=>w.phase==='Shooting'&&!w.abilities.some(a=>a.toLowerCase()==='one shot')).map(w=>w.name);
           const ally=ASSIGNED_AGENT_DATA.find(r=>r.sheet.unit===m.unit)?.weapons.filter(w=>w.type==='Ranged'&&!w.abilities.toLowerCase().includes('one shot')).map(w=>w.name);
           return (native??ally??[]).filter(name=>knightWeaponCount(m,name)>0);
         });
         return guns.length?[{id:p.id,names:[...new Set(guns)].join(', ')}]:[];
       });
       if(gunRows.length)emit('Firing Deck 2',shoot,'When the Rhino is selected to shoot in your Shooting phase, choose up to two embarked models from units that have not shot this phase. The Rhino fires one ranged weapon other than One Shot from each chosen model. Embarked units cannot shoot for the rest of the turn. Equipped passenger weapons: '+gunRows.map(r=>r.id+' ('+r.names+')').join('; ')+'.',[id,...gunRows.map(r=>r.id)]);
     }
   }
   if(unit==='Trajann Valoris'){
     for(const phase of PHASES)emit('Moment Shackle',[phase,'either','start'],'Once per battle for the army, at the start of any phase choose one benefit for Trajann until phase end: +3 Attacks for his Watcher’s Axe, or a 3+ invulnerable save.',[id]);
     for(const stage of eachPhase)emit('Feel No Pain 5+',stage,'Whenever Trajann would lose a wound, roll one D6. On a 5+ he keeps it. This roll belongs to Trajann alone.',[id]);
     const infantry=eligible.filter(m=>!keyword.get(m.unit)?.has('VEHICLE')&&!keyword.get(m.unit)?.has('MONSTER'));
     for(const stage of [shoot,snap,fight]){
       const targets=roots(infantry.filter(m=>stage===fight||custodesHasRangedWeapon(m)));
       emit('Captain-General (Aura)',stage,(stage===snap?'For snap shooting re-roll Wound rolls of 1. Hit rolls cannot be re-rolled.':'Re-roll Hit rolls of 1 and Wound rolls of 1.')+' Applies to friendly non-Monster, non-Vehicle Adeptus Custodes formations within 6″ of Trajann: '+targets.join(', ')+'.',targets);
     }
   }
   if(unit.startsWith('Shield-Captain'))for(const stage of eachPhase)emit('Master of Ka’tahs',stage,'Once per battle round for this formation, if it is not readied, you may ready it. It can then spend that readied state for a ka’tah.');
   if(knightWeaponCount(s,'Vexilla'))for(const stage of eachPhase)emit('Vexilla',stage,'While the vexilla bearer survives, add 1 to this formation’s OC and it may ignore modifiers to its Leadership.');
   if(knightWeaponCount(s,'Praesidium Shield'))for(const stage of defended){
     if(unit==='Shield-Captain')emit('Praesidium Shield',stage,'Reduce the Damage of attacks allocated to this Shield-Captain model by 1.',[id]);
     if(unit==='Sentinel Guard Sodality')emit('Praesidium Shield',stage,'While a shield bearer remains, attacks targeting this formation subtract 1 to Wound if their Strength exceeds the formation’s Toughness.');
   }
   if(unit.startsWith('Venatari with ')){
     emit('Take Wing',['Fight','opponent','end'],'At the end of your opponent’s Fight phase, if this unit is unengaged, you may put it in Strategic Reserves.');
     for(const phase of PHASES)emit('Neutronium Cascade Mine',[phase,'either','start'],'Once per battle for this unit, select one enemy within 3″ at the start of any phase and roll D6. On 2+ deal D3 mortal wounds, or 2D3 against a Monster or Vehicle.');
     if(unit==='Venatari with Verutum Lances'&&eligible.find(m=>m.unit===unit)?.id===id){
       const targets=roots(eligible.filter(m=>m.unit===unit));
       emit('Swift Ruin',['Movement','opponent','end'],'Once per phase across your army, one of these formations in Strategic Reserves may use Rapid Ingress at −1 CP, before or after another use on a different unit. The normal first-round prohibition still applies. Eligible formations: '+targets.join(', ')+'.',targets);
     }
   }
 }
 return output;
}
