import type {ArmySelection} from './catalog';
import {emperorsChildrenKeywords,emperorsChildrenMusterUnits} from './emperors-children-data';
import {EMPERORS_CHILDREN_REVISION,EMPERORS_CHILDREN_SHEETS} from './emperors-children-data.generated';
import {emperorsChildrenHasRangedWeapon,emperorsChildrenWeaponCount} from './emperors-children-loadouts';
import {emperorsChildrenCargoFormations,emperorsChildrenFormations} from './emperors-children-transports';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';

const cards=new Map(EMPERORS_CHILDREN_SHEETS.map(s=>[s.unit,s]));
const phases=['Command','Movement','Shooting','Charge','Fight'] as const;
type Turn=NonNullable<GeneratedReminder['turn']>;
type Timing=GeneratedReminder['timing'];

export function emperorsChildrenIntrinsicReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Emperor’s Children')return [];
 const allowed=new Set(emperorsChildrenMusterUnits(army)),native=roster.filter(s=>cards.has(s.unit)&&allowed.has(s.unit));
 if(!native.length)return [];
 const groups=emperorsChildrenFormations(army,roster);
 function recipients(...tags:string[]){
  return groups.filter(g=>{
   const kws=new Set(g.members.flatMap(m=>[...emperorsChildrenKeywords(army,m)]));
   return tags.every(k=>kws.has(k))&&g.members.every(m=>allowed.has(m.unit));
  }).map(g=>g.root.id);
 }
 const slaanesh=recipients('SLAANESH'),infantry=recipients('SLAANESH','INFANTRY'),legions=recipients('LEGIONS OF EXCESS');
 const result:GeneratedReminder[]=[];
 function emit(key:string,title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,units:string[],source:string){
  if(units.length)result.push({id:['11e-ec-card',key,title,window,turn,timing].join(':'),title,window,turn,timing,summary,origin:'unit',units:[...new Set(units)],source});
 }
 const byName=(name:string)=>native.filter(s=>s.unit===name).map(s=>s.id);
 emit('daemonettes','Horrifying Beauty','Fight','either','start','Each enemy unit engaged with one or more of these Daemonette units takes one Battle-shock test. Subtract 1 from its result if the enemy is below Half-strength.',byName('Daemonettes'),cards.get('Daemonettes')!.source);
 emit('fiends','Soporific Musk','Movement','opponent','during','When an engaged enemy falls back from one or more Fiends units, its models take Desperate Escape tests unless the enemy is a Monster or Vehicle unit. If also Battle-shocked, subtract 1 from those tests.',byName('Fiends'),cards.get('Fiends')!.source);
 for(const squad of native){
  const {unit,id}=squad,source=cards.get(unit)!.source;
  const group=groups.find(g=>g.members.some(m=>m.id===id));
  if(!group)continue;
  const formation=[...new Set([id,...group.members.map(m=>m.id)])],leading=group.root.id!==id;
  const guns=group.members.some(emperorsChildrenHasRangedWeapon);
  function add(title:string,window:ReminderWindow,turn:Turn,timing:Timing,summary:string,targets=[id],page?:number){
   emit(id,title,window,turn,timing,summary,targets,page?EMPERORS_CHILDREN_REVISION.pack+'#page='+page:source);
  }
  if(unit==='Fulgrim'){
   add('Daemon Primarch of Slaanesh','Command','opponent','start','Select Beguiling Form, Daemonic Speed or Enthralling Hypnosis. Fulgrim keeps that ability until the start of your opponent’s next Command phase.');
   add('Beguiling Form','Shooting','opponent','during','If this presence was selected, subtract 1 from Hit rolls for attacks targeting Fulgrim.');
   add('Beguiling Form','Fight','either','during','If this presence was selected, subtract 1 from enemy Hit rolls for melee attacks targeting Fulgrim.');
   add('Daemonic Speed','Fight','either','during','If this presence was selected, Fulgrim has Fights First. Resolve his combat in the Fights First alternation when eligible.');
   add('Enthralling Hypnosis','Movement','opponent','during','If this aura was selected, an enemy unit within 6″ selected to Fall Back tests Leadership. On failure it must Remain Stationary instead.');
   for(const [window,turn] of [['Shooting','own'],['Fight','either']] as const)add('Daemonic Poisons',window,turn,'during','After Fulgrim finishes attacking, choose one enemy unit hit by any of those attacks. It remains poisoned for the rest of the battle.');
   add('Daemonic Poisons','Command','either','start','Roll one D6 per poisoned enemy unit on the battlefield, even if Fulgrim has since been destroyed. On 4+ that unit suffers D3 mortal wounds.');
  }
  if(unit==='Lord Exultant'){
   if(leading){
    if(guns)add('Perfectionists','Shooting','own','during','While the Lord leads this formation, its ranged weapons have Lethal Hits. Critical Hits automatically wound.',formation);
    add('Perfectionists','Fight','either','during','While the Lord leads this formation, its melee weapons have Lethal Hits. Critical Hits automatically wound.',formation);
   }
   add('Euphoric Strikes','Fight','either','start','Once per battle, the Lord may add 3 Attacks to his own melee weapons and improve their AP by 1 for this phase.');
  }
  if(unit==='Tormentors')add('Objective Defiled','Command','own','end','If the formation is in range of an objective you control, retain it after leaving. This ends when the enemy’s Level of Control is greater than yours at the end of a phase.',formation);
  if(unit==='Infractors')add('Excessive Assault','Fight','either','during','Re-roll Wound rolls of 1 for this formation’s melee attacks. Against an enemy within range of an objective marker, you may instead re-roll the whole Wound roll.',formation);
  if(emperorsChildrenWeaponCount(squad,'Icon of Excess'))for(const [window,turn] of [['Shooting','own'],['Fight','either']] as const)add('Icon of Excess',window,turn,'end','If the Icon bearer’s formation destroyed one or more enemy units this phase, take one Leadership test for the formation. On a pass, gain 1CP.',formation);
  if(unit==='Chaos Terminators'&&guns){
   add('Lethal Obsession','Shooting','own','during','After the formation shoots, you may mark one enemy unit it hit. Until the turn ends, when declaring a charge the formation may re-roll its charge roll and must finish its charge move engaged with that marked enemy.',formation,10);
   add('Lethal Obsession','Charge','own','during','If this formation marked an enemy it hit this turn, it may re-roll its charge roll and must end the charge engaged with that enemy.',formation,10);
  }
  if(unit==='Chaos Land Raider'||unit==='Chaos Rhino'){
   const passengers=emperorsChildrenCargoFormations(army,squad,roster).map(g=>g.root.id);
   if(passengers.length&&unit==='Chaos Land Raider'){
    add('Assault Ramp','Movement','own','during','After this transport makes a Normal move, its passengers may Assault Disembark wholly within 3″, unengaged. They retain charge eligibility.',[id,...passengers]);
    add('Assault Ramp','Charge','own','during','A formation that Assault Disembarked after this Land Raider’s Normal move may charge this turn.',[id,...passengers]);
   }
   if(passengers.length&&unit==='Chaos Rhino'){
    add('Assault Vehicle','Movement','own','during','After the Rhino Advances, eligible passengers may Shock Disembark wholly within 3″ and outside Engagement Range. Those passengers cannot charge this turn.',[id,...passengers]);
    add('Assault Vehicle','Charge','own','during','A formation that Shock Disembarked after this Rhino’s Advance cannot declare a charge this turn.',[id,...passengers]);
   }
  }
  if(unit==='Lucius the Eternal'){
   add('A Challenge Worthy of Skill','Fight','either','during','When Lucius attacks a Character, Monster or Walker unit, he may re-roll his own Hit and Wound rolls.');
   if(!leading)add('Duellist’s Hubris','Fight','either','start','Because Lucius is not leading a unit, he gains Fights First until the end of this Fight phase.');
  }
  if(unit==='Lord Kakophonist'){
   if(leading&&guns)add('Obsessive Annunciation','Shooting','own','during','While the Kakophonist leads this formation, its ranged weapons have Sustained Hits 1. Each Critical Hit generates an additional hit.',formation);
   if(guns)add('Doom Siren','Shooting','own','during','After the formation shoots, choose one enemy Infantry unit hit by any of those attacks. Roll three D6. Each 4+ inflicts one mortal wound. If it suffers any mortal wounds from this ability, it must take a Battle-shock test.',formation);
  }
  if(unit==='Sorcerer'){
   if(leading)for(const [window,turn] of [['Shooting','opponent'],['Movement','own']] as const)add('Warped Interference',window,turn,window==='Movement'?'end':'during','While the Sorcerer leads this formation, its models have the Benefit of Cover against ranged attacks.',formation);
   add('Wracking Agonies','Shooting','own','during','After the Sorcerer shoots, choose an Infantry unit hit by its Agonising Energies. Until your next turn starts, subtract 2″ from its Move and 2 from its Charge rolls.');
   add('Wracking Agonies','Movement','opponent','during','If the Sorcerer wracked an Infantry unit with Agonising Energies, that unit has −2″ Move until your next turn starts.');
   add('Wracking Agonies','Charge','opponent','during','An Infantry unit wracked by this Sorcerer subtracts 2 from Charge rolls until your next turn starts.');
  }
  if(unit==='Daemon Prince of Slaanesh'){
   if(infantry.length)for(const [window,turn] of [['Shooting','opponent'],['Movement','own']] as const)add('Lord of Excess',window,turn,window==='Movement'?'end':'during','While within 3″ of a friendly Slaanesh Infantry unit, this Prince has Lone Operative. Enemy models more than 12″ away cannot see it or target it indirectly. Eligible escorts: '+infantry.join(', ')+'.',[id,...infantry]);
   add('Excessive Vigour','Fight','either','during','Friendly Slaanesh units within 6″ that made a charge move this turn improve the AP of their melee weapons by 1.',[id,...slaanesh]);
   add('Ecstatic Death','Fight','either','during','If a melee attack destroys the Prince before it has fought this phase, roll a D6. On 2+ it fights after the attacking unit finishes attacking, then remove the Prince.');
  }
  if(unit==='Daemon Prince of Slaanesh with Wings'){
   add('Daemonic Destruction','Charge','either','during','After the Prince completes a charge move, select an enemy engaged with it. Roll one D6 per remaining wound on the Prince. Each 4+ causes one mortal wound, up to six mortal wounds.');
   for(const [window,turn] of [['Shooting','opponent'],['Movement','own'],['Fight','either']] as const)add('Stimulated by Pain',window,turn,window==='Movement'?'end':'during','When allocating an attack to the Prince, reduce its Damage characteristic by 1.');
  }
  if(unit==='Noise Marines'){
   add('Terrifying Crescendo','Shooting','own','during','After the formation shoots, choose one enemy unit hit by any of those attacks. It subtracts 1 from Battle-shock and Leadership tests until the start of your next Shooting phase. Each application stacks with the other active penalties from this ability on that enemy.',formation,10);
   add('Terrifying Crescendo','Command','either','during','When a marked enemy tests Leadership or Battle-shock, subtract 1 for each active Terrifying Crescendo on it until your next Shooting phase starts.',formation,10);
  }
  if(unit==='Flawless Blades'){
   add('Daemonic Patrons','Fight','either','during','When selecting this formation to fight, it may call on its patrons. Its attacks then score Critical Wounds on unmodified Wound rolls of 3+ until the phase ends.',formation);
   add('Daemonic Patrons','Fight','either','end','If this formation invoked its patrons and its attacks destroyed no enemy models this phase, destroy one model in this formation.',formation);
  }
  if(unit==='Chaos Spawn')add('Scuttling Horrors','Movement','opponent','during','After an enemy finishes a move within 8″ of this unengaged unit, it may make a Normal move of up to 6″.');
  if(unit==='Maulerfiend'){
   const pain='Below Starting Strength, add 1 to this model’s Hit rolls. If also below Half-strength, add 1 to its Wound rolls as well.';
   add('Glutton for Punishment','Fight','either','during',pain);
   if(emperorsChildrenHasRangedWeapon(squad)){
    add('Glutton for Punishment','Shooting','own','during',pain);
    add('Glutton for Punishment','Movement','opponent','end','When this model fires Overwatch below Half-strength, add 1 to its Wound rolls. Hit modifiers do not affect snap shooting.');
   }
  }
  if(unit==='Heldrake')add('Airborne Predator','Movement','own','during','After a Normal move, choose an enemy unit the Heldrake flew over. Roll two D6, adding 1 to each die if that unit can Fly. For each 4+, deal D3 mortal wounds.');
  if(unit==='Shalaxi Helbane'){
   add('No Prey Can Evade','Movement','own','during','You may re-roll Shalaxi’s Advance rolls.');
   add('No Prey Can Evade','Charge','either','during','You may re-roll Shalaxi’s Charge rolls.');
   add('Monarch of the Hunt','Start of battle round','either','start','In the first battle round, select one enemy unit as Shalaxi’s quarry. Whenever the quarry is destroyed, immediately select a new enemy unit.');
   add('Monarch of the Hunt','Fight','either','during','Against the current quarry, re-roll Shalaxi’s melee Hit and Wound rolls. Select a new quarry whenever the current one is destroyed.');
  }
  if(unit==='Keeper of Secrets'){
   add('Daemon Lord of Slaanesh','Fight','either','during','Friendly Legions of Excess units within 6″ improve the AP of their melee weapons by 1.',[id,...legions]);
   for(const [window,turn] of [['Shooting','opponent'],['Fight','either']] as const)add('Mesmerising Form',window,turn,'during','Subtract 1 from Hit rolls for attacks directed at this Keeper.');
   if(emperorsChildrenWeaponCount(squad,'Shining aegis'))for(const [window,turn] of [['Shooting','opponent'],['Movement','own'],['Fight','either']] as const)add('Shining Aegis',window,turn,window==='Movement'?'end':'during','This Keeper’s equipped Shining Aegis gives it a 3+ armour Save. Apply the attacking weapon’s AP normally when using this save.');
  }
  if(unit==='Seekers'){
   add('Unholy Speed','Movement','own','during','You may re-roll Advance rolls for this unit.');
   add('Unholy Speed','Charge','either','during','You may re-roll Charge rolls for this unit.');
  }
  if(emperorsChildrenWeaponCount(squad,'Daemonic Icon'))for(const phase of phases)add('Daemonic Icon',phase,'either','during','While its Icon bearer survives, every model in this unit has Leadership 6+.',formation);
  if(emperorsChildrenWeaponCount(squad,'Instrument of Chaos'))add('Instrument of Chaos','Charge','either','during','While the Instrument bearer survives, add 1 to this unit’s Charge rolls.',formation);
  if(unit==='Defiler'){
   add('Scuttling Walker','Movement','own','during','On Normal, Advance and Fall Back moves the Defiler can move through non-Titanic models and terrain. It may cross enemy Engagement Range without finishing there and automatically passes Desperate Escape tests.');
   add('Revel in Desecration','Shooting','own','during','Add 1 to the Defiler’s ranged Hit rolls against an enemy that is not below Half-strength.');
   add('Revel in Desecration','Fight','either','during','Add 1 to its melee Hit rolls against an enemy that is not below Half-strength.');
  }
 }
 return result;
}
