import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {MECHANICUS_DOCTRINA_UNITS,MECHANICUS_REVISION} from './mechanicus-data.generated';
import {mechanicusAgentName,mechanicusMusterUnits} from './mechanicus-army-data';
import {mechanicusHasRangedWeapon} from './mechanicus-loadouts';
import {mechanicusFormations} from './mechanicus-transports';
import {mechanicusReactionShooting} from './mechanicus-reactions';
import {assignedAgentHasRanged} from './knight-assigned-agents';
import {expandRoster,type RosterInstance} from './roster-instances';

type Step=readonly [ReminderWindow,NonNullable<GeneratedReminder['turn']>,GeneratedReminder['timing']];
const faithful=new Set<string>(MECHANICUS_DOCTRINA_UNITS);
export function mechanicusDoctrinaFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 if(army.faction!=='Adeptus Mechanicus')return [];
 const legal=new Set(mechanicusMusterUnits(army));
 return mechanicusFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit))&&g.members.some(s=>faithful.has(s.unit)));
}
export function mechanicusDoctrinaReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 const groups=mechanicusDoctrinaFormations(army,roster);if(!groups.length)return [];
 const result:GeneratedReminder[]=[],all=groups.flatMap(g=>g.members.map(s=>s.id));
 const hasGun=(s:RosterInstance)=>mechanicusHasRangedWeapon(s)||!!mechanicusAgentName(s.unit)&&assignedAgentHasRanged(s,mechanicusAgentName(s.unit));
 const armed=groups.filter(g=>g.members.some(hasGun)).flatMap(g=>g.members.map(s=>s.id));
 const reaction=groups.filter(g=>g.members.some(s=>hasGun(s)&&mechanicusReactionShooting(army,s,roster).length)).flatMap(g=>g.members.map(s=>s.id));
 function add(key:string,title:string,[window,turn,timing]:Step,summary:string,units=all){
  if(units.length)result.push({id:['11e-mechanicus-doctrina',key,window,turn].join(':'),title,window,turn,timing,summary,units:[...new Set(units)],origin:'army',source:MECHANICUS_REVISION.pack});
 }
 const reach='This applies to every model in each eligible attached formation, including its attached allies, while a surviving native source supplies Doctrina Imperatives. If the last source dies to an attack, retain its effect until the attacking unit finishes. Unattached allies gain no Doctrina.';
 const battleline='The formation must have Battleline or be within 6″ of a friendly Adeptus Mechanicus Battleline unit. Cawl counts as Battleline only while his Mantra of Discipline is active.';
 add('choose','Doctrina Imperatives · Select an imperative',['Start of battle round','either','start'],'At the start of each battle round, you may select Protector or Conqueror. That imperative remains active for your army until the round ends. A rule that makes both active for a particular unit applies to that unit only. Eligible formations: '+groups.map(g=>g.root.id).join(', ')+'. '+reach);
 add('protector','Protector Imperative',['Shooting','own','during'],'While Protector is active for this formation, improve its ranged weapons’ Ballistic Skill by 1 and give them Heavy. Heavy adds 1 to Hit only in your Shooting phase if the unit is unengaged, no model moved more than 3″ this turn, and it was not set up this turn. Ballistic Skill changes and the Heavy Hit modifier are separate.',armed);
 add('protector-defense','Protector Imperative · Melee defence',['Fight','either','during'],'While Protector is active and the Battleline condition is met, subtract 1 from Hit rolls for melee attacks targeting this formation. '+battleline);
 add('conqueror-move','Conqueror Imperative · Assault',['Movement','own','during'],'While Conqueror is active, ranged weapons in this formation have Assault. After an Advance, an unengaged formation can use assault shooting with Assault weapons only; if it does, it cannot then start an action that phase.',armed);
 add('conqueror-shoot','Conqueror Imperative',['Shooting','own','during'],'While Conqueror is active, this formation’s ranged weapons have Assault. After an Advance, an unengaged formation can use assault shooting with Assault weapons only and cannot then start an action this phase. Improve its ranged attacks’ AP by 1 if the Battleline condition is met. '+battleline,armed);
 add('conqueror-fight','Conqueror Imperative',['Fight','either','during'],'While Conqueror is active, improve the Weapon Skill of this formation’s melee weapons by 1. Improve its melee attacks’ AP by 1 if the Battleline condition is met. '+battleline);
 add('snap','Doctrina Imperatives · Overwatch',['Movement','opponent','end'],'While Conqueror is active, improve these snap shots’ AP by 1 if the Battleline condition is met. '+battleline+' Protector’s Ballistic Skill and Heavy bonuses do not change snap shooting. Snap shots cannot re-roll Hit rolls or score Critical Hits.',armed);
 add('reaction','Doctrina Imperatives · Reaction shooting',['Shooting','opponent','during'],'Only when another rule permits normal reaction shooting: active Protector improves Ballistic Skill by 1; Heavy does not add a Hit bonus outside your own Shooting phase. Active Conqueror improves AP by 1 if the Battleline condition is met. '+battleline,reaction);
 return result;
}
