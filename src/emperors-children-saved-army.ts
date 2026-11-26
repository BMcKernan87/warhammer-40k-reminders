import {currentEcDetachment} from './emperors-children-detachment-data';
import {migrateSavedDetachments} from './saved-detachment-names';
export const migrateEmperorsChildrenDetachments=(value:unknown):unknown=>migrateSavedDetachments(value,'Emperor’s Children',currentEcDetachment);
