import type {ArmySelection} from './catalog';
import type {GeneratedReminder} from './generated-reminders';
import {TAU_GREATER_GOOD_UNITS,TAU_REVISION} from './tau-data.generated';
import {tauMusterUnits} from './tau-data';
import {tauKeywords} from './tau-keywords';
import {tauHasRangedWeapon} from './tau-loadouts';
import {tauFormations} from './tau-transports';
import {expandRoster,type RosterInstance} from './roster-instances';

const sources=new Set<string>(TAU_GREATER_GOOD_UNITS);
const snapshot=(army:ArmySelection,roster:readonly RosterInstance[])=>({...army,instances:[...roster]});

/** Eligible roster formations, not battlefield choices of Observer or target. */
export function tauGreaterGoodFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 if(army.faction!=='T’au Empire')return [];
 const legal=new Set(tauMusterUnits(army));
 return tauFormations(army,roster).filter(g=>g.members.every(s=>legal.has(s.unit))&&g.members.some(s=>sources.has(s.unit)));
}
export function tauObserverFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 const current=snapshot(army,roster);
 return tauGreaterGoodFormations(army,roster).filter(g=>!g.members.some(s=>tauKeywords(current,s).has('FORTIFICATION')));
}
export function tauGuidedFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 return tauGreaterGoodFormations(army,roster).filter(g=>g.members.some(tauHasRangedWeapon));
}
export function tauMarkerlightFormations(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)){
 const current=snapshot(army,roster);
 return tauObserverFormations(army,roster).filter(g=>g.members.some(s=>tauKeywords(current,s).has('MARKERLIGHT')));
}

export function tauGreaterGoodReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 const observers=tauObserverFormations(army,roster);if(!observers.length)return [];
 const guided=tauGuidedFormations(army,roster),markers=tauMarkerlightFormations(army,roster),result:GeneratedReminder[]=[];
 const ids=(groups:typeof observers)=>[...new Set(groups.flatMap(g=>g.members.map(s=>s.id)))];
 function add(id:string,title:string,timing:GeneratedReminder['timing'],summary:string,units:string[]){
  if(units.length)result.push({id:'11e-tau-greater-good:'+id,title,window:'Shooting',turn:'own',timing,summary,units,origin:'army',source:TAU_REVISION.pack});
 }
 add('observers','For the Greater Good · Select Observers','start','At the start of your Shooting phase, choose which of these formations will be Observer units for this phase. They must have a surviving source of For the Greater Good. An Observer cannot also be a Guided unit that phase. Eligible formations: '+observers.map(g=>g.root.id).join(', ')+'. A gunless Ethereal still has the faction ability; its lack of a ranged weapon does not by itself remove Observer eligibility.',ids(observers));
 add('spot','For the Greater Good · Mark Spotted targets','during','During your Shooting phase, each chosen Observer that is eligible to shoot, has not been selected to shoot this phase and is neither Battle-shocked nor a Fortification may mark one visible enemy unit as its Spotted unit until the end of the phase. Each enemy unit can be marked only once per phase. An Observer may shoot after it has marked its target. There is no one-to-one pairing with a Guided unit.',ids(observers));
 add('guided','For the Greater Good · Guided attacks','during','A formation with For the Greater Good that was not selected as an Observer is Guided while targeting one or more Spotted enemy units. Improve the Ballistic Skill of each attack against a Spotted unit by 1. That attack also has Ignores Cover if the Observer that marked its target had Markerlight. Other targets receive neither benefit; there is no Ballistic Skill penalty for splitting attacks. These effects end with your Shooting phase and do not apply to Overwatch or shooting in other phases.',ids(guided));
 add('markerlight','For the Greater Good · Markerlight','during','These eligible Observer formations have Markerlight from a native model or a surviving equipped Marker Drone bearer. When one marks its Spotted enemy, Guided attacks against that enemy also have Ignores Cover until this Shooting phase ends. An equipped Marker Drone also allows its bearer’s formation to act as an Observer after Advancing. Drones are equipment tokens, not separate models or separate Observer units.',ids(markers));
 return result;
}
