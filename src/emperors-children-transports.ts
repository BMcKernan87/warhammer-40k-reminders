import {EMPERORS_CHILDREN_SHEETS,emperorsChildrenKeywords} from './emperors-children-data';
import {legionTransports} from './legion-transports';

export const {formations:emperorsChildrenFormations,cargo:emperorsChildrenCargoFormations,reminders:emperorsChildrenTransportReminders}=legionTransports({
 faction:'Emperor’s Children',idPrefix:'11e-ec-',sheets:EMPERORS_CHILDREN_SHEETS,keywords:emperorsChildrenKeywords,
 doubleSpace:['TERMINATOR','FLAWLESS BLADES'],heavyModels:'Terminators and Flawless Blades',
});
