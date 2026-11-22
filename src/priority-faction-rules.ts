import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import {expandRoster} from './roster-instances';
type Faction='Orks'|'Tyranids'|'Space Marines';
type Rule={unit:string;id:string;title:string;window:ReminderWindow;timing:'start'|'during'|'end';summary:string};
const rules:Record<Faction,readonly Rule[]>={
 Orks:[
  {unit:'Gretchin',id:'gretchin-thievin',title:'Gretchin · Thievin’ Scavengers',window:'Command',timing:'start',summary:'At the start of your Command phase, check whether this Gretchin unit is within range of an objective marker you control. Roll a D6; on a 4+, gain 1 CP, subject to the core CP gain limit.'},
  {unit:'Weirdboy',id:'weirdboy-da-jump',title:'Weirdboy · Da Jump',window:'Movement',timing:'end',summary:'At the end of your Movement phase, check Da Jump eligibility and its Psychic test before repositioning the Weirdboy’s unit. Apply current placement and Engagement Range restrictions.'},
  {unit:'Boyz',id:'boyz-get-da-good-bit',title:'Boyz · Get Da Good Bitz',window:'Command',timing:'during',summary:'Check this unit’s objective-control and Battleline interactions when resolving mission objectives; consult the current Boyz datasheet for the applicable ability.'}
 ],
 Tyranids:[
  {unit:'Neurotyrant',id:'neurotyrant-shadow',title:'Neurotyrant · Psychic Terror',window:'Command',timing:'during',summary:'When you unleash Shadow in the Warp, apply this Neurotyrant’s Psychic Terror modifier to affected enemy Battle-shock tests, using the current datasheet wording.'},
  {unit:'Termagants',id:'termagants-skulking',title:'Termagants · Skulking Horrors',window:'Movement',timing:'during',summary:'When an enemy unit ends a Normal, Advance or Fall Back move within 9 inches of this unit, check whether Skulking Horrors allows this unit a reactive Normal move. Observe the once-per-turn restriction and distance from enemies.'},
  {unit:'Tervigon',id:'tervigon-spawn',title:'Tervigon · Spawn Termagants',window:'Command',timing:'during',summary:'In your Command phase, check Spawn Termagants to return destroyed Termagant models to an eligible friendly Termagants unit within range, up to its Starting Strength.'},
  {unit:'Exocrine',id:'exocrine-symbiotic',title:'Exocrine · Symbiotic Targeting',window:'Shooting',timing:'during',summary:'After this Exocrine has shot, check whether Symbiotic Targeting applies to a surviving target so subsequent friendly Tyranid shooting can benefit from the datasheet effect.'}
 ],
 'Space Marines':[
  {unit:'Lieutenant',id:'lieutenant-tactical',title:'Lieutenant · Tactical Precision',window:'Shooting',timing:'during',summary:'While this Lieutenant leads a unit, check the LETHAL HITS benefit granted to models in that unit when resolving their attacks.'},
  {unit:'Apothecary Biologis',id:'biologis-surgical',title:'Apothecary Biologis · Surgical Precision',window:'Shooting',timing:'during',summary:'While this Apothecary Biologis leads a unit, check the LETHAL HITS benefit for models in the attached unit.'},
  {unit:'Aggressor Squad',id:'aggressor-close',title:'Aggressor Squad · Close-quarters Firepower',window:'Shooting',timing:'during',summary:'Check the current Aggressor Squad datasheet ability when selecting targets and resolving attacks at close range.'},
  {unit:'Eradicator Squad',id:'eradicator-total',title:'Eradicator Squad · Total Obliteration',window:'Shooting',timing:'during',summary:'When this unit makes ranged attacks against MONSTER or VEHICLE targets, apply the current Total Obliteration re-roll conditions.'}
 ]
};
export function priorityFactionUnitReminders(army:ArmySelection):GeneratedReminder[]{
 if(!(army.faction in rules))return [];
 const faction=army.faction as Faction;
 const base='https://wahapedia.ru/wh40k10ed/factions/'+(faction==='Space Marines'?'space-marines':faction.toLowerCase())+'/';
 const instances=expandRoster(army);
 return rules[faction].flatMap(rule=>instances.filter(x=>x.unit===rule.unit).map(x=>({
  id:rule.id+'-'+x.id,title:rule.title+' · '+x.id,window:rule.window,timing:rule.timing,
  summary:rule.summary,source:base+rule.unit.replaceAll(' ','-'),origin:'unit' as const,units:[x.id]
 })));
}
