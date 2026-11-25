import {currentGscDetachment} from './gsc-detachment-data';
import {migrateSavedDetachments} from './saved-detachment-names';
export const migrateGscDetachments=(value:unknown):unknown=>migrateSavedDetachments(value,'Genestealer Cults',currentGscDetachment);
