import {currentDeathGuardDetachment} from './death-guard-detachment-data';
import {migrateSavedDetachments} from './saved-detachment-names';
import {migrateCustodesArmy} from './custodes-saved-army';
import {migrateEmperorsChildrenDetachments} from './emperors-children-saved-army';
import {migrateGscDetachments} from './gsc-saved-army';
import {migrateOrkArmy} from './ork-saved-army';
import {renameSavedUnit} from './saved-unit-name';

export function migrateSavedArmy(value:unknown):unknown{
 const detachments=migrateSavedDetachments(value,'Death Guard',currentDeathGuardDetachment);
 const renamed=renameSavedUnit(detachments,'Thousand Sons','Magnus the Red','Magnus The Red');
 return migrateEmperorsChildrenDetachments(migrateGscDetachments(migrateOrkArmy(migrateCustodesArmy(renamed))));
}
