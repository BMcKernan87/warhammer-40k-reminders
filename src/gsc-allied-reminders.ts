import type {ArmySelection} from './catalog';
import {broodBrotherIntrinsicReminders} from './brood-brother-reminders';
import {finalDayIntrinsicReminders} from './final-day-intrinsic';
import {finalDayWeaponReminders} from './final-day-weapon-reminders';
import type {GeneratedReminder} from './generated-reminders';
import {expandRoster,type RosterInstance} from './roster-instances';

export function gscAlliedReminders(army:ArmySelection,roster:readonly RosterInstance[]=expandRoster(army)):GeneratedReminder[]{
 if(army.faction!=='Genestealer Cults')return [];
 return [
  ...broodBrotherIntrinsicReminders(army,roster),
  ...finalDayIntrinsicReminders(army,roster),
  ...finalDayWeaponReminders(army,roster),
 ];
}
