import {KNIGHT_CARD_STATS as cards} from './daemon-card-data.generated';
import {knightWeaponCount} from './knight-loadouts';
import type {ArmySelection} from './catalog';
import type {GeneratedReminder,ReminderWindow} from './generated-reminders';
import type {RosterInstance} from './roster-instances';

export interface DaemonRuleContext {
  army:ArmySelection;
  squad:RosterInstance;
  roster:readonly RosterInstance[];
  body?:RosterInstance;
  formationId:(s:RosterInstance)=>string;
  god:(s:RosterInstance)=>string|undefined;
  add:(name:string,window:ReminderWindow,turn:NonNullable<GeneratedReminder['turn']>,timing:GeneratedReminder['timing'],summary:string,targets?:string[])=>void;
}

export function daemonFortification(c:DaemonRuleContext,coverName:string):void {
  for(const window of ['Movement','Shooting'] as const){
    c.add(coverName,window,'either','during','When this Fortification blocks full visibility of a model from any model of the attacking unit, that model gets the Benefit of Cover against the ranged attack.');
    c.add('Fortification',window,'either','during','An enemy engaged only with your Fortifications may still be targeted with ranged attacks. Subtract 1 to Hit unless firing a Pistol. A Battle-shocked enemy falling back from only your Fortifications tests for Desperate Escape only for models moving over enemy models.');
  }
}

export function daemonHasRangedWeapon(s:RosterInstance):boolean {
  return cards[s.unit]?.weapons.some(w=>w.phase==='Shooting'&&knightWeaponCount(s,w.name)>0)??false;
}
