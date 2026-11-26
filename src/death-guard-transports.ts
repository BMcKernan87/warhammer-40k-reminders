import {DEATH_GUARD_SHEETS,deathGuardKeywords} from './death-guard-data';
import {legionTransports} from './legion-transports';

export const {formations:deathGuardFormations,cargo:deathGuardCargoFormations,reminders:deathGuardTransportReminders}=legionTransports({
 faction:'Death Guard',idPrefix:'11e-dg-',sheets:DEATH_GUARD_SHEETS,keywords:deathGuardKeywords,
 doubleSpace:['TERMINATOR'],heavyModels:'Terminators',
});
