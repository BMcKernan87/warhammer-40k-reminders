import {THOUSAND_SONS_SHEETS,thousandSonsKeywords} from './thousand-sons-data';
import {legionTransports} from './legion-transports';

export const {formations:thousandSonsFormations,cargo:thousandSonsCargoFormations,reminders:thousandSonsTransportReminders}=legionTransports({
 faction:'Thousand Sons',idPrefix:'11e-ts-',sheets:THOUSAND_SONS_SHEETS,keywords:thousandSonsKeywords,
 doubleSpace:['TERMINATOR'],heavyModels:'Terminators',
});
